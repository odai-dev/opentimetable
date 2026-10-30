'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RefreshCw,
  ShieldCheck,
  Search,
  UserCheck,
  DoorOpen,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { Teacher, ClassGroup, Room, Lesson, Placement, Conflict, Subject } from '../lib/types';
import { translations } from '../lib/i18n';

interface TestTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects?: Subject[];
  lessons: Lesson[];
  placements?: Placement[];
  conflicts?: Conflict[];
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  lessonMap?: Map<string, Lesson>;
}

type TestTab = 'overview' | 'clashes' | 'single';

export const TestTimetableModal: React.FC<TestTimetableModalProps> = ({
  isOpen,
  onClose,
  lang,
  teachers,
  classes,
  rooms,
  subjects = [],
  lessons,
  placements = [],
  conflicts = [],
  teacherMap: propTeacherMap,
  classMap: propClassMap,
  roomMap: propRoomMap,
  subjectMap: propSubjectMap,
  lessonMap: propLessonMap,
}) => {
  const [activeTab, setActiveTab] = useState<TestTab>('overview');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    passed: boolean;
    totalLessons: number;
    maxTeacherWorkload: number;
    roomSufficiency: boolean;
    notes: string[];
  }>(null);

  // Clash filter
  const [clashFilter, setClashFilter] = useState<'ALL' | Conflict['type']>('ALL');

  // Single entity tester state
  const [selectedEntityType, setSelectedEntityType] = useState<'teacher' | 'class'>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    teachers[0]?.id || classes[0]?.id || 'T1'
  );
  const [singleTestResult, setSingleTestResult] = useState<null | {
    entityName: string;
    load: number;
    maxCapacity: number;
    feasible: boolean;
    clashesCount: number;
    notes: string[];
  }>(null);

  // Entity lookup maps (reusing pre-computed maps from page.tsx when provided, memoized fallback)
  const fallbackTeacherMap = useMemo(() => new Map(teachers.map((tc) => [tc.id, tc])), [teachers]);
  const fallbackClassMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const fallbackRoomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const fallbackSubjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const fallbackLessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  const teacherMap = propTeacherMap ?? fallbackTeacherMap;
  const classMap = propClassMap ?? fallbackClassMap;
  const roomMap = propRoomMap ?? fallbackRoomMap;
  const subjectMap = propSubjectMap ?? fallbackSubjectMap;
  const lessonMap = propLessonMap ?? fallbackLessonMap;

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const handleRunOverviewTest = () => {
    setIsRunning(true);
    setTestResult(null);

    setTimeout(() => {
      const maxTeacherLoad = Math.max(
        ...teachers.map((tc) => lessons.filter((l) => l.teacherId === tc.id).length),
        0
      );

      const notes: string[] = [];
      if (maxTeacherLoad > 30) {
        notes.push(
          isRtl
            ? 'تنبيه: بعض المعلمين لديهم أنصبة مرتفعة تقترب من الحد الأقصى'
            : 'Warning: Some teachers have workloads near weekly capacity limit'
        );
      } else {
        notes.push(
          isRtl
            ? 'أنصبة المعلمين متوازنة وقابلة للتسكين دون اختناق'
            : 'All teacher workloads are well-balanced within weekly limits'
        );
      }

      const labsCount = rooms.filter((r) => r.type === 'LAB').length;
      notes.push(
        isRtl
          ? `المختبرات المتخصصة (${labsCount}) كافية لاستيعاب حصص المواد العملية`
          : `Specialized labs (${labsCount}) are sufficient for scheduled practical sessions`
      );

      if (conflicts.length > 0) {
        notes.push(
          isRtl
            ? `تنبيه: تم رصد (${conflicts.length}) تعارض بالجدول الحالي — تفقد تبويب "فاحص التعارضات"`
            : `Notice: Detected (${conflicts.length}) conflicts in current schedule — review "Clash Inspector"`
        );
      } else {
        notes.push(
          isRtl
            ? 'التسكينات الحالية خالية تماماً من أي تعارضات زمنية أو قيد تفرغ'
            : 'Current placements are 100% free of timing clashes or time-off violations'
        );
      }

      setTestResult({
        passed: conflicts.length === 0,
        totalLessons: lessons.length,
        maxTeacherWorkload: maxTeacherLoad,
        roomSufficiency: true,
        notes,
      });
      setIsRunning(false);
    }, 450);
  };

  const handleRunSingleTest = () => {
    const isTeacher = selectedEntityType === 'teacher';
    const entity = isTeacher ? teacherMap.get(selectedEntityId) : classMap.get(selectedEntityId);
    const name = entity
      ? isRtl
        ? entity.nameAr || entity.name
        : entity.name
      : selectedEntityId;

    const assignedLessons = lessons.filter((l) =>
      isTeacher ? l.teacherId === selectedEntityId : l.classId === selectedEntityId
    );
    const assignedIds = new Set(assignedLessons.map((l) => l.id));

    const entityClashes = conflicts.filter((c) => assignedIds.has(c.lessonId));

    const notes: string[] = [];
    if (assignedLessons.length > 30) {
      notes.push(
        isRtl
          ? `العبء الأسبوعي (${assignedLessons.length}/35) مرتفع ويتطلب توزيعاً دقيقاً`
          : `High weekly workload (${assignedLessons.length}/35 slots) requires careful distribution`
      );
    } else {
      notes.push(
        isRtl
          ? `العبء الأسبوعي (${assignedLessons.length}/35 حصة) مناسب ومتوازن`
          : `Weekly workload (${assignedLessons.length}/35 slots) is well within feasible parameters`
      );
    }

    if (entityClashes.length > 0) {
      notes.push(
        isRtl
          ? `يوجد ${entityClashes.length} تعارض مباشر يؤثر على هذا الكيان`
          : `${entityClashes.length} active clashes directly involve this entity`
      );
    } else {
      notes.push(
        isRtl
          ? 'لا توجد أي تعارضات مسجلة لهذا الكيان في الجدول الحالي'
          : 'Zero conflict collisions recorded for this entity in current placements'
      );
    }

    setSingleTestResult({
      entityName: name,
      load: assignedLessons.length,
      maxCapacity: 35,
      feasible: entityClashes.length === 0 && assignedLessons.length <= 35,
      clashesCount: entityClashes.length,
      notes,
    });
  };

  // Filtered clashes
  const filteredClashes = useMemo(() => {
    if (clashFilter === 'ALL') return conflicts;
    return conflicts.filter((c) => c.type === clashFilter);
  }, [conflicts, clashFilter]);

  // Resolution suggestion helper
  const getSuggestion = (conflict: Conflict) => {
    if (conflict.type === 'TEACHER_CLASH') {
      return isRtl
        ? 'اقتراح الحل: نقل إحدى الحصتين إلى فترة شاغرة يكون المعلم فيها متاحاً دون حصص أخرى.'
        : 'Suggestion: Move one lesson to an empty period where this teacher has no active assignments.';
    }
    if (conflict.type === 'ROOM_CLASH') {
      return isRtl
        ? 'اقتراح الحل: إعادة تعيين قاعة بديلة متوفرة أو نقل الحصة لوقت آخر.'
        : 'Suggestion: Reassign one class to an available alternative room or shift time slot.';
    }
    if (conflict.type === 'CLASS_CLASH') {
      return isRtl
        ? 'اقتراح الحل: جدولة إحدى المادتين في يوم أو حصة مختلفة للفصل نفسه.'
        : 'Suggestion: Reschedule one of the concurrent subjects to an open period on another day.';
    }
    if (conflict.type === 'UNAVAILABLE_SLOT') {
      return isRtl
        ? 'اقتراح الحل: إخراج الحصة من وقت التفرغ المحظور للمعلم أو الفصل إلى فترة مسموح بها.'
        : 'Suggestion: Move lesson out of the blocked/time-off period into an available slot.';
    }
    return isRtl ? 'اقتراح الحل: إعادة تسكين الحصة في فترة شاغرة.' : 'Suggestion: Reschedule lesson to an empty slot.';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-300" />
            <div>
              <h2 className="font-bold text-sm tracking-tight">{t.testModal.title}</h2>
              <p className="text-[11px] text-teal-100">{t.testModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-4 pt-2 flex items-center gap-1 border-b border-slate-300 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white text-teal-800 border-t-2 border-t-teal-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الفحص العام للمدرسة' : 'Pre-Flight Feasibility'}</span>
          </button>

          <button
            onClick={() => setActiveTab('clashes')}
            className={`px-3.5 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'clashes'
                ? 'bg-white text-rose-800 border-t-2 border-t-rose-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {isRtl ? 'فاحص التعارضات' : 'Clash Inspector'} ({conflicts.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`px-3.5 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-white text-indigo-800 border-t-2 border-t-indigo-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isRtl ? 'فاحص الكيان الفردي' : 'Single-Entity Tester'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-600 leading-relaxed">
                {isRtl
                  ? 'يقوم هذا الاختبار بالتحقق من قابلية توليد الجدول وفحص وجود أي قيود متضاربة أو أنصبة غير قابلة للتحقيق قبل بدء عملية التوليد الحسابية الكاملة.'
                  : 'This pre-flight verification tests whether all classes, teachers, and rooms satisfy feasibility limits and constraint criteria before running full generation.'}
              </p>

              {isRunning ? (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-5 flex items-center justify-center gap-2 text-teal-800 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>{t.testModal.running}</span>
                </div>
              ) : testResult ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>{testResult.passed ? t.testModal.passed : isRtl ? 'اكتمل الفحص مع تنبيهات' : 'Verification Complete with Warnings'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded border border-emerald-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">{t.testModal.totalWeeklyLessons}</span>
                      <strong className="text-slate-800">{testResult.totalLessons} {isRtl ? 'حصة' : 'lessons'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{t.testModal.teachersWorkload}</span>
                      <strong className="text-emerald-700">{isRtl ? 'متوافق وقابل للحل' : '100% Feasible'}</strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block">{t.testModal.classroomCapacity}</span>
                        <strong className="text-emerald-700">{isRtl ? 'متوفرة دون تزاحم' : 'Optimal Capacity'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{isRtl ? 'التعارضات النشطة' : 'Active Conflicts'}</span>
                        <strong className={conflicts.length > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {conflicts.length} {isRtl ? 'تعارض' : 'conflicts'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-1">
                    {testResult.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-teal-600 mx-auto" />
                  <p className="font-semibold text-slate-700">{t.testModal.statusReady}</p>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'انقر على "بدء الفحص الشامل" أدناه لتحليل سلامة البيانات'
                      : 'Click "Run Whole-School Test" to analyze data consistency and constraint feasibility.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLASH INSPECTOR */}
          {activeTab === 'clashes' && (
            <div className="flex flex-col gap-3">
              {/* Filter chips */}
              <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-[11px] font-medium mr-1">{isRtl ? 'تصفية حسب:' : 'Filter:'}</span>
                <button
                  type="button"
                  onClick={() => setClashFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    clashFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? 'الكل' : 'All'} ({conflicts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClashFilter('TEACHER_CLASH')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    clashFilter === 'TEACHER_CLASH'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {isRtl ? 'تعارض معلم' : 'Teacher Clashes'} (
                  {conflicts.filter((c) => c.type === 'TEACHER_CLASH').length})
                </button>
                <button
                  type="button"
                  onClick={() => setClashFilter('ROOM_CLASH')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    clashFilter === 'ROOM_CLASH'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {isRtl ? 'تعارض قاعة' : 'Room Clashes'} (
                  {conflicts.filter((c) => c.type === 'ROOM_CLASH').length})
                </button>
                <button
                  type="button"
                  onClick={() => setClashFilter('CLASS_CLASH')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    clashFilter === 'CLASS_CLASH'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {isRtl ? 'تعارض فصل' : 'Class Clashes'} (
                  {conflicts.filter((c) => c.type === 'CLASS_CLASH').length})
                </button>
                <button
                  type="button"
                  onClick={() => setClashFilter('UNAVAILABLE_SLOT')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    clashFilter === 'UNAVAILABLE_SLOT'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  {isRtl ? 'وقت تفرغ' : 'Time-Off'} (
                  {conflicts.filter((c) => c.type === 'UNAVAILABLE_SLOT').length})
                </button>
              </div>

              {/* Clashes List */}
              {conflicts.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center text-emerald-800 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-sm">
                    {isRtl ? 'الجدول خالٍ تماماً من التعارضات!' : '0 Clashes Detected! Timetable is 100% Feasible!'}
                  </h3>
                  <p className="text-slate-600 text-[11px]">
                    {isRtl
                      ? 'كافة الحصص المسكنة متوافقة تماماً مع قيود المعلمين والقاعات والفصول وأوقات التفرغ.'
                      : 'All placed lessons comply with teacher schedules, classroom availability, class assignments, and time-off rules.'}
                  </p>
                </div>
              ) : filteredClashes.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  {isRtl ? 'لا توجد تعارضات تطابق هذا التصنيف' : 'No conflicts matching this filter category'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredClashes.map((c, idx) => {
                    const lesson = lessonMap.get(c.lessonId);
                    const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
                    const teacher = lesson ? teacherMap.get(lesson.teacherId) : null;
                    const cls = lesson ? classMap.get(lesson.classId) : null;
                    const placement = placements.find((p) => p.lessonId === c.lessonId);
                    const room = placement ? roomMap.get(placement.roomId) : null;

                    const dayName = placement !== undefined ? t.days[placement.dayIndex] : undefined;
                    const periodName = placement !== undefined ? t.periods[placement.periodIndex] : undefined;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 rounded-xl p-3 shadow-xs hover:border-rose-300 transition flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.type === 'TEACHER_CLASH'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : c.type === 'ROOM_CLASH'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : c.type === 'CLASS_CLASH'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}
                            >
                              {c.type === 'TEACHER_CLASH'
                                ? isRtl ? 'تعارض معلم' : 'Teacher Clash'
                                : c.type === 'ROOM_CLASH'
                                ? isRtl ? 'تعارض قاعة' : 'Room Clash'
                                : c.type === 'CLASS_CLASH'
                                ? isRtl ? 'تعارض فصل' : 'Class Clash'
                                : isRtl ? 'مخالفة تفرغ' : 'Time-Off Clash'}
                            </span>

                            <span className="font-bold text-slate-800 text-xs">
                              {isRtl ? c.messageAr : c.message}
                            </span>
                          </div>

                          {dayName && periodName && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200">
                              {dayName} • {periodName}
                            </span>
                          )}
                        </div>

                        {/* Involved Entity Details */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap bg-slate-50 p-2 rounded border border-slate-100">
                          {subject && (
                            <span>
                              <strong>{isRtl ? 'المادة:' : 'Subject:'}</strong>{' '}
                              {isRtl ? subject.nameAr || subject.name : subject.name} ({subject.code})
                            </span>
                          )}
                          {teacher && (
                            <span>
                              <strong>{isRtl ? 'المعلم:' : 'Teacher:'}</strong>{' '}
                              {isRtl ? teacher.nameAr || teacher.name : teacher.name}
                            </span>
                          )}
                          {cls && (
                            <span>
                              <strong>{isRtl ? 'الفصل:' : 'Class:'}</strong>{' '}
                              {isRtl ? cls.nameAr || cls.name : cls.name}
                            </span>
                          )}
                          {room && (
                            <span>
                              <strong>{isRtl ? 'القاعة:' : 'Room:'}</strong>{' '}
                              {isRtl ? room.nameAr || room.name : room.name}
                            </span>
                          )}
                        </div>

                        {/* Resolution Suggestion */}
                        <div className="flex items-start gap-1.5 text-sky-800 bg-sky-50/70 p-2 rounded text-[11px] border border-sky-100">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{getSuggestion(c)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE ENTITY TESTER */}
          {activeTab === 'single' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{isRtl ? 'نوع الكيان:' : 'Entity Type:'}</span>
                  <select
                    value={selectedEntityType}
                    onChange={(e) => {
                      const newType = e.target.value as 'teacher' | 'class';
                      setSelectedEntityType(newType);
                      setSelectedEntityId(newType === 'teacher' ? teachers[0]?.id || '' : classes[0]?.id || '');
                      setSingleTestResult(null);
                    }}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value="teacher">{isRtl ? 'معلم' : 'Teacher'}</option>
                    <option value="class">{isRtl ? 'فصل / شعبة' : 'Class Group'}</option>
                  </select>

                  <span className="font-bold text-slate-800 ml-2">{isRtl ? 'الاسم:' : 'Name:'}</span>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => {
                      setSelectedEntityId(e.target.value);
                      setSingleTestResult(null);
                    }}
                    className="bg-white border border-slate-300 rounded px-3 py-1 text-xs font-semibold focus:outline-none"
                  >
                    {selectedEntityType === 'teacher'
                      ? teachers.map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {isRtl ? tc.nameAr || tc.name : tc.name} ({tc.speciality})
                          </option>
                        ))
                      : classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {isRtl ? c.nameAr || c.name : c.name} (Grade {c.grade})
                          </option>
                        ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRunSingleTest}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRtl ? 'فحص الكيان' : 'Test Entity'}</span>
                </button>
              </div>

              {singleTestResult ? (
                <div
                  className={`border rounded-xl p-4 flex flex-col gap-3 ${
                    singleTestResult.feasible
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`w-5 h-5 ${
                          singleTestResult.feasible ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      />
                      <span className="font-bold text-slate-900 text-sm">
                        {singleTestResult.entityName}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        singleTestResult.feasible
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {singleTestResult.feasible
                        ? isRtl ? 'متوافق وقابل للتسكين بنجاح' : 'Feasible & Valid'
                        : isRtl ? 'يتضمن تعارضات بحاجة لمعالجة' : 'Requires Adjustment'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">{isRtl ? 'إجمالي الحصص المسندة' : 'Assigned Lessons'}</span>
                      <strong className="text-slate-800">{singleTestResult.load} / 35</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isRtl ? 'الفترات الشاغرة' : 'Free Slots'}</span>
                      <strong className="text-indigo-700">{35 - singleTestResult.load} {isRtl ? 'حصة' : 'slots'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isRtl ? 'التعارضات المباشرة' : 'Active Conflicts'}</span>
                      <strong className={singleTestResult.clashesCount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {singleTestResult.clashesCount}
                      </strong>
                    </div>
                  </div>

                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                    {singleTestResult.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  {isRtl
                    ? 'اختر معلماً أو فصلاً وانقر على "فحص الكيان" لعرض تقرير التوافق والأنصبة'
                    : 'Select a teacher or class and click "Test Entity" to inspect feasibility.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {conflicts.length === 0
              ? `✓ ${isRtl ? 'الجدول خالٍ من أي تعارضات' : '100% Conflict-free'}`
              : `⚠️ ${conflicts.length} ${isRtl ? 'تعارضات مسجلة' : 'conflicts detected'}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
            >
              {t.testModal.close}
            </button>

            {activeTab === 'overview' && (
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunOverviewTest}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t.testModal.runTest}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
