// opentimetable/tests/tier2_boundaries/b10_soft_constraints_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 10 (Soft Constraints Optimizer)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSoftPenalty, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';

describe('Tier 2 - Boundary: Feature 10 (Soft Constraints Optimizer)', () => {
  const baseReq = generateSyntheticSchedule(10, 2, 2, 2);

  it('T2.B10.1: Maximum single-day gap boundary: period 0 and period 6 produces exactly 5 gaps (50 pts)', () => {
    // Teacher 1 on day 0 at period 0 and period 6 -> 5 intermediate empty periods
    const maxGapPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 6, roomId: 'room_1' },
    ];
    const penalty = evaluateSoftPenalty(baseReq, maxGapPlacements);
    assert.strictEqual(penalty, 50); // (6 - 0 + 1) - 2 = 5 gaps * 10
  });

  it('T2.B10.2: Fully saturated day with 0 gaps incurs 0 soft penalty', () => {
    // Teacher 1 scheduled for periods 0 through 6 continuously (no holes)
    const continuousPlacements = Array.from({ length: 7 }, (_, p) => ({
      lessonId: 'lesson_1',
      dayIndex: 0,
      periodIndex: p,
      roomId: 'room_1',
    }));
    const penalty = evaluateSoftPenalty(baseReq, continuousPlacements);
    assert.strictEqual(penalty, 0);
  });

  it('T2.B10.3: Empty placements array produces exactly 0 penalty', () => {
    const penalty = evaluateSoftPenalty(baseReq, []);
    assert.strictEqual(penalty, 0);
  });

  it('T2.B10.4: Day boundaries strictly isolate gaps (gaps do not leak between days)', () => {
    // Teacher 1 has period 6 on day 0, and period 0 on day 1 -> Neither day has an internal gap
    const crossDayPlacements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 6, roomId: 'room_1' },
      { lessonId: 'lesson_1', dayIndex: 1, periodIndex: 0, roomId: 'room_1' },
    ];
    const penalty = evaluateSoftPenalty(baseReq, crossDayPlacements);
    assert.strictEqual(penalty, 0, 'Cross-day transition is not an idle window gap');
  });

  it('T2.B10.5: Additive scaling across 10 teachers with 1 gap each yields exactly 100 penalty points', () => {
    const multiReq = generateSyntheticSchedule(20, 10, 10, 5);
    const placements = [];
    for (let i = 0; i < 10; i++) {
      // Each teacher gets periods 0 and 2 on day 0 -> 1 gap each
      placements.push({ lessonId: multiReq.lessons[i].id, dayIndex: 0, periodIndex: 0, roomId: 'room_1' });
      placements.push({ lessonId: multiReq.lessons[i + 10].id, dayIndex: 0, periodIndex: 2, roomId: 'room_1' });
    }
    const penalty = evaluateSoftPenalty(multiReq, placements);
    assert.strictEqual(penalty, 100); // 10 teachers * 1 gap * 10
  });
});
