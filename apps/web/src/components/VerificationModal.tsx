'use client';

import React, { useState, useMemo } from 'react';
import {
  Placement,
  Lesson,
  Teacher,
  ClassGroup,
  Room,
  Subject,
  VerificationItem,
  AvailabilityState,
  AdvancedRelationRule,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  Search,
  Filter,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  placements: Placement[];
  lessons: Lesson[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  teacherMap: Map<string, Teacher>;
  classMap: Map<string, ClassGroup>;
  roomMap: Map<string, Room>;
  subjectMap: Map<string, Subject>;
  lessonMap: Map<string, Lesson>;
  cycleDays: number;
  periodsPerDay: number;
  timeOffMatrix?: Record<string, AvailabilityState>;
  advancedRules?: AdvancedRelationRule[];
  onNavigateToCard?: (lessonId: string, dayIndex: number, periodIndex: number) => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  lang,
  placements,
  lessons,
  teachers,
  classes,
  rooms,
  subjects,
  teacherMap,
  classMap,
  roomMap,
  subjectMap,
  lessonMap,
  cycleDays,
  periodsPerDay,
  timeOffMatrix = {},
  advancedRules = [],
  onNavigateToCard,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Audit evaluation engine
  const violations = useMemo<VerificationItem[]>(() => {
    const list: VerificationItem[] = [];

    // Maps for clash detection: key = `${day}-${period}`
    const teacherSlots = new Map<string, string[]>(); // `${tId}-${day}-${period}` -> [lessonIds]
    const classSlots = new Map<string, string[]>(); // `${cId}-${day}-${period}` -> [lessonIds]
    const roomSlots = new Map<string, string[]>(); // `${rId}-${day}-${period}` -> [lessonIds]

    // Track per-day periods and gaps
    const teacherDayPeriods = new Map<string, number[]>(); // `${tId}-${day}` -> [periodIndices]
    const classSubjectDays = new Map<string, number[]>(); // `${cId}-${sId}` -> [dayIndices]

    for (const p of placements) {
      const l = lessonMap.get(p.lessonId);
      if (!l) continue;

      const tKey = `${l.teacherId}-${p.dayIndex}-${p.periodIndex}`;
      const cKey = `${l.classId}-${p.dayIndex}-${p.periodIndex}`;
      const rKey = `${p.roomId}-${p.dayIndex}-${p.periodIndex}`;

      const tArr = teacherSlots.get(tKey) || [];
      tArr.push(p.lessonId);
      teacherSlots.set(tKey, tArr);

      const cArr = classSlots.get(cKey) || [];
      cArr.push(p.lessonId);
      classSlots.set(cKey, cArr);

      if (p.roomId) {
        const rArr = roomSlots.get(rKey) || [];
        rArr.push(p.lessonId);
        roomSlots.set(rKey, rArr);
      }

      // Track teacher day periods
      const tdKey = `${l.teacherId}-${p.dayIndex}`;
      const tdArr = teacherDayPeriods.get(tdKey) || [];
      tdArr.push(p.periodIndex);
      teacherDayPeriods.set(tdKey, tdArr);

      // Track class subject days
      const csKey = `${l.classId}-${l.subjectId}`;
      const csArr = classSubjectDays.get(csKey) || [];
      csArr.push(p.dayIndex);
      classSubjectDays.set(csKey, csArr);

      // Check Time-Off violations
      const teacherMatrixKey = `${l.teacherId}-${p.dayIndex}-${p.periodIndex}`;
      if (timeOffMatrix[teacherMatrixKey] === 0) {
        const tc = teacherMap.get(l.teacherId);
        list.push({
          id: `TO_T_${p.lessonId}`,
          category: 'TEACHER',
          severity: 'HARD',
          ruleName: 'Teacher Time-Off Violation',
          ruleNameAr: 'مخالفة تفريغ المعلم',
          description: `Teacher ${tc?.name || l.teacherId} is blocked at Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
          descriptionAr: `المعلم ${tc?.name || l.teacherId} لديه حظر تفريغ في اليوم ${p.dayIndex + 1}، الحصة ${p.periodIndex + 1}`,
          affectedLessonIds: [p.lessonId],
          entityId: l.teacherId,
          entityName: tc?.name,
          slotIndex: p.dayIndex * periodsPerDay + p.periodIndex,
        });
      }

      // Check Room Capacity
      if (p.roomId) {
        const room = roomMap.get(p.roomId);
        const cls = classMap.get(l.classId);
        if (room && cls && room.capacity > 0) {
          const estimatedStudents = 30; // standard benchmark
          if (room.capacity < 15) {
            list.push({
              id: `CAP_${p.lessonId}`,
              category: 'ROOM',
              severity: 'HARD',
              ruleName: 'Room Capacity Exceeded',
              ruleNameAr: 'تجاوز سعة القاعة',
              description: `Room ${room.name} (Cap: ${room.capacity}) may be too small for Class ${cls.name}`,
              descriptionAr: `القاعة ${room.name} (سعتها: ${room.capacity}) قد تكون صغيرة جداً للفصل ${cls.name}`,
              affectedLessonIds: [p.lessonId],
              entityId: room.id,
              entityName: room.name,
            });
          }
        }
      }
    }

    // 1. Teacher Clashes
    for (const [key, lessonIds] of teacherSlots.entries()) {
      if (lessonIds.length > 1) {
        const [tId, dStr, pStr] = key.split('-');
        const tc = teacherMap.get(tId);
        list.push({
          id: `CLASH_T_${key}`,
          category: 'TEACHER',
          severity: 'HARD',
          ruleName: 'Teacher Double Booking',
          ruleNameAr: 'تعارض حصص المعلم (تسكين مضاعف)',
          description: `Teacher ${tc?.name || tId} has ${lessonIds.length} simultaneous lessons on Day ${Number(dStr) + 1}, Period ${Number(pStr) + 1}`,
          descriptionAr: `المعلم ${tc?.name || tId} لديه ${lessonIds.length} حصص في نفس الوقت (اليوم ${Number(dStr) + 1}، الحصة ${Number(pStr) + 1})`,
          affectedLessonIds: lessonIds,
          entityId: tId,
          entityName: tc?.name,
        });
      }
    }

    // 2. Class Clashes
    for (const [key, lessonIds] of classSlots.entries()) {
      if (lessonIds.length > 1) {
        const [cId, dStr, pStr] = key.split('-');
        const cls = classMap.get(cId);
        list.push({
          id: `CLASH_C_${key}`,
          category: 'CLASS',
          severity: 'HARD',
          ruleName: 'Class Double Booking',
          ruleNameAr: 'تعارض حصص الفصل',
          description: `Class ${cls?.name || cId} has ${lessonIds.length} concurrent lessons on Day ${Number(dStr) + 1}, Period ${Number(pStr) + 1}`,
          descriptionAr: `الفصل ${cls?.name || cId} مسكن له ${lessonIds.length} حصص متزامنة في اليوم ${Number(dStr) + 1}، الحصة ${Number(pStr) + 1}`,
          affectedLessonIds: lessonIds,
          entityId: cId,
          entityName: cls?.name,
        });
      }
    }

    // 3. Room Clashes
    for (const [key, lessonIds] of roomSlots.entries()) {
      if (lessonIds.length > 1) {
        const [rId, dStr, pStr] = key.split('-');
        const rm = roomMap.get(rId);
        list.push({
          id: `CLASH_R_${key}`,
          category: 'ROOM',
          severity: 'HARD',
          ruleName: 'Room Double Booking',
          ruleNameAr: 'تعارض استخدام القاعة',
          description: `Room ${rm?.name || rId} is booked for ${lessonIds.length} lessons on Day ${Number(dStr) + 1}, Period ${Number(pStr) + 1}`,
          descriptionAr: `القاعة ${rm?.name || rId} محجوزة لأكثر من حصة (${lessonIds.length}) في اليوم ${Number(dStr) + 1}، الحصة ${Number(pStr) + 1}`,
          affectedLessonIds: lessonIds,
          entityId: rId,
          entityName: rm?.name,
        });
      }
    }

    // 4. Soft constraints: Teacher Gaps and Consecutive periods
    for (const [tdKey, periods] of teacherDayPeriods.entries()) {
      const [tId, dStr] = tdKey.split('-');
      const tc = teacherMap.get(tId);
      periods.sort((a, b) => a - b);

      // Max Daily Hours
      const maxDaily = tc?.maxDailyHours ?? 5;
      if (periods.length > maxDaily) {
        list.push({
          id: `DAILY_${tdKey}`,
          category: 'TEACHER',
          severity: 'SOFT',
          ruleName: 'Max Daily Hours Exceeded',
          ruleNameAr: 'تجاوز الحد اليومي للحصص',
          description: `Teacher ${tc?.name || tId} has ${periods.length} periods on Day ${Number(dStr) + 1} (Max allowed: ${maxDaily})`,
          descriptionAr: `المعلم ${tc?.name || tId} لديه ${periods.length} حصص في اليوم ${Number(dStr) + 1} (الحد المسموح: ${maxDaily})`,
          affectedLessonIds: [],
          entityId: tId,
          entityName: tc?.name,
        });
      }

      // Check Consecutive Periods (> 2 without break)
      let consecutive = 1;
      for (let i = 1; i < periods.length; i++) {
        if (periods[i] === periods[i - 1] + 1) {
          consecutive++;
          if (consecutive > 3) {
            list.push({
              id: `CONSEC_${tdKey}_${i}`,
              category: 'TEACHER',
              severity: 'SOFT',
              ruleName: 'Excess Consecutive Periods',
              ruleNameAr: 'توالي حصص المعلم بدون راحة',
              description: `Teacher ${tc?.name || tId} has ${consecutive} back-to-back periods on Day ${Number(dStr) + 1}`,
              descriptionAr: `المعلم ${tc?.name || tId} لديه ${consecutive} حصص متتالية بدون استراحة في اليوم ${Number(dStr) + 1}`,
              affectedLessonIds: [],
              entityId: tId,
              entityName: tc?.name,
            });
            break;
          }
        } else {
          consecutive = 1;
        }
      }

      // Check Windows / Gaps (idle periods between classes)
      if (periods.length >= 2) {
        const span = periods[periods.length - 1] - periods[0] + 1;
        const gaps = span - periods.length;
        if (gaps >= 2) {
          list.push({
            id: `GAP_${tdKey}`,
            category: 'TEACHER',
            severity: 'SOFT',
            ruleName: 'Teacher Window Gap Hours',
            ruleNameAr: 'ساعات فراغ وانتظار بين الحصص',
            description: `Teacher ${tc?.name || tId} has ${gaps} window gap periods on Day ${Number(dStr) + 1}`,
            descriptionAr: `المعلم ${tc?.name || tId} لديه ${gaps} حصص فراغ انتظار في اليوم ${Number(dStr) + 1}`,
            affectedLessonIds: [],
            entityId: tId,
            entityName: tc?.name,
          });
        }
      }
    }

    // 5. Subject Dispersion across days (avoiding 2 sessions on same day unless block)
    for (const [csKey, dayIndices] of classSubjectDays.entries()) {
      const [cId, sId] = csKey.split('-');
      const dayCounts = new Map<number, number>();
      for (const d of dayIndices) dayCounts.set(d, (dayCounts.get(d) || 0) + 1);

      for (const [day, count] of dayCounts.entries()) {
        if (count >= 2) {
          const cls = classMap.get(cId);
          const sub = subjectMap.get(sId);
          list.push({
            id: `DISP_${csKey}_${day}`,
            category: 'SUBJECT',
            severity: 'SOFT',
            ruleName: 'Subject Clustering On Same Day',
            ruleNameAr: 'تكدس المادة في نفس اليوم',
            description: `Class ${cls?.name} has ${count} sessions of ${sub?.name} on Day ${day + 1}`,
            descriptionAr: `الفصل ${cls?.name} لديه ${count} حصص من مادة ${sub?.name} في نفس اليوم (${day + 1})`,
            affectedLessonIds: [],
            entityId: sId,
            entityName: sub?.name,
          });
        }
      }
    }

    return list;
  }, [
    placements,
    lessons,
    teachers,
    classes,
    rooms,
    subjects,
    teacherMap,
    classMap,
    roomMap,
    subjectMap,
    lessonMap,
    periodsPerDay,
    timeOffMatrix,
  ]);

  const hardErrors = violations.filter((v) => v.severity === 'HARD');
  const softWarnings = violations.filter((v) => v.severity === 'SOFT');

  // Compute Quality Health Score (0 - 100%)
  const healthScore = Math.max(
    0,
    Math.round(100 - hardErrors.length * 20 - softWarnings.length * 3)
  );

  // Filtered view
  const filteredViolations = violations.filter((v) => {
    if (selectedCategory !== 'ALL' && v.category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && v.severity !== selectedSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName =
        v.ruleName.toLowerCase().includes(q) ||
        v.ruleNameAr.includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.descriptionAr.includes(q) ||
        (v.entityName && v.entityName.toLowerCase().includes(q));
      if (!matchName) return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[88vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'سجل التحقق والتدقيق الشامل' : 'Timetable Verification Ledger'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'تدقيق وفحص كافة القيود الصارمة والمرنة واكتشاف التضاربات'
                  : 'Comprehensive hard & soft constraint audit'}
              </p>
            </div>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                hardErrors.length === 0
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                  : 'bg-rose-950/80 text-rose-300 border-rose-600'
              }`}
            >
              <span>{isRtl ? 'مؤشر الجودة:' : 'Health:'}</span>
              <span className="text-sm font-extrabold">{healthScore}%</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <div>
                <span className="text-xs font-bold text-rose-900 block">
                  {isRtl ? 'تعارضات صارمة (Hard)' : 'Hard Conflicts'}
                </span>
                <span className="text-[10px] text-rose-700">
                  {isRtl ? 'تمنع اعتماد الجدول نهائياً' : 'Must be resolved to 0'}
                </span>
              </div>
            </div>
            <span className="text-lg font-black text-rose-700">{hardErrors.length}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  {isRtl ? 'تنبيهات جودة (Soft)' : 'Quality Warnings'}
                </span>
                <span className="text-[10px] text-amber-700">
                  {isRtl ? 'فراغات معلمين وتكدس مواد' : 'Gaps, load balance'}
                </span>
              </div>
            </div>
            <span className="text-lg font-black text-amber-700">{softWarnings.length}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sky-600" />
              <div>
                <span className="text-xs font-bold text-sky-900 block">
                  {isRtl ? 'الحصص المسكنة' : 'Placed Lessons'}
                </span>
                <span className="text-[10px] text-sky-700">
                  {isRtl ? 'إجمالي الحصص بالجدول' : 'Total active placements'}
                </span>
              </div>
            </div>
            <span className="text-lg font-black text-sky-700">
              {placements.length} / {lessons.length}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {['ALL', 'TEACHER', 'CLASS', 'ROOM', 'SUBJECT'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL'
                  ? isRtl ? 'الكل' : 'All'
                  : cat === 'TEACHER'
                  ? isRtl ? 'المعلمين' : 'Teachers'
                  : cat === 'CLASS'
                  ? isRtl ? 'الفصول' : 'Classes'
                  : cat === 'ROOM'
                  ? isRtl ? 'القاعات' : 'Rooms'
                  : isRtl ? 'المواد' : 'Subjects'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث في القيود أو الأسماء...' : 'Search rules or entities...'}
              className="w-full text-xs ps-8 pe-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>

        {/* Violations List Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredViolations.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                {isRtl ? 'الجدول مطابق تماماً وخالٍ من التعارضات!' : 'No Rule Violations Found!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isRtl
                  ? 'تم فحص جميع قيود الحصص والمعلمين والفصول والقاعات وتأكيد سلامتها.'
                  : 'All hard and soft rules evaluated successfully without detected clashes.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredViolations.map((v) => (
                <div
                  key={v.id}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 transition ${
                    v.severity === 'HARD'
                      ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                      : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {v.severity === 'HARD' ? (
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {isRtl ? v.ruleNameAr : v.ruleName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            v.severity === 'HARD'
                              ? 'bg-rose-200 text-rose-800'
                              : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {v.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isRtl ? v.descriptionAr : v.description}
                      </p>
                    </div>
                  </div>

                  {/* Action: Highlight or Jump */}
                  {v.affectedLessonIds.length > 0 && onNavigateToCard && (
                    <button
                      onClick={() => {
                        const targetPlacement = placements.find(
                          (p) => p.lessonId === v.affectedLessonIds[0]
                        );
                        if (targetPlacement) {
                          onNavigateToCard(
                            targetPlacement.lessonId,
                            targetPlacement.dayIndex,
                            targetPlacement.periodIndex
                          );
                          onClose();
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 shadow-2xs transition flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{isRtl ? 'عرض بالجدول' : 'Locate'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isRtl
              ? `إجمالي المخالفات المعروضة: ${filteredViolations.length}`
              : `Showing ${filteredViolations.length} violations`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-bold transition"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
