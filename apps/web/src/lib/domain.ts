/**
 * opentimetable/apps/web/src/lib/domain.ts
 *
 * Core timetable domain models, entities, and conversion interfaces.
 * Provides unified data structures for timetable authoring, parsing,
 * solver integration, and serialization.
 */

import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  Placement,
  Conflict,
  Role,
  ViewMode,
  Language,
  RibbonTab,
  GenerationComplexity,
  AvailabilityState,
  BasicDataTab,
  DragItem,
} from './types';

// Re-export standard presentation and interaction types
export type {
  Role,
  ViewMode,
  Language,
  RibbonTab,
  GenerationComplexity,
  AvailabilityState,
  BasicDataTab,
  DragItem,
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  Placement,
  Conflict,
};

/**
 * Single period / bell schedule slot definition
 */
export interface PeriodDefinition {
  period: number;
  name: string;
  short: string;
  starttime: string;
  endtime: string;
}

/**
 * Educational institution metadata
 */
export interface SchoolInfo {
  name: string;
  academicYear?: string;
  cycleDays: number;
  periodsPerDay: number;
}

/**
 * Raw entity extracted directly from binary or file representations
 */
export interface RozRawEntity {
  id: string;
  name: string;
  short: string;
}

/**
 * Raw lesson card assignment extracted from binary representation
 */
export interface RozRawLesson {
  id: string;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  room_id: string;
  room_name: string;
  duration: number;
  period: number;
  day: number;
  is_locked?: boolean;
}

/**
 * Full parse result schema representing an extracted timetable dataset
 */
export interface RozParseResult {
  file: string;
  filesize_bytes: number;
  schema_version: number;
  has_asctt_magic: boolean;
  school_name: string;
  cycle_days: number;
  periods_per_day: number;
  periods: PeriodDefinition[];
  counts: {
    teachers: number;
    classes: number;
    subjects: number;
    rooms: number;
    lessons: number;
  };
  teachers: RozRawEntity[];
  classes: RozRawEntity[];
  subjects: RozRawEntity[];
  rooms: RozRawEntity[];
  lessons: RozRawLesson[];
  mapped: {
    teachers: Teacher[];
    classes: ClassGroup[];
    subjects: Subject[];
    rooms: Room[];
    lessons: Lesson[];
    placements: Placement[];
  };
}

/**
 * Standard palette for subjects
 */
export const SUBJECT_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // violet
  '#ef4444', // red
  '#6366f1', // indigo
];

/**
 * Standard palette for teachers
 */
export const TEACHER_PALETTE = [
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#0d9488',
  '#9333ea',
  '#dc2626',
  '#4f46e5',
];

/**
 * Determines whether a string contains Arabic Unicode characters (0x0600 - 0x06FF).
 */
export function isArabicText(text: string): boolean {
  return /[\u0600-\u06ff]/.test(text);
}

/**
 * Maps raw extracted entities into frontend React state models.
 */
export function mapRozToFrontend(parsed: Omit<RozParseResult, 'mapped'>): RozParseResult['mapped'] {
  const teachers: Teacher[] = parsed.teachers.map((t, idx) => {
    const isAr = isArabicText(t.name);
    return {
      id: t.id,
      name: t.name,
      nameAr: isAr ? t.name : undefined,
      speciality: t.short || 'Faculty',
      color: TEACHER_PALETTE[idx % TEACHER_PALETTE.length],
      unavailableSlots: [],
    };
  });

  const classes: ClassGroup[] = parsed.classes.map((c) => {
    const isAr = isArabicText(c.name);
    const numMatch = c.name.match(/\d+/);
    const grade = numMatch ? parseInt(numMatch[0], 10) : 1;
    return {
      id: c.id,
      name: c.name,
      nameAr: isAr ? c.name : undefined,
      grade: isNaN(grade) ? 1 : grade,
    };
  });

  const subjects: Subject[] = parsed.subjects.map((s, idx) => {
    const isAr = isArabicText(s.name);
    const lower = s.name.toLowerCase();
    const isLab = lower.includes('lab') || lower.includes('chem') || lower.includes('phys') || lower.includes('bio') || lower.includes('مختبر');
    return {
      id: s.id,
      name: s.name,
      nameAr: isAr ? s.name : undefined,
      code: s.short || s.name.slice(0, 4),
      color: SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length],
      requiredRoomType: isLab ? 'LAB' : undefined,
    };
  });

  const rooms: Room[] = parsed.rooms.map((r) => {
    const isAr = isArabicText(r.name);
    const lower = r.name.toLowerCase();
    const isLab = lower.includes('lab') || lower.includes('chem') || lower.includes('phys') || lower.includes('مختبر');
    return {
      id: r.id,
      name: r.name,
      nameAr: isAr ? r.name : undefined,
      capacity: 35,
      type: isLab ? 'LAB' : 'STANDARD',
    };
  });

  const lessons: Lesson[] = parsed.lessons.map((l) => ({
    id: l.id,
    subjectId: l.subject_id,
    teacherId: l.teacher_id,
    classId: l.class_id,
    roomId: l.room_id || (rooms[0] ? rooms[0].id : '1'),
    duration: l.duration || 1,
  }));

  // Create initial placements based on parsed day and period (filtering unplaced cards)
  const placements: Placement[] = [];
  for (const l of parsed.lessons) {
    if (l.day > 0 && l.period > 0) {
      placements.push({
        lessonId: l.id,
        dayIndex: l.day - 1,
        periodIndex: l.period - 1,
        roomId: l.room_id || (rooms[0] ? rooms[0].id : '1'),
        isLocked: Boolean((l as any).is_locked || (l as any).isLocked),
      });
    }
  }

  return {
    teachers,
    classes,
    subjects,
    rooms,
    lessons,
    placements,
  };
}

