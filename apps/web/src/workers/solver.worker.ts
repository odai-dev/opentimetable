import initWasm, { WasmSolverSession } from '../wasm/opentimetable_solver_wasm.js';
import type {
  InboundWorkerMessage,
  OutboundWorkerMessage,
  ProgressMetrics,
  TimetableResponse,
} from '../lib/solver-protocol';
import { extractSlotsFromTimeOffMatrix } from '../lib/domain';

interface WorkerContext {
  postMessage(message: any, transfer?: Transferable[]): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  onmessage: ((this: any, ev: MessageEvent) => any) | null;
}

const ctx: WorkerContext = self as unknown as WorkerContext;

let wasmInitPromise: Promise<void> | null = null;
let isWasmReady = false;
let activeSession: WasmSolverSession | null = null;
let currentRequestId: string | null = null;
let isCancelled = false;
let stepTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureWasmInitialized(wasmUrl = '/wasm/opentimetable_solver_wasm_bg.wasm'): Promise<void> {
  if (isWasmReady) return;
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      await initWasm(wasmUrl);
      isWasmReady = true;
    })();
  }
  return wasmInitPromise;
}

// Eager initialization on worker startup
ensureWasmInitialized()
  .then(() => {
    ctx.postMessage({ type: 'READY', ready: true } as OutboundWorkerMessage);
  })
  .catch((err) => {
    console.warn('[solver.worker] Pre-warm failed, will retry on demand:', err);
  });

function cleanup() {
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (activeSession) {
    try {
      activeSession.free();
    } catch {}
    activeSession = null;
  }
  currentRequestId = null;
  isCancelled = false;
}

function calculateProgress(
  isFeasible: boolean,
  hardConflicts: number,
  initialHard: number,
  elapsedMs: number,
  timeoutMs: number
): number {
  if (!isFeasible) {
    const conflictProgress = initialHard > 0
      ? ((initialHard - hardConflicts) / initialHard) * 40
      : 10;
    return Math.min(60, Math.max(15, Math.round(15 + conflictProgress)));
  }
  const timeRatio = Math.min(1.0, elapsedMs / timeoutMs);
  return Math.min(98, Math.round(60 + timeRatio * 38));
}

