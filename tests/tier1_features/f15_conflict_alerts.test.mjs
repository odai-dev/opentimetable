// opentimetable/tests/tier1_features/f15_conflict_alerts.test.mjs
// Tier 1 - Feature 15: Real-Time Conflict Alerts (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragAndDropManager } from '../helpers/studio-engine.mjs';

describe('Tier 1 - Feature 15: Real-Time Conflict Alerts', () => {
  it('T1.F15.1: Evaluates conflict detection in under 5.0 milliseconds (<5ms latency requirement)', () => {
    const dnd = new DragAndDropManager(5, 7);
    for (let i = 0; i < 30; i++) {
      dnd.placeLesson({ id: `L_${i}`, teacherId: `T_${i % 5}`, classId: `C_${i % 5}` }, Math.floor(i / 6), i % 6, `R_${i % 5}`);
    }
    const testLesson = { id: 'TEST_L', teacherId: 'T_1', classId: 'C_1' };
    const alert = dnd.evaluateConflicts(testLesson, 0, 1, 'R_1');
    assert.ok(alert.durationMs < 5.0, `Conflict evaluation took ${alert.durationMs}ms (must be < 5ms)`);
  });

  it('T1.F15.2: Accurately identifies teacher collision alert', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'L1', teacherId: 'T_MATH', classId: 'C1' }, 0, 0, 'R101');
    const alert = dnd.evaluateConflicts({ id: 'L2', teacherId: 'T_MATH', classId: 'C2' }, 0, 0, 'R102');

    assert.strictEqual(alert.hasConflict, true);
    assert.ok(alert.conflicts.some(c => c.type === 'TEACHER_CLASH'));
  });

  it('T1.F15.3: Accurately identifies room collision alert', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'L1', teacherId: 'T1', classId: 'C1' }, 0, 0, 'R_LAB');
    const alert = dnd.evaluateConflicts({ id: 'L2', teacherId: 'T2', classId: 'C2' }, 0, 0, 'R_LAB');

    assert.strictEqual(alert.hasConflict, true);
    assert.ok(alert.conflicts.some(c => c.type === 'ROOM_CLASH'));
  });

  it('T1.F15.4: Detects multiple simultaneous collisions (Teacher and Room)', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'L1', teacherId: 'T_DUAL', classId: 'C1' }, 0, 0, 'R_DUAL');
    const alert = dnd.evaluateConflicts({ id: 'L2', teacherId: 'T_DUAL', classId: 'C2' }, 0, 0, 'R_DUAL');

    assert.strictEqual(alert.hasConflict, true);
    assert.strictEqual(alert.conflicts.length, 2);
  });

  it('T1.F15.5: Returns clean conflict state when slot is completely free', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'L1', teacherId: 'T1', classId: 'C1' }, 0, 0, 'R101');
    const alert = dnd.evaluateConflicts({ id: 'L2', teacherId: 'T2', classId: 'C2' }, 1, 1, 'R102');

    assert.strictEqual(alert.hasConflict, false);
    assert.strictEqual(alert.conflicts.length, 0);
  });
});