/**
 * Extracts slot indices from timeOffMatrix (Record<string, AvailabilityState>)
 * for an entity (Teacher, Class, Room), sorting into unavailableSlots (state 0)
 * and undesirableSlots (state 2).
 */
export function extractSlotsFromTimeOffMatrix(
  entityId: string,
  timeOffMatrix: Record<string, AvailabilityState> = {},
  periodsPerDay: number = 7,
  initialUnavailable: number[] = []
): { unavailableSlots: number[]; undesirableSlots: number[] } {
  const unavailSet = new Set<number>(initialUnavailable || []);
  const undesirSet = new Set<number>();

  for (const [key, state] of Object.entries(timeOffMatrix || {})) {
    const lastDash = key.lastIndexOf('-');
    const secondLastDash = key.lastIndexOf('-', lastDash - 1);
    if (secondLastDash === -1 || lastDash === -1) continue;

    const id = key.substring(0, secondLastDash);
    if (id !== entityId) continue;

    const day = Number(key.substring(secondLastDash + 1, lastDash));
    const period = Number(key.substring(lastDash + 1));
    if (isNaN(day) || isNaN(period)) continue;

    const slotIndex = day * periodsPerDay + period;
    if (slotIndex >= 64) continue; // Respect u64 mask boundary

    if (state === 0) {
      unavailSet.add(slotIndex);
      undesirSet.delete(slotIndex);
    } else if (state === 2) {
      undesirSet.add(slotIndex);
      unavailSet.delete(slotIndex);
    } else if (state === 1) {
      unavailSet.delete(slotIndex);
      undesirSet.delete(slotIndex);
    }
  }

  return {
    unavailableSlots: Array.from(unavailSet).sort((a, b) => a - b),
    undesirableSlots: Array.from(undesirSet).sort((a, b) => a - b),
  };
}

/**
 * Checks if two lessons belonging to the same class are divided/split groups
 * and should be exempted from CLASS_CLASH.
 */
export function isSplitExempt(l1: Lesson, l2: Lesson): boolean {
  const g1 = l1.groupName?.trim().toLowerCase();
  const g2 = l2.groupName?.trim().toLowerCase();

  const isL1Split =
    l1.entireClass === false ||
    Boolean(l1.isSplitGroup) ||
    Boolean(l1.groupId) ||
    (Boolean(g1) && g1 !== 'entire class' && l1.groupName?.trim() !== 'كامل الفصل');

  const isL2Split =
    l2.entireClass === false ||
    Boolean(l2.isSplitGroup) ||
    Boolean(l2.groupId) ||
    (Boolean(g2) && g2 !== 'entire class' && l2.groupName?.trim() !== 'كامل الفصل');

  if (!isL1Split || !isL2Split) return false;

  // If both specify group IDs, they must be distinct
  if (l1.groupId && l2.groupId) {
    return l1.groupId !== l2.groupId;
  }

  // If both specify group names, they must be distinct
  if (g1 && g2) {
    return g1 !== g2;
  }

  // If one or both are split lessons with distinct IDs
  return l1.id !== l2.id;
}

