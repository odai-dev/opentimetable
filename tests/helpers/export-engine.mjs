// opentimetable/tests/helpers/export-engine.mjs
// Multiformat export engines for PDF, Excel/CSV, and RFC 5545 iCalendar

export class PdfExporter {
  static generateTimetablePdf(placements, metadata = {}) {
    const title = metadata.title || 'OpenTimetable Schedule';
    // Minimal standard compliant PDF 1.4 binary buffer
    const contentStream = `BT /F1 16 Tf 50 750 Td (${title}) Tj ET\n` +
      `BT /F1 10 Tf 50 720 Td (Total Scheduled Lessons: ${placements.length}) Tj ET\n`;

    const streamLength = Buffer.byteLength(contentStream, 'utf8');

    const pdfParts = [
      '%PDF-1.4\n',
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000350 00000 n \n',
      'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n420\n%%EOF\n',
    ];

    const pdfString = pdfParts.join('');
    return Buffer.from(pdfString, 'utf8');
  }

  static validatePdfBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) return false;
    const str = buffer.toString('utf8');
    return str.startsWith('%PDF-') && str.includes('%%EOF') && str.includes('/Catalog');
  }
}

export class ExcelExporter {
  static generateCsv(placements, lessons, classes, teachers, rooms, isRtl = false) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));

    const daysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const daysAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const days = isRtl ? daysAr : daysEn;

    const headers = isRtl
      ? ['اليوم', 'الحصة', 'الفصل', 'الأستاذ', 'القاعة', 'المادة']
      : ['Day', 'Period', 'Class', 'Teacher', 'Room', 'LessonId'];

    const rows = [headers.join(',')];

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      const dayName = days[p.dayIndex] || `Day ${p.dayIndex + 1}`;
      const periodNum = p.periodIndex + 1;
      const className = classMap.get(lesson?.classId) || lesson?.classId || 'N/A';
      const teacherName = teacherMap.get(lesson?.teacherId) || lesson?.teacherId || 'N/A';
      const roomName = roomMap.get(p.roomId) || p.roomId || 'N/A';
      const lessonId = p.lessonId;

      rows.push(`"${dayName}",${periodNum},"${className}","${teacherName}","${roomName}","${lessonId}"`);
    }

    // Prepend UTF-8 BOM (\uFEFF) so Excel properly parses UTF-8 / Arabic
    return '\uFEFF' + rows.join('\r\n');
  }

  static validateCsvString(csvString) {
    if (typeof csvString !== 'string') return false;
    // Check BOM or headers
    const clean = csvString.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter(Boolean);
    if (lines.length < 1) return false;
    const headerCols = lines[0].split(',');
    return headerCols.length >= 5;
  }
}

export class IcalExporter {
  static generateIcal(placements, lessons, semesterStartDate = '2026-09-01') {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const baseDate = new Date(semesterStartDate);

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OpenTimetable//Enterprise Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      const eventDate = new Date(baseDate);
      eventDate.setDate(baseDate.getDate() + p.dayIndex);
      const startHour = 8 + p.periodIndex;
      const endHour = startHour + 1;

      const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('T')[0];
      const dtStart = `${dateStr}T${String(startHour).padStart(2, '0')}0000Z`;
      const dtEnd = `${dateStr}T${String(endHour).padStart(2, '0')}0000Z`;
      const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:Lesson ${lesson?.subjectId || p.lessonId}`);
      lines.push(`LOCATION:Room ${p.roomId}`);
      lines.push(`DESCRIPTION:Class ${lesson?.classId || 'N/A'} with Teacher ${lesson?.teacherId || 'N/A'}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  static validateIcalString(icalStr) {
    if (typeof icalStr !== 'string') return false;
    const hasBegin = icalStr.includes('BEGIN:VCALENDAR');
    const hasEnd = icalStr.includes('END:VCALENDAR');
    const hasVersion = icalStr.includes('VERSION:2.0');
    return hasBegin && hasEnd && hasVersion;
  }
}
