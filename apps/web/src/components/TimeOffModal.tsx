'use client';

import React, { useState } from 'react';
import { Calendar, X, Check, Slash, HelpCircle, Save } from 'lucide-react';
import { Teacher, ClassGroup, AvailabilityState } from '../lib/types';
import { translations } from '../lib/i18n';

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  teachers: Teacher[];
  classes: ClassGroup[];
}

export const TimeOffModal: React.FC<TimeOffModalProps> = ({
  isOpen,
  onClose,
  lang,
  teachers,
  classes,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const [selectedEntityId, setSelectedEntityId] = useState<string>(teachers[0]?.id || 'T1');

  // Matrix state: map key `${entityId}-${day}-${period}` -> AvailabilityState (1 = Available, 0 = Blocked, 2 = Disfavored)
  const [matrix, setMatrix] = useState<Record<string, AvailabilityState>>({
    'T2-0-0': 0, // Sample: Prof. Layla unavailable Monday period 1
  });

  if (!isOpen) return null;

  const getKey = (day: number, period: number) => `${selectedEntityId}-${day}-${period}`;

  const getSlotState = (day: number, period: number): AvailabilityState => {
    const val = matrix[getKey(day, period)];
    return val !== undefined ? val : 1; // Default to 1 (Available)
  };

  const handleToggle = (day: number, period: number) => {
    const current = getSlotState(day, period);
    // Cycle: 1 (Available) -> 0 (Blocked) -> 2 (Disfavored) -> 1
    const next: AvailabilityState = current === 1 ? 0 : current === 0 ? 2 : 1;
    setMatrix((prev) => ({
      ...prev,
      [getKey(day, period)]: next,
    }));
  };

  const handleSetAllAvailable = () => {
    const updated = { ...matrix };
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 7; p++) {
        updated[getKey(d, p)] = 1;
      }
    }
    setMatrix(updated);
  };

  const handleBlockPeriod1 = () => {
    const updated = { ...matrix };
    for (let d = 0; d < 5; d++) {
      updated[getKey(d, 0)] = 0;
    }
    setMatrix(updated);
  };

  const handleBlockLastPeriod = () => {
    const updated = { ...matrix };
    for (let d = 0; d < 5; d++) {
      updated[getKey(d, 6)] = 0;
    }
    setMatrix(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-200" />
            <div>
              <h2 className="font-bold text-sm tracking-tight">{t.timeOffModal.title}</h2>
              <p className="text-[11px] text-amber-100">{t.timeOffModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-700">
          {/* Entity Selector & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{t.timeOffModal.selectEntity}</span>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="bg-white border border-slate-300 rounded px-3 py-1 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <optgroup label={isRtl ? 'المعلمون' : 'Teachers'}>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {isRtl ? tc.nameAr || tc.name : tc.name} ({tc.speciality})
                    </option>
                  ))}
                </optgroup>
                <optgroup label={isRtl ? 'الفصول' : 'Classes'}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.nameAr || c.name : c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Availability Legend Badges */}
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">✓</span>
                {t.timeOffModal.available}
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 flex items-center justify-center font-bold">✗</span>
                {t.timeOffModal.blocked}
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold">?</span>
                {t.timeOffModal.disfavored}
              </span>
            </div>
          </div>

          {/* 5 Days $\times$ 7 Periods Matrix Grid */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-xs bg-white">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                  <th className="p-2 border-r border-slate-300 w-28 bg-slate-200/70 text-start px-3">
                    {isRtl ? 'اليوم / الحصة' : 'Day / Period'}
                  </th>
                  {t.periods.map((_, pIdx) => (
                    <th key={pIdx} className="p-2 border-r border-slate-200">
                      <div>{pIdx + 1}</div>
                      <div className="text-[9px] text-slate-400 font-mono font-normal">
                        {t.bellSchedule[pIdx].split('-')[0].trim()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.days.map((dayName, dIdx) => (
                  <tr key={dayName} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 border-r border-slate-300 bg-slate-50 font-bold text-slate-800 text-start px-3">
                      {dayName}
                    </td>

                    {t.periods.map((_, pIdx) => {
                      const state = getSlotState(dIdx, pIdx);
                      return (
                        <td key={pIdx} className="p-1 border-r border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleToggle(dIdx, pIdx)}
                            className={`w-9 h-9 rounded-md flex items-center justify-center font-extrabold text-sm transition-all shadow-xs mx-auto ${
                              state === 1
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                : state === 0
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {state === 1 ? '✓' : state === 0 ? '✗' : '?'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-500">
              💡 {t.timeOffModal.cycleHint}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSetAllAvailable}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-medium transition"
              >
                {t.timeOffModal.setAllAvailable}
              </button>
              <button
                type="button"
                onClick={handleBlockPeriod1}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-medium transition"
              >
                {t.timeOffModal.blockPeriod1}
              </button>
              <button
                type="button"
                onClick={handleBlockLastPeriod}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-medium transition"
              >
                {t.timeOffModal.blockLastPeriod}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition"
          >
            {t.timeOffModal.saveAndClose}
          </button>
        </div>
      </div>
    </div>
  );
};
