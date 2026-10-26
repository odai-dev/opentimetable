// opentimetable/tests/tier4_scenarios/s01_high_school_master_schedule.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticSchedule, solveTimetable } from '../helpers/solver-engine.mjs';
import { MultiViewTransformer } from '../helpers/studio-engine.mjs';
import { PdfExporter, IcalExporter } from '../helpers/export-engine.mjs';

describe('Tier 4 - Scenario 1: Comprehensive High School Master Schedule', () => {
  it('should generate, transform multi-views, and export master PDF and iCal for a full high school', () => {
    // 1. Generate full high school scenario (500 lessons, 45 teachers, 25 classes, 33 rooms)
    const request = generateSyntheticSchedule(500, 45, 33, 25);
    const result = solveTimetable(request);

    assert.ok(['OPTIMAL', 'FEASIBLE'].includes(result.status), 'Schedule must be feasible');
    assert.equal(result.placements.length, 500, 'All 500 lessons must be scheduled');
    assert.equal(result.hardConflicts, 0, 'Zero hard conflicts guaranteed');

    // 2. Generate Master Wall Grid view
    const wallGrid = MultiViewTransformer.transformMasterWall(
      result.placements,
      request.lessons,
      request.classes,
      request.config.days,
      request.config.periodsPerDay
    );
    assert.equal(wallGrid.length, 25, 'Wall grid must contain all 25 classes');

    // 3. Generate Teacher Views
    const teacherViews = MultiViewTransformer.transformByTeacher(
      result.placements,
      request.lessons,
      request.teachers,
      request.config.days,
      request.config.periodsPerDay
    );
    assert.equal(teacherViews.size, 45, 'Must generate views for all 45 teachers');

    // 4. Export to standard compliant PDF
    const pdfBuffer = PdfExporter.generateTimetablePdf(result.placements, { title: 'High School Master Timetable 2026' });
    assert.ok(PdfExporter.validatePdfBuffer(pdfBuffer), 'Exported PDF must be valid PDF 1.4');

    // 5. Export to RFC 5545 iCalendar feed
    const icalData = IcalExporter.generateIcal(result.placements, request.lessons);
    assert.ok(IcalExporter.validateIcalString(icalData), 'Exported iCal must conform to RFC 5545');
  });
});
