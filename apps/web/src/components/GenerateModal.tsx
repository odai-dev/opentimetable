'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
  Wand2,
  Lightbulb,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import {
  GenerationComplexity,
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  AvailabilityState,
} from '../lib/types';
import { SolverProgressPayload } from '../lib/solver-protocol';
import { translations } from '../lib/i18n';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  isSolving: boolean;
  progress?: SolverProgressPayload | null;
  onRunGenerate: (
    complexity: GenerationComplexity,
    options: { minimizeGaps: boolean; strictRooms: boolean; distributeSubjects: boolean },
    mode: 'NEW' | 'IMPROVE'
  ) => void;
  onCancel?: () => void;
  onOpenAdvisor?: () => void;
  solveDurationMs?: number | null;
  solveStatus?: string | null;
  unplacedCount: number;
  conflictsCount: number;
  // Pre-flight feasibility props
  teachers?: Teacher[];
  classes?: ClassGroup[];
  rooms?: Room[];
  subjects?: Subject[];
  lessons?: Lesson[];
  cycleDays?: number;
  periodsPerDay?: number;
  timeOffMatrix?: Record<string, AvailabilityState>;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  lang,
  isSolving,
  progress,
  onRunGenerate,
  onCancel,
  onOpenAdvisor,
  solveDurationMs,
  solveStatus,
  unplacedCount,
  conflictsCount,
  teachers = [],
  classes = [],
  rooms = [],
  subjects = [],
  lessons = [],
  cycleDays = 5,
  periodsPerDay = 7,
  timeOffMatrix = {},
}) => {
  const [solveMode, setSolveMode] = useState<'NEW' | 'IMPROVE'>('NEW');
  const [complexity, setComplexity] = useState<GenerationComplexity>('normal');
  const [minimizeGaps, setMinimizeGaps] = useState(true);
  const [strictRooms, setStrictRooms] = useState(true);
  const [distributeSubjects, setDistributeSubjects] = useState(true);

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Pre-flight Feasibility Diagnostic Evaluation
  const feasibilityReport = useMemo(() => {
    if (!lessons.length || !teachers.length || !classes.length) return null;
    const totalCap = (cycleDays || 5) * (periodsPerDay || 7);
    const impossibleTeachers: string[] = [];
    const impossibleClasses: string[] = [];

    const classHours = new Map<string, number>();
    const teacherHours = new Map<string, number>();
    for (const l of lessons) {
      const dur = l.duration || 1;
      classHours.set(l.classId, (classHours.get(l.classId) || 0) + dur);
      teacherHours.set(l.teacherId, (teacherHours.get(l.teacherId) || 0) + dur);
    }

    for (const c of classes) {
      const req = classHours.get(c.id) || 0;
      if (req > totalCap) {
        impossibleClasses.push(`${isRtl ? c.nameAr || c.name : c.name} (${req}/${totalCap}h)`);
      }
    }

    for (const tc of teachers) {
      const req = teacherHours.get(tc.id) || 0;
      let blocked = 0;
      for (let d = 0; d < (cycleDays || 5); d++) {
        for (let p = 0; p < (periodsPerDay || 7); p++) {
          if (timeOffMatrix[`${tc.id}-${d}-${p}`] === 0) blocked++;
        }
      }
      const avail = totalCap - blocked;
      if (req > avail) {
        impossibleTeachers.push(`${isRtl ? tc.nameAr || tc.name : tc.name} (${req}h > ${avail}h)`);
      }
    }

    const isCritical = impossibleClasses.length > 0 || impossibleTeachers.length > 0;
    return { isCritical, impossibleClasses, impossibleTeachers, totalCap };
  }, [lessons, teachers, classes, cycleDays, periodsPerDay, timeOffMatrix, isRtl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Dialog Header */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            <div>
              <h2 className="font-bold text-sm tracking-tight">{t.generatorModal.title}</h2>
              <p className="text-[11px] text-sky-100">{t.generatorModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSolving}
            className="p-1 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Generation Mode Selector (NEW vs IMPROVE) */}
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              {isRtl ? 'نمط التوليد' : 'Generation Mode'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSolveMode('NEW')}
                disabled={isSolving}
                className={`py-2 px-3 rounded-lg border text-center transition flex flex-col items-center gap-0.5 ${
                  solveMode === 'NEW'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-xs">{isRtl ? 'توليد كامل جديد' : 'New Generation'}</span>
                </div>
                <span className="text-[9px] opacity-80">
                  {isRtl ? 'يجدول الكل مع تثبيت المقفل 🔒' : 'Schedules all, keeps locked 🔒'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSolveMode('IMPROVE')}
                disabled={isSolving}
                className={`py-2 px-3 rounded-lg border text-center transition flex flex-col items-center gap-0.5 ${
                  solveMode === 'IMPROVE'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs">{isRtl ? 'تحسين وتسكين البنك' : 'Improve Timetable'}</span>
                </div>
                <span className="text-[9px] opacity-80">
                  {isRtl ? 'يسكن غير المسكن دون تفكيك الحالي' : 'Fills unplaced cards gently'}
                </span>
              </button>
            </div>
          </div>

          {/* Pre-Flight Feasibility Banner */}
          {feasibilityReport && (
            feasibilityReport.isCritical ? (
              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-900 flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-bold text-xs text-rose-800">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    {isRtl ? 'تنبيه الجدوى المسبقة: استحالة رياضية مكتشفة' : 'Pre-Flight Alert: Mathematical Deadlock Detected'}
                  </span>
                  {onOpenAdvisor && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAdvisor();
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-700 font-bold transition flex items-center gap-1"
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>{isRtl ? 'المستشار الذكي' : 'Advisor'}</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-rose-700">
                  {isRtl
                    ? 'الأنصبة المطلوبة تتجاوز الحصص المتاحة بعد حظر فترات التفريغ:'
                    : 'Required teaching hours exceed available unblocked slots in the cycle:'}
                </p>
                <div className="text-[10px] font-mono text-rose-800 bg-white/70 p-1.5 rounded border border-rose-200">
                  {feasibilityReport.impossibleTeachers.slice(0, 3).map((item, idx) => (
                    <div key={idx}>• {item}</div>
                  ))}
                  {feasibilityReport.impossibleClasses.slice(0, 3).map((item, idx) => (
                    <div key={idx}>• {item}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {isRtl
                      ? `فحص الجدوى المسبقة سليم (${feasibilityReport.totalCap} حصة أسبوعية)`
                      : `Pre-flight feasibility verified (${feasibilityReport.totalCap} weekly slots)`}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Complexity Selection */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-600" />
                {t.generatorModal.complexity}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-extrabold uppercase text-[10px]">
                {complexity}
              </span>
            </div>

            {/* Radio / Tab Selector for Complexity */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(['normal', 'large', 'huge'] as GenerationComplexity[]).map((level) => {
                const isSelected = complexity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={isSolving}
                    onClick={() => setComplexity(level)}
                    className={`py-2 px-3 rounded-lg border text-center transition flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs">{t.generatorModal[level]}</span>
                    <span className="text-[9px] opacity-75">
                      {level === 'normal' ? '<0.5s' : level === 'large' ? '~1.2s' : '~2.0s'}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 bg-white p-2 rounded border border-slate-200">
              💡 {complexity === 'normal'
                ? t.generatorModal.normalDesc
                : complexity === 'large'
                ? t.generatorModal.largeDesc
                : t.generatorModal.hugeDesc}
            </p>
          </div>

          {/* Optimization Options Checklist */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col gap-2">
            <span className="font-bold text-slate-800">
              {t.generatorModal.options}
            </span>

            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                disabled={isSolving}
                checked={minimizeGaps}
                onChange={(e) => setMinimizeGaps(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs">{t.generatorModal.minimizeGaps}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                disabled={isSolving}
                checked={strictRooms}
                onChange={(e) => setStrictRooms(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs">{t.generatorModal.strictRooms}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                disabled={isSolving}
                checked={distributeSubjects}
                onChange={(e) => setDistributeSubjects(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs">{t.generatorModal.distributeSubjects}</span>
            </label>
          </div>

          {/* Progress / Status Area */}
          {isSolving ? (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600 animate-spin" />
                  {progress
                    ? (isRtl ? progress.stageNameAr : progress.stageName)
                    : t.generatorModal.generating}
                </span>
                <span>
                  {progress ? `Stage ${progress.stage} / ${progress.totalStages}` : 'Solving...'}
                </span>
              </div>
              <div className="w-full bg-sky-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-sky-600 animated-progress-stripes rounded-full transition-all duration-300"
                  style={{
                    width: progress
                      ? `${Math.round((progress.stage / progress.totalStages) * 100)}%`
                      : '60%',
                  }}
                />
              </div>
              {progress && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>{t.generatorModal.iterations}: {progress.iteration}</span>
                  <span>{progress.elapsedMs} ms</span>
                </div>
              )}
            </div>
          ) : solveDurationMs != null ? (
            solveStatus?.includes('FALLBACK') || conflictsCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-bold text-amber-900 text-xs">
                      {isRtl ? 'تسكين بديل غير مدقق (FALLBACK)' : 'Fallback Schedule (Unverified)'}
                    </div>
                    <div className="text-[10px] text-amber-700">
                      {t.generatorModal.duration}: <strong>{solveDurationMs} ms</strong> • {conflictsCount} {isRtl ? 'تعارضات' : 'conflicts'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-bold text-emerald-900 text-xs">
                      {isRtl ? 'تم التوليد بنجاح (محقق 100%)' : 'Generation Successful (0 Hard Conflicts)'}
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      {t.generatorModal.duration}: <strong>{solveDurationMs} ms</strong> • {unplacedCount} {t.generatorModal.unplaced}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Dialog Footer Actions */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          {isSolving ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>{isRtl ? 'إلغاء التوليد' : 'Cancel Solving'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                {t.generatorModal.close}
              </button>

              <button
                type="button"
                onClick={() =>
                  onRunGenerate(
                    complexity,
                    { minimizeGaps, strictRooms, distributeSubjects },
                    solveMode
                  )
                }
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>
                  {solveMode === 'IMPROVE'
                    ? (isRtl ? 'بدء التحسين والتسكين' : 'Start Improving')
                    : t.generatorModal.start}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
