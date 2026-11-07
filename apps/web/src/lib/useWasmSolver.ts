'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Placement } from './types';
import {
  SolverInboundMessage,
  SolverOutboundMessage,
  SolverProgressPayload,
  SolveRequestPayload,
} from './solver-protocol';

export interface UseWasmSolverReturn {
  isReady: boolean;
  isSolving: boolean;
  progress: SolverProgressPayload | null;
  solveStats: { durationMs: number; status: string } | null;
  solve: (payload: SolveRequestPayload) => Promise<Placement[]>;
  allocateRooms: (payload: any) => Promise<Placement[]>;
  cancel: () => void;
}

export function useWasmSolver(): UseWasmSolverReturn {
  const [isReady, setIsReady] = useState<boolean>(true);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [progress, setProgress] = useState<SolverProgressPayload | null>(null);
  const [solveStats, setSolveStats] = useState<{ durationMs: number; status: string } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((placements: Placement[]) => void) | null>(null);
  const rejectRef = useRef<((err: any) => void) | null>(null);

  useEffect(() => {
    // Only instantiate in browser environment
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<SolverOutboundMessage>) => {
        const msg = event.data;
        if (msg.type === 'READY') {
          setIsReady(true);
        } else if (msg.type === 'PROGRESS_UPDATE') {
          setProgress(msg.payload);
        } else if (msg.type === 'SOLVE_COMPLETE') {
          setSolveStats({
            durationMs: msg.durationMs,
            status: msg.status,
          });
          setIsSolving(false);
          setProgress(null);
          if (resolveRef.current) {
            resolveRef.current(msg.placements);
            resolveRef.current = null;
            rejectRef.current = null;
          }
        } else if (msg.type === 'ALLOCATE_ROOMS_COMPLETE') {
          setIsSolving(false);
          setProgress(null);
          if (resolveRef.current) {
            resolveRef.current(msg.placements);
            resolveRef.current = null;
            rejectRef.current = null;
          }
        } else if (msg.type === 'SOLVE_ERROR') {
          setIsSolving(false);
          setProgress(null);
          if (rejectRef.current) {
            rejectRef.current(new Error(msg.error));
            resolveRef.current = null;
            rejectRef.current = null;
          }
        }
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.warn('Worker creation notice, inline solver active:', err);
    }
  }, []);

  const solve = useCallback((payload: SolveRequestPayload): Promise<Placement[]> => {
    setIsSolving(true);
    setProgress({
      stage: 1,
      totalStages: 3,
      stageName: 'Stage 1: MRV Feasibility',
      stageNameAr: 'المرحلة 1: التسكين الإرشادي الأولي',
      iteration: 0,
      unplacedCount: payload.lessons.length,
      hardConflicts: 0,
      elapsedMs: 0,
    });

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'SOLVE_REQUEST',
          payload,
        } as SolverInboundMessage);
      } else {
        // High-speed fallback if Worker is unavailable
        const start = performance.now();
        setTimeout(() => {
          const days =
            Number(payload.config?.days) ||
            Number((payload as any).days) ||
            Number((payload as any).cycleDays) ||
            5;
          const periods =
            Number(payload.config?.periodsPerDay) ||
            Number((payload.config as any)?.periods_per_day) ||
            Number((payload as any).periodsPerDay) ||
            Number((payload as any).periods_per_day) ||
            7;
          const totalCapacity = Math.max(1, days * periods);

          let slot = 0;
          const solvedPlacements: Placement[] = payload.lessons.map((lesson: any) => {
            const isPinned = Boolean(lesson.isPinned || lesson.isLocked);
            if (isPinned && lesson.pinnedSlot !== undefined) {
              const d = Math.floor(lesson.pinnedSlot / periods);
              const p = lesson.pinnedSlot % periods;
              return {
                lessonId: lesson.id,
                dayIndex: d,
                periodIndex: p,
                roomId: lesson.pinnedRoomId || lesson.roomId || (payload.rooms && payload.rooms[0]?.id) || '',
                isLocked: true,
              };
            }
            if (payload.solveMode === 'IMPROVE' && lesson.initialSlot !== undefined) {
              const d = Math.floor(lesson.initialSlot / periods);
              const p = lesson.initialSlot % periods;
              return {
                lessonId: lesson.id,
                dayIndex: d,
                periodIndex: p,
                roomId: lesson.initialRoomId || lesson.roomId || (payload.rooms && payload.rooms[0]?.id) || '',
                isLocked: isPinned,
              };
            }
            const currentSlot = slot % totalCapacity;
            const d = Math.floor(currentSlot / periods);
            const p = currentSlot % periods;
            slot++;
            return {
              lessonId: lesson.id,
              dayIndex: d,
              periodIndex: p,
              roomId: lesson.roomId || (payload.rooms && payload.rooms[0]?.id) || '',
              isLocked: isPinned,
            };
          });

          const elapsed = Math.round((performance.now() - start) * 10) / 10;
          setSolveStats({
            durationMs: elapsed,
            status: 'FALLBACK (Unverified)',
          });
          setIsSolving(false);
          setProgress(null);
          resolve(solvedPlacements);
        }, 400);
      }
    });
  }, []);

  const allocateRooms = useCallback((payload: any): Promise<Placement[]> => {
    setIsSolving(true);
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'ALLOCATE_ROOMS_REQUEST',
          payload,
        } as SolverInboundMessage);
      } else {
        setIsSolving(false);
        resolve(payload.placements);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL_REQUEST' } as SolverInboundMessage);
    }
    setIsSolving(false);
    setProgress(null);
    if (rejectRef.current) {
      rejectRef.current(new Error('Solver cancelled by user'));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  return {
    isReady,
    isSolving,
    progress,
    solveStats,
    solve,
    allocateRooms,
    cancel,
  };
}
