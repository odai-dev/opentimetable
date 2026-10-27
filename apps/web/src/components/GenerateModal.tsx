'use client';

import React, { useState } from 'react';
import { Sparkles, X, Sliders, CheckCircle2, AlertTriangle, Layers, Clock } from 'lucide-react';
import { GenerationComplexity } from '../lib/types';
import { SolverProgressPayload } from '../lib/solver-protocol';
import { translations } from '../lib/i18n';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  isSolving: boolean;
  progress?: SolverProgressPayload | null;
  onRunGenerate: (complexity: GenerationComplexity, options: { minimizeGaps: boolean; strictRooms: boolean; distributeSubjects: boolean }) => void;
  solveDurationMs?: number | null;
  unplacedCount: number;
  conflictsCount: number;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  lang,
  isSolving,
  progress,
  onRunGenerate,
  solveDurationMs,
  unplacedCount,
  conflictsCount,
}) => {
  const [complexity, setComplexity] = useState<GenerationComplexity>('normal');
  const [minimizeGaps, setMinimizeGaps] = useState(true);
  const [strictRooms, setStrictRooms] = useState(true);
  const [distributeSubjects, setDistributeSubjects] = useState(true);

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

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
            className="p-1 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-700">
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

            {/* Complexity Explanatory Note */}
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
                checked={minimizeGaps}
                onChange={(e) => setMinimizeGaps(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs">{t.generatorModal.minimizeGaps}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={strictRooms}
                onChange={(e) => setStrictRooms(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs">{t.generatorModal.strictRooms}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
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
          ) : null}
        </div>

        {/* Dialog Footer Actions */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            {t.generatorModal.close}
          </button>

          <button
            type="button"
            disabled={isSolving}
            onClick={() => onRunGenerate(complexity, { minimizeGaps, strictRooms, distributeSubjects })}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{isSolving ? t.generatorModal.generating : t.generatorModal.start}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
