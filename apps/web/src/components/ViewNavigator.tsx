'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { ViewMode, ClassGroup, Teacher, Room, Conflict, Faculty, AcademicMajor } from '../lib/types';
import { translations } from '../lib/i18n';

interface ViewNavigatorProps {
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  classes: ClassGroup[];
  teachers: Teacher[];
  rooms: Room[];
  faculties?: Faculty[];
  majors?: AcademicMajor[];
  conflicts: Conflict[];
  totalLessons: number;
  placedLessonsCount: number;
  unplacedCount: number;
  solveDurationMs?: number | null;
  setViewMode?: (mode: ViewMode) => void;
}

export const ViewNavigator: React.FC<ViewNavigatorProps> = ({
  lang,
  viewMode,
  selectedEntityId,
  setSelectedEntityId,
  classes,
  teachers,
  rooms,
  faculties = [],
  majors = [],
  conflicts,
  totalLessons,
  placedLessonsCount,
  unplacedCount,
  solveDurationMs,
  setViewMode,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Cascading filters for university structure navigation
  const [navFacultyId, setNavFacultyId] = React.useState<string>('ALL');
  const [navMajorId, setNavMajorId] = React.useState<string>('ALL');

  const viewTabs: { mode: ViewMode; labelEn: string; labelAr: string }[] = [
    { mode: 'class', labelEn: 'Levels & Sections', labelAr: 'المستويات والشعب' },
    { mode: 'teacher', labelEn: 'Faculty', labelAr: 'أعضاء هيئة التدريس' },
    { mode: 'room', labelEn: 'Halls & Labs', labelAr: 'القاعات والمعامل' },
    { mode: 'wall', labelEn: 'Master Timetable', labelAr: 'الجدول العام' },
  ];

  const handleModeSwitch = (mode: ViewMode) => {
    if (setViewMode) {
      setViewMode(mode);
      if (mode === 'class' && classes.length > 0 && !classes.some((c) => c.id === selectedEntityId)) {
        setSelectedEntityId(classes[0].id);
      } else if (mode === 'teacher' && teachers.length > 0 && !teachers.some((tc) => tc.id === selectedEntityId)) {
        setSelectedEntityId(teachers[0].id);
      } else if (mode === 'room' && rooms.length > 0 && !rooms.some((r) => r.id === selectedEntityId)) {
        setSelectedEntityId(rooms[0].id);
      }
    }
  };

  // Filter classes according to cascading university filters
  const filteredClasses = React.useMemo(() => {
    return classes.filter((c) => {
      const matchFac = navFacultyId === 'ALL' || c.facultyId === navFacultyId;
      const matchMaj = navMajorId === 'ALL' || c.majorId === navMajorId;
      return matchFac && matchMaj;
    });
  }, [classes, navFacultyId, navMajorId]);

  // Keep selection valid when filters change
  React.useEffect(() => {
    if (viewMode === 'class' && filteredClasses.length > 0) {
      if (!filteredClasses.some((c) => c.id === selectedEntityId)) {
        setSelectedEntityId(filteredClasses[0].id);
      }
    }
  }, [filteredClasses, selectedEntityId, setSelectedEntityId, viewMode]);

  // Get active entities list for navigation
  const entities = React.useMemo(() => {
    if (viewMode === 'class') {
      return filteredClasses.map((c) => {
        const maj = majors.find((m) => m.id === c.majorId);
        const prefix = maj ? `[${maj.code}] ` : '';
        const cap = c.studentCount ? ` (👥 ${c.studentCount})` : '';
        return {
          id: c.id,
          label: `${prefix}${isRtl ? c.nameAr || c.name : c.name}${cap}`,
        };
      });
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
  }, [viewMode, filteredClasses, teachers, rooms, majors, isRtl]);

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
      {/* Left: View Mode Switcher + Entity Stepper (< Dropdown >) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Higher Education View Switcher */}
        <div className="inline-flex rounded-md shadow-xs bg-slate-200/90 p-0.5 border border-slate-300" role="group">
          {viewTabs.map((tab) => {
            const isActive = viewMode === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => handleModeSwitch(tab.mode)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
                title={isRtl ? tab.labelAr : tab.labelEn}
              >
                <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Cascading University Filters for Class View */}
        {viewMode === 'class' && faculties.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={navFacultyId}
              onChange={(e) => {
                setNavFacultyId(e.target.value);
                setNavMajorId('ALL');
              }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium text-xs shadow-xs focus:ring-1 focus:ring-sky-500"
              title={isRtl ? 'فلترة حسب الكلية' : 'Filter by College'}
            >
              <option value="ALL">{isRtl ? '🏛️ كل الكليات' : '🏛️ All Colleges'}</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {isRtl ? f.nameAr || f.name : f.code}
                </option>
              ))}
            </select>

            <select
              value={navMajorId}
              onChange={(e) => setNavMajorId(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium text-xs shadow-xs focus:ring-1 focus:ring-sky-500"
              title={isRtl ? 'فلترة حسب التخصص' : 'Filter by Major'}
            >
              <option value="ALL">{isRtl ? '🎓 كل التخصصات' : '🎓 All Majors'}</option>
              {majors
                .filter((m) => navFacultyId === 'ALL' || m.facultyId === navFacultyId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {isRtl ? m.nameAr || m.name : m.code}
                  </option>
                ))}
            </select>
          </div>
        )}

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
              className="bg-transparent font-bold text-slate-800 px-3 py-1 focus:outline-none cursor-pointer text-xs max-w-[280px] truncate"
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
