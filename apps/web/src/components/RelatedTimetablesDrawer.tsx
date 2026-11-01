'use client';

import React from 'react';
import {
  Placement,
  Lesson,
  Teacher,
  ClassGroup,
  Room,
  Subject,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  UserCheck,
  DoorOpen,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
} from 'lucide-react';

interface RelatedTimetablesDrawerProps {
  lang: 'en' | 'ar';
  isOpen: boolean;
  onClose: () => void;
  selectedPlacement: Placement | null;
  selectedLesson: Lesson | null;
  placements: Placement[];
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
  onSelectSlot?: (dayIndex: number, periodIndex: number) => void;
}

export const RelatedTimetablesDrawer: React.FC<RelatedTimetablesDrawerProps> = ({
  lang,
  isOpen,
  onClose,
  selectedPlacement,
  selectedLesson,
  placements,
  teacherMap,
  classMap,
  roomMap,
  subjectMap,
  lessonMap,
  cycleDays,
  periodsPerDay,
  customDays,
  customPeriods,
  onSelectSlot,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  if (!isOpen) return null;

  const currentTeacherId = selectedLesson?.teacherId;
  const currentClassId = selectedLesson?.classId;
  const currentRoomId = selectedPlacement?.roomId || selectedLesson?.roomId;

  const currentTeacher = currentTeacherId ? teacherMap.get(currentTeacherId) : undefined;
  const currentClass = currentClassId ? classMap.get(currentClassId) : undefined;
  const currentRoom = currentRoomId ? roomMap.get(currentRoomId) : undefined;

  const daysList =
    customDays && customDays.length > 0
      ? customDays.slice(0, cycleDays)
      : t.days.slice(0, cycleDays);
  const periodsList =
    customPeriods && customPeriods.length > 0
      ? customPeriods.slice(0, periodsPerDay)
      : t.periods.slice(0, periodsPerDay);

  // Index placements for fast lookup
  const teacherPlacements = new Map<string, Placement>();
  const classPlacements = new Map<string, Placement>();
  const roomPlacements = new Map<string, Placement>();

  for (const p of placements) {
    const l = lessonMap.get(p.lessonId);
    if (!l) continue;
    const key = `${p.dayIndex}-${p.periodIndex}`;
    if (l.teacherId === currentTeacherId) teacherPlacements.set(key, p);
    if (l.classId === currentClassId) classPlacements.set(key, p);
    if (p.roomId === currentRoomId) roomPlacements.set(key, p);
  }

  const renderMiniGrid = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    iconColor: string,
    slotPlacements: Map<string, Placement>,
    entityType: 'teacher' | 'class' | 'room'
  ) => {
    return (
      <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col min-w-[280px] overflow-hidden">
        {/* Header */}
        <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className={iconColor}>{icon}</span>
            <div className="truncate">
              <span className="text-[11px] font-bold text-slate-800 block truncate leading-tight">
                {title}
              </span>
              <span className="text-[9px] text-slate-500 block truncate leading-none">
                {subtitle}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
            {slotPlacements.size} {isRtl ? 'حصص' : 'slots'}
          </span>
        </div>

        {/* Mini Grid Table */}
        <div className="p-1.5 overflow-x-auto flex-1">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="p-0.5 text-[8px] font-bold text-slate-400 bg-slate-100/50 rounded-xs w-6 text-center">
                  #
                </th>
                {daysList.map((day, dIdx) => (
                  <th
                    key={dIdx}
                    className="p-0.5 text-[8px] font-bold text-slate-600 bg-slate-100/50 text-center truncate max-w-[42px]"
                  >
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodsList.map((_, pIdx) => (
                <tr key={pIdx} className="border-t border-slate-100">
                  <td className="p-0.5 text-[8px] text-slate-400 text-center font-mono">
                    {pIdx + 1}
                  </td>
                  {daysList.map((_, dIdx) => {
                    const key = `${dIdx}-${pIdx}`;
                    const placement = slotPlacements.get(key);
                    const isSelectedSlot =
                      selectedPlacement?.dayIndex === dIdx &&
                      selectedPlacement?.periodIndex === pIdx;
                    const lesson = placement ? lessonMap.get(placement.lessonId) : null;
                    const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
                    const isCurrentLesson = placement?.lessonId === selectedPlacement?.lessonId;

                    return (
                      <td
                        key={dIdx}
                        onClick={() => onSelectSlot && onSelectSlot(dIdx, pIdx)}
                        className={`p-0.5 text-center cursor-pointer transition-colors relative border border-slate-100/80 ${
                          isSelectedSlot
                            ? 'ring-1 ring-amber-500 bg-amber-50/70 font-bold z-10'
                            : placement
                            ? isCurrentLesson
                              ? 'bg-sky-100 text-sky-900 font-bold'
                              : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-50/40 text-emerald-600 hover:bg-emerald-100/50'
                        }`}
                        title={
                          placement
                            ? `${subject?.name || 'Lesson'} (${isRtl ? 'مشغول' : 'Occupied'})`
                            : isRtl
                            ? 'متاح (شاغر)'
                            : 'Free Slot'
                        }
                      >
                        {placement ? (
                          <div
                            className="truncate px-0.5 py-0.5 rounded text-[8px] leading-tight flex items-center justify-center font-medium shadow-2xs"
                            style={{
                              backgroundColor: subject?.color ? `${subject.color}25` : '#e2e8f0',
                              color: subject?.color || '#334155',
                              borderLeft: subject?.color ? `2px solid ${subject.color}` : undefined,
                            }}
                          >
                            <span className="truncate">
                              {entityType === 'teacher'
                                ? classMap.get(lesson?.classId || '')?.name || 'Class'
                                : entityType === 'class'
                                ? subject?.code || subject?.name?.slice(0, 4) || 'Sub'
                                : teacherMap.get(lesson?.teacherId || '')?.name?.slice(0, 5) || 'T'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[7px] text-emerald-600 font-semibold opacity-70">
                            ✓
                          </span>
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
    );
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-t-2 border-sky-500 shadow-2xl transition-all duration-200 ${
        isMinimized ? 'h-9' : 'h-64'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Dock Bar Header */}
      <div className="h-9 px-3 bg-slate-800 flex items-center justify-between border-b border-slate-700 select-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-sky-600 flex items-center justify-center shadow">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            {isRtl ? 'الجداول المرتبطة المتزامنة' : 'Related Timetables Dock'}
            {selectedLesson && (
              <span className="text-[10px] font-normal text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-700/50">
                {subjectMap.get(selectedLesson.subjectId)?.name || 'Lesson'} •{' '}
                {currentClass?.name || 'Class'} • {currentTeacher?.name || 'Teacher'}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            {isRtl
              ? 'معاينة حية للمدرس والفصل والقاعة في نفس اللحظة'
              : 'Synchronized live view for Teacher, Class & Room'}
          </span>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isMinimized ? (isRtl ? 'تكبير اللوحة' : 'Expand') : (isRtl ? 'تصغير' : 'Collapse')}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-600 text-slate-400 hover:text-white transition"
            title={isRtl ? 'إغلاق اللوحة' : 'Close Dock'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Synchronized 3-Pane View */}
      {!isMinimized && (
        <div className="p-2.5 h-[calc(100%-36px)] flex items-stretch gap-2.5 overflow-x-auto">
          {renderMiniGrid(
            currentTeacher?.name || (isRtl ? 'لم يتم اختيار معلم' : 'No Teacher Selected'),
            currentTeacher?.speciality || (isRtl ? 'جدول المعلم الأسبوعي' : 'Teacher Schedule'),
            <UserCheck className="w-4 h-4" />,
            'text-violet-600',
            teacherPlacements,
            'teacher'
          )}

          {renderMiniGrid(
            currentClass?.name || (isRtl ? 'لم يتم اختيار فصل' : 'No Class Selected'),
            isRtl ? `الصف ${currentClass?.grade || '-'}` : `Grade ${currentClass?.grade || '-'}`,
            <Users className="w-4 h-4" />,
            'text-indigo-600',
            classPlacements,
            'class'
          )}

          {renderMiniGrid(
            currentRoom?.name || (isRtl ? 'لم يتم تحديد قاعة' : 'No Room Assigned'),
            currentRoom ? `${currentRoom.type} (سعة: ${currentRoom.capacity})` : (isRtl ? 'جدول إشغال القاعة' : 'Room Schedule'),
            <DoorOpen className="w-4 h-4" />,
            'text-amber-600',
            roomPlacements,
            'room'
          )}
        </div>
      )}
    </div>
  );
};
