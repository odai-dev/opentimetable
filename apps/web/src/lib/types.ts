export type Role = 'ADMIN' | 'DEPT_HEAD' | 'ACADEMIC_ADVISOR' | 'STAFF' | 'TEACHER' | 'STUDENT';

export type ViewMode = 'class' | 'teacher' | 'room' | 'wall';

export type Language = 'en' | 'ar';

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
