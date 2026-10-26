import { Teacher, ClassGroup, Room, Subject, Lesson, Placement } from './types';

export const sampleTeachers: Teacher[] = [
  { id: 'T1', name: 'Dr. Tariq Al-Mansoor', nameAr: 'د. طارق المنصور', speciality: 'Mathematics', color: '#3b82f6', unavailableSlots: [] },
  { id: 'T2', name: 'Prof. Layla Haddad', nameAr: 'أ.د. ليلى حداد', speciality: 'Physics', color: '#10b981', unavailableSlots: [0] },
  { id: 'T3', name: 'Dr. Omar Al-Qurashi', nameAr: 'د. عمر القرشي', speciality: 'Computer Science', color: '#8b5cf6', unavailableSlots: [] },
  { id: 'T4', name: 'Prof. Sarah Jenkins', nameAr: 'أ. سارة جنكينز', speciality: 'English Literature', color: '#f59e0b', unavailableSlots: [] },
  { id: 'T5', name: 'Dr. Khalid Al-Shammari', nameAr: 'د. خالد الشمري', speciality: 'Chemistry', color: '#ec4899', unavailableSlots: [] },
];

export const sampleClasses: ClassGroup[] = [
  { id: 'C1', name: 'Grade 10 - Section A', nameAr: 'الصف العاشر (أ)', grade: 10 },
  { id: 'C2', name: 'Grade 10 - Section B', nameAr: 'الصف العاشر (ب)', grade: 10 },
  { id: 'C3', name: 'Grade 11 - Science', nameAr: 'الصف الحادي عشر (علمي)', grade: 11 },
  { id: 'C4', name: 'Grade 12 - Advanced', nameAr: 'الصف الثاني عشر (متقدم)', grade: 12 },
];

export const sampleRooms: Room[] = [
  { id: 'R101', name: 'Room 101 (Standard)', nameAr: 'قاعة 101 (عامة)', capacity: 35, type: 'STANDARD' },
  { id: 'R102', name: 'Room 102 (Standard)', nameAr: 'قاعة 102 (عامة)', capacity: 35, type: 'STANDARD' },
  { id: 'R_LAB1', name: 'Science Physics Lab', nameAr: 'مختبر الفيزياء', capacity: 30, type: 'LAB' },
  { id: 'R_COMP', name: 'Computer Science Lab', nameAr: 'مختبر الحاسوب', capacity: 30, type: 'LAB' },
];

export const sampleSubjects: Subject[] = [
  { id: 'SUB_MATH', name: 'Mathematics', nameAr: 'الرياضيات', code: 'MATH101', color: '#3b82f6' },
  { id: 'SUB_PHYS', name: 'Physics', nameAr: 'الفيزياء', code: 'PHYS101', color: '#10b981', requiredRoomType: 'LAB' },
  { id: 'SUB_CS', name: 'Computer Science', nameAr: 'علوم الحاسب', code: 'CS101', color: '#8b5cf6', requiredRoomType: 'LAB' },
  { id: 'SUB_ENG', name: 'English Literature', nameAr: 'اللغة الإنجليزية', code: 'ENG101', color: '#f59e0b' },
  { id: 'SUB_CHEM', name: 'Chemistry', nameAr: 'الكيمياء', code: 'CHEM101', color: '#ec4899', requiredRoomType: 'LAB' },
];

