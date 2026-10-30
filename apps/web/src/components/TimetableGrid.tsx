'use client';

import React, { useState } from 'react';
import {
  Placement,
  Lesson,
  Subject,
  Teacher,
  ClassGroup,
  Room,
  Conflict,
  ViewMode,
  DragItem,
} from '../lib/types';
import { translations } from '../lib/i18n';
import { AlertTriangle, X, LayoutGrid, Users, DoorOpen, Eye } from 'lucide-react';

interface TimetableGridProps {
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  setViewMode?: (mode: ViewMode) => void;
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  placements: Placement[];
  lessons: Lesson[];
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  conflicts: Conflict[];
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  lessonMap?: Map<string, Lesson>;
  onPlaceLesson: (lessonId: string, dayIndex: number, periodIndex: number, roomId?: string) => void;
  onRemovePlacement: (lessonId: string) => void;
  onMovePlacement: (lessonId: string, targetDay: number, targetPeriod: number) => void;
  zoomLevel: number;
  isReadOnly: boolean;
  customDays?: string[];
  customPeriods?: string[];
  bellSchedule?: string[];
}

const EMPTY_PLACEMENTS: Placement[] = [];

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  lang,
  viewMode,
  setViewMode,
  selectedEntityId,
  setSelectedEntityId,
  placements,
  lessons,
  subjects,
  teachers,
  classes,
  rooms,
  conflicts,
  teacherMap: propTeacherMap,
  classMap: propClassMap,
  roomMap: propRoomMap,
  subjectMap: propSubjectMap,
  lessonMap: propLessonMap,
  onPlaceLesson,
  onRemovePlacement,
  onMovePlacement,
  zoomLevel,
  isReadOnly,
  customDays,
  customPeriods,
  bellSchedule,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Days and periods to render (dynamic with fallback)
  const daysList = customDays && customDays.length > 0 ? customDays : t.days;
  const periodsList = customPeriods && customPeriods.length > 0 ? customPeriods : t.periods;
  const bells = bellSchedule && bellSchedule.length > 0 ? bellSchedule : t.bellSchedule;

  // Fast entity lookup maps (reusing pre-computed maps from page.tsx when provided)
  const fallbackLessonMap = React.useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const fallbackSubjectMap = React.useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const fallbackTeacherMap = React.useMemo(() => new Map(teachers.map((tc) => [tc.id, tc])), [teachers]);
  const fallbackClassMap = React.useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const fallbackRoomMap = React.useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const lessonMap = propLessonMap ?? fallbackLessonMap;
  const subjectMap = propSubjectMap ?? fallbackSubjectMap;
  const teacherMap = propTeacherMap ?? fallbackTeacherMap;
  const classMap = propClassMap ?? fallbackClassMap;
  const roomMap = propRoomMap ?? fallbackRoomMap;

  // Pre-index placements by entity and slot for O(1) cell lookup
  const placementsByEntitySlot = React.useMemo(() => {
    const map = new Map<string, Placement[]>();

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      // 1. Index by Class
      if (lesson.classId) {
        const classKey = `class:${lesson.classId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(classKey);
        if (group) group.push(p);
        else map.set(classKey, [p]);
      }

      // 2. Index by Teacher
      if (lesson.teacherId) {
        const teacherKey = `teacher:${lesson.teacherId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(teacherKey);
        if (group) group.push(p);
        else map.set(teacherKey, [p]);
      }

      // 3. Index by Room
      if (p.roomId) {
        const roomKey = `room:${p.roomId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(roomKey);
        if (group) group.push(p);
        else map.set(roomKey, [p]);
      }
    }

    return map;
  }, [placements, lessonMap]);

  // Conflict lookup by lesson ID
  const conflictLessonIds = React.useMemo(() => {
    return new Set(conflicts.map((c) => c.lessonId));
  }, [conflicts]);

  // Drag over tracking
  const [dragOverCell, setDragOverCell] = useState<{ day: number; period: number; entityId: string } | null>(null);

  // Entities displayed as rows in the matrix
  const rowEntities = React.useMemo(() => {
    if (viewMode === 'class' || viewMode === 'wall') {
      return classes.map((c) => ({
        id: c.id,
        name: isRtl ? c.nameAr || c.name : c.name,
        code: c.name.split('-')[0].trim(),
        type: 'class' as const,
      }));
    }
    if (viewMode === 'teacher') {
      return teachers.map((tc) => ({
        id: tc.id,
        name: isRtl ? tc.nameAr || tc.name : tc.name,
        code: tc.speciality,
        type: 'teacher' as const,
      }));
    }
    if (viewMode === 'room') {
      return rooms.map((r) => ({
        id: r.id,
        name: isRtl ? r.nameAr || r.name : r.name,
        code: `Cap: ${r.capacity}`,
        type: 'room' as const,
      }));
    }
    return classes.map((c) => ({
      id: c.id,
      name: isRtl ? c.nameAr || c.name : c.name,
      code: c.name.split('-')[0].trim(),
      type: 'class' as const,
    }));
  }, [viewMode, classes, teachers, rooms, isRtl]);

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, lessonId: string, day: number, period: number) => {
    if (isReadOnly) return;
    const dragItem: DragItem = {
      type: 'grid',
      lessonId,
      sourceDay: day,
      sourcePeriod: period,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: number, period: number, entityId: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverCell || dragOverCell.day !== day || dragOverCell.period !== period || dragOverCell.entityId !== entityId) {
      setDragOverCell({ day, period, entityId });
    }
  };

  const handleDragLeave = (
    e: React.DragEvent,
    day: number,
    period: number,
    entityId: string
  ) => {
    // 1. If pointer is moving into a child element inside this same cell, do not reset
    if (
      e.currentTarget &&
      e.relatedTarget &&
      e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      return;
    }

    // 2. Only clear drag-over state if the cell being left is the currently active one
    setDragOverCell((current) => {
      if (
        current &&
        current.day === day &&
        current.period === period &&
        current.entityId === entityId
      ) {
        return null;
      }
      return current;
    });
  };

  const handleDrop = (e: React.DragEvent, targetDay: number, targetPeriod: number, rowEntityId: string) => {
    e.preventDefault();
    setDragOverCell(null);
    if (isReadOnly) return;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const item: DragItem = JSON.parse(dataStr);

      if (item.type === 'grid') {
        onMovePlacement(item.lessonId, targetDay, targetPeriod);
      } else if (item.type === 'deck') {
        onPlaceLesson(item.lessonId, targetDay, targetPeriod);
      }
    } catch (err) {
      console.error('Failed to parse drag item:', err);
    }
  };

  // Left vertical tab switching
  const verticalTabs = [
    { id: 'class' as ViewMode, labelEn: 'Lesson grid', labelAr: 'الجدول العام', icon: LayoutGrid },
    { id: 'wall' as ViewMode, labelEn: 'Whole', labelAr: 'الكل', icon: Eye },
    { id: 'teacher' as ViewMode, labelEn: 'Teachers', labelAr: 'المعلمون', icon: Users },
    { id: 'room' as ViewMode, labelEn: 'Classrooms', labelAr: 'القاعات', icon: DoorOpen },
  ];

  // Detect authentic compact Whole (wall) view vs detailed view
  const isCompact = viewMode === 'wall';
  const colMinWidth = isCompact ? Math.max(32, Math.round(zoomLevel * 36)) : Math.max(85, Math.round(zoomLevel * 95));
  const colMaxWidth = isCompact ? Math.max(44, Math.round(zoomLevel * 50)) : Math.max(115, Math.round(zoomLevel * 130));

  return (
    <div
      className="flex-1 flex overflow-hidden bg-slate-200 select-none"
      style={{ fontSize: `${Math.round(zoomLevel * 12)}px` }}
    >
      {/* 1. Iconic Desktop Left Vertical Tab Strip (from roz.exe) */}
      <div className="w-9 bg-slate-300 border-r border-slate-400 flex flex-col justify-start items-center py-2 gap-1.5 shrink-0 z-30 shadow-inner">
        {verticalTabs.map((tab) => {
          const isActive = viewMode === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode && setViewMode(tab.id)}
              title={isRtl ? tab.labelAr : tab.labelEn}
              className={`w-7 py-2 rounded flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mb-1" />
              <span
                className="text-[9px] tracking-tighter"
                style={{
                  writingMode: 'vertical-rl',
                  transform: isRtl ? 'none' : 'rotate(180deg)',
                }}
              >
                {isRtl ? tab.labelAr : tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Main Matrix Grid Canvas */}
      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden inline-block min-w-full">
          <table
            role="grid"
            aria-label={isRtl ? 'جدول الحصص الأسبوعي' : 'Weekly Timetable Grid'}
            aria-readonly={isReadOnly}
            className="border-collapse w-full text-slate-800"
          >
            {/* Day Headers (Upper Tier) */}
            <thead>
              <tr className="bg-slate-200 border-b border-slate-300 text-slate-700 text-xs font-bold">
                {/* Top-Left Entity Header Column */}
                <th
                  rowSpan={2}
                  className={`p-2 border-r border-slate-300 bg-slate-100 text-center sticky ltr:left-0 rtl:right-0 z-20 shadow-xs ${
                    isCompact ? 'min-w-[110px]' : 'min-w-[140px]'
                  }`}
                >
                  <div className="font-bold text-slate-800">
                    {viewMode === 'class' || viewMode === 'wall'
                      ? isRtl ? 'الشعبة / الفصل' : 'Class / Section'
                      : viewMode === 'teacher'
                      ? isRtl ? 'المعلم' : 'Teacher'
                      : isRtl ? 'الغرفة الدراسية' : 'Classroom'}
                  </div>
                </th>

                {/* Days Columns */}
                {daysList.map((dayName) => (
                  <th
                    key={dayName}
                    colSpan={periodsList.length}
                    className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800 bg-slate-100 tracking-wide"
                  >
                    {dayName}
                  </th>
                ))}
              </tr>

              {/* Period Sub-headers (Lower Tier with Period Numbers & Bell Times) */}
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-600 font-semibold">
                {daysList.map((_, dIdx) =>
                  periodsList.map((periodName, pIdx) => {
                    const bellTime = bells[pIdx] ? bells[pIdx].split('-')[0].trim() : '';
                    return (
                      <th
                        key={`${dIdx}-${pIdx}`}
                        style={{ minWidth: `${colMinWidth}px`, maxWidth: `${colMaxWidth}px` }}
                        className="p-1 border-r border-slate-200 text-center transition-all"
                      >
                        <div className="font-bold text-slate-700">{pIdx + 1}</div>
                        {!isCompact && bellTime && (
                          <div className="text-[9px] text-slate-400 font-mono scale-90">
                            {bellTime}
                          </div>
                        )}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>

            {/* Matrix Body: Rows of Entities × Cells */}
            <tbody>
              {rowEntities.map((entity) => {
                const isSelectedRow = selectedEntityId === entity.id;

                return (
                  <tr
                    key={entity.id}
                    role="row"
                    onClick={() => setSelectedEntityId(entity.id)}
                    className={`border-b border-slate-200 transition-colors cursor-pointer ${
                      isSelectedRow
                        ? 'bg-sky-50/70'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Entity Label Cell (Sticky Left) */}
                    <td
                      role="rowheader"
                      className={`p-2 border-r border-slate-300 text-xs sticky ltr:left-0 rtl:right-0 z-10 transition-colors ${
                        isSelectedRow
                          ? 'bg-sky-100/90 font-bold text-sky-900 border-l-4 border-l-sky-600 shadow-xs'
                          : 'bg-slate-50 font-semibold text-slate-700'
                      }`}
                    >
                      <div className="truncate font-bold">{entity.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{entity.code}</div>
                    </td>

                    {/* Period Slot Cells */}
                    {daysList.map((_, dIdx) =>
                      periodsList.map((_, pIdx) => {
                        // O(1) slot placements lookup
                        const slotKey = `${entity.type}:${entity.id}:${dIdx}:${pIdx}`;
                        const slotPlacements = placementsByEntitySlot.get(slotKey) || EMPTY_PLACEMENTS;

                        const isDragOver =
                          dragOverCell?.day === dIdx &&
                          dragOverCell?.period === pIdx &&
                          dragOverCell?.entityId === entity.id;

                        // Case 1: Empty slot
                        if (slotPlacements.length === 0) {
                          return (
                            <td
                              key={`${dIdx}-${pIdx}`}
                              role="gridcell"
                              aria-label={
                                isRtl
                                  ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `الحصة ${pIdx + 1}`}: فارغ`
                                  : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Period ${pIdx + 1}`}: Empty`
                              }
                              aria-selected={isDragOver}
                              onDragOver={(e) => handleDragOver(e, dIdx, pIdx, entity.id)}
                              onDragLeave={(e) => handleDragLeave(e, dIdx, pIdx, entity.id)}
                              onDrop={(e) => handleDrop(e, dIdx, pIdx, entity.id)}
                              style={{ minWidth: `${colMinWidth}px`, maxWidth: `${colMaxWidth}px` }}
                              className={`p-1 border-r border-slate-200 align-top transition-all relative ${
                                isCompact ? 'h-11' : 'h-16'
                              } ${isDragOver ? 'bg-sky-100 ring-2 ring-sky-500 ring-inset' : ''}`}
                            >
                              <div className="h-full border border-dashed border-slate-200/80 rounded flex items-center justify-center text-[10px] text-slate-300 hover:border-slate-400 hover:bg-slate-50 transition pointer-events-none">
                                <span className="opacity-0 group-hover:opacity-60">+</span>
                              </div>
                            </td>
                          );
                        }

                        // Case 2: Exactly 1 lesson (Standard Card)
                        if (slotPlacements.length === 1) {
                          const p = slotPlacements[0];
                          const lesson = lessonMap.get(p.lessonId);
                          const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
                          const teacher = lesson ? teacherMap.get(lesson.teacherId) : null;
                          const targetClass = lesson ? classMap.get(lesson.classId) : null;
                          const room = roomMap.get(p.roomId);
                          const hasConflict = lesson ? conflictLessonIds.has(lesson.id) : false;

                          if (!lesson || !subject) return <td key={`${dIdx}-${pIdx}`} role="gridcell" className="p-1 border-r border-slate-200" />;

                          return (
                            <td
                              key={`${dIdx}-${pIdx}`}
                              role="gridcell"
                              aria-label={
                                isRtl
                                  ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `الحصة ${pIdx + 1}`}: ${
                                      subject.nameAr || subject.name
                                    }${teacher ? `، المعلم ${teacher.nameAr || teacher.name}` : ''}${
                                      room ? `، القاعة ${room.nameAr || room.name}` : ''
                                    }${hasConflict ? ' (تنبيه: يوجد تعارض)' : ''}`
                                  : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Period ${pIdx + 1}`}: ${
                                      subject.name
                                    }${teacher ? `, Teacher ${teacher.name}` : ''}${
                                      room ? `, Room ${room.name}` : ''
                                    }${hasConflict ? ' (Warning: Conflict detected)' : ''}`
                              }
                              aria-selected={isDragOver}
                              onDragOver={(e) => handleDragOver(e, dIdx, pIdx, entity.id)}
                              onDragLeave={(e) => handleDragLeave(e, dIdx, pIdx, entity.id)}
                              onDrop={(e) => handleDrop(e, dIdx, pIdx, entity.id)}
                              style={{ minWidth: `${colMinWidth}px`, maxWidth: `${colMaxWidth}px` }}
                              className={`p-1 border-r border-slate-200 align-top transition-all relative ${
                                isCompact ? 'h-11' : 'h-16'
                              } ${isDragOver ? 'bg-sky-100 ring-2 ring-sky-500 ring-inset' : ''}`}
                            >
                              {isCompact ? (
                                <div
                                  draggable={!isReadOnly}
                                  onDragStart={(e) => handleDragStart(e, lesson.id, dIdx, pIdx)}
                                  className={`lesson-card h-full rounded border select-none p-0.5 flex flex-col justify-center items-center text-center cursor-grab active:cursor-grabbing shadow-2xs overflow-hidden transition ${
                                    hasConflict
                                      ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-400'
                                      : 'border-slate-300'
                                  }`}
                                  style={{
                                    backgroundColor: hasConflict ? undefined : subject.color + '26',
                                    borderTop: `3px solid ${subject.color}`,
                                  }}
                                  title={`${subject.name} - ${teacher?.name || ''} (${room?.name || ''})`}
                                >
                                  <span className="font-bold text-[10px] text-slate-900 leading-tight truncate w-full">
                                    {subject.code || subject.name.slice(0, 3)}
                                  </span>
                                  <span className="text-[8px] text-slate-600 truncate w-full leading-none mt-0.5">
                                    {entity.type === 'teacher'
                                      ? targetClass?.name.split('-')[0].trim() || ''
                                      : entity.type === 'room'
                                      ? targetClass?.name.split('-')[0].trim() || ''
                                      : isRtl
                                      ? teacher?.nameAr?.slice(0, 3) || teacher?.name.slice(0, 3) || ''
                                      : teacher?.name.slice(0, 3) || ''}
                                  </span>
                                </div>
                              ) : (
                                <div
                                  draggable={!isReadOnly}
                                  onDragStart={(e) => handleDragStart(e, lesson.id, dIdx, pIdx)}
                                  className={`lesson-card h-full rounded border select-none p-1 flex flex-col justify-between text-xs relative group cursor-grab active:cursor-grabbing shadow-xs ${
                                    hasConflict
                                      ? 'border-rose-500 bg-rose-50/90 ring-1 ring-rose-400'
                                      : 'border-slate-300'
                                  }`}
                                  style={{
                                    backgroundColor: hasConflict ? undefined : subject.color + '26',
                                    borderTop: `3px solid ${subject.color}`,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-0.5">
                                    <span className="font-extrabold text-[11px] text-slate-900 tracking-tight truncate">
                                      {subject.code || (isRtl ? subject.nameAr || subject.name : subject.name)}
                                    </span>

                                    <div className="flex items-center gap-0.5">
                                      {hasConflict && (
                                        <span title={isRtl ? 'تعارض في هذا التسكين' : 'Clash in this placement'}>
                                          <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                                        </span>
                                      )}
                                      {!isReadOnly && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemovePlacement(lesson.id);
                                          }}
                                          title={isRtl ? 'إرجاع إلى بنك البطاقات' : 'Return to cards bank'}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500 hover:text-white text-slate-500 transition"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[9px] font-semibold text-slate-700 pt-0.5 border-t border-slate-300/40">
                                    <span
                                      className="truncate max-w-[45px]"
                                      title={entity.type === 'teacher' ? targetClass?.name : teacher?.name}
                                    >
                                      {entity.type === 'teacher'
                                        ? targetClass ? (isRtl ? targetClass.nameAr || targetClass.name : targetClass.name) : ''
                                        : teacher ? (isRtl ? teacher.nameAr?.split(' ')[0] || teacher.name : teacher.name.split(' ').slice(-1)[0]) : ''}
                                    </span>
                                    <span
                                      className="px-1 rounded bg-white/80 border border-slate-300/60 font-mono text-[8px] text-slate-800"
                                      title={entity.type === 'room' ? targetClass?.name : room?.name}
                                    >
                                      {entity.type === 'room' ? (targetClass?.name.split('-')[0].trim() || 'Cls') : (room ? room.id : 'N/A')}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // Case 3: Multiple lessons in one slot -> Authentic Desktop Diagonal Split Card (/)
                        const p1 = slotPlacements[0];
                        const p2 = slotPlacements[1];
                        const l1 = lessonMap.get(p1.lessonId);
                        const l2 = lessonMap.get(p2.lessonId);
                        const s1 = l1 ? subjectMap.get(l1.subjectId) : null;
                        const s2 = l2 ? subjectMap.get(l2.subjectId) : null;
                        const t1 = l1 ? teacherMap.get(l1.teacherId) : null;
                        const t2 = l2 ? teacherMap.get(l2.teacherId) : null;

                        const color1 = s1?.color || '#3b82f6';
                        const color2 = s2?.color || '#10b981';

                        return (
                          <td
                            key={`${dIdx}-${pIdx}`}
                            role="gridcell"
                            aria-label={
                              isRtl
                                ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `الحصة ${pIdx + 1}`}: حصة مشتركة مقسمة - ${
                                    s1?.nameAr || s1?.name || ''
                                  } و ${s2?.nameAr || s2?.name || ''}`
                                : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Period ${pIdx + 1}`}: Split divided lesson - ${
                                    s1?.name || ''
                                  } and ${s2?.name || ''}`
                            }
                            aria-selected={isDragOver}
                            onDragOver={(e) => handleDragOver(e, dIdx, pIdx, entity.id)}
                            onDragLeave={(e) => handleDragLeave(e, dIdx, pIdx, entity.id)}
                            onDrop={(e) => handleDrop(e, dIdx, pIdx, entity.id)}
                            style={{ minWidth: `${colMinWidth}px`, maxWidth: `${colMaxWidth}px` }}
                            className={`p-1 border-r border-slate-200 align-top transition-all relative ${
                              isCompact ? 'h-11' : 'h-16'
                            } ${isDragOver ? 'bg-sky-100 ring-2 ring-sky-500 ring-inset' : ''}`}
                          >
                            <div className="relative h-full w-full rounded border border-slate-300 overflow-hidden shadow-xs select-none">
                              {/* Top-Left Half (Diagonal Split) */}
                              <div
                                draggable={!isReadOnly && !!l1}
                                onDragStart={(e) => l1 && handleDragStart(e, l1.id, dIdx, pIdx)}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing p-1"
                                style={{
                                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                  backgroundColor: color1 + '33',
                                  borderTop: `3px solid ${color1}`,
                                }}
                              >
                                <span className="font-extrabold text-[10px] text-slate-900 block truncate max-w-[50%]">
                                  {s1?.code || s1?.name}
                                </span>
                                <span className="text-[8px] text-slate-700 block truncate max-w-[45%] font-medium">
                                  {t1 ? (isRtl ? t1.nameAr?.split(' ')[0] || t1.name : t1.name.split(' ').slice(-1)[0]) : ''}
                                </span>
                              </div>

                              {/* Bottom-Right Half (Diagonal Split) */}
                              <div
                                draggable={!isReadOnly && !!l2}
                                onDragStart={(e) => l2 && handleDragStart(e, l2.id, dIdx, pIdx)}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing flex flex-col justify-end items-end p-1 text-right"
                                style={{
                                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                                  backgroundColor: color2 + '33',
                                  borderBottom: `3px solid ${color2}`,
                                }}
                              >
                                <span className="text-[8px] text-slate-700 block truncate max-w-[50%] font-medium">
                                  {t2 ? (isRtl ? t2.nameAr?.split(' ')[0] || t2.name : t2.name.split(' ').slice(-1)[0]) : ''}
                                </span>
                                <span className="font-extrabold text-[10px] text-slate-900 block truncate max-w-[50%]">
                                  {s2?.code || s2?.name}
                                </span>
                              </div>

                              {/* Diagonal Dividing Line */}
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(to top right, transparent calc(50% - 0.75px), #94a3b8 calc(50% - 0.75px), #94a3b8 calc(50% + 0.75px), transparent calc(50% + 0.75px))',
                                }}
                              />
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
