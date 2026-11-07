'use client';

import React, { useMemo } from 'react';
import {
  Placement,
  Lesson,
  Subject,
  Teacher,
  ClassGroup,
  Room,
} from '../lib/types';
import { translations } from '../lib/i18n';
import { collectEntityClassrooms } from '../lib/domain';

export type ColorMode = 'color' | 'ink_saver' | 'black_white';
export type SheetLayoutOrientation = 'horizontal_asc' | 'vertical_days';

export interface IndividualTimetableSheetProps {
  lang: 'en' | 'ar';
  entityType: 'teacher' | 'class' | 'room';
  entityId: string;
  entityName: string;
  entitySubtitle?: string; // e.g. Speciality or Grade
  quotaHours?: number;     // e.g. Weekly hours
  homeroomTeacherName?: string;
  schoolName: string;
  academicYear: string;
  daysList: string[];
  periodsList: string[];
  bellSchedule?: string[];
  placements: Placement[];
  lessons: Lesson[];
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  teacherMap?: Map<string, Teacher>;
  classMap?: Map<string, ClassGroup>;
  roomMap?: Map<string, Room>;
  subjectMap?: Map<string, Subject>;
  lessonMap?: Map<string, Lesson>;
  colorMode: ColorMode;
  layoutOrientation?: SheetLayoutOrientation; // default 'horizontal_asc'
  showSignatures?: boolean;
  preparedBy?: string;
  approvedBy?: string;
  isPrintOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(59, 130, 246, ${alpha})`;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(59, 130, 246, ${alpha})`;
}

function getDayAbbreviation(dayName: string, isRtl: boolean): string {
  const lower = dayName.toLowerCase().trim();
  if (lower.startsWith('sat') || lower.includes('سبت')) return isRtl ? 'السبت' : 'Sa';
  if (lower.startsWith('sun') || lower.includes('أحد') || lower.includes('احد')) return isRtl ? 'الأحد' : 'Su';
  if (lower.startsWith('mon') || lower.includes('إثنين') || lower.includes('اثنين')) return isRtl ? 'الإثنين' : 'Mo';
  if (lower.startsWith('tue') || lower.includes('ثلاثاء')) return isRtl ? 'الثلاثاء' : 'Tu';
  if (lower.startsWith('wed') || lower.includes('أربعاء') || lower.includes('اربعاء')) return isRtl ? 'الأربعاء' : 'We';
  if (lower.startsWith('thu') || lower.includes('خميس')) return isRtl ? 'الخميس' : 'Th';
  if (lower.startsWith('fri') || lower.includes('جمعة')) return isRtl ? 'الجمعة' : 'Fr';
  return dayName.substring(0, 2);
}

