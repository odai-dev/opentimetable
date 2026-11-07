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
  CardLayoutConfig,
} from '../lib/types';
import { translations } from '../lib/i18n';
import { AlertTriangle, X, LayoutGrid, Users, DoorOpen, Eye, Lock, Unlock } from 'lucide-react';

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
  cardLayout?: CardLayoutConfig;
  onToggleLockPlacement?: (lessonId: string) => void;
  onSplitLesson?: (lessonId: string, mode: 'duration' | 'groups') => void;
  onMergeLessons?: (lessonId1: string, lessonId2: string) => void;
  selectedPlacement?: Placement | null;
  onSelectPlacement?: (placement: Placement | null) => void;
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
  cardLayout,
  onToggleLockPlacement,
  onSplitLesson,
  onMergeLessons,
  selectedPlacement,
  onSelectPlacement,
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

      // 1. Index by Class (supporting joint classes via classIds)
      const targetClassIds =
        lesson.classIds && lesson.classIds.length > 0
          ? lesson.classIds
          : lesson.classId
          ? [lesson.classId]
          : [];
      for (const cId of targetClassIds) {
        if (!cId) continue;
        const classKey = `class:${cId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(classKey);
        if (group) group.push(p);
        else map.set(classKey, [p]);
      }

      // 2. Index by Teacher (supporting co-teachers via teacherIds)
      const targetTeacherIds =
        lesson.teacherIds && lesson.teacherIds.length > 0
          ? lesson.teacherIds
          : lesson.teacherId
          ? [lesson.teacherId]
          : [];
      for (const tId of targetTeacherIds) {
        if (!tId) continue;
        const teacherKey = `teacher:${tId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(teacherKey);
        if (group) group.push(p);
        else map.set(teacherKey, [p]);
      }

      // 3. Index by Room
      const rId = p.roomId?.trim();
      if (rId) {
        const roomKey = `room:${rId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(roomKey);
        if (group) group.push(p);
        else map.set(roomKey, [p]);
      }

      // 4. Index by Subject
      if (lesson.subjectId) {
        const subjectKey = `subject:${lesson.subjectId}:${p.dayIndex}:${p.periodIndex}`;
        const group = map.get(subjectKey);
        if (group) group.push(p);
        else map.set(subjectKey, [p]);
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

  // Hovered lesson tracking for keyboard shortcuts (e.g. 'L' for lock/unlock)
  const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

  // Desktop right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    lessonId: string;
    placement: Placement;
  } | null>(null);

  React.useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        setContextMenu(null);
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        const targetId = hoveredLessonId || selectedPlacement?.lessonId;
        if (targetId && onToggleLockPlacement && !isReadOnly) {
          e.preventDefault();
          onToggleLockPlacement(targetId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredLessonId, selectedPlacement, onToggleLockPlacement, isReadOnly]);

  // Ref to active selected row for smooth navigation scrolling
  const selectedRowRef = React.useRef<HTMLTableRowElement | null>(null);

  React.useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntityId]);

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
    const plc = placements.find((p) => p.lessonId === lessonId);
    if (plc?.isLocked) {
      e.preventDefault();
      return;
    }
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
    { id: 'class' as ViewMode, labelEn: 'Lecture grid', labelAr: 'جدول المحاضرات', icon: LayoutGrid },
    { id: 'wall' as ViewMode, labelEn: 'Whole Campus', labelAr: 'كامل الكلية', icon: Eye },
    { id: 'teacher' as ViewMode, labelEn: 'Faculty', labelAr: 'أعضاء هيئة التدريس', icon: Users },
    { id: 'room' as ViewMode, labelEn: 'Halls & Labs', labelAr: 'القاعات والمعامل', icon: DoorOpen },
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
            aria-label={isRtl ? 'جدول المحاضرات الأكاديمي الأسبوعي' : 'Weekly University Lecture Schedule'}
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
                      ? isRtl ? 'المجموعة / الشعبة' : 'Group / Section'
                      : viewMode === 'teacher'
                      ? isRtl ? 'عضو هيئة التدريس / المحاضر' : 'Faculty Member / Instructor'
                      : isRtl ? 'القاعة / المعمل الأكاديمي' : 'Hall / Lab'}
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
                    ref={isSelectedRow ? selectedRowRef : undefined}
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
                                  ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `المحاضرة ${pIdx + 1}`}: فارغ`
                                  : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Lecture ${pIdx + 1}`}: Empty`
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
                          const room = p.roomId ? roomMap.get(p.roomId) : null;
                          const hasConflict = lesson ? conflictLessonIds.has(lesson.id) : false;

                          if (!lesson || !subject) return <td key={`${dIdx}-${pIdx}`} role="gridcell" className="p-1 border-r border-slate-200" />;

                          const targetClassIds = lesson.classIds?.length ? lesson.classIds : (lesson.classId ? [lesson.classId] : []);
                          const classShortCode = targetClassIds.length > 1
                            ? targetClassIds.map((cId) => classMap.get(cId)?.name?.split('-')[0].trim() || cId).join('+')
                            : (targetClass?.name.split('-')[0].trim() || '');
                          const classFullName = targetClassIds.length > 1
                            ? targetClassIds.map((cId) => {
                                const c = classMap.get(cId);
                                return isRtl ? c?.nameAr || c?.name || cId : c?.name || cId;
                              }).join(' + ')
                            : (targetClass ? (isRtl ? targetClass.nameAr || targetClass.name : targetClass.name) : '');

                          const targetTeacherIds = lesson.teacherIds?.length ? lesson.teacherIds : (lesson.teacherId ? [lesson.teacherId] : []);
                          const teacherShortName = targetTeacherIds.length > 1
                            ? targetTeacherIds.map((tId) => {
                                const tc = teacherMap.get(tId);
                                return isRtl ? tc?.nameAr?.split(' ')[0] || tc?.name || tId : tc?.name?.split(' ').slice(-1)[0] || tId;
                              }).join('/')
                            : (teacher ? (isRtl ? teacher.nameAr?.split(' ')[0] || teacher.name : teacher.name.split(' ').slice(-1)[0]) : '');

                          const groupBadge = lesson.groupName || (lesson.entireClass === false && lesson.groupId ? lesson.groupId : undefined);

                          const isLocked = !!p.isLocked;
                          const isSelected = selectedPlacement?.lessonId === lesson.id;

                          // Dynamic card coloring based on cardLayout.colorBy
                          const cardThemeColor = cardLayout?.colorBy === 'teacher'
                            ? (teacher?.color || '#8b5cf6')
                            : cardLayout?.colorBy === 'class'
                            ? ((targetClass as any)?.color || '#3b82f6')
                            : subject.color;

                          const cardFontFamily = cardLayout?.fontFamily || 'inherit';

                          // Field resolvers for customizable 3 lines
                          const getFieldText = (field?: string): string => {
                            switch (field) {
                              case 'subject_name':
                                return isRtl ? subject.nameAr || subject.name : subject.name;
                              case 'subject_code':
                                return subject.code || subject.name.slice(0, 4);
                              case 'teacher_name':
                                return teacherShortName;
                              case 'room_name':
                                return room ? (isRtl ? room.nameAr || room.name : room.name) : (p.roomId ?? 'N/A');
                              case 'class_name':
                                return classShortCode || classFullName;
                              default:
                                return '';
                            }
                          };

                          const line1Text = cardLayout
                            ? getFieldText(cardLayout.line1)
                            : (subject.code || (isRtl ? subject.nameAr || subject.name : subject.name));

                          // Perspective-aware line2: when on teacher row, display class name instead of repeating teacher
                          const line2Text = entity.type === 'teacher' && (!cardLayout || cardLayout.line2 === 'teacher_name')
                            ? (classFullName || classShortCode)
                            : (cardLayout ? getFieldText(cardLayout.line2) : teacherShortName);

                          // Perspective-aware line3: when on room row, display class/teacher instead of repeating room
                          const line3Text = entity.type === 'room' && (!cardLayout || cardLayout.line3 === 'room_name')
                            ? (classShortCode || classFullName || teacherShortName)
                            : (cardLayout ? getFieldText(cardLayout.line3) : (room ? (isRtl ? room.nameAr || room.name : room.name) : 'N/A'));

                          // Capacity & Headcount Validation
                          const isSplit = lesson.isSplitGroup || Boolean(lesson.groupName);
                          let targetHeadcount = targetClass?.studentCount || 50;
                          if (isSplit && targetClass?.subgroups && targetClass.subgroups.length > 0) {
                            const matchedSub = targetClass.subgroups.find(
                              (sg) => sg.code === lesson.groupName || sg.name === lesson.groupName || sg.id === lesson.groupId
                            );
                            if (matchedSub?.studentCount) {
                              targetHeadcount = matchedSub.studentCount;
                            } else {
                              targetHeadcount = Math.round(targetHeadcount / 2);
                            }
                          }
                          const hasCapacityWarning = Boolean(room && room.capacity && room.capacity < targetHeadcount);

                          return (
                            <td
                              key={`${dIdx}-${pIdx}`}
                              role="gridcell"
                              aria-label={
                                isRtl
                                  ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `المحاضرة ${pIdx + 1}`}: ${
                                      subject.nameAr || subject.name
                                    }${teacherShortName ? `، المحاضر ${teacherShortName}` : ''}${
                                      room ? `، القاعة/المعمل ${room.nameAr || room.name}` : ''
                                    }${groupBadge ? ` [${groupBadge}]` : ''}${hasConflict ? ' (تنبيه: يوجد تعارض)' : ''}`
                                  : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Lecture ${pIdx + 1}`}: ${
                                      subject.name
                                    }${teacherShortName ? `, Instructor ${teacherShortName}` : ''}${
                                      room ? `, Hall/Lab ${room.name}` : ''
                                    }${groupBadge ? ` [${groupBadge}]` : ''}${hasConflict ? ' (Warning: Conflict detected)' : ''}`
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
                                  draggable={!isReadOnly && !isLocked}
                                  onDragStart={(e) => handleDragStart(e, lesson.id, dIdx, pIdx)}
                                  onClick={() => onSelectPlacement?.(p)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, lessonId: lesson.id, placement: p });
                                  }}
                                  onMouseEnter={() => setHoveredLessonId(lesson.id)}
                                  onMouseLeave={() => setHoveredLessonId(null)}
                                  className={`lesson-card h-full rounded border select-none p-0.5 flex flex-col justify-center items-center text-center cursor-grab active:cursor-grabbing shadow-2xs overflow-hidden transition relative ${
                                    isSelected
                                      ? 'ring-2 ring-sky-500 shadow-md'
                                      : hasConflict
                                      ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-400'
                                      : 'border-slate-300'
                                  }`}
                                  style={{
                                    fontFamily: cardFontFamily,
                                    backgroundColor: hasConflict ? undefined : cardThemeColor + '26',
                                    borderTop: `3px solid ${cardThemeColor}`,
                                  }}
                                  title={`${subject.name} - ${teacherShortName} (${room?.name || ''})${isLocked ? ' [🔒 Locked]' : ''}${groupBadge ? ` [${groupBadge}]` : ''}`}
                                >
                                  {isLocked && (cardLayout?.showLockBadge ?? true) && (
                                    <div className="absolute top-0.5 right-0.5 text-[8px] text-amber-600 font-bold pointer-events-none">
                                      🔒
                                    </div>
                                  )}
                                  <span className="font-bold text-[10px] text-slate-900 leading-tight truncate w-full">
                                    {line1Text || subject.code || subject.name.slice(0, 3)}
                                  </span>
                                  <span className="text-[8px] text-slate-600 truncate w-full leading-none mt-0.5">
                                    {line2Text || (entity.type === 'teacher' ? classShortCode : teacherShortName)}
                                  </span>
                                </div>
                              ) : (
                                <div
                                  draggable={!isReadOnly && !isLocked}
                                  onDragStart={(e) => handleDragStart(e, lesson.id, dIdx, pIdx)}
                                  onClick={() => onSelectPlacement?.(p)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, lessonId: lesson.id, placement: p });
                                  }}
                                  onMouseEnter={() => setHoveredLessonId(lesson.id)}
                                  onMouseLeave={() => setHoveredLessonId(null)}
                                  className={`lesson-card h-full rounded border select-none p-1 flex flex-col justify-between text-xs relative group cursor-grab active:cursor-grabbing shadow-xs transition ${
                                    isSelected
                                      ? 'ring-2 ring-sky-500 border-sky-400 shadow-md'
                                      : hasConflict
                                      ? 'border-rose-500 bg-rose-50/90 ring-1 ring-rose-400'
                                      : 'border-slate-300 hover:border-slate-400'
                                  }`}
                                  style={{
                                    fontFamily: cardFontFamily,
                                    backgroundColor: hasConflict ? undefined : cardThemeColor + '26',
                                    borderTop: `3px solid ${cardThemeColor}`,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-0.5">
                                    <div className="flex items-center gap-0.5 truncate">
                                      <span className="font-extrabold text-[11px] text-slate-900 tracking-tight truncate">
                                        {line1Text}
                                      </span>
                                      {groupBadge && (
                                        <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300/60 truncate max-w-[36px]" title={groupBadge}>
                                          {groupBadge}
                                        </span>
                                      )}
                                      {hasCapacityWarning && (
                                        <span
                                          className="text-[8px] px-1 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300"
                                          title={isRtl ? `تنبيه السعة: ${targetHeadcount} طالب في قاعة سعتها ${room?.capacity}` : `Capacity alert: ${targetHeadcount} students in room capacity ${room?.capacity}`}
                                        >
                                          ⚠️ {targetHeadcount}/{room?.capacity}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-0.5">
                                      {/* Golden Lock Badge & Toggle */}
                                      {isLocked && (cardLayout?.showLockBadge ?? true) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleLockPlacement?.(lesson.id);
                                          }}
                                          title={isRtl ? 'محاضرة مقفلة (L لفك القفل)' : 'Locked lecture (Press L to unlock)'}
                                          className="p-0.5 rounded hover:bg-amber-100 text-amber-600 transition"
                                        >
                                          <Lock className="w-3 h-3 text-amber-600 fill-amber-100" />
                                        </button>
                                      )}

                                      {/* Hover to Lock */}
                                      {!isLocked && onToggleLockPlacement && !isReadOnly && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleLockPlacement(lesson.id);
                                          }}
                                          title={isRtl ? 'تثبيت وقفل المحاضرة (L)' : 'Lock lecture in place (Press L)'}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-amber-600 transition"
                                        >
                                          <Unlock className="w-3 h-3" />
                                        </button>
                                      )}

                                      {hasConflict && (
                                        <span title={isRtl ? 'تعارض في هذا التسكين' : 'Clash in this placement'}>
                                          <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                                        </span>
                                      )}
                                      {!isReadOnly && !isLocked && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemovePlacement(lesson.id);
                                          }}
                                          title={isRtl ? 'إرجاع إلى بنك المحاضرات' : 'Return to lecture cards bank'}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500 hover:text-white text-slate-500 transition"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[9px] font-semibold text-slate-700 pt-0.5 border-t border-slate-300/40">
                                    <span
                                      className="truncate max-w-[54px]"
                                      title={line2Text}
                                    >
                                      {line2Text}
                                    </span>
                                    {line3Text && (
                                      <span
                                        className="px-1 rounded bg-white/80 border border-slate-300/60 font-mono text-[8px] text-slate-800 truncate max-w-[44px]"
                                        title={line3Text}
                                      >
                                        {line3Text}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // Case 3: Multiple lessons in one slot -> Split Card with conflict highlighting
                        const hasAnyConflict = slotPlacements.some((sp) => conflictLessonIds.has(sp.lessonId));

                        if (slotPlacements.length === 2) {
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

                          const g1 = l1?.groupName || (l1?.entireClass === false && l1?.groupId ? l1.groupId : undefined);
                          const g2 = l2?.groupName || (l2?.entireClass === false && l2?.groupId ? l2.groupId : undefined);

                          return (
                            <td
                              key={`${dIdx}-${pIdx}`}
                              role="gridcell"
                              aria-label={
                                isRtl
                                  ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `المحاضرة ${pIdx + 1}`}: محاضرة مشتركة مقسمة - ${
                                      s1?.nameAr || s1?.name || ''
                                    } و ${s2?.nameAr || s2?.name || ''}${hasAnyConflict ? ' (تنبيه: يوجد تعارض)' : ''}`
                                  : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Lecture ${pIdx + 1}`}: Split divided lecture - ${
                                      s1?.name || ''
                                    } and ${s2?.name || ''}${hasAnyConflict ? ' (Warning: Conflict detected)' : ''}`
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
                              <div className={`relative h-full w-full rounded border overflow-hidden select-none transition ${
                                hasAnyConflict
                                  ? 'border-rose-500 ring-2 ring-rose-400 bg-rose-50/60 shadow-xs'
                                  : 'border-slate-300 shadow-xs'
                              }`}>
                                {hasAnyConflict && (
                                  <div className="absolute z-20 top-0.5 right-0.5 p-0.5 bg-white/95 rounded-full shadow-xs pointer-events-none" title={isRtl ? 'تعارض في هذه المحاضرات المقسمة' : 'Conflict in split lectures'}>
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                                  </div>
                                )}

                                {/* Top-Left Half (Diagonal Split) */}
                                <div
                                  draggable={!isReadOnly && !!l1 && !p1?.isLocked}
                                  onDragStart={(e) => l1 && handleDragStart(e, l1.id, dIdx, pIdx)}
                                  onClick={() => onSelectPlacement?.(p1)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, lessonId: p1.lessonId, placement: p1 });
                                  }}
                                  className="absolute inset-0 cursor-grab active:cursor-grabbing p-1"
                                  style={{
                                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                    backgroundColor: color1 + '33',
                                    borderTop: `3px solid ${color1}`,
                                  }}
                                >
                                  <div className="flex items-center gap-0.5 max-w-[50%]">
                                    {p1?.isLocked && (
                                      <Lock className="w-2.5 h-2.5 text-amber-600 fill-amber-100 flex-shrink-0" />
                                    )}
                                    <span className="font-extrabold text-[10px] text-slate-900 block truncate">
                                      {s1?.code || s1?.name}
                                    </span>
                                    {g1 && (
                                      <span className="text-[7px] px-0.5 rounded bg-amber-200 text-amber-900 font-bold truncate max-w-[28px]" title={g1}>
                                        {g1}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-slate-700 block truncate max-w-[45%] font-medium">
                                    {t1 ? (isRtl ? t1.nameAr?.split(' ')[0] || t1.name : t1.name.split(' ').slice(-1)[0]) : ''}
                                  </span>
                                </div>

                                {/* Bottom-Right Half (Diagonal Split) */}
                                <div
                                  draggable={!isReadOnly && !!l2 && !p2?.isLocked}
                                  onDragStart={(e) => l2 && handleDragStart(e, l2.id, dIdx, pIdx)}
                                  onClick={() => onSelectPlacement?.(p2)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContextMenu({ x: e.clientX, y: e.clientY, lessonId: p2.lessonId, placement: p2 });
                                  }}
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
                                  <div className="flex items-center gap-0.5 max-w-[50%] justify-end">
                                    {p2?.isLocked && (
                                      <Lock className="w-2.5 h-2.5 text-amber-600 fill-amber-100 flex-shrink-0" />
                                    )}
                                    {g2 && (
                                      <span className="text-[7px] px-0.5 rounded bg-amber-200 text-amber-900 font-bold truncate max-w-[28px]" title={g2}>
                                        {g2}
                                      </span>
                                    )}
                                    <span className="font-extrabold text-[10px] text-slate-900 block truncate">
                                      {s2?.code || s2?.name}
                                    </span>
                                  </div>
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
                        }

                        // Case 3b: 3 or more lessons in one slot (Multi-split grid)
                        return (
                          <td
                            key={`${dIdx}-${pIdx}`}
                            role="gridcell"
                            aria-label={
                              isRtl
                                ? `${entity.name}، ${daysList[dIdx]}، ${periodsList[pIdx] || `المحاضرة ${pIdx + 1}`}: تقسيم متعدد (${slotPlacements.length} محاضرات)${hasAnyConflict ? ' (تعارض)' : ''}`
                                : `${entity.name}, ${daysList[dIdx]}, ${periodsList[pIdx] || `Lecture ${pIdx + 1}`}: Multi-split (${slotPlacements.length} lectures)${hasAnyConflict ? ' (Conflict)' : ''}`
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
                            <div className={`relative h-full w-full rounded border overflow-hidden select-none grid grid-cols-2 gap-0.5 p-0.5 ${
                              hasAnyConflict
                                ? 'border-rose-500 ring-2 ring-rose-400 bg-rose-50/60 shadow-xs'
                                : 'border-slate-300 shadow-xs bg-slate-50'
                            }`}>
                              {hasAnyConflict && (
                                <div className="absolute z-20 top-0.5 right-0.5 p-0.5 bg-white/95 rounded-full shadow-xs pointer-events-none" title={isRtl ? 'تعارض في هذه المحاضرات المقسمة' : 'Conflict in split lectures'}>
                                  <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                                </div>
                              )}
                              {slotPlacements.slice(0, 4).map((sp) => {
                                const l = lessonMap.get(sp.lessonId);
                                const s = l ? subjectMap.get(l.subjectId) : null;
                                const tc = l ? teacherMap.get(l.teacherId) : null;
                                const gb = l?.groupName || (l?.entireClass === false && l?.groupId ? l.groupId : undefined);
                                const clr = s?.color || '#3b82f6';
                                return (
                                  <div
                                    key={sp.lessonId}
                                    draggable={!isReadOnly && !!l && !sp.isLocked}
                                    onDragStart={(e) => l && handleDragStart(e, l.id, dIdx, pIdx)}
                                    onClick={() => onSelectPlacement?.(sp)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setContextMenu({ x: e.clientX, y: e.clientY, lessonId: sp.lessonId, placement: sp });
                                    }}
                                    className="rounded p-0.5 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing text-[8px]"
                                    style={{
                                      backgroundColor: clr + '30',
                                      borderTop: `2px solid ${clr}`,
                                    }}
                                    title={`${s?.name || ''} - ${tc?.name || ''}${gb ? ` [${gb}]` : ''}`}
                                  >
                                    <div className="flex items-center justify-between gap-0.5">
                                      <div className="flex items-center gap-0.5 truncate">
                                        {sp.isLocked && <Lock className="w-2 h-2 text-amber-600 fill-amber-100 flex-shrink-0" />}
                                        <span className="font-bold text-slate-900 truncate">
                                          {s?.code || s?.name.slice(0, 3)}
                                        </span>
                                      </div>
                                      {gb && (
                                        <span className="text-[6px] px-0.5 rounded bg-amber-200 text-amber-900 font-bold truncate max-w-[20px]">
                                          {gb}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-slate-600 truncate text-[7px]">
                                      {tc ? (isRtl ? tc.nameAr?.split(' ')[0] || tc.name : tc.name.split(' ').slice(-1)[0]) : ''}
                                    </span>
                                  </div>
                                );
                              })}
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

      {/* aSc Desktop Right-Click Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label={isRtl ? 'قائمة سياق المحاضرة' : 'Lecture Context Menu'}
          style={{
            position: 'fixed',
            left: `${Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : contextMenu.x)}px`,
            top: `${Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 260 : contextMenu.y)}px`,
            zIndex: 9999,
          }}
          className="bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 min-w-[220px] text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const menuPlacement = contextMenu.placement;
            const menuLesson = lessonMap.get(contextMenu.lessonId);
            const isMenuLocked = Boolean(menuPlacement.isLocked);

            return (
              <>
                <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-700 flex items-center justify-between">
                  <span className="truncate max-w-[150px]">
                    {menuLesson ? (subjectMap.get(menuLesson.subjectId)?.name || menuLesson.id) : contextMenu.lessonId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    d{menuPlacement.dayIndex + 1}:p{menuPlacement.periodIndex + 1}
                  </span>
                </div>

                {/* Lock / Unlock */}
                {onToggleLockPlacement && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onToggleLockPlacement(contextMenu.lessonId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left rtl:text-right flex items-center gap-2 hover:bg-slate-50 transition text-slate-800 font-medium"
                  >
                    {isMenuLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isRtl ? 'فك تثبيت المحاضرة (L)' : 'Unlock Placement (L)'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-600 fill-amber-100" />
                        <span>{isRtl ? 'تثبيت وقفل في الجدول (L)' : 'Lock In Place (L)'}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Split Duration (e.g. 2h -> 1h + 1h) */}
                {menuLesson && menuLesson.duration > 1 && onSplitLesson && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onSplitLesson(contextMenu.lessonId, 'duration');
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left rtl:text-right flex items-center gap-2 hover:bg-sky-50 text-sky-800 transition font-medium"
                  >
                    <span className="text-sm">✂️</span>
                    <span>
                      {isRtl
                        ? `تقسيم الحصة المزدوجة (${menuLesson.duration} س) إلى حصص مفردة`
                        : `Split Multi-Period (${menuLesson.duration}h) into Single Hours`}
                    </span>
                  </button>
                )}

                {/* Split Class into Groups */}
                {menuLesson && menuLesson.entireClass !== false && onSplitLesson && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onSplitLesson(contextMenu.lessonId, 'groups');
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left rtl:text-right flex items-center gap-2 hover:bg-amber-50 text-amber-900 transition font-medium"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {isRtl ? 'تقسيم الفصل إلى مجموعتين (أ / ب)' : 'Split Class into 2 Groups (G1/G2)'}
                    </span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                {/* Unplace / Return to Bank */}
                {!isReadOnly && !isMenuLocked && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onRemovePlacement(contextMenu.lessonId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left rtl:text-right flex items-center gap-2 hover:bg-rose-50 text-rose-700 transition font-medium"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isRtl ? 'إرجاع إلى بنك الحصص' : 'Return to Card Deck'}</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
