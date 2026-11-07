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
  AdvisorDiagnostic,
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
  AdvisorDiagnostic,
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

/**
 * Diagnostic analysis engine evaluating mathematical solvability & bottlenecks (R4, WF-SOL-02, WF-SOL-04)
 */
export function analyzeFeasibilityDiagnostics(params: {
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  cycleDays: number;
  periodsPerDay: number;
  timeOffMatrix?: Record<string, AvailabilityState>;
}): AdvisorDiagnostic[] {
  const {
    teachers = [],
    classes = [],
    rooms = [],
    subjects = [],
    lessons = [],
    cycleDays,
    periodsPerDay,
    timeOffMatrix = {},
  } = params;

  const totalCycleSlots = cycleDays * periodsPerDay;
  const list: AdvisorDiagnostic[] = [];

  // 1. Faculty Workload vs Available Unblocked Slots (Pigeonhole Principle)
  const teacherLessonHours = new Map<string, number>();
  for (const l of lessons) {
    const dur = l.duration || 1;
    teacherLessonHours.set(l.teacherId, (teacherLessonHours.get(l.teacherId) || 0) + dur);
  }

  for (const teacher of teachers) {
    const requiredHours = teacherLessonHours.get(teacher.id) || 0;
    if (requiredHours === 0) continue;

    // Count blocked slots
    let blockedCount = 0;
    const blockedSlots: number[] = [];
    for (let d = 0; d < cycleDays; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const key = `${teacher.id}-${d}-${p}`;
        if (timeOffMatrix[key] === 0) {
          blockedCount++;
          blockedSlots.push(d * periodsPerDay + p);
        }
      }
    }

    const availableSlots = totalCycleSlots - blockedCount;
    if (requiredHours > availableSlots) {
      const shortage = requiredHours - availableSlots;
      list.push({
        id: `ADV_PIGEONHOLE_${teacher.id}`,
        type: 'PIGEONHOLE_TEACHER',
        severity: 'CRITICAL',
        title: `Impossible Schedule for Faculty Member: ${teacher.name}`,
        titleAr: `استحالة رياضية لتسكين جدول عضو هيئة التدريس: ${teacher.nameAr || teacher.name}`,
        analysis: `Faculty member ${teacher.name} has ${requiredHours} required weekly lecture hours, but only ${availableSlots} available slots due to ${blockedCount} blocked lecture slots in Time-Off (Deficit: ${shortage} lectures).`,
        analysisAr: `عضو هيئة التدريس ${teacher.nameAr || teacher.name} مطلوب منه تدريس ${requiredHours} محاضرة، بينما المتاح له فقط ${availableSlots} محاضرة بسبب حظر ${blockedCount} محاضرة في جدول تفريغه (العجز: ${shortage} محاضرة). التسكين مستحيل رياضياً.`,
        suggestedAction: `Unblock at least ${shortage} lecture slots in ${teacher.name}'s Time-Off schedule.`,
        suggestedActionAr: `إلغاء حظر ما لا يقل عن ${shortage} محاضرة في جدول تفريغ عضو هيئة التدريس ${teacher.nameAr || teacher.name}.`,
        actionPayload: {
          type: 'UNBLOCK_TIMEOFF',
          teacherId: teacher.id,
          slots: blockedSlots.slice(0, shortage),
        },
      });
    }
  }

  // 2. Hall & Lab Type Depletion Bottleneck
  const roomTypeCounts = new Map<string, number>();
  for (const r of rooms) {
    if (r.type && r.type !== 'STANDARD') {
      roomTypeCounts.set(r.type, (roomTypeCounts.get(r.type) || 0) + 1);
    }
  }

  const roomTypeDemand = new Map<string, number>();
  for (const l of lessons) {
    const sub = subjects.find((s) => s.id === l.subjectId);
    if (sub?.requiredRoomType && sub.requiredRoomType !== 'STANDARD') {
      const dur = l.duration || 1;
      roomTypeDemand.set(
        sub.requiredRoomType,
        (roomTypeDemand.get(sub.requiredRoomType) || 0) + dur
      );
    }
  }

  for (const [rType, demandedHours] of roomTypeDemand.entries()) {
    const physicalRooms = roomTypeCounts.get(rType) || 0;
    const totalAvailableLabHours = physicalRooms * totalCycleSlots;
    if (demandedHours > totalAvailableLabHours) {
      list.push({
        id: `ADV_ROOM_${rType}`,
        type: 'ROOM_BOTTLENECK',
        severity: 'CRITICAL',
        title: `Severe Hall / Lab Shortage: ${rType}`,
        titleAr: `عجز حاد في قاعات / معامل: ${rType}`,
        analysis: `Total weekly demand for ${rType} is ${demandedHours} hours, but the institution only has ${physicalRooms} hall(s)/lab(s) of this type (${totalAvailableLabHours} max capacity).`,
        analysisAr: `الطلب الأسبوعي على قاعات/معامل (${rType}) هو ${demandedHours} محاضرة، بينما المؤسسة تمتلك فقط ${physicalRooms} قاعة/معمل بطاقة قصوى ${totalAvailableLabHours} محاضرة.`,
        suggestedAction: `Allow general lecture hall fallback or add another ${rType} facility.`,
        suggestedActionAr: `السماح باستخدام المدرجات والقاعات العامة كبديل أو إضافة قاعة/معمل ${rType} إضافي.`,
        actionPayload: {
          type: 'FALLBACK_ROOM',
          roomId: rType,
        },
      });
    }
  }

  // 3. Group / Section Load Overload
  const classTotalHours = new Map<string, number>();
  for (const l of lessons) {
    const dur = l.duration || 1;
    classTotalHours.set(l.classId, (classTotalHours.get(l.classId) || 0) + dur);
  }

  for (const cls of classes) {
    const totalH = classTotalHours.get(cls.id) || 0;
    if (totalH > totalCycleSlots) {
      list.push({
        id: `ADV_CLASS_${cls.id}`,
        type: 'UNRESOLVABLE_CLASH',
        severity: 'CRITICAL',
        title: `Over-allocated Curriculum for Section: ${cls.name}`,
        titleAr: `حمولة محاضرات زائدة للدفعة/الشعبة: ${cls.nameAr || cls.name}`,
        analysis: `Group/Section ${cls.name} has ${totalH} assigned weekly hours, which exceeds the entire cycle capacity of ${totalCycleSlots} lecture slots.`,
        analysisAr: `الدفعة/الشعبة ${cls.nameAr || cls.name} تم إسناد ${totalH} محاضرة لها أسبوعياً، وهو ما يتجاوز الطاقة القصوى لكامل الأسبوع (${totalCycleSlots} محاضرة).`,
        suggestedAction: `Reduce weekly lectures for this group/section by ${totalH - totalCycleSlots} lectures.`,
        suggestedActionAr: `تقليص المحاضرات الأسبوعية لهذه الدفعة/الشعبة بمقدار ${totalH - totalCycleSlots} محاضرة.`,
      });
    }
  }

  return list;
}

