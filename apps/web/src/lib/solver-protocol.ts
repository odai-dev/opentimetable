/**
 * Shared Worker Protocol Contracts and Type Definitions
 */

export type SolverStage =
  | 'CONSTRUCTIVE_GREEDY'
  | 'FEASIBILITY_TABU'
  | 'OPTIMIZATION_LAHC';

export interface ProgressMetrics {
  stage: SolverStage;
  stageIndex: 1 | 2 | 3;
  totalStages: 3;
  iteration: number;
  hardConflicts: number;
  softPenalty: number;
  isFeasible: boolean;
  elapsedMs: number;
  progressPercent: number; // 0 to 100
}

export interface LessonAssignment {
  lessonId: string;
  slot: number;
  dayIndex: number;
  periodIndex: number;
  duration: number;
  roomId: string;
}

export interface TimetableResponse {
  requestId: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'TIMEOUT' | 'INFEASIBLE';
  hardConflicts: number;
  softPenalty: number;
  solveDurationMs: number;
  iterations: number;
  placements: LessonAssignment[];
  violations: Array<{
    constraintType: string;
    severity: string;
    description: string;
    affectedLessons: string[];
  }>;
}

export interface SolverProgressPayload {
  stage: number;
  totalStages: number;
  stageName: string;
  stageNameAr: string;
  iteration: number;
  unplacedCount: number;
  hardConflicts: number;
  softPenalty?: number;
  isFeasible?: boolean;
  elapsedMs: number;
  progressPercent?: number;
}

export interface SolveRequestPayload {
  complexity?: 'normal' | 'large' | 'huge';
  lessons: Array<{
    id: string;
    subjectId?: string;
    teacherId?: string;
    classId?: string;
    roomId?: string;
    duration?: number;
    [key: string]: any;
  }>;
  teachers?: any[];
  classes?: any[];
  rooms?: any[];
  subjects?: any[];
  config?: any;
  [key: string]: any;
}

// Inbound Messages (Main Thread -> Worker)
export type InboundWorkerMessage =
  | {
      type: 'INIT_REQUEST';
      wasmUrl?: string;
    }
  | {
      type: 'SOLVE_REQUEST';
      requestId?: string;
      payload: any; // TimetableRequest or SolveRequestPayload
      complexity?: 'normal' | 'large' | 'huge';
      options?: {
        timeoutMs?: number;
        stepIterations?: number;
        yieldIntervalMs?: number;
      };
    }
  | {
      type: 'CANCEL_REQUEST';
      requestId?: string;
    };

export type SolverInboundMessage = InboundWorkerMessage;

// Outbound Messages (Worker -> Main Thread)
export type OutboundWorkerMessage =
  | {
      type: 'READY';
      ready?: boolean;
    }
  | {
      type: 'INIT_SUCCESS';
      ready: true;
    }
  | {
      type: 'INIT_ERROR';
      error: string;
    }
  | {
      type: 'PROGRESS_UPDATE';
      requestId?: string;
      metrics?: ProgressMetrics;
      payload: SolverProgressPayload;
    }
  | {
      type: 'SOLVE_COMPLETE';
      requestId?: string;
      response?: TimetableResponse;
      placements: any[];
      durationMs: number;
      status: string;
    }
  | {
      type: 'SOLVE_ERROR';
      requestId?: string;
      error: string;
      canFallback?: boolean;
    }
  | {
      type: 'SOLVE_CANCELLED';
      requestId?: string;
      elapsedMs?: number;
    };

export type SolverOutboundMessage = OutboundWorkerMessage;
