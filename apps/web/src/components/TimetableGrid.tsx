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
import { AlertTriangle, X, GripVertical } from 'lucide-react';

interface TimetableGridProps {
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  placements: Placement[];
  lessons: Lesson[];
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  conflicts: Conflict[];
  onPlaceLesson: (lessonId: string, dayIndex: number, periodIndex: number, roomId?: string) => void;
  onRemovePlacement: (lessonId: string) => void;
  onMovePlacement: (lessonId: string, targetDay: number, targetPeriod: number) => void;
  zoomLevel: number;
  isReadOnly: boolean;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  lang,
  viewMode,
  selectedEntityId,
  setSelectedEntityId,
  placements,
  lessons,
  subjects,
  teachers,
  classes,
  rooms,
  conflicts,
  onPlaceLesson,
  onRemovePlacement,
  onMovePlacement,
  zoomLevel,
  isReadOnly,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Fast entity lookup maps
  const lessonMap = React.useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const subjectMap = React.useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const teacherMap = React.useMemo(() => new Map(teachers.map((tc) => [tc.id, tc])), [teachers]);
  const classMap = React.useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const roomMap = React.useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Conflict lookup by lesson ID
  const conflictLessonIds = React.useMemo(() => {
    return new Set(conflicts.map((c) => c.lessonId));
  }, [conflicts]);

  // Drag over tracking
  const [dragOverCell, setDragOverCell] = useState<{ day: number; period: number; entityId: string } | null>(null);

