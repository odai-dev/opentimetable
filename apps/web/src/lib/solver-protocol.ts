/**
 * Shared Worker Protocol Contracts and Type Definitions
 * opentimetable/apps/web/src/lib/solver-protocol.ts
 */

import type {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  Placement,
  GenerationComplexity,
} from './types';

export type SolverStage =
  | 'CONSTRUCTIVE_GREEDY'
  | 'FEASIBILITY_TABU'
  | 'OPTIMIZATION_LAHC';

export type SolutionStatus =
  | 'OPTIMAL'
  | 'FEASIBLE'
  | 'TIMEOUT'
  | 'INFEASIBLE';

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

export interface ViolationDetail {
  constraintType: string;
  severity: string;
  description: string;
  affectedLessons: string[];
}

export interface TimetableResponse {
  requestId: string;
  status: SolutionStatus;
  hardConflicts: number;
  softPenalty: number;
  solveDurationMs: number;
  iterations: number;
  placements: LessonAssignment[];
  violations: ViolationDetail[];
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

export interface SolverExecutionOptions {
  minimizeGaps?: boolean;
  strictRooms?: boolean;
  distributeSubjects?: boolean;
  timeoutMs?: number;
  stepIterations?: number;
  yieldIntervalMs?: number;
  [key: string]: any;
}

export interface SolverConfig {
  days?: number;
  periodsPerDay?: number;
  maxConsecutivePeriods?: number;
  timeoutMs?: number;
  maxIterations?: number;
  randomSeed?: number;
  gapWeight?: number;
  distributionWeight?: number;
  preferenceWeight?: number;
  roomChangeWeight?: number;
  [key: string]: any;
}

/**
 * Flexible lesson input allowing standard Lesson or extended constraints
 */
export interface SolverLessonInput {
  id: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  roomId?: string;
  duration?: number;
  requiredFeatures?: string[];
  studentCount?: number;
  isPinned?: boolean;
  pinnedSlot?: number;
  pinnedRoomId?: string;
  [key: string]: any;
}

/**
 * Flexible entity inputs supporting frontend domain types or raw solver extensions
 */
export interface SolverTeacherInput extends Partial<Teacher> {
  id: string;
  name: string;
  unavailableSlots?: number[];
  maxConsecutivePeriods?: number;
  maxDailyHours?: number;
  preferredSlots?: number[];
  undesirableSlots?: number[];
  [key: string]: any;
}

export interface SolverClassInput extends Partial<ClassGroup> {
  id: string;
  name: string;
  unavailableSlots?: number[];
  studentCount?: number;
  [key: string]: any;
}

export interface SolverRoomInput extends Partial<Room> {
  id: string;
  name: string;
  capacity?: number;
  roomType?: string;
  features?: string[];
  unavailableSlots?: number[];
  [key: string]: any;
}

export interface SolverSubjectInput extends Partial<Subject> {
  id: string;
  name: string;
  maxDailyPeriods?: number;
  requiredRoomType?: string;
  requiredFeatures?: string[];
  [key: string]: any;
}

export interface SolveRequestPayload {
  complexity?: GenerationComplexity;
  solveMode?: 'NEW' | 'IMPROVE';
  lessons: Array<Lesson | SolverLessonInput>;
  teachers?: Array<Teacher | SolverTeacherInput>;
  classes?: Array<ClassGroup | SolverClassInput>;
  rooms?: Array<Room | SolverRoomInput>;
  subjects?: Array<Subject | SolverSubjectInput>;
  config?: SolverConfig;
  options?: SolverExecutionOptions;
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
      payload: SolveRequestPayload;
      complexity?: GenerationComplexity;
      options?: SolverExecutionOptions;
    }
  | {
      type: 'ALLOCATE_ROOMS_REQUEST';
      requestId?: string;
      payload: {
        teachers: any[];
        classes: any[];
        rooms: any[];
        subjects: any[];
        lessons: any[];
        placements: Placement[];
        config?: any;
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
      placements: Placement[];
      durationMs: number;
      status: string;
    }
  | {
      type: 'ALLOCATE_ROOMS_COMPLETE';
      requestId?: string;
      placements: Placement[];
      allocatedCount: number;
      unallocatedCount: number;
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
