'use client';

import React, { useState, useEffect } from 'react';
import {
  School,
  Building2,
  BookOpen,
  Users,
  DoorOpen,
  UserCheck,
  Layers,
  X,
  Check,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  AlertCircle,
  GraduationCap,
  Network,
  CheckSquare,
  Square,
  GitFork,
  Sparkles,
  Settings2,
} from 'lucide-react';
import {
  BasicDataTab,
  Subject,
  ClassGroup,
  Room,
  Teacher,
  Lesson,
  Student,
  CourseGroup,
  Faculty,
  AcademicMajor,
  SubGroupConfig,
} from '../lib/types';
import { translations } from '../lib/i18n';

export interface SchoolDataUpdate {
  schoolName: string;
  academicYear: string;
  cycleDays: number;
  periodsPerDay: number;
  bellSchedule?: string[];
}

import { generateDefaultBells, generateUniversityGroups, GenerateUniversityGroupsParams } from '../lib/domain';
export { generateDefaultBells };

interface BasicDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  initialTab?: BasicDataTab;
  subjects: Subject[];
  classes: ClassGroup[];
  rooms: Room[];
  teachers: Teacher[];
  lessons: Lesson[];
  faculties?: Faculty[];
  majors?: AcademicMajor[];
  schoolName?: string;
  academicYear?: string;
  cycleDays?: number;
  periodsPerDay?: number;
  bellSchedule?: string[];
  onUpdateSchool?: (data: SchoolDataUpdate) => void;
  // CRUD Callbacks
  onAddSubject?: (subject: Subject) => void;
  onEditSubject?: (subject: Subject) => void;
  onDeleteSubject?: (id: string) => void;
  onAddClass?: (classGroup: ClassGroup) => void;
  onEditClass?: (classGroup: ClassGroup) => void;
  onDeleteClass?: (id: string) => void;
  onAddRoom?: (room: Room) => void;
  onEditRoom?: (room: Room) => void;
  onDeleteRoom?: (id: string) => void;
  onAddTeacher?: (teacher: Teacher) => void;
  onEditTeacher?: (teacher: Teacher) => void;
  onDeleteTeacher?: (id: string) => void;
  onAddLesson?: (lesson: Lesson) => void;
  onEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson?: (id: string) => void;
  // University Structure Callbacks
  onAddFaculty?: (faculty: Faculty) => void;
  onEditFaculty?: (faculty: Faculty) => void;
  onDeleteFaculty?: (id: string) => void;
  onAddMajor?: (major: AcademicMajor) => void;
  onEditMajor?: (major: AcademicMajor) => void;
  onDeleteMajor?: (id: string) => void;
  onGenerateUniversityGroups?: (params: GenerateUniversityGroupsParams) => void;
  students?: Student[];
  seminars?: CourseGroup[];
  onAddStudent?: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  onAddSeminar?: (seminar: CourseGroup) => void;
  onDeleteSeminar?: (id: string) => void;
  onBatchUpdateTeachersMaxHours?: (ids: string[], hours: number) => void;
  onBatchDeleteTeachers?: (ids: string[]) => void;
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  lessonMap?: Map<string, Lesson>;
}

type EntityType = 'subject' | 'class' | 'room' | 'teacher' | 'lesson' | 'student' | 'seminar';

