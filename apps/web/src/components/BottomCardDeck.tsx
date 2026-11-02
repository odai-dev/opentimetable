'use client';

import React, { useState } from 'react';
import {
  Lesson,
  Placement,
  Subject,
  Teacher,
  ClassGroup,
  Room,
  DragItem,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  Layers,
  Wand2,
  CheckCircle2,
  Trash2,
  Building2,
  Users,
  GraduationCap,
  DoorOpen,
} from 'lucide-react';

type DeckCategory = 'school' | 'teacher' | 'class' | 'room';

interface BottomCardDeckProps {
  lang: 'en' | 'ar';
  lessons: Lesson[];
  placements: Placement[];
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  selectedEntityId: string;
  onPlaceLesson: (lessonId: string, dayIndex?: number, periodIndex?: number) => void;
  onRemovePlacement: (lessonId: string) => void;
  onAutoPlaceAll: () => void;
  onClearEntityPlacements: (entityId: string) => void;
  isReadOnly: boolean;
}

export const BottomCardDeck: React.FC<BottomCardDeckProps> = ({
  lang,
  lessons,
  placements,
  subjects,
  teachers,
  classes,
  rooms,
  teacherMap: propTeacherMap,
  classMap: propClassMap,
  roomMap: propRoomMap,
  subjectMap: propSubjectMap,
  selectedEntityId,
  onPlaceLesson,
  onRemovePlacement,
  onAutoPlaceAll,
  onClearEntityPlacements,
  isReadOnly,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const [deckCategory, setDeckCategory] = useState<DeckCategory>('school');
  const [isDeckDragOver, setIsDeckDragOver] = useState(false);

  // Maps
  const placedLessonIds = React.useMemo(() => new Set(placements.map((p) => p.lessonId)), [placements]);
  const fallbackSubjectMap = React.useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const fallbackTeacherMap = React.useMemo(() => new Map(teachers.map((tc) => [tc.id, tc])), [teachers]);
  const fallbackClassMap = React.useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const fallbackRoomMap = React.useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const subjectMap = propSubjectMap ?? fallbackSubjectMap;
  const teacherMap = propTeacherMap ?? fallbackTeacherMap;
  const classMap = propClassMap ?? fallbackClassMap;
  const roomMap = propRoomMap ?? fallbackRoomMap;

  // Selected Entity Name
  const selectedEntityName = React.useMemo(() => {
    const cls = classMap.get(selectedEntityId);
    if (cls) return isRtl ? cls.nameAr || cls.name : cls.name;
    const tch = teacherMap.get(selectedEntityId);
    if (tch) return isRtl ? tch.nameAr || tch.name : tch.name;
    const rm = roomMap.get(selectedEntityId);
    if (rm) return isRtl ? rm.nameAr || rm.name : rm.name;
    return selectedEntityId;
  }, [selectedEntityId, classMap, teacherMap, roomMap, isRtl]);

  // Unplaced lessons
  const unplacedLessons = React.useMemo(() => {
    return lessons.filter((l) => !placedLessonIds.has(l.id));
  }, [lessons, placedLessonIds]);

  // Filtered unplaced lessons based on category
  const displayedCards = React.useMemo(() => {
    if (deckCategory === 'school') {
      return unplacedLessons;
    }
    if (deckCategory === 'class') {
      // If selected entity is a class, filter by it; otherwise show all class cards
      const isSelectedClass = classMap.has(selectedEntityId);
      if (isSelectedClass) {
        return unplacedLessons.filter(
          (l) => l.classId === selectedEntityId || Boolean(l.classIds?.includes(selectedEntityId))
        );
      }
      return unplacedLessons;
    }
    if (deckCategory === 'teacher') {
      const isSelectedTeacher = teacherMap.has(selectedEntityId);
      if (isSelectedTeacher) {
        return unplacedLessons.filter(
          (l) => l.teacherId === selectedEntityId || Boolean(l.teacherIds?.includes(selectedEntityId))
        );
      }
      return unplacedLessons;
    }
    if (deckCategory === 'room') {
      const isSelectedRoom = roomMap.has(selectedEntityId);
      if (isSelectedRoom) {
        return unplacedLessons.filter((l) => l.roomId === selectedEntityId);
      }
      return unplacedLessons;
    }
    return unplacedLessons;
  }, [unplacedLessons, deckCategory, selectedEntityId, classMap, teacherMap, roomMap]);

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, lessonId: string) => {
    if (isReadOnly) return;
    const dragItem: DragItem = {
      type: 'deck',
      lessonId,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDeckDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDeckDragOver(true);
  };

  const handleDeckDragLeave = () => {
    setIsDeckDragOver(false);
  };

  const handleDeckDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDeckDragOver(false);
    if (isReadOnly) return;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const item: DragItem = JSON.parse(dataStr);
      if (item.type === 'grid') {
        onRemovePlacement(item.lessonId);
      }
    } catch (err) {
      console.error('Failed to parse deck drop:', err);
    }
  };

  const categoryButtons = [
    { id: 'school' as DeckCategory, labelEn: 'Campus', labelAr: 'الجامعة', icon: Building2 },
    { id: 'teacher' as DeckCategory, labelEn: 'Faculty', labelAr: 'أعضاء هيئة التدريس', icon: Users },
    { id: 'class' as DeckCategory, labelEn: 'Groups', labelAr: 'الدفعات والشعب', icon: GraduationCap },
    { id: 'room' as DeckCategory, labelEn: 'Halls & Labs', labelAr: 'القاعات والمعامل', icon: DoorOpen },
  ];

  return (
    <div
      onDragOver={handleDeckDragOver}
      onDragLeave={handleDeckDragLeave}
      onDrop={handleDeckDrop}
      className={`border-t border-slate-300 bg-slate-100 flex flex-col transition-all select-none shadow-lg z-20 ${
        isDeckDragOver ? 'bg-sky-50 ring-2 ring-sky-400 ring-inset' : ''
      }`}
    >
      {/* Deck Header Bar */}
      <div className="bg-slate-200/90 border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Category Filter Icons (Classic aSc Desktop Icons) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Layers className="w-4 h-4 text-sky-700" />
            <span>{t.deck.title}</span>
          </div>

          {/* 4 Iconic Category Switcher Buttons */}
          <div className="flex items-center bg-white border border-slate-300 rounded p-0.5 gap-0.5 shadow-2xs">
            {categoryButtons.map((btn) => {
              const isActive = deckCategory === btn.id;
              const Icon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={() => setDeckCategory(btn.id)}
                  title={isRtl ? btn.labelAr : btn.labelEn}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isRtl ? btn.labelAr : btn.labelEn}</span>
                </button>
              );
            })}
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              displayedCards.length > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {displayedCards.length} {t.deck.unplacedCount}
          </span>
        </div>

        {/* Center: Dynamic Active Context */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">
            {t.deck.filterLabel}
          </span>

          <span className="px-2 py-0.5 bg-white border border-slate-300 rounded font-bold text-sky-800 text-[11px] shadow-xs">
            {deckCategory === 'school' ? (isRtl ? 'كامل الجامعة' : 'Entire University') : selectedEntityName}
          </span>
        </div>

        {/* Right: Quick Deck Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAutoPlaceAll}
            disabled={unplacedLessons.length === 0 || isReadOnly}
            title={t.deck.autoPlace}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition flex items-center gap-1 disabled:opacity-40"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{t.deck.autoPlace}</span>
          </button>

          <button
            onClick={() => onClearEntityPlacements(selectedEntityId)}
            disabled={isReadOnly}
            title={t.deck.clearRow}
            className="px-2 py-1 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 text-[11px] font-semibold shadow-xs transition flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>{t.deck.clearRow}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Draggable Card Shelf */}
      <div className="p-2.5 overflow-x-auto min-h-[96px] max-h-[120px] flex items-center gap-2.5">
        {displayedCards.length > 0 ? (
          displayedCards.map((lesson) => {
            const subject = subjectMap.get(lesson.subjectId);
            const teacher = teacherMap.get(lesson.teacherId);
            const targetClass = classMap.get(lesson.classId);
            const room = lesson.roomId ? roomMap.get(lesson.roomId) : null;

            const effectiveClassIds = lesson.classIds?.length ? lesson.classIds : (lesson.classId ? [lesson.classId] : []);
            const classShortLabel = effectiveClassIds.length > 1
              ? effectiveClassIds.map((cId) => classMap.get(cId)?.name.split('-')[0].trim() || cId).join('+')
              : (targetClass?.name.split('-')[0].trim() || '');

            const classFullLabel = effectiveClassIds.length > 1
              ? effectiveClassIds.map((cId) => {
                  const c = classMap.get(cId);
                  return isRtl ? c?.nameAr || c?.name || cId : c?.name || cId;
                }).join(' + ')
              : (targetClass ? (isRtl ? targetClass.nameAr || targetClass.name : targetClass.name) : '');

            const effectiveTeacherIds = lesson.teacherIds?.length ? lesson.teacherIds : (lesson.teacherId ? [lesson.teacherId] : []);
            const teacherLabel = effectiveTeacherIds.length > 1
              ? effectiveTeacherIds.map((tId) => {
                  const tc = teacherMap.get(tId);
                  return isRtl ? tc?.nameAr?.split(' ')[0] || tc?.name || tId : tc?.name?.split(' ').slice(-1)[0] || tId;
                }).join('/')
              : (teacher ? (isRtl ? teacher.nameAr?.split(' ')[0] || teacher.name : teacher.name.split(' ').slice(-1)[0]) : '');

            const groupBadge = lesson.groupName || (lesson.entireClass === false && lesson.groupId ? lesson.groupId : undefined);

            return (
              <div
                key={lesson.id}
                draggable={!isReadOnly}
                onDragStart={(e) => handleDragStart(e, lesson.id)}
                onClick={() => {
                  if (!isReadOnly) onPlaceLesson(lesson.id);
                }}
                title={`${subject?.name || ''} - ${classFullLabel} - ${teacher?.name || ''}${groupBadge ? ` [${groupBadge}]` : ''}`}
                className="lesson-card flex-shrink-0 w-28 h-20 rounded border border-slate-300 bg-white p-1.5 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:border-sky-400 select-none transition-all group"
                style={{
                  borderTop: `4px solid ${subject?.color || '#3b82f6'}`,
                  backgroundColor: (subject?.color || '#3b82f6') + '15',
                }}
              >
                {/* Subject Header */}
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 truncate">
                    {subject?.code || (isRtl ? subject?.nameAr || subject?.name : subject?.name)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {groupBadge && (
                      <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300/60 truncate max-w-[38px]" title={groupBadge}>
                        {groupBadge}
                      </span>
                    )}
                    <span className="text-[9px] px-1 rounded bg-slate-200/80 font-bold text-slate-700 truncate max-w-[42px]" title={classFullLabel}>
                      {classShortLabel}
                    </span>
                  </div>
                </div>

                {/* Teacher Name */}
                <div className="text-[10px] text-slate-600 font-medium truncate" title={teacherLabel}>
                  🎓 {teacherLabel}
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 border-t border-slate-300/40">
                  <span className="truncate max-w-[50px] font-semibold text-slate-700" title={classFullLabel}>
                    {classFullLabel}
                  </span>
                  <span className="px-1 rounded bg-white border border-slate-300 text-[8px] font-mono text-slate-800">
                    {room ? room.id : 'Auto'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="w-full flex items-center justify-center text-slate-400 text-xs py-4 gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              {unplacedLessons.length === 0
                ? t.deck.allPlaced
                : t.deck.emptyDeck}
            </span>
          </div>
        )}
      </div>

      {/* Dock Hint Footer */}
      <div className="bg-slate-200/60 border-t border-slate-300/60 px-3 py-0.5 text-[10px] text-slate-500 flex items-center justify-between">
        <span>💡 {t.deck.dragHint}</span>
        <span className="text-[10px] text-slate-500 font-medium">
          {displayedCards.length} {isRtl ? 'محاضرات ظاهرة' : 'visible lectures'} ({unplacedLessons.length} {isRtl ? 'في بنك المحاضرات' : 'total pending lectures'})
        </span>
      </div>
    </div>
  );
};
