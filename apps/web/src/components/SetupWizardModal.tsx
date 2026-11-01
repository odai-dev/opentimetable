'use client';

import React, { useState } from 'react';
import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  Wand2,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  School,
  BookOpen,
  DoorOpen,
  UserCheck,
  Users,
  Sparkles,
} from 'lucide-react';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  onComplete: (data: {
    schoolName: string;
    academicYear: string;
    cycleDays: number;
    periodsPerDay: number;
    teachers: Teacher[];
    classes: ClassGroup[];
    rooms: Room[];
    subjects: Subject[];
    lessons: Lesson[];
  }) => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  lang,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Step 1: School & Calendar
  const [schoolName, setSchoolName] = useState<string>('Al-Noor Secondary School');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [cycleDays, setCycleDays] = useState<number>(5);
  const [periodsPerDay, setPeriodsPerDay] = useState<number>(7);

  // Step 2: Subjects
  const [subjectsList, setSubjectsList] = useState<Subject[]>([
    { id: 's_math', name: 'الرياضيات', code: 'MATH', color: '#0284c7' },
    { id: 's_sci', name: 'العلوم الفيزيائية', code: 'PHYS', color: '#10b981', requiredRoomType: 'LAB' },
    { id: 's_ara', name: 'اللغة العربية', code: 'ARAB', color: '#f59e0b' },
    { id: 's_eng', name: 'اللغة الإنجليزية', code: 'ENG', color: '#8b5cf6' },
    { id: 's_isl', name: 'الدراسات الإسلامية', code: 'ISLM', color: '#059669' },
  ]);
  const [newSubName, setNewSubName] = useState('');

  // Step 3: Classrooms
  const [roomsList, setRoomsList] = useState<Room[]>([
    { id: 'r_101', name: 'القاعة 101', capacity: 32, type: 'STANDARD' },
    { id: 'r_102', name: 'القاعة 102', capacity: 32, type: 'STANDARD' },
    { id: 'r_lab1', name: 'معمل الفيزياء', capacity: 30, type: 'LAB' },
    { id: 'r_comp', name: 'معمل الحاسوب', capacity: 25, type: 'LAB' },
  ]);
  const [newRoomName, setNewRoomName] = useState('');

  // Step 4: Teachers
  const [teachersList, setTeachersList] = useState<Teacher[]>([
    { id: 't_1', name: 'أ. أحمد خالد', speciality: 'رياضيات', color: '#0284c7', unavailableSlots: [], maxDailyHours: 5 },
    { id: 't_2', name: 'أ. محمد سعيد', speciality: 'علوم', color: '#10b981', unavailableSlots: [], maxDailyHours: 4 },
    { id: 't_3', name: 'أ. فهد ناصر', speciality: 'عربي', color: '#f59e0b', unavailableSlots: [], maxDailyHours: 5 },
    { id: 't_4', name: 'أ. سامي عادل', speciality: 'إنجليزي', color: '#8b5cf6', unavailableSlots: [], maxDailyHours: 4 },
  ]);
  const [newTeacherName, setNewTeacherName] = useState('');

  // Step 5: Classes
  const [classesList, setClassesList] = useState<ClassGroup[]>([
    { id: 'c_10a', name: 'الصف 10-أ', grade: 10 },
    { id: 'c_10b', name: 'الصف 10-ب', grade: 10 },
    { id: 'c_11a', name: 'الصف 11-أ علمي', grade: 11 },
  ]);

  const handleFinish = () => {
    // Automatically generate curriculum lessons mapping
    const generatedLessons: Lesson[] = [];
    let lIdx = 1;

    for (const cls of classesList) {
      for (const sub of subjectsList) {
        // Find matching teacher
        const assignedTeacher =
          teachersList.find((tc) => tc.speciality.includes(sub.name.slice(0, 3))) ||
          teachersList[(lIdx - 1) % teachersList.length];

        const weeklyPeriods = sub.code === 'MATH' ? 5 : sub.code === 'ARAB' ? 4 : 3;

        for (let p = 0; p < weeklyPeriods; p++) {
          generatedLessons.push({
            id: `wiz_l_${lIdx++}`,
            subjectId: sub.id,
            teacherId: assignedTeacher.id,
            classId: cls.id,
            duration: 1,
            roomId: sub.requiredRoomType ? roomsList.find((r) => r.type === sub.requiredRoomType)?.id : undefined,
          });
        }
      }
    }

    onComplete({
      schoolName,
      academicYear,
      cycleDays,
      periodsPerDay,
      teachers: teachersList,
      classes: classesList,
      rooms: roomsList,
      subjects: subjectsList,
      lessons: generatedLessons,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[88vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-sky-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow">
              <Wand2 className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'معالج إعداد الجدول المدرسي خطوة بخطوة' : 'School Setup Wizard'}
              </h2>
              <p className="text-xs text-sky-200">
                {isRtl
                  ? `الخطوة ${step} من 5: ${
                      step === 1
                        ? 'التقويم المدرسي'
                        : step === 2
                        ? 'المواد الدراسية'
                        : step === 3
                        ? 'القاعات والمعامل'
                        : step === 4
                        ? 'هيئة التدريس'
                        : 'الفصول وتوليد الحصص'
                    }`
                  : `Step ${step} of 5`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s
                    ? 'bg-sky-600 text-white shadow-xs'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === s ? 'font-bold text-sky-800' : 'text-slate-500'
                }`}
              >
                {s === 1
                  ? isRtl ? 'المدرسة' : 'School'
                  : s === 2
                  ? isRtl ? 'المواد' : 'Subjects'
                  : s === 3
                  ? isRtl ? 'القاعات' : 'Rooms'
                  : s === 4
                  ? isRtl ? 'المعلمين' : 'Teachers'
                  : isRtl ? 'الفصول' : 'Classes'}
              </span>
              {s < 5 && <div className="w-8 h-0.5 bg-slate-200 mx-1 hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* STEP 1: School & Calendar */}
          {step === 1 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-4">
                <School className="w-10 h-10 text-sky-600 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? 'بيانات المدرسة والتقويم الأسبوعي' : 'School Identity & Weekly Grid'}
                </h3>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isRtl ? 'اسم المدرسة أو المنشأة:' : 'School / Institution Name:'}
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isRtl ? 'العام الدراسي:' : 'Academic Year:'}
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isRtl ? 'أيام الدورة الأسبوعية:' : 'Cycle Days:'}
                  </label>
                  <select
                    value={cycleDays}
                    onChange={(e) => setCycleDays(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-slate-800"
                  >
                    <option value={5}>{isRtl ? '5 أيام (أحد - خميس)' : '5 Days (Standard)'}</option>
                    <option value={6}>{isRtl ? '6 أيام (سبت - خميس)' : '6 Days'}</option>
                    <option value={7}>{isRtl ? '7 أيام (جامعي كامل)' : '7 Days'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isRtl ? 'الحصص باليوم الواحد:' : 'Periods Per Day:'}
                  </label>
                  <select
                    value={periodsPerDay}
                    onChange={(e) => setPeriodsPerDay(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-slate-800"
                  >
                    <option value={6}>6 {isRtl ? 'حصص' : 'Periods'}</option>
                    <option value={7}>7 {isRtl ? 'حصص (افتراضي)' : 'Periods (Standard)'}</option>
                    <option value={8}>8 {isRtl ? 'حصص' : 'Periods'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Subjects */}
          {step === 2 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-3">
                <BookOpen className="w-9 h-9 text-emerald-600 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? 'المواد الدراسية ومتطلبات القاعات' : 'Curriculum Subjects & Facilities'}
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder={isRtl ? 'أضف مادة جديدة...' : 'Add new subject name...'}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSubName.trim()) {
                      setSubjectsList([
                        ...subjectsList,
                        {
                          id: `s_${Date.now()}`,
                          name: newSubName.trim(),
                          code: newSubName.trim().slice(0, 3).toUpperCase(),
                          color: '#0284c7',
                        },
                      ]);
                      setNewSubName('');
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  {isRtl ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                {subjectsList.map((s, idx) => (
                  <div key={s.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-bold text-slate-800">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">[{s.code}]</span>
                      {s.requiredRoomType && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          {s.requiredRoomType}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Rooms */}
          {step === 3 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-3">
                <DoorOpen className="w-9 h-9 text-amber-600 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? 'الفصول والقاعات والمعامل' : 'Classrooms & Specialized Labs'}
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={isRtl ? 'اسم القاعة أو المعمل...' : 'Room name...'}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newRoomName.trim()) {
                      setRoomsList([
                        ...roomsList,
                        {
                          id: `r_${Date.now()}`,
                          name: newRoomName.trim(),
                          capacity: 30,
                          type: newRoomName.includes('معمل') || newRoomName.toLowerCase().includes('lab') ? 'LAB' : 'STANDARD',
                        },
                      ]);
                      setNewRoomName('');
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  {isRtl ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                {roomsList.map((r, idx) => (
                  <div key={r.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{r.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {isRtl ? `(سعة: ${r.capacity} طالب)` : `(Cap: ${r.capacity})`}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          r.type === 'LAB'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoomsList(roomsList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Teachers */}
          {step === 4 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-3">
                <UserCheck className="w-9 h-9 text-violet-600 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? 'المعلمون والتخصصات' : 'Faculty Teachers & Specialities'}
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder={isRtl ? 'اسم المعلم الجديد...' : 'Teacher name...'}
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTeacherName.trim()) {
                      setTeachersList([
                        ...teachersList,
                        {
                          id: `t_${Date.now()}`,
                          name: newTeacherName.trim(),
                          speciality: 'عام',
                          color: '#8b5cf6',
                          unavailableSlots: [],
                          maxDailyHours: 5,
                        },
                      ]);
                      setNewTeacherName('');
                    }
                  }}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold"
                >
                  {isRtl ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                {teachersList.map((t, idx) => (
                  <div key={t.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{t.name}</span>
                      <span className="text-[10px] text-slate-500 ms-2">[{t.speciality}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTeachersList(teachersList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Classes & Auto-Curriculum */}
          {step === 5 && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center mb-3">
                <Users className="w-9 h-9 text-indigo-600 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? 'الفصول وتوليد الحصص الأوتوماتيكي' : 'Classes & Curriculum Generation'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRtl
                    ? 'سيقوم المعالج بتوليد خطة الحصص تلقائياً وتوزيع المواد على الفصول'
                    : 'The wizard will automatically generate lesson allocations for all classes'}
                </p>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-sky-950">
                  <span>{isRtl ? 'الفصول المستهدفة:' : 'Target Classes:'}</span>
                  <span>{classesList.length} {isRtl ? 'شعب' : 'classes'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{isRtl ? 'المواد المعتمدة:' : 'Curriculum Subjects:'}</span>
                  <span>{subjectsList.length} {isRtl ? 'مواد' : 'subjects'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{isRtl ? 'المعلمون المسجلون:' : 'Faculty Count:'}</span>
                  <span>{teachersList.length} {isRtl ? 'معلمين' : 'teachers'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{isRtl ? 'القاعات والمعامل المتاحة:' : 'Rooms Available:'}</span>
                  <span>{roomsList.length} {isRtl ? 'قاعات' : 'rooms'}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                  {isRtl
                    ? 'عند الضغط على "إنهاء وبناء الجدول"، سيتم إعداد المشروع وفتح مسودة الجدول فوراً للبدء بالتوليد السريع.'
                    : 'Clicking Finish will initialize your project and open Draft 1 ready for instant solving.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            className="px-4 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-30 font-semibold transition flex items-center gap-1"
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{isRtl ? 'السابق' : 'Back'}</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, 5))}
              className="px-5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>{isRtl ? 'التالي' : 'Next'}</span>
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{isRtl ? 'إنهاء وبناء مسودة الجدول' : 'Finish & Build Timetable'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