export const sampleLessons: Lesson[] = [
  { id: 'L1', subjectId: 'SUB_MATH', teacherId: 'T1', classId: 'C1', roomId: 'R101', duration: 1 },
  { id: 'L2', subjectId: 'SUB_PHYS', teacherId: 'T2', classId: 'C1', roomId: 'R_LAB1', duration: 1 },
  { id: 'L3', subjectId: 'SUB_CS', teacherId: 'T3', classId: 'C1', roomId: 'R_COMP', duration: 1 },
  { id: 'L4', subjectId: 'SUB_ENG', teacherId: 'T4', classId: 'C1', roomId: 'R101', duration: 1 },
  { id: 'L5', subjectId: 'SUB_CHEM', teacherId: 'T5', classId: 'C1', roomId: 'R_LAB1', duration: 1 },

  { id: 'L6', subjectId: 'SUB_MATH', teacherId: 'T1', classId: 'C2', roomId: 'R102', duration: 1 },
  { id: 'L7', subjectId: 'SUB_PHYS', teacherId: 'T2', classId: 'C2', roomId: 'R_LAB1', duration: 1 },
  { id: 'L8', subjectId: 'SUB_CS', teacherId: 'T3', classId: 'C2', roomId: 'R_COMP', duration: 1 },
  { id: 'L9', subjectId: 'SUB_ENG', teacherId: 'T4', classId: 'C2', roomId: 'R102', duration: 1 },
  { id: 'L10', subjectId: 'SUB_CHEM', teacherId: 'T5', classId: 'C2', roomId: 'R_LAB1', duration: 1 },

  { id: 'L11', subjectId: 'SUB_MATH', teacherId: 'T1', classId: 'C3', roomId: 'R101', duration: 1 },
  { id: 'L12', subjectId: 'SUB_PHYS', teacherId: 'T2', classId: 'C3', roomId: 'R_LAB1', duration: 1 },
  { id: 'L13', subjectId: 'SUB_CS', teacherId: 'T3', classId: 'C3', roomId: 'R_COMP', duration: 1 },
  { id: 'L14', subjectId: 'SUB_ENG', teacherId: 'T4', classId: 'C3', roomId: 'R101', duration: 1 },

  { id: 'L15', subjectId: 'SUB_MATH', teacherId: 'T1', classId: 'C4', roomId: 'R102', duration: 1 },
  { id: 'L16', subjectId: 'SUB_PHYS', teacherId: 'T2', classId: 'C4', roomId: 'R_LAB1', duration: 1 },
  { id: 'L17', subjectId: 'SUB_CS', teacherId: 'T3', classId: 'C4', roomId: 'R_COMP', duration: 1 },
  { id: 'L18', subjectId: 'SUB_ENG', teacherId: 'T4', classId: 'C4', roomId: 'R102', duration: 1 },
];

export const initialPlacements: Placement[] = [
  { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R101' },
  { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R_LAB1' },
  { lessonId: 'L3', dayIndex: 0, periodIndex: 2, roomId: 'R_COMP' },
  { lessonId: 'L4', dayIndex: 0, periodIndex: 3, roomId: 'R101' },
  { lessonId: 'L5', dayIndex: 0, periodIndex: 4, roomId: 'R_LAB1' },

  { lessonId: 'L6', dayIndex: 1, periodIndex: 0, roomId: 'R102' },
  { lessonId: 'L7', dayIndex: 1, periodIndex: 1, roomId: 'R_LAB1' },
  { lessonId: 'L8', dayIndex: 1, periodIndex: 2, roomId: 'R_COMP' },
  { lessonId: 'L9', dayIndex: 1, periodIndex: 3, roomId: 'R102' },
  { lessonId: 'L10', dayIndex: 1, periodIndex: 4, roomId: 'R_LAB1' },

  { lessonId: 'L11', dayIndex: 2, periodIndex: 0, roomId: 'R101' },
  { lessonId: 'L12', dayIndex: 2, periodIndex: 1, roomId: 'R_LAB1' },
  { lessonId: 'L13', dayIndex: 2, periodIndex: 2, roomId: 'R_COMP' },
  { lessonId: 'L14', dayIndex: 2, periodIndex: 3, roomId: 'R101' },

  { lessonId: 'L15', dayIndex: 3, periodIndex: 0, roomId: 'R102' },
  { lessonId: 'L16', dayIndex: 3, periodIndex: 1, roomId: 'R_LAB1' },
  { lessonId: 'L17', dayIndex: 3, periodIndex: 2, roomId: 'R_COMP' },
  { lessonId: 'L18', dayIndex: 3, periodIndex: 3, roomId: 'R102' },
];