/**
 * Independent constraint validator for schedules (R4, WF-SOL-05)
 * Verifies 0 hard teacher, class, room, or time-off clashes.
 */
export function validateScheduleConstraints(params: {
  placements: Placement[];
  lessons: Lesson[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  cycleDays: number;
  periodsPerDay: number;
  timeOffMatrix?: Record<string, AvailabilityState>;
}): { isValid: boolean; conflicts: Conflict[] } {
  const {
    placements,
    lessons,
    teachers,
    classes,
    rooms,
    cycleDays: _cycleDays,
    periodsPerDay,
    timeOffMatrix = {},
  } = params;

  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const conflicts: Conflict[] = [];

  // Group placements by occupied period slots
  const slotOccupancy = new Map<number, Placement[]>();

  for (const p of placements) {
    const l = lessonMap.get(p.lessonId);
    const duration = l?.duration || 1;
    for (let offset = 0; offset < duration; offset++) {
      const period = p.periodIndex + offset;
      if (period >= periodsPerDay) continue;
      const slotIndex = p.dayIndex * periodsPerDay + period;
      const list = slotOccupancy.get(slotIndex) || [];
      list.push(p);
      slotOccupancy.set(slotIndex, list);

      // Check time-off unavailability
      if (l) {
        // Teacher time-off
        const tKey = `${l.teacherId}-${p.dayIndex}-${period}`;
        if (timeOffMatrix[tKey] === 0) {
          conflicts.push({
            type: 'UNAVAILABLE_SLOT',
            lessonId: l.id,
            message: `Teacher ${teacherMap.get(l.teacherId)?.name || l.teacherId} is unavailable at Day ${p.dayIndex + 1}, Period ${period + 1}`,
            messageAr: `المعلم غير متاح في اليوم ${p.dayIndex + 1}، الحصة ${period + 1}`,
          });
        }
        // Class time-off
        const cKey = `${l.classId}-${p.dayIndex}-${period}`;
        if (timeOffMatrix[cKey] === 0) {
          conflicts.push({
            type: 'UNAVAILABLE_SLOT',
            lessonId: l.id,
            message: `Class ${classMap.get(l.classId)?.name || l.classId} is unavailable at Day ${p.dayIndex + 1}, Period ${period + 1}`,
            messageAr: `الفصل غير متاح في اليوم ${p.dayIndex + 1}، الحصة ${period + 1}`,
          });
        }
      }
    }
  }

  // Check pairwise clashes within each slot
  for (const [slotIndex, slotPlacements] of slotOccupancy.entries()) {
    if (slotPlacements.length < 2) continue;
    const day = Math.floor(slotIndex / periodsPerDay);
    const period = slotIndex % periodsPerDay;

    for (let i = 0; i < slotPlacements.length; i++) {
      const p1 = slotPlacements[i];
      const l1 = lessonMap.get(p1.lessonId);
      if (!l1) continue;

      for (let j = i + 1; j < slotPlacements.length; j++) {
        const p2 = slotPlacements[j];
        const l2 = lessonMap.get(p2.lessonId);
        if (!l2) continue;

        // 1. Teacher Clash
        const t1Teachers = [l1.teacherId, ...(l1.teacherIds || []), ...(l1.coTeacherIds || [])];
        const t2Teachers = [l2.teacherId, ...(l2.teacherIds || []), ...(l2.coTeacherIds || [])];
        const sharedTeacher = t1Teachers.find((t) => t && t2Teachers.includes(t));
        if (sharedTeacher) {
          const tName = teacherMap.get(sharedTeacher)?.name || sharedTeacher;
          conflicts.push({
            type: 'TEACHER_CLASH',
            lessonId: l1.id,
            message: `Teacher clash: ${tName} assigned to both lessons at Day ${day + 1}, Period ${period + 1}`,
            messageAr: `تعارض معلم: ${tName} مخصص لحصتين في نفس الوقت`,
          });
        }

        // 2. Class Clash (unless split group exempt)
        const c1Classes = [l1.classId, ...(l1.classIds || []), ...(l1.jointClassIds || [])];
        const c2Classes = [l2.classId, ...(l2.classIds || []), ...(l2.jointClassIds || [])];
        const sharedClass = c1Classes.find((c) => c && c2Classes.includes(c));
        if (sharedClass && !isSplitExempt(l1, l2)) {
          const cName = classMap.get(sharedClass)?.name || sharedClass;
          conflicts.push({
            type: 'CLASS_CLASH',
            lessonId: l1.id,
            message: `Class clash: ${cName} assigned to both lessons at Day ${day + 1}, Period ${period + 1}`,
            messageAr: `تعارض فصل: ${cName} مخصص لحصتين في نفس الوقت`,
          });
        }

        // 3. Room Clash
        if (p1.roomId && p2.roomId && p1.roomId === p2.roomId) {
          const rName = roomMap.get(p1.roomId)?.name || p1.roomId;
          conflicts.push({
            type: 'ROOM_CLASH',
            lessonId: l1.id,
            message: `Room clash: ${rName} double-booked at Day ${day + 1}, Period ${period + 1}`,
            messageAr: `تعارض قاعة: ${rName} محجوزة لحصتين في نفس الوقت`,
          });
        }
      }
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Generate default bell schedule intervals given a period count.
 * For standard school schedules (<= 12 periods), defaults to 45 minutes with a 5-minute passing period starting at 08:00.
 * For university schedules (> 12 periods or when 30-min selected), generates 30-minute intervals
 * matching authentic aSc Timetables print format (e.g. 08:00 - 08:29, 08:30 - 08:59, ..., 16:30 - 16:59).
 */
export function generateDefaultBells(
  count: number,
  intervalMinutes?: number,
  breakMinutes?: number,
  startHour: number = 8,
  startMinute: number = 0
): string[] {
  const isUniversityInterval = intervalMinutes !== undefined ? intervalMinutes === 30 : count > 12;
  const interval = intervalMinutes ?? (isUniversityInterval ? 30 : 45);
  const breakTime = breakMinutes ?? (isUniversityInterval ? 0 : 5);

  const bells: string[] = [];
  let currentHour = startHour;
  let currentMinute = startMinute;

  for (let i = 0; i < count; i++) {
    const startH = String(currentHour).padStart(2, '0');
    const startM = String(currentMinute).padStart(2, '0');

    currentMinute += interval;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute %= 60;
    }

    let endHVal = currentHour;
    let endMVal = currentMinute;

    if (breakTime === 0) {
      // Authentic aSc 30-minute interval display: 08:00 - 08:29, 08:30 - 08:59, etc.
      if (endMVal === 0) {
        endMVal = 59;
        endHVal -= 1;
      } else {
        endMVal -= 1;
      }
    }

    const endH = String(endHVal).padStart(2, '0');
    const endM = String(endMVal).padStart(2, '0');
    bells.push(`${startH}:${startM} - ${endH}:${endM}`);

    currentMinute += breakTime;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute %= 60;
    }
  }
  return bells;
}

/**
 * Collects a comma-separated sorted string of unique classrooms used by a class or teacher.
 * Matches desktop aSc Timetables top-right classroom list print format.
 */
export function collectEntityClassrooms(
  entityId: string,
  entityType: 'class' | 'teacher' | 'room',
  lessons: Lesson[],
  rooms: Room[],
  placements: Placement[]
): string {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const usedRoomIds = new Set<string>();

  for (const p of placements) {
    const l = lessonMap.get(p.lessonId);
    if (!l) continue;

    let matches = false;
    if (entityType === 'class') {
      matches =
        l.classId === entityId ||
        Boolean(l.classIds?.includes(entityId)) ||
        Boolean(l.jointClassIds?.includes(entityId));
    } else if (entityType === 'teacher') {
      matches = l.teacherId === entityId || Boolean(l.teacherIds?.includes(entityId));
    } else {
      matches = p.roomId === entityId;
    }

    if (matches) {
      if (p.roomId) usedRoomIds.add(p.roomId);
      else if (l.roomId) usedRoomIds.add(l.roomId);
    }
  }

  // Also include rooms from unplaced lessons for this entity
  for (const l of lessons) {
    let matches = false;
    if (entityType === 'class') {
      matches =
        l.classId === entityId ||
        Boolean(l.classIds?.includes(entityId)) ||
        Boolean(l.jointClassIds?.includes(entityId));
    } else if (entityType === 'teacher') {
      matches = l.teacherId === entityId || Boolean(l.teacherIds?.includes(entityId));
    }
    if (matches && l.roomId) {
      usedRoomIds.add(l.roomId);
    }
  }

  const roomNames = Array.from(usedRoomIds)
    .map((rid) => {
      const r = roomMap.get(rid);
      if (!r) return rid;
      if (r.capacity) return `${r.name} (${r.capacity})`;
      return r.name;
    })
    .sort();

  return roomNames.join(', ');
}


