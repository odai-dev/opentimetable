'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, X, Check, Slash, HelpCircle, Save, RotateCcw } from 'lucide-react';
import { Teacher, ClassGroup, AvailabilityState } from '../lib/types';
import { translations } from '../lib/i18n';

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  teachers: Teacher[];
  classes: ClassGroup[];
  initialMatrix?: Record<string, AvailabilityState>;
  onSaveTimeOff?: (entityId: string, matrix: Record<string, AvailabilityState>) => void;
  customDays?: string[];
  customPeriods?: string[];
  bellSchedule?: string[];
  daysCount?: number;
  periodsCount?: number;
}

export const TimeOffModal: React.FC<TimeOffModalProps> = ({
  isOpen,
  onClose,
  lang,
  teachers,
  classes,
  initialMatrix = { 'T2-0-0': 0 },
  onSaveTimeOff,
  customDays,
  customPeriods,
  bellSchedule,
  daysCount,
  periodsCount,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const daysList = customDays && customDays.length > 0 ? customDays : t.days;
  const periodsList = customPeriods && customPeriods.length > 0 ? customPeriods : t.periods;
  const bells = bellSchedule && bellSchedule.length > 0 ? bellSchedule : t.bellSchedule;

  const totalDays = daysCount || daysList.length;
  const totalPeriods = periodsCount || periodsList.length;

  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    teachers[0]?.id || classes[0]?.id || 'T1'
  );

  // Matrix state: map key `${entityId}-${day}-${period}` -> AvailabilityState (1 = Available, 0 = Blocked, 2 = Disfavored)
  const [matrix, setMatrix] = useState<Record<string, AvailabilityState>>(initialMatrix);

  useEffect(() => {
    if (initialMatrix) {
      setMatrix((prev) => ({ ...prev, ...initialMatrix }));
    }
  }, [initialMatrix]);

  useEffect(() => {
    if (isOpen) {
      if (teachers.length > 0 && !teachers.some((t) => t.id === selectedEntityId)) {
        setSelectedEntityId(teachers[0].id);
      }
    }
  }, [isOpen, teachers, selectedEntityId]);

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

  // Toggle entire day row
  const handleToggleDay = (day: number) => {
    const states = Array.from({ length: totalPeriods }, (_, p) => getSlotState(day, p));
    const allAvailable = states.every((s) => s === 1);
    const nextState: AvailabilityState = allAvailable ? 0 : 1;

    setMatrix((prev) => {
      const updated = { ...prev };
      for (let p = 0; p < totalPeriods; p++) {
        updated[getKey(day, p)] = nextState;
      }
      return updated;
    });
  };

  // Toggle entire period column
  const handleTogglePeriod = (period: number) => {
    const states = Array.from({ length: totalDays }, (_, d) => getSlotState(d, period));
    const allAvailable = states.every((s) => s === 1);
    const nextState: AvailabilityState = allAvailable ? 0 : 1;

    setMatrix((prev) => {
      const updated = { ...prev };
      for (let d = 0; d < totalDays; d++) {
        updated[getKey(d, period)] = nextState;
      }
      return updated;
    });
  };

  const handleSetAllAvailable = () => {
    setMatrix((prev) => {
      const updated = { ...prev };
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          updated[getKey(d, p)] = 1;
        }
      }
      return updated;
    });
  };

  const handleBlockPeriod1 = () => {
    setMatrix((prev) => {
      const updated = { ...prev };
      for (let d = 0; d < totalDays; d++) {
        updated[getKey(d, 0)] = 0;
      }
      return updated;
    });
  };

  const handleBlockLastPeriod = () => {
    setMatrix((prev) => {
      const updated = { ...prev };
      const lastPeriodIdx = totalPeriods - 1;
      for (let d = 0; d < totalDays; d++) {
        updated[getKey(d, lastPeriodIdx)] = 0;
      }
      return updated;
    });
  };

  const handleInvert = () => {
    setMatrix((prev) => {
      const updated = { ...prev };
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          const current = getSlotState(d, p);
          // Invert: 1 -> 0, 0 -> 1, 2 -> 1
          updated[getKey(d, p)] = current === 1 ? 0 : 1;
        }
      }
      return updated;
    });
  };

  const handleSaveAndClose = () => {
    if (onSaveTimeOff) {
      onSaveTimeOff(selectedEntityId, matrix);
    }
    onClose();
  };

  const selectedTeacher = teachers.find((tc) => tc.id === selectedEntityId);
  const selectedClass = classes.find((c) => c.id === selectedEntityId);
  const entityName =
    selectedTeacher
      ? isRtl
        ? selectedTeacher.nameAr || selectedTeacher.name
        : selectedTeacher.name
      : selectedClass
      ? isRtl
        ? selectedClass.nameAr || selectedClass.name
        : selectedClass.name
      : selectedEntityId;

  // Stats for current entity
  let availableCount = 0;
  let blockedCount = 0;
  let disfavoredCount = 0;
  for (let d = 0; d < totalDays; d++) {
    for (let p = 0; p < totalPeriods; p++) {
      const st = getSlotState(d, p);
      if (st === 1) availableCount++;
      else if (st === 0) blockedCount++;
      else disfavoredCount++;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-700 overflow-y-auto flex-1">
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
                      {isRtl ? c.nameAr || c.name : c.name} (Grade {c.grade})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Current entity quick stats */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-slate-500 font-medium">
                {isRtl ? 'المحدد:' : 'Selected:'} <strong className="text-slate-800">{entityName}</strong>
              </span>
              <span className="text-emerald-700 font-semibold">{availableCount} {isRtl ? 'متاح' : 'Available'}</span>
              <span className="text-rose-700 font-semibold">{blockedCount} {isRtl ? 'محظور' : 'Blocked'}</span>
              {disfavoredCount > 0 && (
                <span className="text-amber-700 font-semibold">{disfavoredCount} {isRtl ? 'غير مرغوب' : 'Disfavored'}</span>
              )}
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

          {/* Dynamic Days x Periods Matrix Grid */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-xs bg-white">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                  <th className="p-2 border-r border-slate-300 w-28 bg-slate-200/70 text-start px-3">
                    {isRtl ? 'اليوم / الحصة' : 'Day / Period'}
                  </th>
                  {periodsList.map((_, pIdx) => {
                    const bellTime = bells[pIdx] ? bells[pIdx].split('-')[0].trim() : '';
                    return (
                      <th
                        key={pIdx}
                        onClick={() => handleTogglePeriod(pIdx)}
                        className="p-2 border-r border-slate-200 hover:bg-slate-200 cursor-pointer transition select-none min-w-[50px]"
                        title={isRtl ? `انقر لتعديل عمود الحصة ${pIdx + 1}` : `Click to toggle column ${pIdx + 1}`}
                      >
                        <div>{pIdx + 1}</div>
                        {bellTime && (
                          <div className="text-[9px] text-slate-400 font-mono font-normal">
                            {bellTime}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {daysList.map((dayName, dIdx) => (
                  <tr key={`${dayName}-${dIdx}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td
                      onClick={() => handleToggleDay(dIdx)}
                      className="p-2 border-r border-slate-300 bg-slate-50 font-bold text-slate-800 text-start px-3 hover:bg-slate-200 cursor-pointer transition select-none"
                      title={isRtl ? `انقر لتعديل صف يوم ${dayName}` : `Click to toggle row ${dayName}`}
                    >
                      {dayName}
                    </td>

                    {periodsList.map((_, pIdx) => {
                      const state = getSlotState(dIdx, pIdx);
                      return (
                        <td key={pIdx} className="p-1 border-r border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleToggle(dIdx, pIdx)}
                            title={
                              state === 1
                                ? isRtl ? 'متاح (انقر للتعطيل)' : 'Available (Click to Block)'
                                : state === 0
                                ? isRtl ? 'محظور (انقر لغير مفضل)' : 'Blocked (Click for Disfavored)'
                                : isRtl ? 'غير مفضل (انقر للمتاح)' : 'Disfavored (Click for Available)'
                            }
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
              <button
                type="button"
                onClick={handleInvert}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-medium transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>{isRtl ? 'عكس التحديد' : 'Invert'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.timeOffModal.saveAndClose}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
