export type Role = 'ADMIN' | 'DEPT_HEAD' | 'ACADEMIC_ADVISOR' | 'STAFF' | 'TEACHER' | 'STUDENT';

export type ViewMode = 'class' | 'teacher' | 'room' | 'wall';

export type Language = 'en' | 'ar';

export type RibbonTab = 'file' | 'main' | 'timetable' | 'specification' | 'view';

export type GenerationComplexity = 'normal' | 'large' | 'huge';

export type AvailabilityState = 0 | 1 | 2; // 1 = Available (Check), 0 = Blocked (X), 2 = Disfavored (?)

export type BasicDataTab = 'school' | 'subjects' | 'classes' | 'rooms' | 'teachers' | 'lessons' | 'students' | 'seminars';

export interface DragItem {
  type: 'deck' | 'grid';
  lessonId: string;
  sourceDay?: number;
  sourcePeriod?: number;
}

export interface Teacher {
  id: string;
  name: string;
  nameAr?: string;
  speciality: string;
  color: string;
  unavailableSlots: number[];
  undesirableSlots?: number[];
  maxConsecutivePeriods?: number;
  maxDailyHours?: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  nameAr?: string;
  grade: number;
  unavailableSlots?: number[];
  homeRoomId?: string;
}

export interface Room {
  id: string;
  name: string;
  nameAr?: string;
  capacity: number;
  type: 'STANDARD' | 'LAB' | 'GYM' | 'AUDITORIUM';
}

export interface Subject {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  color: string;
  requiredRoomType?: string;
  maxDailyPeriods?: number;
}

export interface SolverPayloadConfig {
  days: number;
  periodsPerDay: number;
  maxConsecutivePeriods?: number;
  gapWeight?: number;
  distributionWeight?: number;
  preferenceWeight?: number;
  roomChangeWeight?: number;
  timeoutMs?: number;
  solveMode?: 'NEW' | 'IMPROVE';
}

export interface Lesson {
  id: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  roomId?: string;
  duration: number;
  groupName?: string;
  groupId?: string;
  entireClass?: boolean;
  isSplitGroup?: boolean;
  teacherIds?: string[];
  classIds?: string[];
  jointClassIds?: string[];
  coTeacherIds?: string[];
  isPinned?: boolean;
  pinnedSlot?: number;
  pinnedRoomId?: string;
  initialSlot?: number;
  initialRoomId?: string;
}

export interface Placement {
  lessonId: string;
  dayIndex: number;
  periodIndex: number;
  roomId: string;
  isLocked?: boolean;
}

export interface Conflict {
  type: 'TEACHER_CLASH' | 'ROOM_CLASH' | 'CLASS_CLASH' | 'CAPACITY_CLASH' | 'UNAVAILABLE_SLOT';
  message: string;
  messageAr: string;
  lessonId: string;
}

export type AdvancedRelationType =
  | 'DISTRIBUTION_ACROSS_DAYS'
  | 'MAX_CONSECUTIVE_PERIODS'
  | 'MAX_DAILY_HOURS'
  | 'TEACHER_GAP_LIMITS'
  | 'SHARED_CLASSROOM'
  | 'LUNCH_BREAK_PLACEMENT';

export interface AdvancedRelationRule {
  id: string;
  name: string;
  nameAr?: string;
  type: AdvancedRelationType;
  enabled: boolean;
  subjectId?: string;
  teacherId?: string;
  classId?: string;
  parameterValue?: number;
  description?: string;
  descriptionAr?: string;
}

// R5: Students & Elective Seminars
export interface Student {
  id: string;
  name: string;
  nameAr?: string;
  studentNumber: string;
  gradeLevel: string;
  classId: string;
  enrolledCourseIds: string[];
}

export interface CourseGroup {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  capacity: number;
  enrolledStudentIds: string[];
}

// R3: Card Layout & Customization
export interface CardLayoutConfig {
  line1: 'subject_name' | 'subject_code';
  line2: 'teacher_name' | 'room_name' | 'none';
  line3: 'room_name' | 'class_name' | 'none';
  colorBy: 'subject' | 'teacher' | 'class';
  fontFamily: 'Tajawal' | 'Cairo' | 'IBM Plex Sans Arabic' | 'sans-serif';
  density: 'compact' | 'normal' | 'spacious';
  showLockBadge: boolean;
}

// R2: Verification & Advisor
export interface VerificationItem {
  id: string;
  category: 'TEACHER' | 'CLASS' | 'ROOM' | 'SUBJECT' | 'RELATION';
  severity: 'HARD' | 'SOFT' | 'SUGGESTION';
  ruleName: string;
  ruleNameAr: string;
  description: string;
  descriptionAr: string;
  affectedLessonIds: string[];
  entityId?: string;
  entityName?: string;
  slotIndex?: number;
}

export interface AdvisorDiagnostic {
  id: string;
  type: 'PIGEONHOLE_TEACHER' | 'ROOM_BOTTLENECK' | 'TIMEOFF_STARVATION' | 'UNRESOLVABLE_CLASH';
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  titleAr: string;
  analysis: string;
  analysisAr: string;
  suggestedAction: string;
  suggestedActionAr: string;
  actionPayload?: {
    type: 'UNBLOCK_TIMEOFF' | 'RELAX_RULE' | 'FALLBACK_ROOM';
    teacherId?: string;
    roomId?: string;
    slots?: number[];
  };
}

// R3: Revision Comparison
export interface TimetableDiffItem {
  lessonId: string;
  status: 'UNCHANGED' | 'MOVED' | 'ADDED' | 'REMOVED';
  oldSlot?: { dayIndex: number; periodIndex: number; roomId: string };
  newSlot?: { dayIndex: number; periodIndex: number; roomId: string };
  subjectName: string;
  teacherName: string;
  className: string;
}