ctx.addEventListener('message', async (event: MessageEvent<InboundWorkerMessage>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'INIT_REQUEST') {
    try {
      await ensureWasmInitialized(msg.wasmUrl);
      ctx.postMessage({ type: 'INIT_SUCCESS', ready: true } as OutboundWorkerMessage);
      ctx.postMessage({ type: 'READY', ready: true } as OutboundWorkerMessage);
    } catch (err: any) {
      ctx.postMessage({ type: 'INIT_ERROR', error: err?.message || String(err) } as OutboundWorkerMessage);
    }
    return;
  }

  if (msg.type === 'CANCEL_REQUEST') {
    if (!msg.requestId || currentRequestId === msg.requestId) {
      isCancelled = true;
      const cancelReqId = msg.requestId || currentRequestId || '';
      cleanup();
      ctx.postMessage({
        type: 'SOLVE_CANCELLED',
        requestId: cancelReqId,
        elapsedMs: 0,
      } as OutboundWorkerMessage);
    }
    return;
  }

  if (msg.type === 'SOLVE_REQUEST') {
    cleanup();
    const reqId = msg.requestId || `req_${Date.now()}`;
    currentRequestId = reqId;
    isCancelled = false;

    try {
      await ensureWasmInitialized();
    } catch (err: any) {
      ctx.postMessage({
        type: 'SOLVE_ERROR',
        requestId: reqId,
        error: `WASM initialization failed: ${err?.message || String(err)}`,
        canFallback: true,
      } as OutboundWorkerMessage);
      return;
    }

    const { payload, complexity, options } = msg;
    const resolvedDays =
      Number(payload?.config?.days) ||
      Number(payload?.config?.days_count) ||
      Number(payload?.days) ||
      Number(payload?.cycleDays) ||
      5;

    const resolvedPeriodsPerDay =
      Number(payload?.config?.periodsPerDay) ||
      Number(payload?.config?.periods_per_day) ||
      Number(payload?.periodsPerDay) ||
      Number(payload?.periods_per_day) ||
      7;

    const timeOffMatrix = payload?.timeOffMatrix;
    let normalizedTeachers = payload?.teachers || [];
    let normalizedClasses = payload?.classes || [];

    if (timeOffMatrix && typeof timeOffMatrix === 'object') {
      normalizedTeachers = normalizedTeachers.map((tc: any) => {
        const { unavailableSlots, undesirableSlots } = extractSlotsFromTimeOffMatrix(
          tc.id,
          timeOffMatrix,
          resolvedPeriodsPerDay,
          tc.unavailableSlots
        );
        return {
          ...tc,
          unavailableSlots,
          undesirableSlots,
        };
      });

      normalizedClasses = normalizedClasses.map((c: any) => {
        const { unavailableSlots } = extractSlotsFromTimeOffMatrix(
          c.id,
          timeOffMatrix,
          resolvedPeriodsPerDay,
          c.unavailableSlots || []
        );
        return {
          ...c,
          unavailableSlots,
        };
      });
    }

    const normalizedPayload = {
      ...payload,
      days: resolvedDays,
      periodsPerDay: resolvedPeriodsPerDay,
      teachers: normalizedTeachers,
      classes: normalizedClasses,
      config: {
        ...payload?.config,
        days: resolvedDays,
        periodsPerDay: resolvedPeriodsPerDay,
      },
    };

    const resolvedComplexity = complexity || payload?.complexity || 'normal';
    const timeoutMs = options?.timeoutMs ?? (resolvedComplexity === 'normal' ? 800 : resolvedComplexity === 'large' ? 1800 : 2500);
    const stepIterations = options?.stepIterations ?? 200;
    const startTime = performance.now();

    try {
      activeSession = new WasmSolverSession(JSON.stringify(normalizedPayload));
    } catch (err: any) {
      ctx.postMessage({
        type: 'SOLVE_ERROR',
        requestId: reqId,
        error: `Failed to construct solver session: ${err?.message || String(err)}`,
        canFallback: true,
      } as OutboundWorkerMessage);
      cleanup();
      return;
    }

    let initialHard = 0;

    const stepLoop = () => {
      if (isCancelled || currentRequestId !== reqId || !activeSession) {
        return;
      }

      try {
        const progressJson = activeSession.step(stepIterations);
        const progress = JSON.parse(progressJson);
        const elapsedMs = performance.now() - startTime;

        if (initialHard === 0 && progress.hardConflicts > 0) {
          initialHard = progress.hardConflicts;
        }

        const stage = !progress.isFeasible ? 'FEASIBILITY_TABU' : 'OPTIMIZATION_LAHC';
        const progressPercent = calculateProgress(
          progress.isFeasible,
          progress.hardConflicts,
          initialHard,
          elapsedMs,
          timeoutMs
        );

        ctx.postMessage({
          type: 'PROGRESS_UPDATE',
          requestId: reqId,
          metrics: {
            stage,
            stageIndex: !progress.isFeasible ? 2 : 3,
            totalStages: 3,
            iteration: progress.iteration,
            hardConflicts: progress.hardConflicts,
            softPenalty: progress.softPenalty,
            isFeasible: progress.isFeasible,
            elapsedMs: Math.round(elapsedMs),
            progressPercent,
          },
          payload: {
            stage: !progress.isFeasible ? 2 : 3,
            totalStages: 3,
            stageName: !progress.isFeasible ? 'Stage 2: Tabu Search' : 'Stage 3: LAHC Optimization',
            stageNameAr: !progress.isFeasible ? 'المرحلة 2: خوارزمية تابو لفض النزاعات' : 'المرحلة 3: تحسين الفترات الشاغرة',
            iteration: progress.iteration,
            unplacedCount: 0,
            hardConflicts: progress.hardConflicts,
            softPenalty: progress.softPenalty,
            isFeasible: progress.isFeasible,
            elapsedMs: Math.round(elapsedMs),
            progressPercent,
          },
        } as OutboundWorkerMessage);

        const isTimeout = elapsedMs >= timeoutMs;
        const isOptimal = progress.isFeasible && progress.hardConflicts === 0 && (isTimeout || progress.softPenalty === 0);

        if (isOptimal || isTimeout) {
          const solutionJson = activeSession.get_solution();
          const response: TimetableResponse = JSON.parse(solutionJson);

          const lessonMap = new Map((payload?.lessons || []).map((l: any) => [l.id, l]));
          const mappedPlacements = (response.placements || []).map((p: any) => {
            const lessonId = p.lessonId || p.lesson_id;
            const lesson = lessonMap.get(lessonId);
            const fallbackRoom = lesson?.roomId || (payload?.rooms && payload.rooms[0]?.id) || '';
            return {
              lessonId,
              dayIndex:
                p.dayIndex ??
                p.day_index ??
                (p.slot !== undefined ? Math.floor(p.slot / resolvedPeriodsPerDay) : 0),
              periodIndex:
                p.periodIndex ??
                p.period_index ??
                (p.slot !== undefined ? p.slot % resolvedPeriodsPerDay : 0),
              roomId: p.roomId || p.room_id || fallbackRoom,
            };
          });

          ctx.postMessage({
            type: 'SOLVE_COMPLETE',
            requestId: reqId,
            response,
            placements: mappedPlacements,
            durationMs: response.solveDurationMs ?? Math.round(elapsedMs),
            status: response.status ? `${response.status} (${response.hardConflicts} Hard Conflicts)` : 'OPTIMAL (0 Hard Conflicts)',
          } as OutboundWorkerMessage);
          cleanup();
          return;
        }

        stepTimer = setTimeout(stepLoop, options?.yieldIntervalMs ?? 0);
      } catch (err: any) {
        ctx.postMessage({
          type: 'SOLVE_ERROR',
          requestId: reqId,
          error: `Solver step execution error: ${err?.message || String(err)}`,
          canFallback: true,
        } as OutboundWorkerMessage);
        cleanup();
      }
    };

    stepLoop();
  }
});
