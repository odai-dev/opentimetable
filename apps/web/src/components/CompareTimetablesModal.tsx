'use client';

import React, { useState, useMemo } from 'react';
import {
  Placement,
  Lesson,
  Teacher,
  ClassGroup,
  Room,
  Subject,
  TimetableDiffItem,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  GitCompare,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle,
  X,
  Search,
  Filter,
} from 'lucide-react';

interface CompareTimetablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  currentPlacements: Placement[];
  baselinePlacements: Placement[];
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
  customDays?: string[];
  customPeriods?: string[];
}

export const CompareTimetablesModal: React.FC<CompareTimetablesModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentPlacements,
  baselinePlacements,
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
  customDays,
  customPeriods,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('MOVED');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const daysList = customDays && customDays.length > 0 ? customDays : t.days;

  // Diff engine
  const diffItems = useMemo<TimetableDiffItem[]>(() => {
    const baselineMap = new Map<string, Placement>();
    for (const p of baselinePlacements) baselineMap.set(p.lessonId, p);

    const currentMap = new Map<string, Placement>();
    for (const p of currentPlacements) currentMap.set(p.lessonId, p);

    const items: TimetableDiffItem[] = [];

    // Union of all lesson IDs
    const allLessonIds = new Set<string>([
      ...Array.from(baselineMap.keys()),
      ...Array.from(currentMap.keys()),
    ]);

    for (const lessonId of allLessonIds) {
      const base = baselineMap.get(lessonId);
      const curr = currentMap.get(lessonId);
      const lesson = lessonMap.get(lessonId);

      const sub = lesson ? subjectMap.get(lesson.subjectId)?.name : 'Subject';
      const tc = lesson ? teacherMap.get(lesson.teacherId)?.name : 'Teacher';
      const cls = lesson ? classMap.get(lesson.classId)?.name : 'Class';

      if (base && curr) {
        if (
          base.dayIndex === curr.dayIndex &&
          base.periodIndex === curr.periodIndex &&
          base.roomId === curr.roomId
        ) {
          items.push({
            lessonId,
            status: 'UNCHANGED',
            oldSlot: { dayIndex: base.dayIndex, periodIndex: base.periodIndex, roomId: base.roomId },
            newSlot: { dayIndex: curr.dayIndex, periodIndex: curr.periodIndex, roomId: curr.roomId },
            subjectName: sub || '',
            teacherName: tc || '',
            className: cls || '',
          });
        } else {
          items.push({
            lessonId,
            status: 'MOVED',
            oldSlot: { dayIndex: base.dayIndex, periodIndex: base.periodIndex, roomId: base.roomId },
            newSlot: { dayIndex: curr.dayIndex, periodIndex: curr.periodIndex, roomId: curr.roomId },
            subjectName: sub || '',
            teacherName: tc || '',
            className: cls || '',
          });
        }
      } else if (!base && curr) {
        items.push({
          lessonId,
          status: 'ADDED',
          newSlot: { dayIndex: curr.dayIndex, periodIndex: curr.periodIndex, roomId: curr.roomId },
          subjectName: sub || '',
          teacherName: tc || '',
          className: cls || '',
        });
      } else if (base && !curr) {
        items.push({
          lessonId,
          status: 'REMOVED',
          oldSlot: { dayIndex: base.dayIndex, periodIndex: base.periodIndex, roomId: base.roomId },
          subjectName: sub || '',
          teacherName: tc || '',
          className: cls || '',
        });
      }
    }

    return items;
  }, [currentPlacements, baselinePlacements, lessonMap, subjectMap, teacherMap, classMap]);

  const movedCount = diffItems.filter((i) => i.status === 'MOVED').length;
  const addedCount = diffItems.filter((i) => i.status === 'ADDED').length;
  const removedCount = diffItems.filter((i) => i.status === 'REMOVED').length;
  const unchangedCount = diffItems.filter((i) => i.status === 'UNCHANGED').length;

  const filteredItems = diffItems.filter((item) => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.subjectName.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const formatSlot = (slot?: { dayIndex: number; periodIndex: number; roomId: string }) => {
    if (!slot) return '-';
    const dayName = daysList[slot.dayIndex] || `Day ${slot.dayIndex + 1}`;
    const roomName = roomMap.get(slot.roomId)?.name || slot.roomId || '';
    return `${dayName.slice(0, 3)} - ${isRtl ? 'ح' : 'P'}${slot.periodIndex + 1}${roomName ? ` (${roomName})` : ''}`;
  };

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
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'مقارنة نسختين من الجدول (Visual Diff)' : 'Timetable Revision Compare'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'مقارنة المسودة الحالية مع النسخة المرجعية السابقة وإبراز الحصص المنقولة'
                  : 'Compare current modifications against baseline schedule snapshot'}
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

        {/* Diff Metric Summary Badges */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => setFilterStatus('MOVED')}
            className={`p-2 rounded-lg border text-start transition ${
              filterStatus === 'MOVED'
                ? 'bg-amber-100 border-amber-400 font-bold'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <span className="text-amber-800 block text-[10px] font-bold">
              {isRtl ? 'حصص نُقلت (Moved)' : 'Moved Lessons'}
            </span>
            <span className="text-base font-black text-amber-900">{movedCount}</span>
          </button>

          <button
            onClick={() => setFilterStatus('ADDED')}
            className={`p-2 rounded-lg border text-start transition ${
              filterStatus === 'ADDED'
                ? 'bg-emerald-100 border-emerald-400 font-bold'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <span className="text-emerald-800 block text-[10px] font-bold">
              {isRtl ? 'حصص جديدة (Added)' : 'Added Lessons'}
            </span>
            <span className="text-base font-black text-emerald-900">{addedCount}</span>
          </button>

          <button
            onClick={() => setFilterStatus('REMOVED')}
            className={`p-2 rounded-lg border text-start transition ${
              filterStatus === 'REMOVED'
                ? 'bg-rose-100 border-rose-400 font-bold'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <span className="text-rose-800 block text-[10px] font-bold">
              {isRtl ? 'حصص أُفرغت (Removed)' : 'Removed Lessons'}
            </span>
            <span className="text-base font-black text-rose-900">{removedCount}</span>
          </button>

          <button
            onClick={() => setFilterStatus('ALL')}
            className={`p-2 rounded-lg border text-start transition ${
              filterStatus === 'ALL'
                ? 'bg-sky-100 border-sky-400 font-bold'
                : 'bg-sky-50/70 border-sky-200'
            }`}
          >
            <span className="text-sky-800 block text-[10px] font-bold">
              {isRtl ? 'إجمالي الحصص (Total)' : 'Total Lessons'}
            </span>
            <span className="text-base font-black text-sky-900">{diffItems.length}</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث بالمادة، المعلم، أو الفصل...' : 'Filter by subject, teacher, class...'}
              className="w-full text-xs ps-8 pe-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:border-teal-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            {isRtl ? `التغييرات المعروضة: ${filteredItems.length}` : `Displaying ${filteredItems.length} changes`}
          </span>
        </div>

        {/* Change List Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {isRtl ? 'لا توجد تغييرات مطابقة لهذا الفلتر' : 'No differences found for this filter'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] border-b border-slate-200">
                    <th className="p-2 text-start">{isRtl ? 'المادة' : 'Subject'}</th>
                    <th className="p-2 text-start">{isRtl ? 'الفصل' : 'Class'}</th>
                    <th className="p-2 text-start">{isRtl ? 'المعلم' : 'Teacher'}</th>
                    <th className="p-2 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="p-2 text-start">{isRtl ? 'الموقع السابق (Baseline)' : 'Previous Slot'}</th>
                    <th className="p-2 text-start">{isRtl ? 'الموقع الحالي (Current)' : 'New Slot'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.lessonId} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-800">{item.subjectName}</td>
                      <td className="p-2 text-slate-600">{item.className}</td>
                      <td className="p-2 text-slate-600">{item.teacherName}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'MOVED'
                              ? 'bg-amber-100 text-amber-800'
                              : item.status === 'ADDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'REMOVED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-2 text-slate-500 font-mono text-[11px]">
                        {formatSlot(item.oldSlot)}
                      </td>
                      <td className="p-2 font-mono text-[11px] font-bold text-teal-800">
                        {formatSlot(item.newSlot)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs text-slate-500">
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
