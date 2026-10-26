// opentimetable/tests/tier1_features/f09_hard_constraints.test.mjs
// Tier 1 - Feature 9: Hard Constraints Engine (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHardConflicts, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';

describe('Tier 1 - Feature 9: Hard Constraints Engine', () => {
  const baseReq = generateSyntheticSchedule(4, 2, 2, 2);

  it('T1.F9.1: Prevents teacher double-booking in identical slot', () => {
    // Both lessons with teacher_1 placed at day 0, period 0 in different rooms
    const conflictingPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' }, // teacher_1
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 0, roomId: 'room_2' }, // teacher_1
    ];
    const conflicts = evaluateHardConflicts(baseReq, conflictingPlacements);
    assert.ok(conflicts > 0, 'Must detect teacher double-booking clash');
  });

  it('T1.F9.2: Prevents room collision in identical slot', () => {
    // Different teachers and classes in room_1 at day 0, period 0
    const conflictingPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_2', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
    ];
    const conflicts = evaluateHardConflicts(baseReq, conflictingPlacements);
    assert.ok(conflicts > 0, 'Must detect room collision clash');
  });

  it('T1.F9.3: Prevents class double-booking in identical slot', () => {
    // Class 1 scheduled for two lessons at (0, 1)
    const conflictingPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 1, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 1, roomId: 'room_2' },
    ];
    const conflicts = evaluateHardConflicts(baseReq, conflictingPlacements);
    assert.ok(conflicts > 0, 'Must detect class double-booking clash');
  });

  it('T1.F9.4: Enforces teacher unavailable slots as strict hard constraint', () => {
    const reqWithUnavailable = JSON.parse(JSON.stringify(baseReq));
    reqWithUnavailable.teachers[0].unavailableSlots = [0]; // slot 0 is day 0, period 0
    const placementOnUnavailable = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
    ];
    const conflicts = evaluateHardConflicts(reqWithUnavailable, placementOnUnavailable);
    assert.ok(conflicts > 0, 'Must detect placement on unavailable slot');
  });

  it('T1.F9.5: Enforces max consecutive periods threshold', () => {
    const reqWithLimit = JSON.parse(JSON.stringify(baseReq));
    reqWithLimit.config.maxConsecutivePeriods = 2;
    // Schedule 3 consecutive periods for teacher_1 (periods 0, 1, 2)
    const placements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 1, roomId: 'room_1' },
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 2, roomId: 'room_1' },
    ];
    const conflicts = evaluateHardConflicts(reqWithLimit, placements);
    assert.ok(conflicts > 0, 'Must detect violation of max consecutive periods');
  });
});