export const BasicDataModal: React.FC<BasicDataModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialTab = 'school',
  subjects,
  classes,
  rooms,
  teachers,
  lessons,
  students = [],
  seminars = [],
  onAddStudent,
  onDeleteStudent,
  onAddSeminar,
  onDeleteSeminar,
  onBatchUpdateTeachersMaxHours,
  onBatchDeleteTeachers,
  teacherMap,
  classMap,
  roomMap,
  subjectMap,
  lessonMap,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  faculties = [],
  majors = [],
  onAddFaculty,
  onEditFaculty,
  onDeleteFaculty,
  onAddMajor,
  onEditMajor,
  onDeleteMajor,
  onGenerateUniversityGroups,
  schoolName: propSchoolName = 'Saudi Arabia 1',
  academicYear: propAcademicYear = '2025 - 2026',
  cycleDays: propCycleDays = 5,
  periodsPerDay: propPeriodsPerDay = 12,
  bellSchedule: propBellSchedule,
  onUpdateSchool,
}) => {
  const [activeTab, setActiveTab] = useState<BasicDataTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // University Structure Sub-Tab & Filters State
  const [structureSubTab, setStructureSubTab] = useState<'classes' | 'colleges' | 'configurator'>('classes');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('ALL');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState<string>('ALL');

  // Quick Cohort & Subgroup Generator State
  const [genFacultyId, setGenFacultyId] = useState<string>(faculties[0]?.id || 'fac-engineering');
  const [genMajorId, setGenMajorId] = useState<string>(majors[0]?.id || 'maj-cybersecurity');
  const [genLevel, setGenLevel] = useState<number>(2);
  const [genGroupCount, setGenGroupCount] = useState<number>(2);
  const [genSubgroupsPerGroup, setGenSubgroupsPerGroup] = useState<number>(2);
  const [genGroupCapacity, setGenGroupCapacity] = useState<number>(50);
  const [genSubgroupCapacity, setGenSubgroupCapacity] = useState<number>(25);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string | null>(null);

  // Faculty and Major dialog states
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editingMajor, setEditingMajor] = useState<AcademicMajor | null>(null);
  const [isFacultyDialogOpen, setIsFacultyDialogOpen] = useState<boolean>(false);
  const [isMajorDialogOpen, setIsMajorDialogOpen] = useState<boolean>(false);

  // School Tab State
  const [localSchoolName, setLocalSchoolName] = useState(propSchoolName);
  const [localAcademicYear, setLocalAcademicYear] = useState(propAcademicYear);
  const [localCycleDays, setLocalCycleDays] = useState(propCycleDays);
  const [localPeriodsPerDay, setLocalPeriodsPerDay] = useState(propPeriodsPerDay);
  const [localBellSchedule, setLocalBellSchedule] = useState<string[]>(
    propBellSchedule && propBellSchedule.length > 0
      ? propBellSchedule
      : generateDefaultBells(propPeriodsPerDay)
  );
  const [schoolSavedFeedback, setSchoolSavedFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSchoolName(propSchoolName);
      setLocalAcademicYear(propAcademicYear);
      setLocalCycleDays(propCycleDays);
      setLocalPeriodsPerDay(propPeriodsPerDay);
      if (propBellSchedule && propBellSchedule.length > 0) {
        setLocalBellSchedule(propBellSchedule);
      } else {
        setLocalBellSchedule(generateDefaultBells(propPeriodsPerDay));
      }
      setSchoolSavedFeedback(false);
    }
  }, [isOpen, propSchoolName, propAcademicYear, propCycleDays, propPeriodsPerDay, propBellSchedule]);

  // Keep generator defaults in sync when faculties/majors load
  useEffect(() => {
    if (faculties.length > 0 && !faculties.some((f) => f.id === genFacultyId)) {
      setGenFacultyId(faculties[0].id);
    }
    if (majors.length > 0 && !majors.some((m) => m.id === genMajorId)) {
      setGenMajorId(majors[0].id);
    }
  }, [faculties, majors, genFacultyId, genMajorId]);

  const handlePeriodsChange = (newPeriods: number) => {
    setLocalPeriodsPerDay(newPeriods);
    setLocalBellSchedule((prev) => {
      if (newPeriods === prev.length) return prev;
      if (newPeriods < prev.length) return prev.slice(0, newPeriods);
      const extended = [...prev];
      const defaults = generateDefaultBells(newPeriods);
      for (let i = prev.length; i < newPeriods; i++) {
        extended.push(defaults[i]);
      }
      return extended;
    });
  };

  const handleBellChange = (index: number, value: string) => {
    setLocalBellSchedule((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleApplySchoolSettings = () => {
    if (onUpdateSchool) {
      onUpdateSchool({
        schoolName: localSchoolName.trim() || 'University',
        academicYear: localAcademicYear.trim() || '2025 - 2026',
        cycleDays: localCycleDays,
        periodsPerDay: localPeriodsPerDay,
        bellSchedule: localBellSchedule,
      });
    }
    setSchoolSavedFeedback(true);
    setTimeout(() => setSchoolSavedFeedback(false), 2500);
  };

  // Editing state
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [editingEntityType, setEditingEntityType] = useState<EntityType | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Form Fields State
  const [formSubject, setFormSubject] = useState<Partial<Subject>>({
    code: '',
    name: '',
    nameAr: '',
    color: '#0284c7',
    requiredRoomType: 'STANDARD',
  });
  const [formClass, setFormClass] = useState<Partial<ClassGroup>>({
    id: '',
    name: '',
    nameAr: '',
    grade: 1,
    facultyId: '',
    majorId: '',
    groupNumber: 1,
    studentCount: 50,
    subgroups: [],
  });
  const [formRoom, setFormRoom] = useState<Partial<Room>>({
    id: '',
    name: '',
    nameAr: '',
    type: 'STANDARD',
    capacity: 30,
  });
  const [formTeacher, setFormTeacher] = useState<Partial<Teacher>>({
    id: '',
    name: '',
    nameAr: '',
    speciality: '',
    color: '#4f46e5',
    unavailableSlots: [],
  });
  const [formLesson, setFormLesson] = useState<Partial<Lesson>>({
    id: '',
    subjectId: '',
    teacherId: '',
    classId: '',
    roomId: '',
    duration: 1,
    entireClass: true,
    isSplitGroup: false,
    groupName: '',
    jointClassIds: [],
    coTeacherIds: [],
  });

  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [initialTab]);

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Open Add Dialog
  const handleOpenAdd = (entityType: EntityType) => {
    setEditingEntityType(entityType);
    setDialogMode('add');
    setEditingEntityId(null);
    setFormError(null);

    const randomSuffix = Math.floor(100 + Math.random() * 900).toString();

    if (entityType === 'subject') {
      setFormSubject({
        id: `SUB_${randomSuffix}`,
        code: `S${randomSuffix}`,
        name: '',
        nameAr: '',
        color: '#0284c7',
        requiredRoomType: 'STANDARD',
      });
    } else if (entityType === 'class') {
      const defFac = faculties[0]?.id || 'fac-engineering';
      const defMaj = majors.find((m) => m.facultyId === defFac)?.id || majors[0]?.id || '';
      setFormClass({
        id: `C_${randomSuffix}`,
        name: '',
        nameAr: '',
        grade: 1,
        facultyId: defFac,
        majorId: defMaj,
        groupNumber: 1,
        studentCount: 50,
        subgroups: [
          { id: `sub-${randomSuffix}-a`, name: 'Lab A', nameAr: 'معمل أ', code: 'A', studentCount: 25 },
          { id: `sub-${randomSuffix}-b`, name: 'Lab B', nameAr: 'معمل ب', code: 'B', studentCount: 25 },
        ],
      });
    } else if (entityType === 'room') {
      setFormRoom({
        id: `R_${randomSuffix}`,
        name: '',
        nameAr: '',
        type: 'STANDARD',
        capacity: 30,
      });
    } else if (entityType === 'teacher') {
      setFormTeacher({
        id: `T_${randomSuffix}`,
        name: '',
        nameAr: '',
        speciality: '',
        color: '#4f46e5',
        unavailableSlots: [],
      });
    } else if (entityType === 'lesson') {
      setFormLesson({
        id: `L_${randomSuffix}`,
        subjectId: subjects[0]?.id || '',
        teacherId: teachers[0]?.id || '',
        classId: classes[0]?.id || '',
        roomId: rooms[0]?.id || '',
        duration: 1,
        entireClass: true,
        isSplitGroup: false,
        groupName: '',
        jointClassIds: [],
        coTeacherIds: [],
      });
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (entityType: EntityType, entity: any) => {
    setEditingEntityType(entityType);
    setDialogMode('edit');
    setEditingEntityId(entity.id);
    setFormError(null);

    if (entityType === 'subject') setFormSubject({ ...entity });
    else if (entityType === 'class') {
      setFormClass({
        ...entity,
        facultyId: entity.facultyId || faculties[0]?.id || '',
        majorId: entity.majorId || majors[0]?.id || '',
        groupNumber: entity.groupNumber || 1,
        studentCount: entity.studentCount || 50,
        subgroups: entity.subgroups && entity.subgroups.length > 0
          ? entity.subgroups
          : [
              { id: `${entity.id}-sub-a`, name: `${entity.name} - Lab A`, nameAr: `${entity.nameAr || entity.name} - معمل أ`, code: 'A', studentCount: Math.round((entity.studentCount || 50) / 2) },
              { id: `${entity.id}-sub-b`, name: `${entity.name} - Lab B`, nameAr: `${entity.nameAr || entity.name} - معمل ب`, code: 'B', studentCount: Math.round((entity.studentCount || 50) / 2) },
            ],
      });
    } else if (entityType === 'room') setFormRoom({ ...entity });
    else if (entityType === 'teacher') setFormTeacher({ ...entity });
    else if (entityType === 'lesson') setFormLesson({ ...entity });
  };

  // Save Add/Edit Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingEntityType === 'subject') {
      if (!formSubject.code?.trim() || !formSubject.name?.trim()) {
        setFormError(isRtl ? 'يرجى إدخال رمز المادة واسمها' : 'Subject Code and Name are required');
        return;
      }
      const item: Subject = {
        id: formSubject.id || `SUB_${Date.now()}`,
        code: formSubject.code.trim(),
        name: formSubject.name.trim(),
        nameAr: formSubject.nameAr?.trim() || undefined,
        color: formSubject.color || '#0284c7',
        requiredRoomType: formSubject.requiredRoomType || 'STANDARD',
      };
      if (dialogMode === 'add') onAddSubject?.(item);
      else onEditSubject?.(item);
    } else if (editingEntityType === 'class') {
      if (!formClass.name?.trim()) {
        setFormError(isRtl ? 'يرجى إدخال اسم الدفعة / الشعبة' : 'Group Name is required');
        return;
      }
      const item: ClassGroup = {
        id: formClass.id || `C_${Date.now()}`,
        name: formClass.name.trim(),
        nameAr: formClass.nameAr?.trim() || undefined,
        grade: Number(formClass.grade) || 1,
        facultyId: formClass.facultyId || undefined,
        majorId: formClass.majorId || undefined,
        groupNumber: formClass.groupNumber ? Number(formClass.groupNumber) : undefined,
        studentCount: formClass.studentCount ? Number(formClass.studentCount) : undefined,
        subgroups: formClass.subgroups || undefined,
      };
      if (dialogMode === 'add') onAddClass?.(item);
      else onEditClass?.(item);
    } else if (editingEntityType === 'room') {
      if (!formRoom.name?.trim()) {
        setFormError(isRtl ? 'يرجى إدخال اسم القاعة' : 'Room Name is required');
        return;
      }
      const item: Room = {
        id: formRoom.id || `R_${Date.now()}`,
        name: formRoom.name.trim(),
        nameAr: formRoom.nameAr?.trim() || undefined,
        type: formRoom.type || 'STANDARD',
        capacity: Number(formRoom.capacity) > 0 ? Number(formRoom.capacity) : 30,
      };
      if (dialogMode === 'add') onAddRoom?.(item);
      else onEditRoom?.(item);
    } else if (editingEntityType === 'teacher') {
      if (!formTeacher.name?.trim() || !formTeacher.speciality?.trim()) {
        setFormError(isRtl ? 'يرجى إدخال اسم المعلم والتخصص' : 'Teacher Name and Speciality are required');
        return;
      }
      const item: Teacher = {
        id: formTeacher.id || `T_${Date.now()}`,
        name: formTeacher.name.trim(),
        nameAr: formTeacher.nameAr?.trim() || undefined,
        speciality: formTeacher.speciality.trim(),
        color: formTeacher.color || '#4f46e5',
        unavailableSlots: formTeacher.unavailableSlots || [],
      };
      if (dialogMode === 'add') onAddTeacher?.(item);
      else onEditTeacher?.(item);
    } else if (editingEntityType === 'lesson') {
      if (!formLesson.subjectId || !formLesson.teacherId || !formLesson.classId) {
        setFormError(isRtl ? 'يرجى اختيار المادة والمعلم والفصل' : 'Subject, Teacher, and Class are required');
        return;
      }
      const item: Lesson = {
        id: formLesson.id || `L_${Date.now()}`,
        subjectId: formLesson.subjectId,
        teacherId: formLesson.teacherId,
        classId: formLesson.classId,
        roomId: formLesson.roomId || undefined,
        duration: Number(formLesson.duration) || 1,
        entireClass: formLesson.entireClass !== false,
        isSplitGroup: Boolean(formLesson.isSplitGroup),
        groupName: formLesson.groupName?.trim() || undefined,
        groupId: formLesson.groupId || undefined,
        jointClassIds: formLesson.jointClassIds || [],
        coTeacherIds: formLesson.coTeacherIds || [],
      };
      if (dialogMode === 'add') onAddLesson?.(item);
      else onEditLesson?.(item);
    }

    setDialogMode(null);
    setEditingEntityType(null);
  };

  // University Quick Cohort Generator execution
  const handleRunGenerator = () => {
    const selMajor = majors.find((m) => m.id === genMajorId);
    const selFac = faculties.find((f) => f.id === genFacultyId) || faculties[0];
    const majorName = selMajor ? selMajor.name : 'Program';
    const majorNameAr = selMajor?.nameAr;
    const majorCode = selMajor ? selMajor.code : 'MAJ';

    const generated = generateUniversityGroups({
      facultyId: genFacultyId,
      majorId: genMajorId,
      majorName,
      majorNameAr,
      majorCode,
      level: genLevel,
      groupCount: genGroupCount,
      subgroupsPerGroup: genSubgroupsPerGroup,
      groupCapacity: genGroupCapacity,
      subgroupCapacity: genSubgroupCapacity,
    });

    if (onGenerateUniversityGroups) {
      onGenerateUniversityGroups({
        facultyId: genFacultyId,
        majorId: genMajorId,
        majorName,
        majorNameAr,
        majorCode,
        level: genLevel,
        groupCount: genGroupCount,
        subgroupsPerGroup: genSubgroupsPerGroup,
        groupCapacity: genGroupCapacity,
        subgroupCapacity: genSubgroupCapacity,
      });
    } else {
      for (const gc of generated) {
        onAddClass?.(gc);
      }
    }

    setGenSuccessMsg(
      isRtl
        ? `✅ تم بنجاح توليد ${generated.length} شعب مع ${generated.length * genSubgroupsPerGroup} مجموعات معامل لـ (${majorNameAr || majorName} - مستوى ${genLevel})!`
        : `✅ Successfully generated ${generated.length} lecture groups with ${generated.length * genSubgroupsPerGroup} lab subgroups for (${majorName} - Level ${genLevel})!`
    );
    setTimeout(() => setGenSuccessMsg(null), 4000);
    setStructureSubTab('classes');
  };

  // Filtered entity lists based on search
  const filteredSubjects = subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nameAr && s.nameAr.includes(searchQuery))
  );

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameAr && c.nameAr.includes(searchQuery)) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaculty = selectedFacultyFilter === 'ALL' || c.facultyId === selectedFacultyFilter;
    const matchesMajor = selectedMajorFilter === 'ALL' || c.majorId === selectedMajorFilter;
    return matchesSearch && matchesFaculty && matchesMajor;
  });

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.nameAr && r.nameAr.includes(searchQuery)) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(
    (tc) =>
      tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.nameAr && tc.nameAr.includes(searchQuery)) ||
      tc.speciality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLessons = lessons.filter(
    (l) =>
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.teacherId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.classId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-sm">{t.basicDataModal.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="bg-slate-100 px-3 pt-2 flex items-center gap-1 border-b border-slate-300 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => {
              setActiveTab('school');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'school'
                ? 'bg-white text-sky-700 border-t-2 border-t-sky-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.school}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('subjects');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'subjects'
                ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.subjects} ({subjects.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('classes');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'classes'
                ? 'bg-white text-indigo-700 border-t-2 border-t-indigo-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.classes} ({classes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rooms');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'rooms'
                ? 'bg-white text-amber-700 border-t-2 border-t-amber-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.rooms} ({rooms.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('teachers');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'teachers'
                ? 'bg-white text-violet-700 border-t-2 border-t-violet-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.teachers} ({teachers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('lessons');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'lessons'
                ? 'bg-white text-rose-700 border-t-2 border-t-rose-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.lessons} ({lessons.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('students');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'students'
                ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الطلاب' : 'Students'} ({students.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('seminars');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'seminars'
                ? 'bg-white text-amber-700 border-t-2 border-t-amber-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{isRtl ? 'المقررات والسمينارات' : 'Seminars'} ({seminars.length})</span>
          </button>
        </div>

        {/* Tab Controls Bar (Add button + Search bar for non-school tabs) */}
        {activeTab !== 'school' && (
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                const entityType: EntityType =
                  activeTab === 'subjects'
                    ? 'subject'
                    : activeTab === 'classes'
                    ? 'class'
                    : activeTab === 'rooms'
                    ? 'room'
                    : activeTab === 'teachers'
                    ? 'teacher'
                    : 'lesson';
                handleOpenAdd(entityType);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {isRtl
                  ? activeTab === 'subjects'
                    ? 'إضافة مقرر جديد'
                    : activeTab === 'classes'
                    ? 'إضافة دفعة / شعبة جديدة'
                    : activeTab === 'rooms'
                    ? 'إضافة قاعة / معمل'
                    : activeTab === 'teachers'
                    ? 'إضافة عضو هيئة تدريس'
                    : 'إضافة محاضرة جديدة'
                  : `Add ${
                      activeTab === 'subjects'
                        ? 'Course'
                        : activeTab === 'classes'
                        ? 'Group / Section'
                        : activeTab === 'rooms'
                        ? 'Hall / Lab'
                        : activeTab === 'teachers'
                        ? 'Faculty Member'
                        : 'Lecture'
                    }`}
              </span>
            </button>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder={isRtl ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0 text-xs text-slate-800">
          {/* 1. University Specification Tab */}
          {activeTab === 'school' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'اسم الجامعة / الكلية' : 'University / Faculty Name'}
                  </label>
                  <input
                    type="text"
                    value={localSchoolName}
                    onChange={(e) => setLocalSchoolName(e.target.value)}
                    placeholder={isRtl ? 'اسم الجامعة أو الكلية' : 'University / Faculty Name'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'العام الأكاديمي / الفصل' : 'Academic Year / Semester'}
                  </label>
                  <input
                    type="text"
                    value={localAcademicYear}
                    onChange={(e) => setLocalAcademicYear(e.target.value)}
                    placeholder="2025 - 2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">{isRtl ? 'أيام الأسبوع' : 'Days/Week'}</label>
                  <select
                    value={localCycleDays}
                    onChange={(e) => setLocalCycleDays(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value={5}>5 {isRtl ? 'أيام' : 'Days'}</option>
                    <option value={6}>6 {isRtl ? 'أيام' : 'Days'}</option>
                    <option value={7}>7 {isRtl ? 'أيام (أسبوع كامل)' : 'Days'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">{isRtl ? 'المحاضرات باليوم' : 'Lectures/Day'}</label>
                  <select
                    value={localPeriodsPerDay}
                    onChange={(e) => handlePeriodsChange(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((p) => (
                      <option key={p} value={p}>
                        {p} {isRtl ? 'محاضرات' : 'Lectures'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1 font-semibold">{isRtl ? 'إجمالي المحاضرات الأسبوعية' : 'Weekly Capacity'}</span>
                  <div className="font-bold text-sm text-sky-700 bg-sky-100 border border-sky-300 rounded px-3 py-1.5 inline-block w-full text-center">
                    {localCycleDays * localPeriodsPerDay} {isRtl ? 'محاضرة' : 'Slots'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="font-bold text-slate-700">
                    {isRtl ? 'أوقات المحاضرات' : 'Lecture Schedule (Times)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLocalBellSchedule(generateDefaultBells(localPeriodsPerDay, 30, 0))}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-semibold"
                      title={isRtl ? 'فترات 30 دقيقة بدون استراحة (نظام الجامعات)' : '30-minute intervals (University system)'}
                    >
                      {isRtl ? '30 دقيقة (جامعي)' : '30-min (University)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalBellSchedule(generateDefaultBells(localPeriodsPerDay, 45, 5))}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded px-2 py-0.5 text-slate-700 font-semibold"
                      title={isRtl ? 'فترات 45 دقيقة مع استراحة 5 دقائق (نظام المدارس)' : '45-minute intervals (School system)'}
                    >
                      {isRtl ? '45 دقيقة (مدرسي)' : '45-min (School)'}
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <th className="p-2 w-24 text-center">{isRtl ? 'المحاضرة' : 'Lecture'}</th>
                        <th className="p-2">{isRtl ? 'التوقيت (البدء - الانتهاء)' : 'Time Range (Start - End)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: localPeriodsPerDay }).map((_, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={localBellSchedule[idx] || ''}
                              onChange={(e) => handleBellChange(idx, e.target.value)}
                              placeholder="08:00 - 08:45"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="text-sky-800 text-[11px]">
                  {isRtl
                    ? '💡 احرص على تطبيق إعدادات الجامعة والكلية لحفظ وتحديث أبعاد الجدول.'
                    : '💡 Click Apply University Settings to update active timetable dimensions and lecture slots.'}
                </div>
                <div className="flex items-center gap-3">
                  {schoolSavedFeedback && (
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                      <Check className="w-4 h-4" />
                      {isRtl ? 'تم تطبيق إعدادات الجامعة بنجاح!' : 'University settings applied successfully!'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleApplySchoolSettings}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm text-xs transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {isRtl ? 'تطبيق إعدادات الجامعة' : 'Apply University Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Subjects (Courses) Tab */}
          {activeTab === 'subjects' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">{isRtl ? 'اللون' : 'Color'}</th>
                    <th className="p-2 border-r border-slate-200 w-24">{isRtl ? 'الرمز' : 'Code'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم المقرر' : 'Course Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'القاعة / المعمل المطلوب' : 'Required Hall / Lab'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد مقررات مطابقة' : 'No matching courses'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="p-2 border-r border-slate-200 text-center">
                          <div
                            className="w-5 h-5 rounded-full mx-auto shadow-xs border border-slate-300"
                            style={{ backgroundColor: sub.color }}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold">{sub.code}</td>
                        <td className="p-2 border-r border-slate-200 font-medium">
                          {isRtl ? sub.nameAr || sub.name : sub.name}
                          {sub.nameAr && !isRtl && (
                            <span className="text-slate-400 text-[10px] ml-2">({sub.nameAr})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-500 font-mono">
                          {sub.requiredRoomType || 'STANDARD'}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('subject', sub)}
                              className="p-1 rounded hover:bg-sky-100 text-sky-700 transition"
                              title={isRtl ? 'تعديل' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSubject?.(sub.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. University Academic Structure & Groups */}
          {activeTab === 'classes' && (
            <div className="flex flex-col gap-3">
              {/* Feedback Alert */}
              {genSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold animate-in fade-in flex items-center justify-between">
                  <span>{genSuccessMsg}</span>
                  <button onClick={() => setGenSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* University Sub-Navigation & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStructureSubTab('classes')}
                    className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                      structureSubTab === 'classes'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'الشعب والمجموعات الأكاديمية' : 'Groups & Cohorts'} ({classes.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructureSubTab('colleges')}
                    className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                      structureSubTab === 'colleges'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'الكليات والأقسام' : 'Colleges & Majors'} ({faculties.length} / {majors.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructureSubTab('configurator')}
                    className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                      structureSubTab === 'configurator'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isRtl ? 'مولّد الشعب والمعامل الأكاديمي' : 'Cohort & Lab Configurator'}</span>
                  </button>
                </div>

                {structureSubTab === 'classes' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFacultyFilter}
                      onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">{isRtl ? 'كل الكليات' : 'All Colleges'}</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>
                          {isRtl ? f.nameAr || f.name : f.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedMajorFilter}
                      onChange={(e) => setSelectedMajorFilter(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none"
                    >
                      <option value="ALL">{isRtl ? 'كل التخصصات' : 'All Majors'}</option>
                      {majors
                        .filter((m) => selectedFacultyFilter === 'ALL' || m.facultyId === selectedFacultyFilter)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {isRtl ? m.nameAr || m.name : m.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sub-View 1: Classes & Cohorts Table */}
              {structureSubTab === 'classes' && (
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200 w-24 text-center">ID / Code</th>
                      <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم الشعبة / الدفعة' : 'Cohort / Section Name'}</th>
                      <th className="p-2 border-r border-slate-200">{isRtl ? 'الكلية والتخصص' : 'Faculty & Major'}</th>
                      <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'المستوى' : 'Level'}</th>
                      <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'السعة الكلية' : 'Capacity'}</th>
                      <th className="p-2 border-r border-slate-200">{isRtl ? 'مجموعات المعامل (Subgroups)' : 'Lab Subgroups'}</th>
                      <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          {isRtl ? 'لا توجد شعب أو دفعات مطابقة للفلترة الحالية' : 'No matching university cohorts found'}
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((c) => {
                        const fac = faculties.find((f) => f.id === c.facultyId);
                        const maj = majors.find((m) => m.id === c.majorId);
                        return (
                          <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                            <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600 text-[11px]">
                              {c.id}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                              <div>{isRtl ? c.nameAr || c.name : c.name}</div>
                              {c.nameAr && !isRtl && (
                                <div className="text-slate-400 text-[10px]">{c.nameAr}</div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-xs">
                              <div className="flex flex-wrap gap-1">
                                {fac && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                    {isRtl ? fac.nameAr || fac.name : fac.code}
                                  </span>
                                )}
                                {maj && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                                    {isRtl ? maj.nameAr || maj.name : maj.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                              {t.terms.levelFormat ? t.terms.levelFormat(c.grade) : (isRtl ? `المستوى ${c.grade}` : `L${c.grade}`)}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                              👥 {c.studentCount || 50}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {c.subgroups && c.subgroups.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {c.subgroups.map((sub) => (
                                    <span
                                      key={sub.id}
                                      className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 text-[10px]"
                                      title={isRtl ? sub.nameAr || sub.name : sub.name}
                                    >
                                      🔬 {sub.code} ({sub.studentCount || 25})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">{isRtl ? 'دفعة كاملة' : 'Full Cohort'}</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit('class', c)}
                                  className="p-1 rounded hover:bg-indigo-100 text-indigo-700 transition"
                                  title={isRtl ? 'تعديل' : 'Edit'}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteClass?.(c.id)}
                                  className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                                  title={isRtl ? 'حذف' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* Sub-View 2: Faculties & Majors Management */}
              {structureSubTab === 'colleges' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Faculties Column */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>{isRtl ? 'الكليات الجامعية' : 'Colleges & Faculties'} ({faculties.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = `fac_${Date.now()}`;
                          const f: Faculty = {
                            id: newId,
                            name: 'Faculty of Science',
                            nameAr: 'كلية العلوم',
                            code: 'FSC',
                            color: '#0284c7',
                          };
                          onAddFaculty?.(f);
                        }}
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isRtl ? 'إضافة كلية' : 'Add Faculty'}</span>
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[360px] flex flex-col gap-1.5">
                      {faculties.map((f) => (
                        <div
                          key={f.id}
                          className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{isRtl ? f.nameAr || f.name : f.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Code: {f.code}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: f.color || '#3b82f6' }}
                            />
                            <button
                              type="button"
                              onClick={() => onDeleteFaculty?.(f.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Majors Column */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>{isRtl ? 'الأقسام والتخصصات الأكاديمية' : 'Academic Majors & Programs'} ({majors.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = `maj_${Date.now()}`;
                          const targetFac = faculties[0]?.id || 'fac-engineering';
                          const m: AcademicMajor = {
                            id: newId,
                            facultyId: targetFac,
                            name: 'Software Engineering',
                            nameAr: 'هندسة البرمجيات',
                            code: 'SWE',
                            totalLevels: 4,
                            degreeType: 'BACHELOR',
                          };
                          onAddMajor?.(m);
                        }}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isRtl ? 'إضافة تخصص' : 'Add Major'}</span>
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[360px] flex flex-col gap-1.5">
                      {majors.map((m) => {
                        const parentFac = faculties.find((f) => f.id === m.facultyId);
                        return (
                          <div
                            key={m.id}
                            className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{isRtl ? m.nameAr || m.name : m.name}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                <span className="font-mono">Code: {m.code}</span>
                                {parentFac && <span>• {isRtl ? parentFac.nameAr || parentFac.name : parentFac.code}</span>}
                                <span>• {m.totalLevels} {isRtl ? 'سنوات' : 'Levels'}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDeleteMajor?.(m.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-View 3: Cohort & Lab Subgroups Quick Configurator */}
              {structureSubTab === 'configurator' && (
                <div className="border border-indigo-200 rounded-xl bg-linear-to-b from-indigo-50/50 to-white p-4 flex flex-col gap-4 shadow-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{isRtl ? 'مولّد دفعات التخصص والمجموعات الفرعية للمعامل' : 'University Cohort & Lab Subgroups Quick-Builder'}</span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    {isRtl
                      ? 'حدد الكلية والتخصص والمستوى وعدد الشعب والمعامل لكل شعبة، ليقوم النظام بتوليد بنية الدفعات كاملة بالأسماء الإنجليزية والعربية وسعات الحضور.'
                      : 'Configure the college, major, academic level, and number of lecture groups and lab subgroups to immediately generate university cohorts.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'الكلية' : 'College / Faculty'}</label>
                      <select
                        value={genFacultyId}
                        onChange={(e) => {
                          setGenFacultyId(e.target.value);
                          const firstMaj = majors.find((m) => m.facultyId === e.target.value);
                          if (firstMaj) setGenMajorId(firstMaj.id);
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {isRtl ? f.nameAr || f.name : f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'القسم / التخصص' : 'Academic Major'}</label>
                      <select
                        value={genMajorId}
                        onChange={(e) => setGenMajorId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        {majors
                          .filter((m) => m.facultyId === genFacultyId)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {isRtl ? m.nameAr || m.name : m.name} ({m.code})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'المستوى الدراسي' : 'Academic Level'}</label>
                      <select
                        value={genLevel}
                        onChange={(e) => setGenLevel(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {isRtl ? `المستوى ${lvl}` : `Level ${lvl}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'عدد مجموعات المحاضرات' : 'Lecture Groups'}</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={genGroupCount}
                        onChange={(e) => setGenGroupCount(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'سعة شعبة المحاضرة' : 'Lecture Group Headcount'}</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={genGroupCapacity}
                        onChange={(e) => setGenGroupCapacity(parseInt(e.target.value, 10) || 50)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'معامل فرعية لكل شعبة' : 'Lab Subgroups per Group'}</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={genSubgroupsPerGroup}
                        onChange={(e) => setGenSubgroupsPerGroup(parseInt(e.target.value, 10) || 2)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">{isRtl ? 'سعة المعمل الفرعي' : 'Lab Subgroup Headcount'}</label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={genSubgroupCapacity}
                        onChange={(e) => setGenSubgroupCapacity(parseInt(e.target.value, 10) || 25)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Live Generation Preview Box */}
                  <div className="bg-white border border-indigo-200 rounded-lg p-3 flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {isRtl ? 'معاينة المجموعات التي سيتم إنشاؤها:' : 'Preview Generated University Cohorts:'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.from({ length: genGroupCount }).map((_, idx) => {
                        const gNum = idx + 1;
                        const selMaj = majors.find((m) => m.id === genMajorId);
                        const code = selMaj ? selMaj.code : 'MAJ';
                        return (
                          <div key={gNum} className="border border-slate-200 rounded p-2 bg-slate-50 text-xs">
                            <div className="font-bold text-indigo-900 flex items-center justify-between">
                              <span>🎓 {code}-L{genLevel}-G{gNum}</span>
                              <span className="text-slate-500 font-mono text-[11px]">👥 {genGroupCapacity} {isRtl ? 'طالب' : 'students'}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap gap-1">
                              {Array.from({ length: genSubgroupsPerGroup }).map((__, sIdx) => {
                                const letters = ['A', 'B', 'C', 'D'];
                                const subCode = letters[sIdx] || `${sIdx + 1}`;
                                return (
                                  <span key={subCode} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-emerald-800 font-bold">
                                    🔬 Lab {gNum}{subCode} ({genSubgroupCapacity})
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRunGenerator}
                      className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isRtl ? '🚀 توليد وإضافة المجموعات الأكاديمية للجدول' : '🚀 Generate & Add University Cohorts'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Halls & Labs Tab */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-24 text-center">{isRtl ? 'رمز القاعة' : 'Hall / Lab ID'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم القاعة / المعمل' : 'Hall / Lab Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'النوع والتخصص' : 'Type & Facility'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'السعة القصوى' : 'Capacity'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد قاعات أو معامل مطابقة' : 'No matching halls or labs'}
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{r.id}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          {isRtl ? r.nameAr || r.name : r.name}
                          {r.nameAr && !isRtl && (
                            <span className="text-slate-400 text-[10px] ml-2">({r.nameAr})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[11px]">{r.type}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-sky-800">{r.capacity}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('room', r)}
                              className="p-1 rounded hover:bg-amber-100 text-amber-700 transition"
                              title={isRtl ? 'تعديل' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRoom?.(r.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Faculty & Instructors Tab */}
          {activeTab === 'teachers' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-24 text-center">{isRtl ? 'الرقم الأكاديمي' : 'Faculty ID'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'عضو هيئة التدريس / المحاضر' : 'Faculty Member / Instructor'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'التخصص الأكاديمي' : 'Speciality / Dept'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'الأنصبة الأكاديمية' : 'Workload'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا يوجد أعضاء هيئة تدريس مطابقون' : 'No matching faculty members'}
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((tc) => (
                      <tr key={tc.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{tc.id}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                          {isRtl ? tc.nameAr || tc.name : tc.name}
                          {tc.nameAr && !isRtl && (
                            <span className="text-slate-400 text-[10px] ml-2">({tc.nameAr})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{tc.speciality}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-700">
                          {lessons.filter((l) => l.teacherId === tc.id).length} {isRtl ? 'محاضرة' : 'lectures'}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('teacher', tc)}
                              className="p-1 rounded hover:bg-violet-100 text-violet-700 transition"
                              title={isRtl ? 'تعديل' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTeacher?.(tc.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Curriculum Lectures & Labs Tab */}
          {activeTab === 'lessons' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-24 text-center">{isRtl ? 'رمز المحاضرة' : 'Lecture ID'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المقرر' : 'Course'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المحاضر' : 'Faculty / Instructor'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'الدفعة / الشعبة' : 'Group / Section'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'السكشن / المجموعة الفرعية' : 'Sub-group / Lab Section'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'القاعة / المعمل' : 'Hall / Lab'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد محاضرات مطابقة' : 'No matching lectures'}
                      </td>
                    </tr>
                  ) : (
                    filteredLessons.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{l.id}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                          {subjectMap?.get(l.subjectId)?.name || subjects.find((s) => s.id === l.subjectId)?.name || l.subjectId}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {teacherMap?.get(l.teacherId)?.name || teachers.find((tc) => tc.id === l.teacherId)?.name || l.teacherId}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          {classMap?.get(l.classId)?.name || classes.find((c) => c.id === l.classId)?.name || l.classId}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-xs">
                          {l.isSplitGroup || (l.groupName && l.groupName.toLowerCase() !== 'entire class' && l.groupName !== 'كامل الفصل') ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                              {l.groupName || (isRtl ? 'سكشن عملي' : 'Lab Section')}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {isRtl ? 'كامل الشعبة / الدفعة' : 'Entire Section / Batch'}
                            </span>
                          )}
                          {Boolean(l.jointClassIds && l.jointClassIds.length > 0) && (
                            <span className="ms-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              +{l.jointClassIds!.length} {isRtl ? 'مشترك' : 'joint'}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-600">{l.roomId || 'Auto'}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit('lesson', l)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              title={isRtl ? 'تعديل' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLesson?.(l.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'رقم الطالب' : 'Student #'}
                    </th>
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'اسم الطالب' : 'Student Name'}
                    </th>
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'المستوى / الشعبة' : 'Level / Section'}
                    </th>
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'المقررات المسجلة' : 'Enrolled Courses'}
                    </th>
                    <th className="p-2.5 text-center w-20">
                      {isRtl ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        {isRtl
                          ? 'لا يوجد طلاب مسجلون حالياً. يمكنك استيراد قائمة الطلاب من Excel.'
                          : 'No students enrolled. You can import rosters via Excel/CSV.'}
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                          {st.studentNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                          {st.name}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-700">
                          {classMap?.get(st.classId)?.name || st.gradeLevel}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-600">
                          {st.enrolledCourseIds?.length || 0} {isRtl ? 'مقررات' : 'courses'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteStudent?.(st.id)}
                            className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                            title={isRtl ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SEMINARS TAB */}
          {activeTab === 'seminars' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'رمز المقرر' : 'Code'}
                    </th>
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'اسم السمينار / المقرر' : 'Seminar / Course'}
                    </th>
                    <th className="p-2.5 text-start border-r border-slate-200">
                      {isRtl ? 'المحاضر / عضو التدريس' : 'Faculty / Instructor'}
                    </th>
                    <th className="p-2.5 text-center border-r border-slate-200">
                      {isRtl ? 'الطلاب المسجلون' : 'Enrollment'}
                    </th>
                    <th className="p-2.5 text-center w-20">
                      {isRtl ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seminars.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        {isRtl
                          ? 'لا توجد مجموعات سمينار أو مقررات اختيارية مسجلة.'
                          : 'No seminar course sections currently created.'}
                      </td>
                    </tr>
                  ) : (
                    seminars.map((sem) => (
                      <tr key={sem.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-amber-700">
                          {sem.code}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                          {sem.name}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-700">
                          {teacherMap?.get(sem.teacherId)?.name || (isRtl ? 'المحاضر' : 'Instructor')}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-700">
                          {sem.enrolledStudentIds?.length || 0} / {sem.capacity}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteSeminar?.(sem.id)}
                            className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                            title={isRtl ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-sm"
          >
            {t.basicDataModal.close}
          </button>
        </div>
      </div>

      {/* Add / Edit Sub-Dialog Form Overlay */}
      {dialogMode && editingEntityType && (
        <div className="fixed inset-0 z-60 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-xs">
                {dialogMode === 'add'
                  ? isRtl
                    ? `إضافة ${
                        editingEntityType === 'subject'
                          ? 'مقرر دراسي جديد'
                          : editingEntityType === 'class'
                          ? 'دفعة / شعبة جديدة'
                          : editingEntityType === 'room'
                          ? 'قاعة / معمل جديد'
                          : editingEntityType === 'teacher'
                          ? 'عضو هيئة تدريس جديد'
                          : 'محاضرة جديدة'
                      }`
                    : `Add New ${
                        editingEntityType === 'subject'
                          ? 'Course'
                          : editingEntityType === 'class'
                          ? 'Group / Section'
                          : editingEntityType === 'room'
                          ? 'Hall / Lab'
                          : editingEntityType === 'teacher'
                          ? 'Faculty Member'
                          : 'Lecture'
                      }`
                  : isRtl
                  ? `تعديل ${
                      editingEntityType === 'subject'
                        ? 'المقرر الدراسي'
                        : editingEntityType === 'class'
                        ? 'الدفعة / الشعبة'
                        : editingEntityType === 'room'
                        ? 'القاعة / المعمل'
                        : editingEntityType === 'teacher'
                        ? 'عضو هيئة التدريس'
                        : 'المحاضرة'
                    }`
                  : `Edit ${
                      editingEntityType === 'subject'
                        ? 'Course'
                        : editingEntityType === 'class'
                        ? 'Group / Section'
                        : editingEntityType === 'room'
                        ? 'Hall / Lab'
                        : editingEntityType === 'teacher'
                        ? 'Faculty Member'
                        : 'Lecture'
                    }`}
              </h3>
              <button
                type="button"
                onClick={() => setDialogMode(null)}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 flex flex-col gap-3 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-300 rounded p-2 text-rose-700 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Subject (Course) Form */}
              {editingEntityType === 'subject' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رمز المقرر' : 'Course Code'} *</label>
                    <input
                      type="text"
                      required
                      value={formSubject.code || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, code: e.target.value })}
                      placeholder="e.g. CS201"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم المقرر (إنجليزي)' : 'Course Name (EN)'} *</label>
                    <input
                      type="text"
                      required
                      value={formSubject.name || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, name: e.target.value })}
                      placeholder="e.g. Data Structures & Algorithms"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم المقرر (عربي)' : 'Course Name (AR)'}</label>
                    <input
                      type="text"
                      value={formSubject.nameAr || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, nameAr: e.target.value })}
                      placeholder="مثال: هياكل البيانات والخوارزميات"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اللون' : 'Color'}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formSubject.color || '#0284c7'}
                          onChange={(e) => setFormSubject({ ...formSubject, color: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                        />
                        <span className="font-mono text-[11px] text-slate-600">{formSubject.color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'القاعة / المعمل المطلوب' : 'Required Hall / Lab'}</label>
                      <select
                        value={formSubject.requiredRoomType || 'STANDARD'}
                        onChange={(e) => setFormSubject({ ...formSubject, requiredRoomType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="STANDARD">STANDARD</option>
                        <option value="LAB">LAB</option>
                        <option value="GYM">GYM</option>
                        <option value="AUDITORIUM">AUDITORIUM</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Class (Group / Section) Form */}
              {editingEntityType === 'class' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رمز الدفعة' : 'Group ID'}</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formClass.id || ''}
                      onChange={(e) => setFormClass({ ...formClass, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الكلية' : 'Faculty / College'}</label>
                      <select
                        value={formClass.facultyId || ''}
                        onChange={(e) => {
                          const fId = e.target.value;
                          const mId = majors.find((m) => m.facultyId === fId)?.id || '';
                          setFormClass({ ...formClass, facultyId: fId, majorId: mId });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- حدد الكلية --' : '-- Select Faculty --'}</option>
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {isRtl ? f.nameAr || f.name : f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'القسم الأكاديمي' : 'Major / Program'}</label>
                      <select
                        value={formClass.majorId || ''}
                        onChange={(e) => setFormClass({ ...formClass, majorId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- حدد التخصص --' : '-- Select Major --'}</option>
                        {majors
                          .filter((m) => !formClass.facultyId || m.facultyId === formClass.facultyId)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {isRtl ? m.nameAr || m.name : m.name} ({m.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم الشعبة / الدفعة (EN)' : 'Group / Cohort Name (EN)'} *</label>
                    <input
                      type="text"
                      required
                      value={formClass.name || ''}
                      onChange={(e) => setFormClass({ ...formClass, name: e.target.value })}
                      placeholder="e.g. CYS-L2-G1"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formClass.nameAr || ''}
                      onChange={(e) => setFormClass({ ...formClass, nameAr: e.target.value })}
                      placeholder="مثال: الأمن السيبراني - المستوى 2 - شعبة 1"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المستوى' : 'Level'} *</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        required
                        value={formClass.grade || 1}
                        onChange={(e) => setFormClass({ ...formClass, grade: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رقم الشعبة' : 'Group #'}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formClass.groupNumber || 1}
                        onChange={(e) => setFormClass({ ...formClass, groupNumber: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'السعة الكلية' : 'Headcount'}</label>
                      <input
                        type="number"
                        min={5}
                        max={500}
                        value={formClass.studentCount || 50}
                        onChange={(e) => setFormClass({ ...formClass, studentCount: parseInt(e.target.value) || 50 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Subgroups (Labs / Practicals) Configurator inside Edit */}
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        🔬 {isRtl ? 'مجموعات المعامل الفرعية (Subgroups)' : 'Lab Subgroups'} ({(formClass.subgroups || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = formClass.subgroups || [];
                          const letters = ['A', 'B', 'C', 'D', 'E'];
                          const nextCode = letters[current.length] || `${current.length + 1}`;
                          const newSub: SubGroupConfig = {
                            id: `sub_${Date.now()}`,
                            code: nextCode,
                            name: `Lab ${nextCode}`,
                            nameAr: `معمل ${nextCode}`,
                            studentCount: Math.round((formClass.studentCount || 50) / (current.length + 1)),
                          };
                          setFormClass({ ...formClass, subgroups: [...current, newSub] });
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isRtl ? 'إضافة معمل' : 'Add Lab'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                      {(formClass.subgroups || []).map((sub, sIdx) => (
                        <div key={sub.id || sIdx} className="flex items-center gap-2 bg-white p-1.5 rounded border border-slate-200 text-xs">
                          <input
                            type="text"
                            value={sub.code}
                            onChange={(e) => {
                              const updated = [...(formClass.subgroups || [])];
                              updated[sIdx] = { ...updated[sIdx], code: e.target.value };
                              setFormClass({ ...formClass, subgroups: updated });
                            }}
                            className="w-12 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-center text-xs"
                            placeholder="Code"
                          />
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => {
                              const updated = [...(formClass.subgroups || [])];
                              updated[sIdx] = { ...updated[sIdx], name: e.target.value };
                              setFormClass({ ...formClass, subgroups: updated });
                            }}
                            className="flex-1 px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                            placeholder="Name"
                          />
                          <input
                            type="number"
                            value={sub.studentCount || 25}
                            onChange={(e) => {
                              const updated = [...(formClass.subgroups || [])];
                              updated[sIdx] = { ...updated[sIdx], studentCount: parseInt(e.target.value, 10) || 0 };
                              setFormClass({ ...formClass, subgroups: updated });
                            }}
                            className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs font-mono"
                            title="Subgroup Capacity"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formClass.subgroups || []).filter((_, idx) => idx !== sIdx);
                              setFormClass({ ...formClass, subgroups: updated });
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title={isRtl ? 'حذف' : 'Remove'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Room (Hall / Lab) Form */}
              {editingEntityType === 'room' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رمز القاعة / المعمل' : 'Hall / Lab ID'}</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formRoom.id || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم القاعة / المعمل' : 'Hall / Lab Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formRoom.name || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, name: e.target.value })}
                      placeholder="e.g. Auditorium A101 / C-Lab D403"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formRoom.nameAr || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, nameAr: e.target.value })}
                      placeholder="مثال: المدرج المركزي A101 / معمل البرمجة D403"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'نوع القاعة / المعمل' : 'Facility Type'}</label>
                      <select
                        value={formRoom.type || 'STANDARD'}
                        onChange={(e) => setFormRoom({ ...formRoom, type: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="STANDARD">STANDARD</option>
                        <option value="LAB">LAB</option>
                        <option value="GYM">GYM</option>
                        <option value="AUDITORIUM">AUDITORIUM</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'السعة الاستيعابية للطلاب' : 'Max Student Capacity'} *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formRoom.capacity || 30}
                        onChange={(e) => setFormRoom({ ...formRoom, capacity: parseInt(e.target.value) || 30 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                      </input>
                    </div>
                  </div>
                </>
              )}

              {/* Teacher (Faculty) Form */}
              {editingEntityType === 'teacher' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الرقم الأكاديمي' : 'Faculty ID'}</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formTeacher.id || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم عضو هيئة التدريس / المحاضر' : 'Faculty / Instructor Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formTeacher.name || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, name: e.target.value })}
                      placeholder="e.g. Prof. Dr. Ahmed Khaled"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formTeacher.nameAr || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, nameAr: e.target.value })}
                      placeholder="مثال: أ.د. أحمد خالد / د. إبراهيم الحداد"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'التخصص / القسم الأكاديمي' : 'Speciality / Department'} *</label>
                      <input
                        type="text"
                        required
                        value={formTeacher.speciality || ''}
                        onChange={(e) => setFormTeacher({ ...formTeacher, speciality: e.target.value })}
                        placeholder="e.g. Computer Science"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اللون' : 'Color'}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={formTeacher.color || '#4f46e5'}
                          onChange={(e) => setFormTeacher({ ...formTeacher, color: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                        />
                        <span className="font-mono text-[11px] text-slate-600">{formTeacher.color}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Lesson (Curriculum Lecture) Form */}
              {editingEntityType === 'lesson' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رمز المحاضرة' : 'Lecture ID'}</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formLesson.id || ''}
                      onChange={(e) => setFormLesson({ ...formLesson, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المقرر' : 'Course'} *</label>
                      <select
                        required
                        value={formLesson.subjectId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, subjectId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر المقرر --' : '-- Select Course --'}</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {isRtl ? s.nameAr || s.name : s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المحاضر' : 'Faculty / Instructor'} *</label>
                      <select
                        required
                        value={formLesson.teacherId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, teacherId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر المحاضر --' : '-- Select Faculty --'}</option>
                        {teachers.map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {isRtl ? tc.nameAr || tc.name : tc.name} ({tc.speciality})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الدفعة / الشعبة' : 'Group / Section'} *</label>
                      <select
                        required
                        value={formLesson.classId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, classId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر الدفعة / الشعبة --' : '-- Select Group / Section --'}</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {isRtl ? c.nameAr || c.name : c.name} ({t.terms.levelFormat ? t.terms.levelFormat(c.grade) : (isRtl ? `المستوى ${c.grade}` : `Level ${c.grade}`)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'القاعة / المعمل' : 'Hall / Lab'}</label>
                      <select
                        value={formLesson.roomId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, roomId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? 'تلقائي (Auto)' : 'Auto / Flexible'}</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {isRtl ? r.nameAr || r.name : r.name} ({r.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المدة (بالمحاضرات)' : 'Duration (Lectures)'}</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={formLesson.duration || 1}
                      onChange={(e) => setFormLesson({ ...formLesson, duration: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Split Group / Division */}
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col gap-2">
                    <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formLesson.isSplitGroup)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormLesson({
                            ...formLesson,
                            isSplitGroup: checked,
                            entireClass: !checked,
                            groupName: checked ? formLesson.groupName || (isRtl ? 'مجموعة 1' : 'Group 1') : '',
                          });
                        }}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span>{isRtl ? 'تقسيم سكشن عملي / مجموعة فرعية (Lab Section)' : 'Sub-group / Lab Section'}</span>
                    </label>
                    {Boolean(formLesson.isSplitGroup) && (
                      <div>
                        <label className="font-semibold block mb-1 text-[11px] text-slate-600">
                          {isRtl ? 'اسم السكشن أو المجموعة (مثل: Sec-A، معمل 1)' : 'Sub-group name (e.g. Lab Sec A, Group 1)'}
                        </label>
                        <input
                          type="text"
                          placeholder={isRtl ? 'أدخل اسم السكشن أو المجموعة' : 'Enter sub-group name'}
                          value={formLesson.groupName || ''}
                          onChange={(e) => setFormLesson({ ...formLesson, groupName: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Joint Classes & Co-Teachers (Grid) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">
                        {isRtl ? 'شعب / دفعات مشتركة' : 'Joint Groups / Sections'}
                      </label>
                      <select
                        multiple
                        value={formLesson.jointClassIds || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                          setFormLesson({ ...formLesson, jointClassIds: selected });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 h-14 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        {classes
                          .filter((c) => c.id !== formLesson.classId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {isRtl ? c.nameAr || c.name : c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">
                        {isRtl ? 'محاضرون / معيدون مشاركون' : 'Co-Instructors / TAs'}
                      </label>
                      <select
                        multiple
                        value={formLesson.coTeacherIds || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                          setFormLesson({ ...formLesson, coTeacherIds: selected });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 h-14 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        {teachers
                          .filter((tc) => tc.id !== formLesson.teacherId)
                          .map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {isRtl ? tc.nameAr || tc.name : tc.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDialogMode(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'حفظ' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
