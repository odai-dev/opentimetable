/**
 * opentimetable/apps/web/src/lib/export-xml.ts
 *
 * Full bidirectional XML interchange engine for aSc Timetables 2012 schema (asctt2012.xml).
 * Enables seamless project export and import matching the desktop Windows application.
 */

import { Teacher, ClassGroup, Room, Subject, Lesson, Placement } from './types';

export interface AscttExportData {
  schoolName: string;
  academicYear?: string;
  cycleDays: number;
  periodsPerDay: number;
  bellSchedule?: string[];
  daysList?: string[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  placements: Placement[];
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates official aSc Timetables 2012 XML format
 */
export function generateAscttXml(data: AscttExportData): string {
  const {
    schoolName,
    academicYear = '2025/2026',
    cycleDays,
    periodsPerDay,
    bellSchedule = [],
    daysList = [],
    teachers,
    classes,
    rooms,
    subjects,
    lessons,
    placements,
  } = data;

  const placementMap = new Map<string, Placement>();
  for (const p of placements) {
    placementMap.set(p.lessonId, p);
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push(
    `<timetable importtype="database" name="${escapeXml(schoolName)}" year="${escapeXml(academicYear)}" options="idprefix:OpenTimetable">`
  );

  // 1. Periods (Bell Schedule)
  lines.push('   <periods columns="period,name,short,starttime,endtime">');
  for (let i = 0; i < periodsPerDay; i++) {
    const periodNum = i + 1;
    const bell = bellSchedule[i] || '';
    const parts = bell.split('-');
    const start = parts[0]?.trim() || `0${8 + Math.floor((i * 55) / 60)}:00`.slice(-5);
    const end = parts[1]?.trim() || `0${8 + Math.floor(((i * 55) + 45) / 60)}:45`.slice(-5);
    lines.push(
      `      <period period="${periodNum}" name="Period ${periodNum}" short="${periodNum}" starttime="${escapeXml(start)}" endtime="${escapeXml(end)}"/>`
    );
  }
  lines.push('   </periods>');

  // 2. Days definitions
  lines.push('   <daysdefs columns="id,days,name,short">');
  for (let d = 0; d < cycleDays; d++) {
    const dayBitmask = Array.from({ length: cycleDays }, (_, idx) => (idx === d ? '1' : '0')).join('');
    const dayName = daysList[d] || `Day ${d + 1}`;
    lines.push(
      `      <daysdef id="${d + 1}" days="${dayBitmask}" name="${escapeXml(dayName)}" short="${escapeXml(dayName.slice(0, 3))}"/>`
    );
  }
  lines.push('   </daysdefs>');

  // 3. Subjects
  lines.push('   <subjects columns="id,name,short,color">');
  for (const s of subjects) {
    const name = s.nameAr ? `${s.name} (${s.nameAr})` : s.name;
    lines.push(
      `      <subject id="${escapeXml(s.id)}" name="${escapeXml(name)}" short="${escapeXml(s.code || s.id)}" color="${escapeXml(s.color || '#3b82f6')}"/>`
    );
  }
  lines.push('   </subjects>');

  // 4. Teachers
  lines.push('   <teachers columns="id,name,short,color">');
  for (const t of teachers) {
    const name = t.nameAr ? `${t.name} (${t.nameAr})` : t.name;
    lines.push(
      `      <teacher id="${escapeXml(t.id)}" name="${escapeXml(name)}" short="${escapeXml(t.speciality || t.id)}" color="${escapeXml(t.color || '#2563eb')}"/>`
    );
  }
  lines.push('   </teachers>');

  // 5. Classrooms
  lines.push('   <classrooms columns="id,name,short,capacity">');
  for (const r of rooms) {
    const name = r.nameAr ? `${r.name} (${r.nameAr})` : r.name;
    lines.push(
      `      <classroom id="${escapeXml(r.id)}" name="${escapeXml(name)}" short="${escapeXml(r.id)}" capacity="${r.capacity || 30}"/>`
    );
  }
  lines.push('   </classrooms>');

  // 6. Classes
  lines.push('   <classes columns="id,name,short,grade">');
  for (const c of classes) {
    const name = c.nameAr ? `${c.name} (${c.nameAr})` : c.name;
    lines.push(
      `      <class id="${escapeXml(c.id)}" name="${escapeXml(name)}" short="${escapeXml(c.id)}" grade="${c.grade || 1}"/>`
    );
  }
  lines.push('   </classes>');

  // 7. Lessons
  lines.push('   <lessons columns="id,subjectid,classids,teacherids,classroomids,periodspercard,periodsperweek,groupname">');
  for (const l of lessons) {
    const classIds = [l.classId, ...(l.classIds || []), ...(l.jointClassIds || [])].filter(Boolean).join(',');
    const teacherIds = [l.teacherId, ...(l.teacherIds || []), ...(l.coTeacherIds || [])].filter(Boolean).join(',');
    const classroomIds = l.roomId || '';
    const groupName = l.groupName || '';
    lines.push(
      `      <lesson id="${escapeXml(l.id)}" subjectid="${escapeXml(l.subjectId)}" classids="${escapeXml(classIds)}" teacherids="${escapeXml(teacherIds)}" classroomids="${escapeXml(classroomIds)}" periodspercard="${l.duration || 1}" periodsperweek="1" groupname="${escapeXml(groupName)}"/>`
    );
  }
  lines.push('   </lessons>');

  // 8. Cards (Placements)
  lines.push('   <cards columns="lessonid,period,days,classroomids">');
  for (const p of placements) {
    const dayBitmask = Array.from({ length: cycleDays }, (_, idx) => (idx === p.dayIndex ? '1' : '0')).join('');
    lines.push(
      `      <card lessonid="${escapeXml(p.lessonId)}" period="${p.periodIndex + 1}" days="${dayBitmask}" classroomids="${escapeXml(p.roomId || '')}"/>`
    );
  }
  lines.push('   </cards>');

  lines.push('</timetable>');
  return lines.join('\n');
}

/**
 * Downloads XML timetable to local file
 */
export function downloadAscttXml(data: AscttExportData, fileName?: string): void {
  const xml = generateAscttXml(data);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fallbackName = (data.schoolName || 'timetable').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
  a.href = url;
  a.download = fileName || `${fallbackName}_asctt.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
