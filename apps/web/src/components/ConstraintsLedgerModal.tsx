'use client';

import React, { useState, useMemo } from 'react';
import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  Placement,
  AvailabilityState,
  AdvancedRelationRule,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  X,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from 'lucide-react';

interface ConstraintsLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  placements: Placement[];
  timeOffMatrix?: Record<string, AvailabilityState>;
  advancedRules?: AdvancedRelationRule[];
  onToggleRule?: (ruleId: string) => void;
  cycleDays: number;
  periodsPerDay: number;
}

interface ConstraintRow {
  id: string;
  category: 'TIMEOFF' | 'TEACHER_LOAD' | 'SUBJECT_DISTRIB' | 'ROOM_REQ' | 'ADVANCED';
  title: string;
  titleAr: string;
  entityName: string;
  ruleValue: string;
  status: 'SATISFIED' | 'VIOLATED' | 'INFO';
  violationCount: number;
  enabled: boolean;
  canToggle?: boolean;
}

export const ConstraintsLedgerModal: React.FC<ConstraintsLedgerModalProps> = ({
  isOpen,
  onClose,
  lang,
  teachers,
  classes,
  rooms,
  subjects,
  lessons,
  placements,
  timeOffMatrix = {},
  advancedRules = [],
  onToggleRule,
  cycleDays,
  periodsPerDay,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Compute constraints list
  const constraintRows = useMemo<ConstraintRow[]>(() => {
    const list: ConstraintRow[] = [];

    // 1. TimeOff Constraints
    for (const teacher of teachers) {
      let blockedCount = 0;
      let disfavoredCount = 0;
      let violations = 0;

      for (let d = 0; d < cycleDays; d++) {
        for (let p = 0; p < periodsPerDay; p++) {
          const key = `${teacher.id}-${d}-${p}`;
          const state = timeOffMatrix[key];
          if (state === 0) {
            blockedCount++;
            // Check if any placement violates it
            const isViolated = placements.some((pl) => {
              const l = lessons.find((les) => les.id === pl.lessonId);
              return (
                l &&
                l.teacherId === teacher.id &&
                pl.dayIndex === d &&
                pl.periodIndex === p
              );
            });
            if (isViolated) violations++;
          } else if (state === 2) {
            disfavoredCount++;
          }
        }
      }

      if (blockedCount > 0 || disfavoredCount > 0) {
        list.push({
          id: `TO_${teacher.id}`,
          category: 'TIMEOFF',
          title: `Time-Off Restrictions: ${teacher.name}`,
          titleAr: `تفريغ المعلم: ${teacher.name}`,
          entityName: teacher.name,
          ruleValue: `${blockedCount} ${isRtl ? 'محظور' : 'blocked'}, ${disfavoredCount} ${isRtl ? 'غير مفضل' : 'disfavored'}`,
          status: violations > 0 ? 'VIOLATED' : 'SATISFIED',
          violationCount: violations,
          enabled: true,
        });
      }
    }

    // 2. Teacher Max Daily Hours
    for (const teacher of teachers) {
      const maxH = teacher.maxDailyHours ?? 5;
      let violations = 0;

      for (let d = 0; d < cycleDays; d++) {
        const count = placements.filter((p) => {
          const l = lessons.find((les) => les.id === p.lessonId);
          return l && l.teacherId === teacher.id && p.dayIndex === d;
        }).length;
        if (count > maxH) violations += count - maxH;
      }

      list.push({
        id: `MAX_DAILY_${teacher.id}`,
        category: 'TEACHER_LOAD',
        title: `Max Daily Hours: ${teacher.name}`,
        titleAr: `الحد اليومي للحصص: ${teacher.name}`,
        entityName: teacher.name,
        ruleValue: `${maxH} ${isRtl ? 'حصص/يوم' : 'periods/day'}`,
        status: violations > 0 ? 'VIOLATED' : 'SATISFIED',
        violationCount: violations,
        enabled: true,
      });
    }

    // 3. Subject Room Requirements
    for (const sub of subjects) {
      if (sub.requiredRoomType && sub.requiredRoomType !== 'STANDARD') {
        const matchingRooms = rooms.filter((r) => r.type === sub.requiredRoomType);
        list.push({
          id: `REQ_ROOM_${sub.id}`,
          category: 'ROOM_REQ',
          title: `Special Room Required: ${sub.name}`,
          titleAr: `قاعة متخصصة مطلوبة لمادة: ${sub.name}`,
          entityName: sub.name,
          ruleValue: `${sub.requiredRoomType} (${matchingRooms.length} ${isRtl ? 'متاحة' : 'avail'})`,
          status: 'SATISFIED',
          violationCount: 0,
          enabled: true,
        });
      }
    }

    // 4. Advanced Relations
    for (const rule of advancedRules) {
      list.push({
        id: rule.id,
        category: 'ADVANCED',
        title: rule.name,
        titleAr: rule.nameAr || rule.name,
        entityName: isRtl ? 'قيد عام' : 'Global Rule',
        ruleValue: rule.parameterValue !== undefined ? `Value: ${rule.parameterValue}` : (isRtl ? 'مفعل' : 'Active'),
        status: 'SATISFIED',
        violationCount: 0,
        enabled: rule.enabled,
        canToggle: true,
      });
    }

    return list;
  }, [teachers, classes, rooms, subjects, lessons, placements, timeOffMatrix, advancedRules, cycleDays, periodsPerDay, isRtl]);

  const filteredRows = constraintRows.filter((r) => {
    if (selectedCategory !== 'ALL' && r.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.titleAr.includes(q) ||
        r.entityName.toLowerCase().includes(q);
      if (!match) return false;
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
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'سجل كافة القيود والشروط المُدخلة' : 'Inputted Constraints Master Ledger'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'عرض شامل لكافة الشروط والقواعد وجداول التفريغ والتحقق من التزام الجدول بها'
                  : 'Master list of active scheduling rules, limits, and time-off constraints'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {['ALL', 'TIMEOFF', 'TEACHER_LOAD', 'ROOM_REQ', 'ADVANCED'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {cat === 'ALL'
                  ? isRtl ? 'الكل' : 'All'
                  : cat === 'TIMEOFF'
                  ? isRtl ? 'جداول التفريغ' : 'Time-Off'
                  : cat === 'TEACHER_LOAD'
                  ? isRtl ? 'أنصبة المعلمين' : 'Teacher Limits'
                  : cat === 'ROOM_REQ'
                  ? isRtl ? 'اشتراطات القاعات' : 'Room Rules'
                  : isRtl ? 'قيود متقدمة' : 'Advanced Relations'}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث في القيود أو المعلمين...' : 'Search constraints...'}
              className="w-full text-xs ps-8 pe-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>

        {/* Constraints List Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] border-b border-slate-200">
                  <th className="p-2.5 text-start">{isRtl ? 'اسم القيد / الشرط' : 'Constraint Rule'}</th>
                  <th className="p-2.5 text-start">{isRtl ? 'الجهة المعنية' : 'Entity'}</th>
                  <th className="p-2.5 text-start">{isRtl ? 'القيمة / المعيار' : 'Value / Setting'}</th>
                  <th className="p-2.5 text-center">{isRtl ? 'حالة الالتزام' : 'Compliance'}</th>
                  <th className="p-2.5 text-center">{isRtl ? 'التفعيل' : 'Active'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold text-slate-900">
                      {isRtl ? row.titleAr : row.title}
                    </td>
                    <td className="p-2.5 text-slate-600 font-medium">{row.entityName}</td>
                    <td className="p-2.5 text-slate-700 font-mono text-[11px]">{row.ruleValue}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          row.status === 'VIOLATED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.status === 'VIOLATED' ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>{isRtl ? `مخترق (${row.violationCount})` : `Violated (${row.violationCount})`}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isRtl ? 'مستوفى 100%' : 'Satisfied'}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      {row.canToggle && onToggleRule ? (
                        <button
                          onClick={() => onToggleRule(row.id)}
                          className="text-sky-600 hover:text-sky-800"
                        >
                          {row.enabled ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {isRtl ? 'دائم' : 'Fixed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isRtl
              ? `إجمالي الشروط المسجلة: ${constraintRows.length}`
              : `Total defined constraints: ${constraintRows.length}`}
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
