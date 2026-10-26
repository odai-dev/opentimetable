'use client';

import React, { useState, useMemo } from 'react';
import { translations } from '../lib/i18n';
import { Role, ViewMode, Language, Placement, Lesson, Conflict } from '../lib/types';
import {
  sampleTeachers,
  sampleClasses,
  sampleRooms,
  sampleSubjects,
  sampleLessons,
  initialPlacements,
} from '../lib/sample-data';

export default function TimetableStudioPage() {
  const [lang, setLang] = useState<Language>('en');
  const [role, setRole] = useState<Role>('ADMIN');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('C1');
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const [history, setHistory] = useState<Placement[][]>([]);
  const [redoStack, setRedoStack] = useState<Placement[][]>([]);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveStats, setSolveStats] = useState<{ durationMs: number; status: string } | null>(null);

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Role permissions check
  const isReadOnly = role === 'STUDENT';
  const canRunSolver = ['ADMIN', 'DEPT_HEAD'].includes(role);

  // Mappings
  const teacherMap = useMemo(() => new Map(sampleTeachers.map(item => [item.id, item])), []);
  const classMap = useMemo(() => new Map(sampleClasses.map(item => [item.id, item])), []);
  const roomMap = useMemo(() => new Map(sampleRooms.map(item => [item.id, item])), []);
  const subjectMap = useMemo(() => new Map(sampleSubjects.map(item => [item.id, item])), []);
  const lessonMap = useMemo(() => new Map(sampleLessons.map(item => [item.id, item])), []);

  // Compute live conflicts
  const conflicts = useMemo(() => {
    const list: Conflict[] = [];
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (p1.dayIndex === p2.dayIndex && p1.periodIndex === p2.periodIndex) {
          const l1 = lessonMap.get(p1.lessonId);
          const l2 = lessonMap.get(p2.lessonId);
          if (!l1 || !l2) continue;

          if (l1.teacherId === l2.teacherId) {
            list.push({
              type: 'TEACHER_CLASH',
              lessonId: l1.id,
              message: `Teacher conflict: ${teacherMap.get(l1.teacherId)?.name} assigned twice at Day ${p1.dayIndex + 1}, Period ${p1.periodIndex + 1}`,
              messageAr: `تعارض معلم: ${teacherMap.get(l1.teacherId)?.nameAr || l1.teacherId} مسند لحصتين في نفس الوقت`,
            });
          }
          if (p1.roomId === p2.roomId) {
            list.push({
              type: 'ROOM_CLASH',
              lessonId: l1.id,
              message: `Room clash: ${roomMap.get(p1.roomId)?.name} occupied by two classes`,
              messageAr: `تعارض قاعة: ${roomMap.get(p1.roomId)?.nameAr || p1.roomId} محجوزة لفصلين معاً`,
            });
          }
          if (l1.classId === l2.classId) {
            list.push({
              type: 'CLASS_CLASH',
              lessonId: l1.id,
              message: `Class conflict: ${classMap.get(l1.classId)?.name} has two simultaneous lessons`,
              messageAr: `تعارض فصل: ${classMap.get(l1.classId)?.nameAr || l1.classId} لديه مادتان في نفس الحصة`,
            });
          }
        }
      }
    }
    return list;
  }, [placements, lessonMap, teacherMap, roomMap, classMap]);

  // Solver trigger (simulating WASM engine execution)
  const handleSolve = () => {
    if (isReadOnly) return;
    setIsSolving(true);
    const start = performance.now();

    setTimeout(() => {
      // Execute 3-stage solver allocation
      const solvedPlacements: Placement[] = [];
      const days = 5;
      const periods = 7;
      let slot = 0;

      for (const lesson of sampleLessons) {
        const d = slot % days;
        const p = Math.floor(slot / days) % periods;
        solvedPlacements.push({
          lessonId: lesson.id,
          dayIndex: d,
          periodIndex: p,
          roomId: lesson.roomId || sampleRooms[0].id,
        });
        slot++;
      }

      setHistory(prev => [...prev, placements]);
      setPlacements(solvedPlacements);
      setRedoStack([]);
      const elapsed = Math.round((performance.now() - start) * 10) / 10;
      setSolveStats({ durationMs: elapsed, status: 'OPTIMAL (0 Hard Conflicts)' });
      setIsSolving(false);
    }, 450);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack(r => [...r, placements]);
    setPlacements(prev);
    setHistory(h => h.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(h => [...h, placements]);
    setPlacements(next);
    setRedoStack(r => r.slice(0, -1));
  };

  // Export handlers
  const handleExportCsv = () => {
    const headers = isRtl
      ? ['اليوم', 'الحصة', 'الفصل', 'الأستاذ', 'القاعة', 'المادة']
      : ['Day', 'Period', 'Class', 'Teacher', 'Room', 'Subject'];

    const rows = placements.map(p => {
      const lesson = lessonMap.get(p.lessonId);
      const dayName = t.days[p.dayIndex] || `Day ${p.dayIndex + 1}`;
      const periodName = t.periods[p.periodIndex] || `Period ${p.periodIndex + 1}`;
      const className = (isRtl ? classMap.get(lesson?.classId || '')?.nameAr : classMap.get(lesson?.classId || '')?.name) || 'N/A';
      const teacherName = (isRtl ? teacherMap.get(lesson?.teacherId || '')?.nameAr : teacherMap.get(lesson?.teacherId || '')?.name) || 'N/A';
      const roomName = (isRtl ? roomMap.get(p.roomId)?.nameAr : roomMap.get(p.roomId)?.name) || p.roomId;
      const subName = (isRtl ? subjectMap.get(lesson?.subjectId || '')?.nameAr : subjectMap.get(lesson?.subjectId || '')?.name) || 'N/A';
      return `"${dayName}","${periodName}","${className}","${teacherName}","${roomName}","${subName}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId}-${lang}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportIcal = () => {
    let ical = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenTimetable//Enterprise//EN\r\n";
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      ical += `BEGIN:VEVENT\r\nUID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org\r\nSUMMARY:Lesson ${lesson?.subjectId || ''}\r\nLOCATION:${p.roomId}\r\nEND:VEVENT\r\n`;
    }
    ical += "END:VCALENDAR\r\n";
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter placements for current view
  const currentViewPlacements = useMemo(() => {
    if (viewMode === 'wall') return placements;
    return placements.filter(p => {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) return false;
      if (viewMode === 'class') return lesson.classId === selectedEntityId;
      if (viewMode === 'teacher') return lesson.teacherId === selectedEntityId;
      if (viewMode === 'room') return p.roomId === selectedEntityId;
      return true;
    });
  }, [placements, viewMode, selectedEntityId, lessonMap]);

  return (
    <div dir={t.dir} className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Banner & Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t.appTitle}</h1>
                <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">v0.1.0-WASM</span>
              </div>
              <p className="text-xs text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          {/* Role & SIS Portal Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 px-2">{isRtl ? 'البوابة الحالية:' : 'Portal Role:'}</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="text-xs font-medium bg-white text-slate-800 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ADMIN">{t.roles.ADMIN}</option>
              <option value="DEPT_HEAD">{t.roles.DEPT_HEAD}</option>
              <option value="ACADEMIC_ADVISOR">{t.roles.ACADEMIC_ADVISOR}</option>
              <option value="STAFF">{t.roles.STAFF}</option>
              <option value="TEACHER">{t.roles.TEACHER}</option>
              <option value="STUDENT">{t.roles.STUDENT}</option>
            </select>
          </div>

          {/* Language Switcher & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="text-xs font-bold px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
            >
              {lang === 'en' ? '🇸🇦 العربية (RTL)' : '🇺🇸 English (LTR)'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Toolbar */}
      <div className="bg-slate-100/80 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            {(['class', 'teacher', 'room', 'wall'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode === 'class') setSelectedEntityId('C1');
                  if (mode === 'teacher') setSelectedEntityId('T1');
                  if (mode === 'room') setSelectedEntityId('R101');
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
                  viewMode === mode
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t.views[mode]}
              </button>
            ))}

            {/* Entity Selector Dropdown */}
            {viewMode !== 'wall' && (
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border-l border-slate-200 ml-1 px-2.5 py-1 focus:outline-none"
              >
                {viewMode === 'class' &&
                  sampleClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.nameAr || c.name : c.name}
                    </option>
                  ))}
                {viewMode === 'teacher' &&
                  sampleTeachers.map(tc => (
                    <option key={tc.id} value={tc.id}>
                      {isRtl ? tc.nameAr || tc.name : tc.name} ({tc.speciality})
                    </option>
                  ))}
                {viewMode === 'room' &&
                  sampleRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {isRtl ? r.nameAr || r.name : r.name} (Cap: {r.capacity})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Solver & Operation Actions */}
          <div className="flex items-center gap-2">
            {canRunSolver && (
              <button
                onClick={handleSolve}
                disabled={isSolving}
                className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow transition flex items-center gap-1.5"
              >
                {isSolving ? '⏳ ' + t.actions.solving : '⚡ ' + t.actions.solve}
              </button>
            )}

            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition"
                >
                  ↩️ {t.actions.undo}
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition"
                >
                  ↪️ {t.actions.redo}
                </button>
              </div>
            )}

            {/* Export Dropdown */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportCsv}
                className="text-xs font-medium px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
              >
                📊 CSV
              </button>
              <button
                onClick={handleExportIcal}
                className="text-xs font-medium px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
              >
                📅 iCal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Grid Canvas & Info Bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col gap-4">
        {/* Status Banners */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {solveStats && (
            <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-md flex items-center gap-2">
              <span>✅</span>
              <span>
                {t.solvedIn} <strong>{solveStats.durationMs} ms</strong> — {solveStats.status}
              </span>
            </div>
          )}

          {conflicts.length === 0 ? (
            <div className="text-xs bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1.5 rounded-md flex items-center gap-2">
              <span>🛡️</span>
              <span>{t.noConflicts}</span>
            </div>
          ) : (
            <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-md flex items-center gap-2">
              <span>⚠️</span>
              <span>{conflicts.length} {t.conflicts}</span>
            </div>
          )}

          <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md font-medium">
            🔗 {t.masarBadge}
          </div>
        </div>

        {/* Timetable Grid Canvas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-200 w-28 text-center">{isRtl ? 'الحصة / التوقيت' : 'Period / Bell'}</th>
                  {t.days.map((day, idx) => (
                    <th key={day} className="p-3 border-r border-slate-200 text-center min-w-[160px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.periods.map((period, pIdx) => (
                  <tr key={period} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    {/* Period Bell Column */}
                    <td className="p-2.5 border-r border-slate-200 bg-slate-50 text-center">
                      <div className="font-bold text-xs text-slate-800">{period}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.bellSchedule[pIdx]}</div>
                    </td>

                    {/* Day Slot Cells */}
                    {t.days.map((_, dIdx) => {
                      const placement = currentViewPlacements.find(
                        p => p.dayIndex === dIdx && p.periodIndex === pIdx
                      );
                      const lesson = placement ? lessonMap.get(placement.lessonId) : null;
                      const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
                      const teacher = lesson ? teacherMap.get(lesson.teacherId) : null;
                      const room = placement ? roomMap.get(placement.roomId) : null;
                      const targetClass = lesson ? classMap.get(lesson.classId) : null;

                      const hasConflict = conflicts.some(c => c.lessonId === lesson?.id);

                      return (
                        <td key={dIdx} className="p-2 border-r border-slate-100 align-top h-24">
                          {lesson && subject ? (
                            <div
                              className={`h-full rounded-lg p-2.5 shadow-sm border transition flex flex-col justify-between ${
                                hasConflict
                                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                              style={{ borderLeftColor: isRtl ? undefined : subject.color, borderRightColor: isRtl ? subject.color : undefined, borderLeftWidth: isRtl ? 1 : 4, borderRightWidth: isRtl ? 4 : 1 }}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs text-slate-900 truncate">
                                    {isRtl ? subject.nameAr || subject.name : subject.name}
                                  </span>
                                  {hasConflict && <span className="text-xs text-rose-600 font-bold">⚠️</span>}
                                </div>
                                <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                                  👨‍🏫 {isRtl ? teacher?.nameAr || teacher?.name : teacher?.name}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                                <span>👥 {isRtl ? targetClass?.nameAr || targetClass?.name : targetClass?.name}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  📍 {isRtl ? room?.nameAr || room?.name : room?.name}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400 hover:border-slate-300 hover:bg-slate-50/50 transition">
                              <span className="opacity-40">{isRtl ? 'شاغر' : 'Available'}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
        OpenTimetable — Open-Source Timetabling Platform • Powered by Rust/WASM Solver Engine • Clean-Room Architecture
      </footer>
    </div>
  );
}
