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

export type ColorMode = 'color' | 'ink_saver' | 'black_white';

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
  showSignatures = true,
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
    return t.days || (isRtl ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  }, [daysList, t.days, isRtl]);

  const actualPeriods = useMemo(() => {
    if (periodsList && periodsList.length > 0) return periodsList;
    return t.periods || (isRtl ? ['الحصة 1', 'الحصة 2', 'الحصة 3', 'الحصة 4', 'الحصة 5', 'الحصة 6', 'الحصة 7'] : ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7']);
  }, [periodsList, t.periods, isRtl]);

  const bells = useMemo(() => {
    if (bellSchedule && bellSchedule.length > 0) return bellSchedule;
    return t.bellSchedule || ['08:00 - 08:45', '08:55 - 09:40', '09:50 - 10:35', '10:55 - 11:40', '11:50 - 12:35', '12:45 - 13:30', '13:40 - 14:25'];
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

  const specialtyDisplay = useMemo(() => {
    if (entitySubtitle && entitySubtitle.trim() !== '') return entitySubtitle;
    if (teacherObj?.speciality) return teacherObj.speciality;
    return isRtl ? 'عام' : 'General';
  }, [entitySubtitle, teacherObj, isRtl]);

  const gradeDisplay = useMemo(() => {
    if (entitySubtitle && entitySubtitle.trim() !== '') return entitySubtitle;
    if (classObj?.grade) return isRtl ? `المستوى ${classObj.grade}` : `Level ${classObj.grade}`;
    return '-';
  }, [entitySubtitle, classObj, isRtl]);

  const homeroomDisplay = useMemo(() => {
    if (homeroomTeacherName && homeroomTeacherName.trim() !== '') return homeroomTeacherName;
    if (classObj?.homeRoomId) {
      const hrTeacher = teacherMap.get(classObj.homeRoomId);
      if (hrTeacher) return isRtl ? hrTeacher.nameAr || hrTeacher.name : hrTeacher.name;
    }
    return isRtl ? 'غير محدد' : 'Unassigned';
  }, [homeroomTeacherName, classObj, teacherMap, isRtl]);

  // Color mode visual themes
  const isBw = colorMode === 'black_white';
  const isInkSaver = colorMode === 'ink_saver';

  const tableHeaderClasses = isBw
    ? 'bg-white text-black font-extrabold border-b-2 border-black'
    : isInkSaver
    ? 'bg-slate-50 text-slate-700 font-semibold border-b border-slate-300'
    : 'bg-slate-100 text-slate-800 font-bold border-b border-slate-300';

  const periodThClasses = isBw
    ? 'bg-white text-black font-bold border-r border-black'
    : isInkSaver
    ? 'bg-white text-slate-700 font-semibold border-r border-slate-200'
    : 'bg-slate-50 text-slate-800 font-semibold border-r border-slate-200';

  const cellBorderClasses = isBw
    ? 'border border-black'
    : isInkSaver
    ? 'border border-slate-200'
    : 'border border-slate-300';

  return (
    <div
      dir={dir}
      lang={lang}
      data-testid="individual-timetable-sheet"
      data-entity-type={entityType}
      data-entity-id={entityId}
      data-color-mode={colorMode}
      style={{
        pageBreakAfter: 'always',
        breakAfter: 'page',
        ...style,
      }}
      className={`individual-timetable-sheet print-sheet page-break-after-always break-after-page w-full bg-white text-slate-900 box-border p-4 sm:p-6 mx-auto ${
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
            padding: 12mm !important;
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

      {/* Header Block: School Branding and Sheet Title */}
      <div
        className={`pb-3 mb-4 border-b ${
          isBw ? 'border-black border-b-2' : 'border-slate-300'
        } flex items-center justify-between gap-4`}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {schoolName || (isRtl ? 'الجامعة النموذجية' : 'OpenTimetable University')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {academicYear || (isRtl ? 'العام الدراسي 2025 / 2026' : 'Academic Year 2025 / 2026')}
          </p>
        </div>

        <div className="text-center">
          <div className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-800">
            {entityType === 'teacher'
              ? isRtl
                ? 'جدول الحصص الأسبوعي للمعلم'
                : "Teacher's Weekly Timetable"
              : isRtl
              ? 'جدول الحصص الأسبوعي للفصل'
              : "Class Weekly Timetable"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isRtl ? 'استوديو الجداول المدرسية' : 'OpenTimetable Studio'}
          </div>
        </div>

        <div className="text-end text-xs text-slate-500">
          <div>
            <span className="font-semibold">{isRtl ? 'التاريخ:' : 'Date:'}</span>{' '}
            {new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isBw
              ? isRtl ? 'طباعة عالية التباين (أبيض وأسود)' : 'High Contrast Monochrome'
              : isInkSaver
              ? isRtl ? 'وضع توفير الحبر' : 'Light Ink-Saver'
              : isRtl ? 'وضع الألوان الكاملة' : 'Full Color'}
          </div>
        </div>
      </div>

      {/* Entity Details Card: Teacher or Class Info */}
      <div
        className={`p-3 mb-4 rounded-lg border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
          isBw
            ? 'border-2 border-black bg-white'
            : isInkSaver
            ? 'border-slate-200 bg-slate-50/50'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        {entityType === 'teacher' ? (
          <>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'اسم المعلم' : 'Teacher Name'}
              </span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block truncate">
                {resolvedEntityName}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'التخصص' : 'Specialty'}
              </span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block truncate">
                {specialtyDisplay}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'النصاب الأسبوعي' : 'Weekly Quota'}
              </span>
              <span
                data-testid="weekly-quota"
                className={`text-sm font-bold mt-0.5 block ${
                  isBw ? 'text-black font-extrabold' : 'text-blue-700'
                }`}
              >
                {isRtl ? `${effectiveQuota} حصة (ساعة)` : `${effectiveQuota} Hours`}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'الفصل / الشعبة' : 'Class / Section'}
              </span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block truncate">
                {resolvedEntityName}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'المستوى الدراسي' : 'Academic Level'}
              </span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block truncate">
                {gradeDisplay}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                {isRtl ? 'المرشد الأكاديمي' : 'Academic Advisor'}
              </span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block truncate">
                {homeroomDisplay}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main Timetable Matrix: Days across columns, Periods with bell times across rows */}
      <div className="w-full overflow-x-auto">
        <table
          className={`w-full border-collapse table-fixed text-center ${
            isBw ? 'border-2 border-black' : 'border border-slate-300'
          }`}
        >
          <thead>
            <tr className={tableHeaderClasses}>
              {/* Corner header: Period / Time */}
              <th
                scope="col"
                style={{ width: '15%' }}
                className={`p-2 text-xs font-bold border-r ${
                  isBw ? 'border-black' : 'border-slate-300'
                }`}
              >
                {isRtl ? 'الحصة / الوقت' : 'Period / Time'}
              </th>

              {/* Day headers */}
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
                  className={`border-b ${
                    isBw ? 'border-black' : 'border-slate-300'
                  }`}
                >
                  {/* Period label & Bell times across rows */}
                  <th
                    scope="row"
                    className={`p-1.5 align-middle text-center ${periodThClasses}`}
                  >
                    <div className="font-bold text-xs text-slate-800">
                      {periodName}
                    </div>
                    {bellTime && (
                      <div
                        className={`text-[10px] font-mono mt-0.5 ${
                          isBw ? 'text-black font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {bellTime}
                      </div>
                    )}
                  </th>

                  {/* Day cells for this period */}
                  {actualDays.map((_, dIdx) => {
                    const slotKey = `${dIdx}:${pIdx}`;
                    const slotPlacements = placementsBySlot.get(slotKey) || [];

                    return (
                      <td
                        key={dIdx}
                        className={`p-1 align-middle h-16 ${cellBorderClasses} ${
                          isBw ? 'bg-white' : ''
                        }`}
                      >
                        {slotPlacements.length === 0 ? (
                          /* Empty Cell */
                          <div className="w-full h-full min-h-[56px] flex items-center justify-center text-slate-300 select-none">
                            <span className="text-xs font-light opacity-50">-</span>
                          </div>
                        ) : (
                          /* Scheduled Placements (supports single or multi/split lessons) */
                          <div className="flex flex-col gap-1 w-full h-full justify-center">
                            {slotPlacements.map((p, idx) => {
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

                              // Resolve Secondary Name: Teacher for Class view, Class for Teacher view
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

                              // Resolve Classroom
                              const roomNameStr = room
                                ? isRtl
                                  ? room.nameAr || room.name
                                  : room.name
                                : p.roomId || '';

                              // Resolve Group / Division Tag
                              const rawGroup =
                                lesson?.groupName ||
                                (lesson?.entireClass === false && lesson?.groupId
                                  ? lesson.groupId
                                  : undefined);
                              const isEntire =
                                !rawGroup ||
                                rawGroup.toLowerCase() === 'entire class' ||
                                rawGroup === 'كامل الفصل';
                              const groupTag = !isEntire
                                ? rawGroup
                                : lesson?.isSplitGroup
                                ? isRtl
                                  ? 'مجموعة مقسمة'
                                  : 'Split'
                                : undefined;

                              // Visual Styling per Color Mode
                              const cardStyle: React.CSSProperties = isBw
                                ? {
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #000000',
                                  }
                                : isInkSaver
                                ? {
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                  }
                                : {
                                    backgroundColor: subject?.color
                                      ? hexToRgba(subject.color, 0.12)
                                      : 'rgba(59, 130, 246, 0.12)',
                                    border: `1px solid ${
                                      subject?.color ? hexToRgba(subject.color, 0.35) : '#93c5fd'
                                    }`,
                                    borderTop: `3px solid ${subject?.color || '#3b82f6'}`,
                                  };

                              return (
                                <div
                                  key={`${p.lessonId}-${idx}`}
                                  style={cardStyle}
                                  className="w-full min-h-[54px] p-1 rounded-sm flex flex-col justify-between text-center select-none"
                                >
                                  {/* Line 1: Subject Name + Group Tag */}
                                  <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                    <span
                                      className={`font-bold text-[11px] truncate leading-tight ${
                                        isBw ? 'text-black' : 'text-slate-900'
                                      }`}
                                      title={subjectName}
                                    >
                                      {subjectName}
                                    </span>
                                    {groupTag && (
                                      <span
                                        className={`shrink-0 text-[8px] font-semibold px-1 py-0.2 rounded ${
                                          isBw
                                            ? 'border border-black text-black bg-white'
                                            : isInkSaver
                                            ? 'border border-slate-300 text-slate-700 bg-slate-100'
                                            : 'border border-amber-300 text-amber-800 bg-amber-100'
                                        }`}
                                      >
                                        {groupTag}
                                      </span>
                                    )}
                                  </div>

                                  {/* Line 2: Teacher (for class view) or Class (for teacher view) */}
                                  <div
                                    className={`text-[10px] font-medium truncate leading-tight my-0.5 ${
                                      isBw ? 'text-black font-semibold' : 'text-slate-700'
                                    }`}
                                    title={secondaryName}
                                  >
                                    {secondaryName || '-'}
                                  </div>

                                  {/* Line 3: Classroom */}
                                  {roomNameStr ? (
                                    <div
                                      className={`text-[9px] font-mono leading-tight truncate ${
                                        isBw ? 'text-black font-semibold' : 'text-slate-500'
                                      }`}
                                      title={roomNameStr}
                                    >
                                      <span>{isRtl ? 'قاعة:' : 'Rm:'}</span>{' '}
                                      <span className="font-medium">{roomNameStr}</span>
                                    </div>
                                  ) : (
                                    <div className="h-2" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature and Approval Block */}
      {showSignatures && (
        <div
          data-testid="signature-block"
          className={`signature-block mt-6 pt-4 flex items-end justify-between text-xs ${
            isBw
              ? 'border-t-2 border-black text-black'
              : 'border-t border-slate-300 text-slate-700'
          }`}
        >
          {/* Prepared By block */}
          <div className="text-center min-w-[180px]">
            <div className="font-bold text-sm">
              {isRtl ? 'إعداد' : 'Prepared By'}
            </div>
            <div className="h-6 mt-1 flex items-center justify-center font-medium text-xs">
              {preparedBy || ''}
            </div>
            <div
              className={`mt-4 border-b-2 w-44 mx-auto ${
                isBw ? 'border-black' : 'border-slate-400'
              }`}
            />
            <div className="mt-1 text-[10px] opacity-70">
              {isRtl ? 'التوقيع' : 'Signature'}
            </div>
          </div>

          {/* School Stamp Middle Block */}
          <div className="text-center text-[10px] opacity-60 pb-1">
            <div className="font-semibold">{schoolName}</div>
            <div>{academicYear}</div>
            <div className="mt-1 border border-dashed rounded px-2 py-0.5 inline-block opacity-75">
              {isRtl ? 'الختم الرسمي' : 'Official Stamp'}
            </div>
          </div>

          {/* Approved by Principal block */}
          <div className="text-center min-w-[180px]">
            <div className="font-bold text-sm">
              {isRtl ? 'اعتماد عميد الكلية' : 'Approved by Dean'}
            </div>
            <div className="h-6 mt-1 flex items-center justify-center font-medium text-xs">
              {approvedBy || ''}
            </div>
            <div
              className={`mt-4 border-b-2 w-44 mx-auto ${
                isBw ? 'border-black' : 'border-slate-400'
              }`}
            />
            <div className="mt-1 text-[10px] opacity-70">
              {isRtl ? 'الختم والتوقيع' : 'Seal & Signature'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualTimetableSheet;
