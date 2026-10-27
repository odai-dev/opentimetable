export type Role = 'ADMIN' | 'DEPT_HEAD' | 'ACADEMIC_ADVISOR' | 'STAFF' | 'TEACHER' | 'STUDENT';

export type ViewMode = 'class' | 'teacher' | 'room' | 'wall';

export type Language = 'en' | 'ar';

export type RibbonTab = 'file' | 'main' | 'timetable' | 'specification' | 'view';

export type GenerationComplexity = 'normal' | 'large' | 'huge';

export type AvailabilityState = 0 | 1 | 2; // 1 = Available (Check), 0 = Blocked (X), 2 = Disfavored (?)

export type BasicDataTab = 'school' | 'subjects' | 'classes' | 'rooms' | 'teachers' | 'lessons';

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
}

export interface ClassGroup {
  id: string;
  name: string;
  nameAr?: string;
  grade: number;
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
}

export interface Lesson {
  id: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  roomId?: string;
  duration: number;
}

export interface Placement {
  lessonId: string;
  dayIndex: number;
  periodIndex: number;
  roomId: string;
}

export interface Conflict {
  type: 'TEACHER_CLASH' | 'ROOM_CLASH' | 'CLASS_CLASH' | 'CAPACITY_CLASH';
  message: string;
  messageAr: string;
  lessonId: string;
}
