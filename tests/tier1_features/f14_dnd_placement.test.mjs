// opentimetable/tests/tier1_features/f14_dnd_placement.test.mjs
// Tier 1 - Feature 14: Drag-and-Drop Placement (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragAndDropManager } from '../helpers/studio-engine.mjs';

describe('Tier 1 - Feature 14: Drag-and-Drop Placement', () => {
  it('T1.F14.1: Places unassigned card onto an empty grid slot', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'L1', teacherId: 'T1', classId: 'C1' };
    dnd.placeLesson(lesson, 1, 2, 'R101');

    assert.strictEqual(dnd.placements.has('L1'), true);
    const p = dnd.placements.get('L1');
    assert.strictEqual(p.dayIndex, 1);
    assert.strictEqual(p.periodIndex, 2);
    assert.strictEqual(p.roomId, 'R101');
  });

  it('T1.F14.2: Moves placed card to a different empty grid slot', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'L1', teacherId: 'T1', classId: 'C1' };
    dnd.placeLesson(lesson, 0, 0, 'R101');
    dnd.moveLesson('L1', 2, 4, 'R102');

    const p = dnd.placements.get('L1');
    assert.strictEqual(p.dayIndex, 2);
    assert.strictEqual(p.periodIndex, 4);
    assert.strictEqual(p.roomId, 'R102');
  });

  it('T1.F14.3: Removes placed card from timetable back to unassigned tray', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'L1', teacherId: 'T1', classId: 'C1' };
    dnd.placeLesson(lesson, 0, 0, 'R101');
    const removed = dnd.removeLesson('L1');

    assert.strictEqual(removed, true);
    assert.strictEqual(dnd.placements.has('L1'), false);
  });

  it('T1.F14.4: Detects collision when dragging card over conflicting slot', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson1 = { id: 'L1', teacherId: 'T1', classId: 'C1' };
    const lesson2 = { id: 'L2', teacherId: 'T1', classId: 'C2' }; // Same teacher!
    dnd.placeLesson(lesson1, 1, 1, 'R101');

    const conflict = dnd.evaluateConflicts(lesson2, 1, 1, 'R102');
    assert.strictEqual(conflict.hasConflict, true);
    assert.strictEqual(conflict.conflicts[0].type, 'TEACHER_CLASH');
  });

  it('T1.F14.5: Supports rapid sequential card movements without state inconsistency', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'L_RAPID', teacherId: 'T1', classId: 'C1' };
    dnd.placeLesson(lesson, 0, 0, 'R1');
    for (let period = 1; period < 7; period++) {
      dnd.moveLesson('L_RAPID', 0, period, 'R1');
      assert.strictEqual(dnd.placements.get('L_RAPID').periodIndex, period);
    }
  });
});
