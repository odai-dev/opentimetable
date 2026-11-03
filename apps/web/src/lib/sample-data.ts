import { Teacher, ClassGroup, Room, Subject, Lesson, Placement } from './types';

export const sampleTeachers: Teacher[] = [
  { id: 'T1', name: 'Dr. Ahmed Zaid', nameAr: 'د. أحمد زيد', speciality: 'General Surgery & Dental Medicine', color: '#3b82f6', unavailableSlots: [] },
  { id: 'T2', name: 'Dr. Ibrahim Al-Hadad', nameAr: 'د. إبراهيم الحداد', speciality: 'Database Management & Security', color: '#10b981', unavailableSlots: [0] },
  { id: 'T3', name: 'Eng. Shaima Al-Harazi', nameAr: 'م. شيماء الحرازي', speciality: 'Networks Switching & Routing', color: '#8b5cf6', unavailableSlots: [] },
  { id: 'T4', name: 'T. Yasser Alkhateeb', nameAr: 'أ. ياسر الخطيب', speciality: '3D Modeling & Animation', color: '#f59e0b', unavailableSlots: [] },
  { id: 'T5', name: 'Dr. Anas Shamalah', nameAr: 'د. أنس شملة', speciality: 'Periodontology & Implantology', color: '#ec4899', unavailableSlots: [] },
];

export const sampleClasses: ClassGroup[] = [
  { id: 'C1', name: 'CyberSecurity-L2-G1', nameAr: 'الأمن السيبراني - المستوى 2 (شعبة 1)', grade: 2 },
  { id: 'C2', name: 'CyberSecurity-L2-G2', nameAr: 'الأمن السيبراني - المستوى 2 (شعبة 2)', grade: 2 },
  { id: 'C3', name: 'Dentistry-L3', nameAr: 'طب وجراحة الفم والأسنان - المستوى 3', grade: 3 },
  { id: 'C4', name: 'Graphics & Multimedia-L2-G1', nameAr: 'الجرافيكس والوسائط المتعددة - المستوى 2', grade: 2 },
];

export const sampleRooms: Room[] = [
  { id: 'R101', name: 'Lecture Hall B412 (70)', nameAr: 'مدرج المحاضرات B412 (70)', capacity: 70, type: 'STANDARD' },
  { id: 'R102', name: 'Lecture Hall B105 (60)', nameAr: 'قاعة المحاضرات B105 (60)', capacity: 60, type: 'STANDARD' },
  { id: 'R_LAB1', name: 'Cybersecurity Lab C-Lab-D403', nameAr: 'معمل الأمن السيبراني D403', capacity: 30, type: 'LAB' },
  { id: 'R_COMP', name: 'Multimedia Lab GMMLab-A202', nameAr: 'معمل الوسائط المتعددة A202', capacity: 30, type: 'LAB' },
];

export const sampleSubjects: Subject[] = [
  { id: 'SUB_MATH', name: 'General Surgery & Medicine', nameAr: 'الجراحة العامة والطب البشري', code: 'DENT301', color: '#3b82f6' },
  { id: 'SUB_PHYS', name: 'Database Management & Security', nameAr: 'إدارة وأمن قواعد البيانات', code: 'CYS202', color: '#10b981', requiredRoomType: 'LAB' },
  { id: 'SUB_CS', name: 'Networks Switching & Routing', nameAr: 'تحويل وتوجيه الشبكات', code: 'CYS203', color: '#8b5cf6', requiredRoomType: 'LAB' },
  { id: 'SUB_ENG', name: 'Periodontology & Implantology', nameAr: 'أمراض وجراحة اللثة وزراعة الأسنان', code: 'DENT304', color: '#f59e0b' },
  { id: 'SUB_CHEM', name: '3D Modeling & Rendering', nameAr: 'النمذجة والإظهار ثلاثي الأبعاد', code: 'GMM204', color: '#ec4899', requiredRoomType: 'LAB' },
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