  // Entities displayed as rows in the matrix
  const rowEntities = React.useMemo(() => {
    if (viewMode === 'class') {
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
    // Wall view: shows all classes
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

  const handleDragLeave = () => {
    setDragOverCell(null);
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
        // Move placed card
        onMovePlacement(item.lessonId, targetDay, targetPeriod);
      } else if (item.type === 'deck') {
        // Place from deck
        onPlaceLesson(item.lessonId, targetDay, targetPeriod);
      }
    } catch (err) {
      console.error('Failed to parse drag item:', err);
    }
  };

  return (
    <div
      className="flex-1 overflow-auto bg-slate-200 select-none p-2"
      style={{ fontSize: `${Math.round(zoomLevel * 12)}px` }}
    >
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden inline-block min-w-full">
        <table className="border-collapse w-full text-slate-800">
          {/* Day Headers (Upper Tier) */}
          <thead>
            <tr className="bg-slate-200 border-b border-slate-300 text-slate-700 text-xs font-bold">
              {/* Top-Left Entity Header Column */}
              <th
                rowSpan={2}
                className="p-2 border-r border-slate-300 bg-slate-100 text-center min-w-[140px] sticky left-0 z-20 shadow-xs"
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
              {t.days.map((dayName, dIdx) => (
                <th
                  key={dayName}
                  colSpan={t.periods.length}
                  className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-800 bg-slate-100 tracking-wide"
                >
                  {dayName}
                </th>
              ))}
            </tr>

            {/* Period Sub-headers (Lower Tier with Bell Times) */}
            <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-600 font-semibold">
              {t.days.map((_, dIdx) =>
                t.periods.map((periodName, pIdx) => (
                  <th
                    key={`${dIdx}-${pIdx}`}
                    className="p-1 border-r border-slate-200 text-center min-w-[100px] max-w-[130px]"
                  >
                    <div className="font-bold text-slate-700">{pIdx + 1}</div>
                    <div className="text-[9px] text-slate-400 font-mono scale-90">
                      {t.bellSchedule[pIdx].split('-')[0].trim()}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>

          {/* Matrix Body: Rows of Entities $\times$ Cells */}
          <tbody>
            {rowEntities.map((entity) => {
              const isSelectedRow = selectedEntityId === entity.id;

              return (
                <tr
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`border-b border-slate-200 transition-colors cursor-pointer ${
                    isSelectedRow
                      ? 'bg-sky-50/70'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Entity Label Cell (Sticky Left) */}
                  <td
                    className={`p-2 border-r border-slate-300 text-xs sticky left-0 z-10 transition-colors ${
                      isSelectedRow
                        ? 'bg-sky-100/90 font-bold text-sky-900 border-l-4 border-l-sky-600 shadow-xs'
                        : 'bg-slate-50 font-semibold text-slate-700'
                    }`}
                  >
                    <div className="truncate font-bold">{entity.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{entity.code}</div>
                  </td>

                  {/* Period Slot Cells */}
                  {t.days.map((_, dIdx) =>
                    t.periods.map((_, pIdx) => {
                      // Find placement for this row entity and slot
                      const placement = placements.find((p) => {
                        if (p.dayIndex !== dIdx || p.periodIndex !== pIdx) return false;
                        const lesson = lessonMap.get(p.lessonId);
                        if (!lesson) return false;
                        if (entity.type === 'class') return lesson.classId === entity.id;
                        if (entity.type === 'teacher') return lesson.teacherId === entity.id;
                        if (entity.type === 'room') return p.roomId === entity.id;
                        return false;
                      });

                      const lesson = placement ? lessonMap.get(placement.lessonId) : null;
                      const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
                      const teacher = lesson ? teacherMap.get(lesson.teacherId) : null;
                      const targetClass = lesson ? classMap.get(lesson.classId) : null;
                      const room = placement ? roomMap.get(placement.roomId) : null;

                      const hasConflict = lesson ? conflictLessonIds.has(lesson.id) : false;
                      const isDragOver =
                        dragOverCell?.day === dIdx &&
                        dragOverCell?.period === pIdx &&
                        dragOverCell?.entityId === entity.id;

                      return (
                        <td
                          key={`${dIdx}-${pIdx}`}
                          onDragOver={(e) => handleDragOver(e, dIdx, pIdx, entity.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dIdx, pIdx, entity.id)}
                          className={`p-1 border-r border-slate-200 align-top h-16 min-w-[95px] max-w-[125px] transition-all relative ${
                            isDragOver ? 'bg-sky-100 ring-2 ring-sky-500 ring-inset' : ''
                          }`}
                        >
                          {lesson && subject ? (
                            /* Authentic Desktop Physical Lesson Card */
                            <div
                              draggable={!isReadOnly}
                              onDragStart={(e) => handleDragStart(e, lesson.id, dIdx, pIdx)}
                              className={`lesson-card h-full rounded border select-none p-1 flex flex-col justify-between text-xs relative group cursor-grab active:cursor-grabbing ${
                                hasConflict
                                  ? 'conflict-stripes border-rose-500 bg-rose-50/90 ring-1 ring-rose-400'
                                  : 'border-slate-300'
                              }`}
                              style={{
                                backgroundColor: hasConflict ? undefined : subject.color + '26', // Pastel tint
                                borderTop: `3px solid ${subject.color}`,
                              }}
                            >
                              {/* Subject Code Center */}
                              <div className="flex items-center justify-between gap-0.5">
                                <span className="font-extrabold text-[11px] text-slate-900 tracking-tight truncate">
                                  {subject.code || (isRtl ? subject.nameAr || subject.name : subject.name)}
                                </span>

                                <div className="flex items-center gap-0.5">
                                  {hasConflict && (
                                    <span title={isRtl ? 'تعارض في هذا التسكين' : 'Clash in this placement'}>
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                                    </span>
                                  )}

                                  {/* Quick Remove Button (hover) */}
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

                              {/* Badges: Teacher and Room Corner Badges */}
                              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-700 pt-0.5 border-t border-slate-300/40">
                                {/* Bottom-left: Teacher shortcode */}
                                <span className="truncate max-w-[50px]" title={teacher?.name}>
                                  {teacher ? (isRtl ? teacher.nameAr?.split(' ')[0] || teacher.name : teacher.name.split(' ').slice(-1)[0]) : ''}
                                </span>

                                {/* Bottom-right: Classroom badge */}
                                <span
                                  className="px-1 rounded bg-white/80 border border-slate-300/60 font-mono text-[8px] text-slate-800"
                                  title={room?.name}
                                >
                                  {room ? room.id : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Empty Slot (Drop Target) */
                            <div className="h-full border border-dashed border-slate-200/80 rounded flex items-center justify-center text-[10px] text-slate-300 hover:border-slate-400 hover:bg-slate-50 transition">
                              <span className="opacity-0 group-hover:opacity-60">+</span>
                            </div>
                          )}
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
  );
};
