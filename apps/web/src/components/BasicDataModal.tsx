'use client';

import React, { useState } from 'react';
import {
  School,
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
} from 'lucide-react';
import { BasicDataTab, Subject, ClassGroup, Room, Teacher, Lesson } from '../lib/types';
import { translations } from '../lib/i18n';

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
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  lessonMap?: Map<string, Lesson>;
}

type EntityType = 'subject' | 'class' | 'room' | 'teacher' | 'lesson';

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
}) => {
  const [activeTab, setActiveTab] = useState<BasicDataTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      setFormClass({
        id: `C_${randomSuffix}`,
        name: '',
        nameAr: '',
        grade: 1,
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
    else if (entityType === 'class') setFormClass({ ...entity });
    else if (entityType === 'room') setFormRoom({ ...entity });
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
        setFormError(isRtl ? 'يرجى إدخال اسم الفصل' : 'Class Name is required');
        return;
      }
      const item: ClassGroup = {
        id: formClass.id || `C_${Date.now()}`,
        name: formClass.name.trim(),
        nameAr: formClass.nameAr?.trim() || undefined,
        grade: Number(formClass.grade) || 1,
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
      };
      if (dialogMode === 'add') onAddLesson?.(item);
      else onEditLesson?.(item);
    }

    setDialogMode(null);
    setEditingEntityType(null);
  };

  // Filtered entity lists based on search
  const filteredSubjects = subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nameAr && s.nameAr.includes(searchQuery))
  );

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameAr && c.nameAr.includes(searchQuery)) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-sky-400" />
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
        <div className="bg-slate-100 px-3 pt-2 flex items-center gap-1 border-b border-slate-300 overflow-x-auto text-xs">
          <button
            onClick={() => {
              setActiveTab('school');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'school'
                ? 'bg-white text-sky-700 border-t-2 border-t-sky-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.school}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('subjects');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'lessons'
                ? 'bg-white text-rose-700 border-t-2 border-t-rose-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.lessons} ({lessons.length})</span>
          </button>
        </div>

        {/* Tab Controls Bar (Add button + Search bar for non-school tabs) */}
        {activeTab !== 'school' && (
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
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
                    ? 'إضافة مادة جديدة'
                    : activeTab === 'classes'
                    ? 'إضافة فصل جديد'
                    : activeTab === 'rooms'
                    ? 'إضافة قاعة جديدة'
                    : activeTab === 'teachers'
                    ? 'إضافة معلم جديد'
                    : 'إضافة حصة جديدة'
                  : `Add ${
                      activeTab === 'subjects'
                        ? 'Subject'
                        : activeTab === 'classes'
                        ? 'Class'
                        : activeTab === 'rooms'
                        ? 'Room'
                        : activeTab === 'teachers'
                        ? 'Teacher'
                        : 'Lesson'
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
        <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* 1. School Tab */}
          {activeTab === 'school' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'اسم المؤسسة التعليمية' : 'Institution Name'}
                  </label>
                  <input
                    type="text"
                    defaultValue={isRtl ? 'ثانوية الريادة النموذجية' : 'Al-Riyada Model High School'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'العام الدراسي' : 'Academic Year'}
                  </label>
                  <input
                    type="text"
                    defaultValue="2025 - 2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'أيام الأسبوع' : 'Days/Week'}</span>
                  <span className="font-bold text-sm text-slate-800">5 {isRtl ? 'أيام' : 'Days'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'الحصص باليوم' : 'Periods/Day'}</span>
                  <span className="font-bold text-sm text-slate-800">7 {isRtl ? 'حصص' : 'Periods'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'إجمالي الحصص' : 'Weekly Capacity'}</span>
                  <span className="font-bold text-sm text-slate-800">35 {isRtl ? 'حصة' : 'Slots'}</span>
                </div>
              </div>

              <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 text-sky-800 text-[11px] leading-relaxed">
                {isRtl
                  ? '💡 تتيح نافذة البيانات الأساسية إدارة كافة الكيانات التعليمية (المواد، الشعب، القاعات، المعلمون، الحصص) مع إمكانية الإضافة والتعديل والحذف المباشر.'
                  : '💡 Basic Data dialog allows full live CRUD modifications for all scheduling entities. Changes are instantly synchronized across matrix grids, card deck, solver, and exports.'}
              </div>
            </div>
          )}

          {/* 2. Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">{isRtl ? 'اللون' : 'Color'}</th>
                    <th className="p-2 border-r border-slate-200 w-24">{isRtl ? 'الرمز' : 'Code'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم المادة' : 'Subject Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'القاعة المطلوبة' : 'Required Room'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching subjects'}
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

          {/* 3. Classes Tab */}
          {activeTab === 'classes' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-20 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم الفصل / الشعبة' : 'Class Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المستوى' : 'Grade'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching classes'}
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">{c.id}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                          {isRtl ? c.nameAr || c.name : c.name}
                          {c.nameAr && !isRtl && (
                            <span className="text-slate-400 text-[10px] ml-2">({c.nameAr})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600 font-medium">Grade {c.grade}</td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Rooms Tab */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-24 text-center">Room ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم القاعة' : 'Room Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'النوع' : 'Type'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'السعة' : 'Capacity'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching rooms'}
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

          {/* 5. Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم المعلم' : 'Teacher Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'التخصص' : 'Speciality'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'الأنصبة' : 'Workload'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching teachers'}
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
                          {lessons.filter((l) => l.teacherId === tc.id).length} {isRtl ? 'حصص' : 'hrs'}
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

          {/* 6. Lessons Tab */}
          {activeTab === 'lessons' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المادة' : 'Subject'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المعلم' : 'Teacher'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'الفصل' : 'Class'}</th>
                    <th className="p-2 border-r border-slate-200 text-center">{isRtl ? 'القاعة' : 'Room'}</th>
                    <th className="p-2 text-center w-24">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching lessons'}
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
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end">
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
                          ? 'مادة'
                          : editingEntityType === 'class'
                          ? 'فصل'
                          : editingEntityType === 'room'
                          ? 'قاعة'
                          : editingEntityType === 'teacher'
                          ? 'معلم'
                          : 'حصة'
                      } جديدة`
                    : `Add New ${editingEntityType.toUpperCase()}`
                  : isRtl
                  ? `تعديل ${
                      editingEntityType === 'subject'
                        ? 'المادة'
                        : editingEntityType === 'class'
                        ? 'الفصل'
                        : editingEntityType === 'room'
                        ? 'القاعة'
                        : editingEntityType === 'teacher'
                        ? 'المعلم'
                        : 'الحصة'
                    }`
                  : `Edit ${editingEntityType.toUpperCase()}`}
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

              {/* Subject Form */}
              {editingEntityType === 'subject' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'رمز المادة' : 'Code'} *</label>
                    <input
                      type="text"
                      required
                      value={formSubject.code || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, code: e.target.value })}
                      placeholder="e.g. MATH"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (إنجليزي)' : 'Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formSubject.name || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, name: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                    <input
                      type="text"
                      value={formSubject.nameAr || ''}
                      onChange={(e) => setFormSubject({ ...formSubject, nameAr: e.target.value })}
                      placeholder="مثال: الرياضيات"
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
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'القاعة المطلوبة' : 'Room Type'}</label>
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

              {/* Class Form */}
              {editingEntityType === 'class' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Class ID</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formClass.id || ''}
                      onChange={(e) => setFormClass({ ...formClass, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم الفصل / الشعبة' : 'Class Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formClass.name || ''}
                      onChange={(e) => setFormClass({ ...formClass, name: e.target.value })}
                      placeholder="e.g. Class 10-A"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formClass.nameAr || ''}
                      onChange={(e) => setFormClass({ ...formClass, nameAr: e.target.value })}
                      placeholder="مثال: فصل 10-أ"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المستوى الدراسي' : 'Grade'} *</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      required
                      value={formClass.grade || 1}
                      onChange={(e) => setFormClass({ ...formClass, grade: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </>
              )}

              {/* Room Form */}
              {editingEntityType === 'room' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Room ID</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formRoom.id || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم القاعة' : 'Room Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formRoom.name || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, name: e.target.value })}
                      placeholder="e.g. Science Lab 1"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formRoom.nameAr || ''}
                      onChange={(e) => setFormRoom({ ...formRoom, nameAr: e.target.value })}
                      placeholder="مثال: مختبر العلوم 1"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'نوع القاعة' : 'Type'}</label>
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
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'السعة القصوى' : 'Capacity'} *</label>
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

              {/* Teacher Form */}
              {editingEntityType === 'teacher' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Teacher ID</label>
                    <input
                      type="text"
                      disabled={dialogMode === 'edit'}
                      value={formTeacher.id || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, id: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-600 disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'اسم المعلم' : 'Teacher Name'} *</label>
                    <input
                      type="text"
                      required
                      value={formTeacher.name || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, name: e.target.value })}
                      placeholder="e.g. Prof. Ahmed"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                    <input
                      type="text"
                      value={formTeacher.nameAr || ''}
                      onChange={(e) => setFormTeacher({ ...formTeacher, nameAr: e.target.value })}
                      placeholder="مثال: أ. أحمد سالم"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'التخصص' : 'Speciality'} *</label>
                      <input
                        type="text"
                        required
                        value={formTeacher.speciality || ''}
                        onChange={(e) => setFormTeacher({ ...formTeacher, speciality: e.target.value })}
                        placeholder="e.g. Mathematics"
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

              {/* Lesson Form */}
              {editingEntityType === 'lesson' && (
                <>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Lesson ID</label>
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
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المادة' : 'Subject'} *</label>
                      <select
                        required
                        value={formLesson.subjectId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, subjectId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر المادة --' : '-- Select Subject --'}</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {isRtl ? s.nameAr || s.name : s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المعلم' : 'Teacher'} *</label>
                      <select
                        required
                        value={formLesson.teacherId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, teacherId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر المعلم --' : '-- Select Teacher --'}</option>
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
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الفصل' : 'Class'} *</label>
                      <select
                        required
                        value={formLesson.classId || ''}
                        onChange={(e) => setFormLesson({ ...formLesson, classId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">{isRtl ? '-- اختر الفصل --' : '-- Select Class --'}</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {isRtl ? c.nameAr || c.name : c.name} (Grade {c.grade})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'القاعة' : 'Room'}</label>
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
                    <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المدة (بالحصص)' : 'Duration (Periods)'}</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={formLesson.duration || 1}
                      onChange={(e) => setFormLesson({ ...formLesson, duration: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
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
