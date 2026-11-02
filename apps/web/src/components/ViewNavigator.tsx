'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { ViewMode, ClassGroup, Teacher, Room, Conflict } from '../lib/types';
import { translations } from '../lib/i18n';

interface ViewNavigatorProps {
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  classes: ClassGroup[];
  teachers: Teacher[];
  rooms: Room[];
  conflicts: Conflict[];
  totalLessons: number;
  placedLessonsCount: number;
  unplacedCount: number;
  solveDurationMs?: number | null;
}

export const ViewNavigator: React.FC<ViewNavigatorProps> = ({
  lang,
  viewMode,
  selectedEntityId,
  setSelectedEntityId,
  classes,
  teachers,
  rooms,
  conflicts,
  totalLessons,
  placedLessonsCount,
  unplacedCount,
  solveDurationMs,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Get active entities list for navigation
  const entities = React.useMemo(() => {
    if (viewMode === 'class') {
      return classes.map((c) => ({ id: c.id, label: isRtl ? c.nameAr || c.name : c.name }));
    }
    if (viewMode === 'teacher') {
      return teachers.map((tc) => ({
        id: tc.id,
        label: `${isRtl ? tc.nameAr || tc.name : tc.name} (${tc.speciality})`,
      }));
    }
    if (viewMode === 'room') {
      return rooms.map((r) => ({
        id: r.id,
        label: `${isRtl ? r.nameAr || r.name : r.name} [Cap: ${r.capacity}]`,
      }));
    }
    return [];
  }, [viewMode, classes, teachers, rooms, isRtl]);

  const currentIndex = entities.findIndex((e) => e.id === selectedEntityId);

  const handlePrev = () => {
    if (entities.length === 0) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : entities.length - 1;
    setSelectedEntityId(entities[newIdx].id);
  };

  const handleNext = () => {
    if (entities.length === 0) return;
    const newIdx = currentIndex < entities.length - 1 ? currentIndex + 1 : 0;
    setSelectedEntityId(entities[newIdx].id);
  };

  return (
    <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Left: Entity Stepper (< Dropdown >) */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-xs shrink-0 border border-sky-200">
          {t.views[viewMode]}
        </span>
        <span className="font-semibold text-slate-600 hidden sm:inline">
          {t.viewNav.showing}
        </span>

        {viewMode !== 'wall' ? (
          <div className="flex items-center bg-white border border-slate-300 rounded-md shadow-xs overflow-hidden">
            <button
              onClick={handlePrev}
              title={t.viewNav.previous}
              className="px-2 py-1.5 hover:bg-slate-100 border-r border-slate-200 text-slate-600 active:bg-slate-200 transition"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 px-3 py-1 focus:outline-none cursor-pointer text-xs"
            >
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleNext}
              title={t.viewNav.next}
              className="px-2 py-1.5 hover:bg-slate-100 border-l border-slate-200 text-slate-600 active:bg-slate-200 transition"
            >
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="px-3 py-1 bg-white border border-slate-300 rounded font-bold text-sky-800 shadow-xs">
            {isRtl ? 'الجدول العام للجامعة / الكلية (كافة الدفعات وهيئة التدريس والقاعات)' : 'Master University Timetable (All Faculties, Sections & Halls)'}
          </div>
        )}
      </div>

      {/* Right: Clean Desktop Schedule Status */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Placed vs Total lessons counter */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-300 shadow-xs text-slate-700 font-medium">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>
            {isRtl ? 'المحاضرات المسكنة:' : 'Placed Lectures:'}{' '}
            <strong className="text-slate-900">{placedLessonsCount}</strong> / {totalLessons}
          </span>
          {unplacedCount > 0 && (
            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
              {unplacedCount} {isRtl ? 'محاضرة متبقية' : 'pending'}
            </span>
          )}
        </div>

        {/* Conflict indicator - only displays when real conflicts exist */}
        {conflicts.length > 0 && (
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-800 px-2.5 py-1 rounded shadow-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>
              {conflicts.length} {t.viewNav.stats.conflicts}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
