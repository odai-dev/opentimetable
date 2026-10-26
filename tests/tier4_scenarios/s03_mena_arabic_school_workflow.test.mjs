// opentimetable/tests/tier4_scenarios/s03_mena_arabic_school_workflow.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BilingualDictionary, DragAndDropManager } from '../helpers/studio-engine.mjs';
import { ExcelExporter } from '../helpers/export-engine.mjs';

describe('Tier 4 - Scenario 3: MENA Arabic Bilingual & Daily Substitution Workflow', () => {
  it('should switch to Arabic RTL, handle drag-and-drop substitutions, and export UTF-8 BOM CSV for Excel', () => {
    // 1. Check Arabic dictionary and layout direction
    const dictAr = BilingualDictionary.ar;
    assert.equal(dictAr.dir, 'rtl');
    assert.equal(dictAr.appTitle, 'استوديو الجداول المدرسية المفتوحة');
    assert.equal(dictAr.days[0], 'الإثنين');
    assert.equal(dictAr.solve, 'توليد الجدول');

    // 2. Drag & Drop Manager for classroom substitution
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'LES_01', teacherId: 'T_KHALID', classId: 'CLS_10A' };

    dnd.placeLesson(lesson, 0, 1, 'ROOM_LAB');
    assert.equal(dnd.placements.size, 1);

    // Evaluate clash when second teacher tries to take same room
    const conflictingLesson = { id: 'LES_02', teacherId: 'T_OMAR', classId: 'CLS_10B' };
    const clash = dnd.evaluateConflicts(conflictingLesson, 0, 1, 'ROOM_LAB');
    assert.ok(clash.hasConflict);
    assert.equal(clash.conflicts[0].type, 'ROOM_CLASH');

    // Resolve substitution by moving to free room
    const freeSlot = dnd.evaluateConflicts(conflictingLesson, 0, 1, 'ROOM_102');
    assert.equal(freeSlot.hasConflict, false);
    dnd.placeLesson(conflictingLesson, 0, 1, 'ROOM_102');
    assert.equal(dnd.placements.size, 2);

    // 3. Export CSV with Arabic headers and UTF-8 BOM
    const teachers = [
      { id: 'T_KHALID', name: 'أ. خالد الشمري' },
      { id: 'T_OMAR', name: 'أ. عمر القرشي' },
    ];
    const classes = [
      { id: 'CLS_10A', name: 'الصف العاشر (أ)' },
      { id: 'CLS_10B', name: 'الصف العاشر (ب)' },
    ];
    const rooms = [
      { id: 'ROOM_LAB', name: 'مختبر العلوم' },
      { id: 'ROOM_102', name: 'قاعة 102' },
    ];
    const lessons = [lesson, conflictingLesson];
    const placements = [
      { lessonId: 'LES_01', dayIndex: 0, periodIndex: 1, roomId: 'ROOM_LAB' },
      { lessonId: 'LES_02', dayIndex: 0, periodIndex: 1, roomId: 'ROOM_102' },
    ];

    const csvData = ExcelExporter.generateCsv(placements, lessons, classes, teachers, rooms, true);
    assert.ok(csvData.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM for Excel Arabic display');
    assert.ok(csvData.includes('اليوم,الحصة,الفصل,الأستاذ,القاعة,المادة'));
    assert.ok(csvData.includes('خالد الشمري'));
    assert.ok(csvData.includes('مختبر العلوم'));
  });
});
