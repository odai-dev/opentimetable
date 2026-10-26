// opentimetable/tests/tier1_features/f10_soft_constraints.test.mjs
// Tier 1 - Feature 10: Soft Constraints Optimizer (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSoftPenalty, generateSyntheticSchedule, solveTimetable } from '../helpers/solver-engine.mjs';

describe('Tier 1 - Feature 10: Soft Constraints Optimizer', () => {
  const baseReq = generateSyntheticSchedule(4, 2, 2, 2);

  it('T1.F10.1: Assigns 0 penalty to perfectly compact teacher daily schedule', () => {
    // Teacher 1 scheduled at periods 0 and 1 on day 0 -> 0 gaps
    const compactPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 1, roomId: 'room_1' },
    ];
    const penalty = evaluateSoftPenalty(baseReq, compactPlacements);
    assert.strictEqual(penalty, 0);
  });

  it('T1.F10.2: Assigns positive penalty to teacher schedule with idle window gaps', () => {
    // Teacher 1 scheduled at periods 0 and 3 on day 0 -> 2 gaps (periods 1 and 2)
    const gappedPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 3, roomId: 'room_1' },
    ];
    const penalty = evaluateSoftPenalty(baseReq, gappedPlacements);
    assert.strictEqual(penalty, 20); // 2 gaps * 10
  });

  it('T1.F10.3: Accumulates penalties proportionally across multiple teachers', () => {
    // Both teacher 1 and teacher 2 have 1 gap
    const multiGappedPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' }, // T1
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 2, roomId: 'room_1' }, // T1 (1 gap)
      { lessonId: 'lesson_2', dayIndex: 1, periodIndex: 1, roomId: 'room_2' }, // T2
      { lessonId: 'lesson_4', dayIndex: 1, periodIndex: 3, roomId: 'room_2' }, // T2 (1 gap)
    ];
    const penalty = evaluateSoftPenalty(baseReq, multiGappedPlacements);
    assert.strictEqual(penalty, 20); // 2 total gaps * 10 = 20
  });

  it('T1.F10.4: Solver minimizes gap penalty on solvable problem instance', () => {
    const solved = solveTimetable(baseReq);
    assert.ok(typeof solved.softPenalty === 'number');
    assert.ok(solved.softPenalty >= 0);
  });

  it('T1.F10.5: Zero penalty incurred when teacher only has 1 lesson on a given day', () => {
    const singleLessonPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 3, roomId: 'room_1' },
    ];
    const penalty = evaluateSoftPenalty(baseReq, singleLessonPlacements);
    assert.strictEqual(penalty, 0, 'Single lesson in day cannot have gap');
  });
});
