// opentimetable/tests/tier2_boundaries/b20_export_engine_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 20 (Export Engine)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PdfExporter, ExcelExporter, IcalExporter } from '../helpers/export-engine.mjs';

describe('Tier 2 - Boundary: Feature 20 (Export Engine)', () => {
  it('T2.B20.1: Exporting 0 lessons produces valid PDF, CSV, and iCal output files', () => {
    const pdfBuf = PdfExporter.generateTimetablePdf([]);
    assert.strictEqual(PdfExporter.validatePdfBuffer(pdfBuf), true);

    const csvStr = ExcelExporter.generateCsv([], [], [], [], []);
    assert.strictEqual(ExcelExporter.validateCsvString(csvStr), true);

    const icalStr = IcalExporter.generateIcal([], []);
    assert.strictEqual(IcalExporter.validateIcalString(icalStr), true);
  });

  it('T2.B20.2: Excel CSV escaping handles commas, quotes, and multi-byte Arabic strings', () => {
    const lessons = [{ id: 'l1', classId: 'c1', teacherId: 't1' }];
    const classes = [{ id: 'c1', name: 'Class 3, "Advanced"' }];
    const teachers = [{ id: 't1', name: 'الأستاذ بنسعيد، عبد الكريم' }];
    const rooms = [{ id: 'r1', name: 'Lab "A", Room 102' }];
    const placements = [{ lessonId: 'l1', dayIndex: 0, periodIndex: 0, roomId: 'r1' }];

    const csv = ExcelExporter.generateCsv(placements, lessons, classes, teachers, rooms, true);
    assert.ok(csv.startsWith('\uFEFF'), 'Must contain UTF-8 BOM');
    assert.ok(csv.includes('Class 3, "Advanced"'));
    assert.ok(csv.includes('الأستاذ بنسعيد، عبد الكريم'));
    assert.strictEqual(ExcelExporter.validateCsvString(csv), true);
  });

  it('T2.B20.3: iCalendar semester date boundary: handles leap year date (2028-02-29)', () => {
    const lessons = [{ id: 'l1', subjectId: 'MATH' }];
    const placements = [{ lessonId: 'l1', dayIndex: 0, periodIndex: 0, roomId: 'r101' }];
    const ical = IcalExporter.generateIcal(placements, lessons, '2028-02-29');

    assert.ok(ical.includes('DTSTART:20280229T080000Z'));
    assert.strictEqual(IcalExporter.validateIcalString(ical), true);
  });

  it('T2.B20.4: Large workload export: 500 lessons exported across all formats without memory exhaustion', () => {
    const lessons = Array.from({ length: 500 }, (_, i) => ({ id: `l_${i}`, subjectId: `sub_${i % 10}` }));
    const placements = Array.from({ length: 500 }, (_, i) => ({
      lessonId: `l_${i}`,
      dayIndex: i % 5,
      periodIndex: i % 7,
      roomId: `r_${i % 25}`,
    }));

    const pdf = PdfExporter.generateTimetablePdf(placements);
    assert.strictEqual(PdfExporter.validatePdfBuffer(pdf), true);

    const ical = IcalExporter.generateIcal(placements, lessons);
    assert.strictEqual(IcalExporter.validateIcalString(ical), true);
    assert.strictEqual(ical.split('BEGIN:VEVENT').length - 1, 500);
  });

  it('T2.B20.5: PDF validator rejects corrupt buffer missing %PDF header or %%EOF trailer', () => {
    const corruptHeader = Buffer.from('NOT_A_PDF_STREAM\n%%EOF');
    const corruptTrailer = Buffer.from('%PDF-1.4\nstream content without trailer');

    assert.strictEqual(PdfExporter.validatePdfBuffer(corruptHeader), false);
    assert.strictEqual(PdfExporter.validatePdfBuffer(corruptTrailer), false);
  });
});
