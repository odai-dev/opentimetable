// opentimetable/tests/tier1_features/f20_export_engine.test.mjs
// Tier 1 - Feature 20: Export Engine (PDF, Excel, iCal) (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PdfExporter, ExcelExporter, IcalExporter } from '../helpers/export-engine.mjs';

describe('Tier 1 - Feature 20: Export Engine (PDF, Excel, iCal)', () => {
  const classes = [{ id: 'C1', name: 'Class 1A' }];
  const teachers = [{ id: 'T1', name: 'Prof. El Alami' }];
  const rooms = [{ id: 'R1', name: 'Room 101' }];
  const lessons = [{ id: 'L1', subjectId: 'MATH', teacherId: 'T1', classId: 'C1' }];
  const placements = [{ lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' }];

  it('T1.F20.1: Generates valid printable timetable PDF buffer', () => {
    const pdfBuf = PdfExporter.generateTimetablePdf(placements, { title: 'High School Schedule' });
    assert.strictEqual(PdfExporter.validatePdfBuffer(pdfBuf), true);
  });

  it('T1.F20.2: Generates Excel/CSV export with UTF-8 BOM for Arabic compatibility', () => {
    const csv = ExcelExporter.generateCsv(placements, lessons, classes, teachers, rooms, true);
    assert.ok(csv.startsWith('\uFEFF'), 'CSV must prepend UTF-8 BOM');
    assert.strictEqual(ExcelExporter.validateCsvString(csv), true);
    assert.ok(csv.includes('اليوم'), 'Arabic CSV must contain Arabic headers');
  });

  it('T1.F20.3: Generates RFC 5545 compliant iCalendar (.ics) feed', () => {
    const ical = IcalExporter.generateIcal(placements, lessons);
    assert.strictEqual(IcalExporter.validateIcalString(ical), true);
    assert.ok(ical.includes('BEGIN:VCALENDAR'));
    assert.ok(ical.includes('END:VCALENDAR'));
  });

  it('T1.F20.4: Confirms iCal events have valid DTSTART, DTEND, SUMMARY, LOCATION', () => {
    const ical = IcalExporter.generateIcal(placements, lessons);
    assert.ok(ical.includes('BEGIN:VEVENT'));
    assert.ok(ical.includes('DTSTART:'));
    assert.ok(ical.includes('DTEND:'));
    assert.ok(ical.includes('SUMMARY:Lesson MATH'));
    assert.ok(ical.includes('LOCATION:Room R1'));
  });

  it('T1.F20.5: Verifies export pipelines handle multi-lesson schedules', () => {
    const multiPlacements = [
      { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      { lessonId: 'L2', dayIndex: 1, periodIndex: 2, roomId: 'R1' },
    ];
    const multiLessons = [
      { id: 'L1', subjectId: 'MATH', teacherId: 'T1', classId: 'C1' },
      { id: 'L2', subjectId: 'PHYS', teacherId: 'T1', classId: 'C1' },
    ];
    const csv = ExcelExporter.generateCsv(multiPlacements, multiLessons, classes, teachers, rooms);
    const lines = csv.trim().split(/\r?\n/);
    assert.strictEqual(lines.length, 3); // 1 header + 2 lessons
  });
});
