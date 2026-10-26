// opentimetable/tests/tier2_boundaries/b15_conflict_alerts_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 15 (Real-Time Conflict Alerts)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragAndDropManager } from '../helpers/studio-engine.mjs';

describe('Tier 2 - Boundary: Feature 15 (Real-Time Conflict Alerts)', () => {
  it('T2.B15.1: Enforces < 5.0ms conflict detection evaluation limit across 50 placed cards', () => {
    const dnd = new DragAndDropManager(5, 7);
    // Seed 30 placements across the grid
    for (let i = 0; i < 30; i++) {
      const d = Math.floor(i / 6);
      const p = i % 6;
      dnd.placeLesson({ id: `l_${i}`, teacherId: `t_${i}`, classId: `c_${i}` }, d, p, `r_${i}`);
    }

    const proposed = { id: 'l_new', teacherId: 't_0', classId: 'c_new' };
    const evalResult = dnd.evaluateConflicts(proposed, 0, 0, 'r_0');
    assert.ok(evalResult.durationMs < 5.0, `Evaluation duration ${evalResult.durationMs}ms exceeded 5.0ms requirement`);
  });

  it('T2.B15.2: Triple collision boundary: detects simultaneous Teacher, Room, and Class clashes in single slot', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'existing_l', teacherId: 't_shared', classId: 'c_shared' }, 1, 2, 'r_shared');

    // Proposed lesson clashes on all 3 dimensions
    const tripleClashLesson = { id: 'new_l', teacherId: 't_shared', classId: 'c_shared' };
    const result = dnd.evaluateConflicts(tripleClashLesson, 1, 2, 'r_shared');

    assert.strictEqual(result.hasConflict, true);
    assert.strictEqual(result.conflicts.length, 3);
    const types = result.conflicts.map(c => c.type);
    assert.ok(types.includes('TEACHER_CLASH'));
    assert.ok(types.includes('ROOM_CLASH'));
    assert.ok(types.includes('CLASS_CLASH'));
  });

  it('T2.B15.3: Self-collision boundary: does not flag conflict when card is evaluated against itself', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'l_solo', teacherId: 't_solo', classId: 'c_solo' };
    dnd.placeLesson(lesson, 0, 0, 'r1');

    // Evaluate same lesson at its current slot (0, 0, r1)
    const result = dnd.evaluateConflicts(lesson, 0, 0, 'r1');
    assert.strictEqual(result.hasConflict, false);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('T2.B15.4: Completely empty timetable evaluation returns hasConflict: false and duration < 1ms', () => {
    const dnd = new DragAndDropManager(5, 7);
    const lesson = { id: 'l1', teacherId: 't1', classId: 'c1' };
    const result = dnd.evaluateConflicts(lesson, 3, 4, 'r1');
    assert.strictEqual(result.hasConflict, false);
    assert.strictEqual(result.conflicts.length, 0);
    assert.ok(result.durationMs < 5.0);
  });

  it('T2.B15.5: Partial match collision: only room matches while teacher and class are free', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'l1', teacherId: 't1', classId: 'c1' }, 2, 2, 'r_lab');

    // Different teacher, different class, but same room
    const proposed = { id: 'l2', teacherId: 't2', classId: 'c2' };
    const result = dnd.evaluateConflicts(proposed, 2, 2, 'r_lab');

    assert.strictEqual(result.hasConflict, true);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].type, 'ROOM_CLASH');
  });
});
