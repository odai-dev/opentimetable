// opentimetable/tests/tier2_boundaries/b14_dnd_placement_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 14 (Drag-and-Drop Placement)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragAndDropManager } from '../helpers/studio-engine.mjs';

describe('Tier 2 - Boundary: Feature 14 (Drag-and-Drop Placement)', () => {
  it('T2.B14.1: Throws error when placing card at out-of-bounds slot index', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'l1', teacherId: 't1', classId: 'c1' };

    assert.throws(() => dnd.placeLesson(lesson, -1, 0, 'r1'), /invalid slot index/i);
    assert.throws(() => dnd.placeLesson(lesson, 5, 0, 'r1'), /invalid slot index/i);
    assert.throws(() => dnd.placeLesson(lesson, 0, 7, 'r1'), /invalid slot index/i);
  });

  it('T2.B14.2: Throws error when attempting to move an unplaced lesson', () => {
    const dnd = new DragAndDropManager(5, 7);
    assert.throws(() => dnd.moveLesson('unplaced_lesson_123', 0, 0, 'r1'), /cannot move unplaced lesson/i);
  });

  it('T2.B14.3: Removing a non-existent lesson returns false gracefully', () => {
    const dnd = new DragAndDropManager(5, 7);
    const result = dnd.removeLesson('ghost_lesson');
    assert.strictEqual(result, false);
  });

  it('T2.B14.4: Moving placed card to its current existing slot is idempotent and preserves state', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'l1', teacherId: 't1', classId: 'c1' };
    dnd.placeLesson(lesson, 2, 3, 'r1');

    // Move to exact same slot (2, 3)
    dnd.moveLesson('l1', 2, 3, 'r1');
    const p = dnd.placements.get('l1');
    assert.strictEqual(p.dayIndex, 2);
    assert.strictEqual(p.periodIndex, 3);
    assert.strictEqual(p.roomId, 'r1');
  });

  it('T2.B14.5: Multiple sequential moves update placement accurately without stale reference residue', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'l1', teacherId: 't1', classId: 'c1' };
    dnd.placeLesson(lesson, 0, 0, 'r1');

    // Move to (1, 1) then to (4, 6)
    dnd.moveLesson('l1', 1, 1, 'r2');
    dnd.moveLesson('l1', 4, 6, 'r3');

    const p = dnd.placements.get('l1');
    assert.strictEqual(p.dayIndex, 4);
    assert.strictEqual(p.periodIndex, 6);
    assert.strictEqual(p.roomId, 'r3');
    assert.strictEqual(dnd.placements.size, 1);
  });
});
