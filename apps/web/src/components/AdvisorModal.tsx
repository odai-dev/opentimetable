'use client';

import React, { useMemo } from 'react';
import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  AvailabilityState,
  AdvisorDiagnostic,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  Lightbulb,
  Sparkles,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  cycleDays: number;
  periodsPerDay: number;
  timeOffMatrix?: Record<string, AvailabilityState>;
  onApplyFix?: (diagnostic: AdvisorDiagnostic) => void;
}

export const AdvisorModal: React.FC<AdvisorModalProps> = ({
  isOpen,
  onClose,
  lang,
  teachers,
  classes,
  rooms,
  subjects,
  lessons,
  cycleDays,
  periodsPerDay,
  timeOffMatrix = {},
  onApplyFix,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const totalCycleSlots = cycleDays * periodsPerDay;

  // Diagnostic analysis engine
  const diagnostics = useMemo<AdvisorDiagnostic[]>(() => {
    const list: AdvisorDiagnostic[] = [];

    // 1. Faculty Workload vs Available Unblocked Slots (Pigeonhole Principle)
    const teacherLessonHours = new Map<string, number>();
    for (const l of lessons) {
      const dur = l.duration || 1;
      teacherLessonHours.set(l.teacherId, (teacherLessonHours.get(l.teacherId) || 0) + dur);
    }

    for (const teacher of teachers) {
      const requiredHours = teacherLessonHours.get(teacher.id) || 0;
      if (requiredHours === 0) continue;

      // Count blocked slots
      let blockedCount = 0;
      const blockedSlots: number[] = [];
      for (let d = 0; d < cycleDays; d++) {
        for (let p = 0; p < periodsPerDay; p++) {
          const key = `${teacher.id}-${d}-${p}`;
          if (timeOffMatrix[key] === 0) {
            blockedCount++;
            blockedSlots.push(d * periodsPerDay + p);
          }
        }
      }

      const availableSlots = totalCycleSlots - blockedCount;
      if (requiredHours > availableSlots) {
        const shortage = requiredHours - availableSlots;
        list.push({
          id: `ADV_PIGEONHOLE_${teacher.id}`,
          type: 'PIGEONHOLE_TEACHER',
          severity: 'CRITICAL',
          title: `Impossible Schedule for Faculty Member: ${teacher.name}`,
          titleAr: `استحالة رياضية لتسكين جدول عضو هيئة التدريس: ${teacher.name}`,
          analysis: `Faculty member ${teacher.name} has ${requiredHours} required weekly lecture hours, but only ${availableSlots} available slots due to ${blockedCount} blocked lecture slots in Time-Off (Deficit: ${shortage} lectures).`,
          analysisAr: `عضو هيئة التدريس ${teacher.name} مطلوب منه تدريس ${requiredHours} محاضرة، بينما المتاح له فقط ${availableSlots} محاضرة بسبب حظر ${blockedCount} محاضرة في جدول تفريغه (العجز: ${shortage} محاضرة). التسكين مستحيل رياضياً.`,
          suggestedAction: `Unblock at least ${shortage} lecture slots in ${teacher.name}'s Time-Off schedule.`,
          suggestedActionAr: `إلغاء حظر ما لا يقل عن ${shortage} محاضرة في جدول تفريغ عضو هيئة التدريس ${teacher.name}.`,
          actionPayload: {
            type: 'UNBLOCK_TIMEOFF',
            teacherId: teacher.id,
            slots: blockedSlots.slice(0, shortage),
          },
        });
      }
    }

    // 2. Hall & Lab Type Depletion Bottleneck
    const roomTypeCounts = new Map<string, number>();
    for (const r of rooms) {
      if (r.type && r.type !== 'STANDARD') {
        roomTypeCounts.set(r.type, (roomTypeCounts.get(r.type) || 0) + 1);
      }
    }

    const roomTypeDemand = new Map<string, number>();
    for (const l of lessons) {
      const sub = subjects.find((s) => s.id === l.subjectId);
      if (sub?.requiredRoomType && sub.requiredRoomType !== 'STANDARD') {
        const dur = l.duration || 1;
        roomTypeDemand.set(
          sub.requiredRoomType,
          (roomTypeDemand.get(sub.requiredRoomType) || 0) + dur
        );
      }
    }

    for (const [rType, demandedHours] of roomTypeDemand.entries()) {
      const physicalRooms = roomTypeCounts.get(rType) || 0;
      const totalAvailableLabHours = physicalRooms * totalCycleSlots;
      if (demandedHours > totalAvailableLabHours) {
        list.push({
          id: `ADV_ROOM_${rType}`,
          type: 'ROOM_BOTTLENECK',
          severity: 'CRITICAL',
          title: `Severe Hall / Lab Shortage: ${rType}`,
          titleAr: `عجز حاد في قاعات / معامل: ${rType}`,
          analysis: `Total weekly demand for ${rType} is ${demandedHours} hours, but the university only has ${physicalRooms} hall(s)/lab(s) of this type (${totalAvailableLabHours} max capacity).`,
          analysisAr: `الطلب الأسبوعي على قاعات/معامل (${rType}) هو ${demandedHours} محاضرة، بينما الكلية تمتلك فقط ${physicalRooms} قاعة/معمل بطاقة قصوى ${totalAvailableLabHours} محاضرة.`,
          suggestedAction: `Allow general lecture hall fallback or add another ${rType} facility.`,
          suggestedActionAr: `السماح باستخدام المدرجات والقاعات العامة كبديل أو إضافة قاعة/معمل ${rType} إضافي.`,
          actionPayload: {
            type: 'FALLBACK_ROOM',
            roomId: rType,
          },
        });
      }
    }

    // 3. Group / Section Load Overload
    const classTotalHours = new Map<string, number>();
    for (const l of lessons) {
      const dur = l.duration || 1;
      classTotalHours.set(l.classId, (classTotalHours.get(l.classId) || 0) + dur);
    }

    for (const cls of classes) {
      const totalH = classTotalHours.get(cls.id) || 0;
      if (totalH > totalCycleSlots) {
        list.push({
          id: `ADV_CLASS_${cls.id}`,
          type: 'UNRESOLVABLE_CLASH',
          severity: 'CRITICAL',
          title: `Over-allocated Curriculum for Section: ${cls.name}`,
          titleAr: `حمولة محاضرات زائدة للدفعة/الشعبة: ${cls.name}`,
          analysis: `Group/Section ${cls.name} has ${totalH} assigned weekly hours, which exceeds the entire week capacity of ${totalCycleSlots} lecture slots.`,
          analysisAr: `الدفعة/الشعبة ${cls.name} تم إسناد ${totalH} محاضرة لها أسبوعياً، وهو ما يتجاوز الطاقة القصوى لكامل الأسبوع (${totalCycleSlots} محاضرة).`,
          suggestedAction: `Reduce weekly lectures for this group/section by ${totalH - totalCycleSlots} lectures.`,
          suggestedActionAr: `تقليص المحاضرات الأسبوعية لهذه الدفعة/الشعبة بمقدار ${totalH - totalCycleSlots} محاضرة.`,
        });
      }
    }

    return list;
  }, [teachers, classes, rooms, subjects, lessons, cycleDays, periodsPerDay, timeOffMatrix, totalCycleSlots]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[85vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-indigo-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow">
              <Lightbulb className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{isRtl ? 'المرشد الذكي لتشخيص القيود' : 'Intelligent Constraint Advisor'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                  AI / Heuristic
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                {isRtl
                  ? 'اكتشاف أسباب تعثر التوليد واقتراح حلول تصحيحية فورية'
                  : 'Root-cause diagnostic engine detecting unfeasible schedules'}
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

        {/* Diagnostic Items Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {diagnostics.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {isRtl
                  ? 'لا توجد قيود مستحيلة أو اختناقات حرجة!'
                  : 'All Constraints Are Mathematically Feasible!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {isRtl
                  ? 'أنصبة أعضاء هيئة التدريس، سعات القاعات والمعامل، وجداول التفريغ متوافقة وقابلة للتسكين بنجاح.'
                  : 'Faculty workloads, hall & lab capacities, and time-off policies satisfy feasibility bounds.'}
              </p>
            </div>
          ) : (
            diagnostics.map((diag) => (
              <div
                key={diag.id}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <h3 className="text-xs font-bold text-rose-950">
                      {isRtl ? diag.titleAr : diag.title}
                    </h3>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 shrink-0">
                    {diag.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-rose-100 font-medium">
                  {isRtl ? diag.analysisAr : diag.analysis}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-100">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isRtl ? 'الحل المقترح:' : 'Recommended Fix:'}</span>
                    <span className="font-normal text-slate-700">
                      {isRtl ? diag.suggestedActionAr : diag.suggestedAction}
                    </span>
                  </div>

                  {diag.actionPayload && onApplyFix && (
                    <button
                      onClick={() => onApplyFix(diag)}
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <Wand2 className="w-3 h-3 text-amber-200" />
                      <span>{isRtl ? 'تطبيق الحل آلياً' : '1-Click Auto-Fix'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isRtl
              ? `إجمالي التشخيصات الحرجة: ${diagnostics.length}`
              : `Total critical bottlenecks: ${diagnostics.length}`}
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
