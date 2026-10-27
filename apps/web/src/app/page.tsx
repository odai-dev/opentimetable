'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { translations } from '../lib/i18n';
import {
  Role,
  ViewMode,
  Language,
  RibbonTab,
  GenerationComplexity,
  BasicDataTab,
  Placement,
  Lesson,
  Conflict,
} from '../lib/types';
import {
  sampleTeachers,
  sampleClasses,
  sampleRooms,
  sampleSubjects,
  sampleLessons,
  initialPlacements,
} from '../lib/sample-data';
import { RibbonToolbar } from '../components/RibbonToolbar';
import { ViewNavigator } from '../components/ViewNavigator';
import { TimetableGrid } from '../components/TimetableGrid';
import { BottomCardDeck } from '../components/BottomCardDeck';
import { GenerateModal } from '../components/GenerateModal';
import { TimeOffModal } from '../components/TimeOffModal';
import { BasicDataModal } from '../components/BasicDataModal';
import { TestTimetableModal } from '../components/TestTimetableModal';
import { useWasmSolver } from '../lib/useWasmSolver';

export default function TimetableStudioPage() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('main');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('C1');
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const [history, setHistory] = useState<Placement[][]>([]);
  const [redoStack, setRedoStack] = useState<Placement[][]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Background WASM Solver Hook
  const {
    isReady: isWasmReady,
    isSolving,
    progress: solverProgress,
    solveStats,
    solve: runWasmSolve,
    cancel: cancelWasmSolve,
  } = useWasmSolver();

  // Dialog states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isBasicDataModalOpen, setIsBasicDataModalOpen] = useState(false);
  const [basicDataInitialTab, setBasicDataInitialTab] = useState<BasicDataTab>('school');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Desktop timetable authoring mode (always full scheduling capability)
  const isReadOnly = false;
  const canRunSolver = true;

  // Fast entity lookup maps
  const teacherMap = useMemo(() => new Map(sampleTeachers.map((item) => [item.id, item])), []);
  const classMap = useMemo(() => new Map(sampleClasses.map((item) => [item.id, item])), []);
  const roomMap = useMemo(() => new Map(sampleRooms.map((item) => [item.id, item])), []);
  const subjectMap = useMemo(() => new Map(sampleSubjects.map((item) => [item.id, item])), []);
  const lessonMap = useMemo(() => new Map(sampleLessons.map((item) => [item.id, item])), []);

  // Compute live conflicts (Teacher clashes, Room clashes, Class clashes)
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

  // Undo / Redo operations
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isReadOnly) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, placements]);
    setPlacements(prev);
    setHistory((h) => h.slice(0, -1));
  }, [history, placements, isReadOnly]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isReadOnly) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, placements]);
    setPlacements(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack, placements, isReadOnly]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+G, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (canRunSolver && !isReadOnly) setIsGenerateModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, canRunSolver, isReadOnly]);

  // Record history helper
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev, placements]);
    setRedoStack([]);
  }, [placements]);

  // Place a lesson (from deck into specific or first free slot)
  const handlePlaceLesson = (
    lessonId: string,
    dayIndex?: number,
    periodIndex?: number,
    roomId?: string
  ) => {
    if (isReadOnly) return;
    recordHistory();

    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;

    const assignedRoom = roomId || lesson.roomId || sampleRooms[0].id;

    if (dayIndex !== undefined && periodIndex !== undefined) {
      // Place directly in target slot (removing existing placement for this lesson if present)
      const filtered = placements.filter((p) => p.lessonId !== lessonId);
      setPlacements([
        ...filtered,
        {
          lessonId,
          dayIndex,
          periodIndex,
          roomId: assignedRoom,
        },
      ]);
    } else {
      // Find first available conflict-free slot for this class/teacher
      let placed = false;
      for (let d = 0; d < 5 && !placed; d++) {
        for (let p = 0; p < 7 && !placed; p++) {
          const occupied = placements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId ||
              plc.roomId === assignedRoom
            );
          });

          if (!occupied) {
            setPlacements((prev) => [
              ...prev.filter((item) => item.lessonId !== lessonId),
              {
                lessonId,
                dayIndex: d,
                periodIndex: p,
                roomId: assignedRoom,
              },
            ]);
            placed = true;
          }
        }
      }

      // If no conflict-free slot found, place in first empty period for this class
      if (!placed) {
        for (let d = 0; d < 5 && !placed; d++) {
          for (let p = 0; p < 7 && !placed; p++) {
            const classOccupied = placements.some((plc) => {
              if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
              const existingLesson = lessonMap.get(plc.lessonId);
              return existingLesson?.classId === lesson.classId;
            });
            if (!classOccupied) {
              setPlacements((prev) => [
                ...prev.filter((item) => item.lessonId !== lessonId),
                {
                  lessonId,
                  dayIndex: d,
                  periodIndex: p,
                  roomId: assignedRoom,
                },
              ]);
              placed = true;
            }
          }
        }
      }
    }
  };

  // Remove a placement (unplaces card back to bottom deck)
  const handleRemovePlacement = (lessonId: string) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) => prev.filter((p) => p.lessonId !== lessonId));
  };

  // Move placed card to new slot
  const handleMovePlacement = (lessonId: string, targetDay: number, targetPeriod: number) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) =>
      prev.map((p) =>
        p.lessonId === lessonId
          ? { ...p, dayIndex: targetDay, periodIndex: targetPeriod }
          : p
      )
    );
  };

  // Auto-place all unplaced lessons
  const handleAutoPlaceAll = () => {
    if (isReadOnly) return;
    recordHistory();

    const currentPlacedIds = new Set(placements.map((p) => p.lessonId));
    const unplaced = sampleLessons.filter((l) => !currentPlacedIds.has(l.id));
    const newPlacements = [...placements];

    for (const lesson of unplaced) {
      let placed = false;
      for (let d = 0; d < 5 && !placed; d++) {
        for (let p = 0; p < 7 && !placed; p++) {
          const slotTaken = newPlacements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId
            );
          });

          if (!slotTaken) {
            newPlacements.push({
              lessonId: lesson.id,
              dayIndex: d,
              periodIndex: p,
              roomId: lesson.roomId || sampleRooms[0].id,
            });
            placed = true;
          }
        }
      }
    }

    setPlacements(newPlacements);
  };

  // Clear all placements (returns all cards to bottom deck)
  const handleClearPlacements = () => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements([]);
  };

  // Clear placements for a single row entity
  const handleClearEntityPlacements = (entityId: string) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) =>
      prev.filter((p) => {
        const lesson = lessonMap.get(p.lessonId);
        return (
          lesson?.classId !== entityId &&
          lesson?.teacherId !== entityId &&
          p.roomId !== entityId
        );
      })
    );
  };

  // Run Background Web Worker WASM Solver
  const handleRunGenerate = async (
    complexity: GenerationComplexity,
    options: { minimizeGaps: boolean; strictRooms: boolean; distributeSubjects: boolean }
  ) => {
    if (isReadOnly) return;
    recordHistory();

    try {
      const solvedPlacements = await runWasmSolve({
        lessons: sampleLessons,
        teachers: sampleTeachers,
        classes: sampleClasses,
        rooms: sampleRooms,
        subjects: sampleSubjects,
        complexity,
        options,
      });

      setPlacements(solvedPlacements);
      setIsGenerateModalOpen(false);
    } catch (err) {
      console.error('WASM Solver execution encountered error:', err);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = isRtl
      ? ['اليوم', 'الحصة', 'الفصل', 'الأستاذ', 'القاعة', 'المادة']
      : ['Day', 'Period', 'Class', 'Teacher', 'Room', 'Subject'];

    const rows = placements.map((p) => {
      const lesson = lessonMap.get(p.lessonId);
      const dayName = t.days[p.dayIndex] || `Day ${p.dayIndex + 1}`;
      const periodName = t.periods[p.periodIndex] || `Period ${p.periodIndex + 1}`;
      const className =
        (isRtl
          ? classMap.get(lesson?.classId || '')?.nameAr
          : classMap.get(lesson?.classId || '')?.name) || 'N/A';
      const teacherName =
        (isRtl
          ? teacherMap.get(lesson?.teacherId || '')?.nameAr
          : teacherMap.get(lesson?.teacherId || '')?.name) || 'N/A';
      const roomName =
        (isRtl ? roomMap.get(p.roomId)?.nameAr : roomMap.get(p.roomId)?.name) || p.roomId;
      const subName =
        (isRtl
          ? subjectMap.get(lesson?.subjectId || '')?.nameAr
          : subjectMap.get(lesson?.subjectId || '')?.name) || 'N/A';
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

  // Export iCal
  const handleExportIcal = () => {
    let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenTimetable//Enterprise//EN\r\n';
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      ical += `BEGIN:VEVENT\r\nUID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org\r\nSUMMARY:Lesson ${lesson?.subjectId || ''}\r\nLOCATION:${p.roomId}\r\nEND:VEVENT\r\n`;
    }
    ical += 'END:VCALENDAR\r\n';
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPreview = () => {
    window.print();
  };

  const handleOpenBasicData = (tab: BasicDataTab) => {
    setBasicDataInitialTab(tab);
    setIsBasicDataModalOpen(true);
  };

  const unplacedCount = sampleLessons.length - placements.length;

  return (
    <div dir={t.dir} className="h-screen w-screen flex flex-col overflow-hidden bg-slate-200">
      {/* 1. Desktop Ribbon Toolbar */}
      <RibbonToolbar
        lang={lang}
        setLang={setLang}
        activeTab={activeRibbonTab}
        setActiveTab={setActiveRibbonTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        canRunSolver={canRunSolver}
        isReadOnly={isReadOnly}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenGenerate={() => setIsGenerateModalOpen(true)}
        onOpenTimeOff={() => setIsTimeOffModalOpen(true)}
        onOpenBasicData={handleOpenBasicData}
        onOpenTest={() => setIsTestModalOpen(true)}
        onAutoPlaceAll={handleAutoPlaceAll}
        onClearPlacements={handleClearPlacements}
        onExportCsv={handleExportCsv}
        onExportIcal={handleExportIcal}
        onExportPdf={handlePrintPreview}
        onImportRoz={() => alert(isRtl ? 'تم تفعيل محلل ملفات .roz' : '.roz parser active')}
        onPrintPreview={handlePrintPreview}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
      />

      {/* 2. Sub-Toolbar: View Navigator & Metrics Bar */}
      <ViewNavigator
        lang={lang}
        viewMode={viewMode}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        classes={sampleClasses}
        teachers={sampleTeachers}
        rooms={sampleRooms}
        conflicts={conflicts}
        totalLessons={sampleLessons.length}
        placedLessonsCount={placements.length}
        unplacedCount={unplacedCount}
        solveDurationMs={solveStats?.durationMs}
      />

      {/* 3. Main Workspace: Timetable Matrix Grid Canvas */}
      <TimetableGrid
        lang={lang}
        viewMode={viewMode}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        placements={placements}
        lessons={sampleLessons}
        subjects={sampleSubjects}
        teachers={sampleTeachers}
        classes={sampleClasses}
        rooms={sampleRooms}
        conflicts={conflicts}
        onPlaceLesson={handlePlaceLesson}
        onRemovePlacement={handleRemovePlacement}
        onMovePlacement={handleMovePlacement}
        zoomLevel={zoomLevel}
        isReadOnly={isReadOnly}
      />

      {/* 4. Signature Bottom Lesson Card Deck ("بنك البطاقات") */}
      <BottomCardDeck
        lang={lang}
        lessons={sampleLessons}
        placements={placements}
        subjects={sampleSubjects}
        teachers={sampleTeachers}
        classes={sampleClasses}
        rooms={sampleRooms}
        selectedEntityId={selectedEntityId}
        onPlaceLesson={handlePlaceLesson}
        onRemovePlacement={handleRemovePlacement}
        onAutoPlaceAll={handleAutoPlaceAll}
        onClearEntityPlacements={handleClearEntityPlacements}
        isReadOnly={isReadOnly}
      />

      {/* 5. Authentic Desktop Status Bar */}
      <div className="bg-slate-300 border-t border-slate-400/80 px-3 py-1 flex items-center justify-between text-[11px] text-slate-700 select-none shrink-0 font-sans">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
            <span>{isRtl ? 'جاهز' : 'Ready'}</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            {isRtl ? 'الملف الحالي: Saudi Arabia 1.roz (الإصدار 314)' : 'Current File: Saudi Arabia 1.roz (v314)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-600 hidden md:inline">
            {isRtl ? 'محرك التسكين: مدمج (Rust WASM)' : 'Engine: Client WASM'}
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-600 font-mono text-[10px]">
            {isRtl ? 'الترميز: Windows-1256' : 'Encoding: UTF-8'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold text-slate-700">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Modals */}
      <GenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        lang={lang}
        isSolving={isSolving}
        progress={solverProgress}
        onRunGenerate={handleRunGenerate}
        solveDurationMs={solveStats?.durationMs}
        unplacedCount={unplacedCount}
        conflictsCount={conflicts.length}
      />

      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        lang={lang}
        teachers={sampleTeachers}
        classes={sampleClasses}
      />

      <BasicDataModal
        isOpen={isBasicDataModalOpen}
        onClose={() => setIsBasicDataModalOpen(false)}
        lang={lang}
        initialTab={basicDataInitialTab}
        subjects={sampleSubjects}
        classes={sampleClasses}
        rooms={sampleRooms}
        teachers={sampleTeachers}
        lessons={sampleLessons}
      />

      <TestTimetableModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        lang={lang}
        teachers={sampleTeachers}
        classes={sampleClasses}
        rooms={sampleRooms}
        lessons={sampleLessons}
      />
    </div>
  );
}