export const IndividualTimetableSheet: React.FC<IndividualTimetableSheetProps> = ({
  lang,
  entityType,
  entityId,
  entityName,
  entitySubtitle,
  quotaHours,
  homeroomTeacherName,
  schoolName,
  academicYear,
  daysList = [],
  periodsList = [],
  bellSchedule,
  placements = [],
  lessons = [],
  subjects = [],
  teachers = [],
  classes = [],
  rooms = [],
  teacherMap: propTeacherMap,
  classMap: propClassMap,
  roomMap: propRoomMap,
  subjectMap: propSubjectMap,
  lessonMap: propLessonMap,
  colorMode = 'color',
  layoutOrientation = 'horizontal_asc',
  showSignatures = false,
  preparedBy = '',
  approvedBy = '',
  isPrintOnly = false,
  className = '',
  style,
}) => {
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const t = translations[lang] || translations.en;

  // Safe fallback maps for O(1) lookups
  const teacherMap = useMemo(
    () => propTeacherMap ?? new Map(teachers.map((tc) => [tc.id, tc])),
    [propTeacherMap, teachers]
  );
  const classMap = useMemo(
    () => propClassMap ?? new Map(classes.map((c) => [c.id, c])),
    [propClassMap, classes]
  );
  const roomMap = useMemo(
    () => propRoomMap ?? new Map(rooms.map((r) => [r.id, r])),
    [propRoomMap, rooms]
  );
  const subjectMap = useMemo(
    () => propSubjectMap ?? new Map(subjects.map((s) => [s.id, s])),
    [propSubjectMap, subjects]
  );
  const lessonMap = useMemo(
    () => propLessonMap ?? new Map(lessons.map((l) => [l.id, l])),
    [propLessonMap, lessons]
  );

  // Fallback days, periods, bell schedule
  const actualDays = useMemo(() => {
    if (daysList && daysList.length > 0) return daysList;
    return t.days || (isRtl ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
  }, [daysList, t.days, isRtl]);

  const actualPeriods = useMemo(() => {
    if (periodsList && periodsList.length > 0) return periodsList;
    return t.periods || Array.from({ length: 7 }, (_, i) => `Period ${i + 1}`);
  }, [periodsList, t.periods]);

  const bells = useMemo(() => {
    if (bellSchedule && bellSchedule.length > 0) return bellSchedule;
    return t.bellSchedule || ['08:00 - 08:29', '08:30 - 08:59', '09:00 - 09:29', '09:30 - 09:59', '10:00 - 10:29', '10:30 - 10:59', '11:00 - 11:29'];
  }, [bellSchedule, t.bellSchedule]);

  // Filter placements belonging to this entity
  const entityPlacements = useMemo(() => {
    return placements.filter((p) => {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) return false;

      if (entityType === 'teacher') {
        const matchesSingle = lesson.teacherId === entityId;
        const matchesMulti = Array.isArray(lesson.teacherIds) && lesson.teacherIds.includes(entityId);
        return matchesSingle || matchesMulti;
      }

      if (entityType === 'class') {
        const matchesSingle = lesson.classId === entityId;
        const matchesMulti = Array.isArray(lesson.classIds) && lesson.classIds.includes(entityId);
        const matchesJoint = Array.isArray(lesson.jointClassIds) && lesson.jointClassIds.includes(entityId);
        return matchesSingle || matchesMulti || matchesJoint;
      }

      if (entityType === 'room') {
        return p.roomId === entityId || (!p.roomId && lesson.roomId === entityId);
      }

      return false;
    });
  }, [placements, lessonMap, entityType, entityId]);

  // Index placements by slot (dayIndex:periodIndex)
  const placementsBySlot = useMemo(() => {
    const map = new Map<string, Placement[]>();
    for (let i = 0; i < entityPlacements.length; i++) {
      const p = entityPlacements[i];
      const key = `${p.dayIndex}:${p.periodIndex}`;
      const list = map.get(key);
      if (list) {
        list.push(p);
      } else {
        map.set(key, [p]);
      }
    }
    return map;
  }, [entityPlacements]);

  // Calculate weekly teaching quota in hours / scheduled periods
  const calculatedQuota = useMemo(() => entityPlacements.length, [entityPlacements]);
  const effectiveQuota = quotaHours !== undefined ? quotaHours : calculatedQuota;

  // Resolve entity details for header
  const teacherObj = entityType === 'teacher' ? teacherMap.get(entityId) : null;
  const classObj = entityType === 'class' ? classMap.get(entityId) : null;

  const resolvedEntityName = useMemo(() => {
    if (entityName && entityName.trim() !== '') return entityName;
    if (teacherObj) return isRtl ? teacherObj.nameAr || teacherObj.name : teacherObj.name;
    if (classObj) return isRtl ? classObj.nameAr || classObj.name : classObj.name;
    return entityId;
  }, [entityName, teacherObj, classObj, isRtl, entityId]);

  // Collect room inventory for top-right print list (aSc authentic feature)
  const classroomInventory = useMemo(() => {
    return collectEntityClassrooms(entityId, entityType, lessons, rooms, placements);
  }, [entityId, entityType, lessons, rooms, placements]);

  // Color mode visual themes
  const isBw = colorMode === 'black_white';
  const isInkSaver = colorMode === 'ink_saver';

  const tableHeaderClasses = isBw
    ? 'bg-white text-black font-extrabold border-b-2 border-black'
    : isInkSaver
    ? 'bg-slate-50 text-slate-800 font-semibold border-b border-slate-300'
    : 'bg-slate-100 text-slate-900 font-bold border-b border-slate-300';

  const cellBorderClasses = isBw
    ? 'border border-black'
    : isInkSaver
    ? 'border border-slate-300'
    : 'border border-slate-300';

  const formattedDate = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Helper to render card contents inside a cell
  const renderCardContent = (slotPlacements: Placement[], isSubRow: boolean = false) => {
    if (slotPlacements.length === 0) {
      return (
        <div className="w-full h-full min-h-[52px] flex items-center justify-center text-slate-300 select-none">
          <span className="text-xs font-light opacity-50">-</span>
        </div>
      );
    }

    if (slotPlacements.length === 1 && !isSubRow) {
      const p = slotPlacements[0];
      const lesson = lessonMap.get(p.lessonId);
      const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
      const teacher = lesson ? teacherMap.get(lesson.teacherId) : null;
      const targetClass = lesson ? classMap.get(lesson.classId) : null;
      const room = p.roomId
        ? roomMap.get(p.roomId)
        : lesson?.roomId
        ? roomMap.get(lesson.roomId)
        : null;

      const subjectName = subject
        ? isRtl
          ? subject.nameAr || subject.name
          : subject.name
        : lesson?.subjectId || '-';

      let secondaryName = '';
      if (entityType === 'class') {
        const targetTeacherIds = lesson?.teacherIds?.length
          ? lesson.teacherIds
          : lesson?.teacherId
          ? [lesson.teacherId]
          : [];
        secondaryName = targetTeacherIds
          .map((id) => {
            const tc = teacherMap.get(id);
            return isRtl ? tc?.nameAr || tc?.name || id : tc?.name || id;
          })
          .join(' / ');
      } else if (entityType === 'teacher') {
        const targetClassIds = lesson?.classIds?.length
          ? lesson.classIds
          : lesson?.jointClassIds?.length
          ? lesson.jointClassIds
          : lesson?.classId
          ? [lesson.classId]
          : [];
        secondaryName = targetClassIds
          .map((id) => {
            const c = classMap.get(id);
            return isRtl ? c?.nameAr || c?.name || id : c?.name || id;
          })
          .join(' + ');
      } else {
        secondaryName = targetClass
          ? isRtl
            ? targetClass.nameAr || targetClass.name
            : targetClass.name
          : '';
      }

      const roomNameStr = room
        ? room.capacity
          ? `${room.name} (${room.capacity})`
          : room.name
        : p.roomId || '';

      const rawGroup =
        lesson?.groupName ||
        (lesson?.entireClass === false && lesson?.groupId
          ? lesson.groupId
          : undefined);
      const isEntire =
        !rawGroup ||
        rawGroup.toLowerCase() === 'entire class' ||
        rawGroup === 'كامل الفصل';
      const groupTag = !isEntire ? rawGroup : undefined;

      const cardStyle: React.CSSProperties = isBw
        ? { backgroundColor: '#ffffff' }
        : isInkSaver
        ? { backgroundColor: '#ffffff' }
        : {
            backgroundColor: subject?.color
              ? hexToRgba(subject.color, 0.08)
              : 'rgba(248, 250, 252, 0.8)',
          };

      return (
        <div
          style={cardStyle}
          className="w-full h-full min-h-[58px] p-1 flex flex-col justify-between text-center select-none"
        >
          {/* Top/Center: Subject Name & Group Badge */}
          <div className="relative w-full">
            <span
              className={`font-black text-xs sm:text-[13px] leading-tight block truncate ${
                isBw ? 'text-black' : 'text-slate-900'
              }`}
              title={subjectName}
            >
              {subjectName}
            </span>
            {groupTag && (
              <span className="absolute top-0 right-0 text-[8px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-1 rounded">
                {groupTag}
              </span>
            )}
          </div>

          {/* Bottom Bar: Teacher on Left, Room on Right */}
          <div className="flex items-center justify-between text-[10px] text-slate-700 font-medium px-0.5 mt-1">
            <span className="truncate max-w-[55%] text-left" title={secondaryName}>
              {secondaryName || '-'}
            </span>
            {roomNameStr && (
              <span className="truncate font-mono font-bold text-slate-800" title={roomNameStr}>
                {roomNameStr}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Multiple simultaneous group lessons: Render horizontal sub-rows
    return (
      <div className="flex flex-col h-full w-full justify-between divide-y divide-slate-300 select-none">
        {slotPlacements.map((p, idx) => {
          const lesson = lessonMap.get(p.lessonId);
          const subject = lesson ? subjectMap.get(lesson.subjectId) : null;
          const targetClass = lesson ? classMap.get(lesson.classId) : null;
          const room = p.roomId
            ? roomMap.get(p.roomId)
            : lesson?.roomId
            ? roomMap.get(lesson.roomId)
            : null;

          const subjectName = subject
            ? isRtl
              ? subject.nameAr || subject.name
              : subject.name
            : lesson?.subjectId || '-';

          let secondaryName = '';
          if (entityType === 'class') {
            const targetTeacherIds = lesson?.teacherIds?.length
              ? lesson.teacherIds
              : lesson?.teacherId
              ? [lesson.teacherId]
              : [];
            secondaryName = targetTeacherIds
              .map((id) => {
                const tc = teacherMap.get(id);
                return isRtl ? tc?.nameAr || tc?.name || id : tc?.name || id;
              })
              .join(' / ');
          } else if (entityType === 'teacher') {
            const targetClassIds = lesson?.classIds?.length
              ? lesson.classIds
              : lesson?.jointClassIds?.length
              ? lesson.jointClassIds
              : lesson?.classId
              ? [lesson.classId]
              : [];
            secondaryName = targetClassIds
              .map((id) => {
                const c = classMap.get(id);
                return isRtl ? c?.nameAr || c?.name || id : c?.name || id;
              })
              .join(' + ');
          } else {
            secondaryName = targetClass
              ? isRtl
                ? targetClass.nameAr || targetClass.name
                : targetClass.name
              : '';
          }

          const roomNameStr = room
            ? room.capacity
              ? `${room.name} (${room.capacity})`
              : room.name
            : p.roomId || '';

          const rawGroup =
            lesson?.groupName ||
            (lesson?.entireClass === false && lesson?.groupId
              ? lesson.groupId
              : undefined);
          const isEntire =
            !rawGroup ||
            rawGroup.toLowerCase() === 'entire class' ||
            rawGroup === 'كامل الفصل';
          const groupTag = !isEntire ? rawGroup : undefined;

          return (
            <div
              key={`${p.lessonId}-${idx}`}
              className="py-0.5 px-1 flex items-center justify-between text-[10px] leading-tight"
            >
              <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                <span className="font-bold text-slate-900 truncate" title={subjectName}>
                  {subjectName}
                </span>
                {secondaryName && (
                  <span className="text-slate-600 truncate text-[9px]" title={secondaryName}>
                    {secondaryName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[9px]">
                {roomNameStr && (
                  <span className="font-mono font-semibold text-slate-800">
                    {roomNameStr}
                  </span>
                )}
                {groupTag && (
                  <span className="font-bold text-slate-800 bg-slate-100 border border-slate-300 px-1 rounded text-[8px]">
                    {groupTag}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      dir={dir}
      lang={lang}
      data-testid="individual-timetable-sheet"
      data-entity-type={entityType}
      data-entity-id={entityId}
      data-color-mode={colorMode}
      data-layout-orientation={layoutOrientation}
      style={{
        pageBreakAfter: 'always',
        breakAfter: 'page',
        ...style,
      }}
      className={`individual-timetable-sheet print-sheet page-break-after-always break-after-page w-full bg-white text-slate-900 box-border p-3 sm:p-5 mx-auto ${
        isPrintOnly ? 'hidden print:block' : 'block'
      } ${className}`}
    >
      {/* Scoped print rules ensuring exact one-sheet page breaks */}
      <style>{`
        @media print {
          .individual-timetable-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            padding: 8mm !important;
          }
          .individual-timetable-sheet thead {
            display: table-header-group !important;
          }
          .individual-timetable-sheet tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* 1. Header Block: Prominent Centered Title + Top-Right Classroom Inventory */}
      <div className="relative mb-2 pb-1 border-b border-slate-400">
        {classroomInventory && (
          <div className="text-right text-[10px] sm:text-[11px] font-mono text-slate-600 truncate font-semibold mb-0.5">
            {classroomInventory}
          </div>
        )}

        <div className="text-center py-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            {resolvedEntityName}
          </h1>
          {entitySubtitle && (
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {entitySubtitle}
            </p>
          )}
        </div>
      </div>

      {/* 2. Main Timetable Matrix: Authentic aSc Horizontal Layout (Days as rows, Periods as columns) */}
      {layoutOrientation === 'horizontal_asc' ? (
        <div className="w-full overflow-x-auto">
          <table
            className={`w-full border-collapse table-fixed text-center ${
              isBw ? 'border-2 border-black' : 'border border-black'
            }`}
          >
            {/* Header: Periods & Bell Intervals */}
            <thead>
              <tr className={tableHeaderClasses}>
                <th
                  style={{ width: '4%' }}
                  className={`p-1 border border-black ${tableHeaderClasses}`}
                />
                {actualPeriods.map((_, pIdx) => {
                  const bell = bells[pIdx] || '';
                  const times = bell ? bell.split('-').map((t) => t.trim()) : [];
                  return (
                    <th
                      key={pIdx}
                      style={{ width: `${96 / actualPeriods.length}%` }}
                      className={`p-1 text-center border border-black ${tableHeaderClasses}`}
                    >
                      <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {pIdx + 1}
                      </div>
                      {times.length >= 2 ? (
                        <div className="text-[8px] sm:text-[9px] font-mono text-slate-700 leading-tight mt-0.5">
                          <div>{times[0]}</div>
                          <div>{times[1]}</div>
                        </div>
                      ) : bell ? (
                        <div className="text-[8px] font-mono text-slate-700 leading-tight mt-0.5">
                          {bell}
                        </div>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body: Days as Rows with colSpan Merging */}
            <tbody>
              {actualDays.map((dayName, dIdx) => {
                const consumedPeriods = new Set<number>();
                const dayAbbr = getDayAbbreviation(dayName, isRtl);

                return (
                  <tr
                    key={dIdx}
                    className={`border-b ${isBw ? 'border-black' : 'border-black'}`}
                  >
                    {/* Day label on the left */}
                    <th
                      scope="row"
                      className="p-1 align-middle text-center border border-black bg-slate-50 font-black text-base sm:text-lg text-slate-900 select-none"
                    >
                      {dayAbbr}
                    </th>

                    {/* Periods for this day with colSpan block merging */}
                    {actualPeriods.map((_, pIdx) => {
                      if (consumedPeriods.has(pIdx)) {
                        return null; // Covered by preceding multi-period colSpan
                      }

                      const slotKey = `${dIdx}:${pIdx}`;
                      const slotPlacements = placementsBySlot.get(slotKey) || [];

                      if (slotPlacements.length === 0) {
                        return (
                          <td
                            key={pIdx}
                            colSpan={1}
                            className={`border border-black p-0.5 align-middle h-14 sm:h-18 ${
                              isBw ? 'bg-white' : ''
                            }`}
                          >
                            <div className="w-full h-full min-h-[50px] flex items-center justify-center text-slate-200 select-none">
                              <span className="text-xs font-light opacity-30">-</span>
                            </div>
                          </td>
                        );
                      }

                      // Compute multi-period colSpan
                      const maxDuration = Math.max(
                        1,
                        ...slotPlacements.map(
                          (p) => lessonMap.get(p.lessonId)?.duration || 1
                        )
                      );
                      const availablePeriods = actualPeriods.length - pIdx;
                      const colSpan = Math.min(maxDuration, availablePeriods);

                      // Mark covered periods as consumed
                      for (let k = 1; k < colSpan; k++) {
                        consumedPeriods.add(pIdx + k);
                      }

                      return (
                        <td
                          key={pIdx}
                          colSpan={colSpan}
                          className={`border border-black p-0.5 align-middle h-14 sm:h-18 ${
                            isBw ? 'bg-white' : ''
                          }`}
                        >
                          {renderCardContent(slotPlacements)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Backwards-compatible Vertical Layout (Periods as rows, Days as columns) */
        <div className="w-full overflow-x-auto">
          <table
            className={`w-full border-collapse table-fixed text-center ${
              isBw ? 'border-2 border-black' : 'border border-slate-300'
            }`}
          >
            <thead>
              <tr className={tableHeaderClasses}>
                <th
                  scope="col"
                  style={{ width: '15%' }}
                  className={`p-2 text-xs font-bold border-r ${
                    isBw ? 'border-black' : 'border-slate-300'
                  }`}
                >
                  {isRtl ? 'الحصة / الوقت' : 'Period / Time'}
                </th>
                {actualDays.map((dayName, dIdx) => (
                  <th
                    key={dIdx}
                    scope="col"
                    style={{ width: `${85 / actualDays.length}%` }}
                    className={`p-2 text-xs font-bold border-r last:border-r-0 ${
                      isBw ? 'border-black' : 'border-slate-300'
                    }`}
                  >
                    {dayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actualPeriods.map((periodName, pIdx) => {
                const bellTime = bells[pIdx] || '';
                return (
                  <tr
                    key={pIdx}
                    className={`border-b ${isBw ? 'border-black' : 'border-slate-300'}`}
                  >
                    <th scope="row" className="p-1.5 align-middle text-center border-r border-slate-300 font-bold text-xs">
                      <div>{periodName}</div>
                      {bellTime && <div className="text-[10px] font-mono text-slate-500 mt-0.5">{bellTime}</div>}
                    </th>
                    {actualDays.map((_, dIdx) => {
                      const slotKey = `${dIdx}:${pIdx}`;
                      const slotPlacements = placementsBySlot.get(slotKey) || [];
                      return (
                        <td
                          key={dIdx}
                          className={`p-1 align-middle h-16 ${cellBorderClasses} ${isBw ? 'bg-white' : ''}`}
                        >
                          {renderCardContent(slotPlacements)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Authentic aSc Timetables Footer Watermark & Generation Timestamp */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-800 font-medium mt-1.5 px-0.5 select-none">
        <div>
          <span>Timetable generated:</span>
          <span className="font-semibold ml-1">{formattedDate}</span>
        </div>
        <div className="font-bold tracking-tight text-slate-900">
          aSc Timetables
        </div>
      </div>

      {/* Optional Institutional Signatures */}
      {showSignatures && (
        <div
          data-testid="signature-block"
          className={`signature-block mt-4 pt-3 flex items-end justify-between text-xs ${
            isBw ? 'border-t-2 border-black text-black' : 'border-t border-slate-300 text-slate-700'
          }`}
        >
          <div className="text-center min-w-[150px]">
            <div className="font-bold text-xs">{isRtl ? 'إعداد' : 'Prepared By'}</div>
            <div className="h-5 mt-0.5 flex items-center justify-center font-medium text-xs">
              {preparedBy || ''}
            </div>
            <div className={`mt-2 border-b-2 w-36 mx-auto ${isBw ? 'border-black' : 'border-slate-400'}`} />
          </div>
          <div className="text-center min-w-[150px]">
            <div className="font-bold text-xs">{isRtl ? 'اعتماد عميد الكلية' : 'Approved by Dean'}</div>
            <div className="h-5 mt-0.5 flex items-center justify-center font-medium text-xs">
              {approvedBy || ''}
            </div>
            <div className={`mt-2 border-b-2 w-36 mx-auto ${isBw ? 'border-black' : 'border-slate-400'}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualTimetableSheet;
