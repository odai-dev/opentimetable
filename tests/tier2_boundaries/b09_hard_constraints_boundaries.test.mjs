// opentimetable/tests/tier2_boundaries/b09_hard_constraints_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 9 (Hard Constraints Engine)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHardConflicts, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';

describe('Tier 2 - Boundary: Feature 9 (Hard Constraints Engine)', () => {
  const baseReq = generateSyntheticSchedule(4, 2, 2, 2);
  baseReq.teachers.forEach((t) => (t.unavailableSlots = []));

  it('T2.B9.1: Single remaining available slot boundary (34 of 35 slots blocked)', () => {
    const tightReq = JSON.parse(JSON.stringify(baseReq));
    // Block slots 0 to 33, only slot 34 (day 4, period 6) is available
    tightReq.teachers[0].unavailableSlots = Array.from({ length: 34 }, (_, i) => i);

    // Valid placement on the only allowed slot 34 (day 4, period 6)
    const validPlacement = [{ lessonId: 'lesson_1', dayIndex: 4, periodIndex: 6, roomId: 'room_1' }];
    assert.strictEqual(evaluateHardConflicts(tightReq, validPlacement), 0);

    // Invalid placement on blocked slot 33 (day 4, period 5)
    const invalidPlacement = [{ lessonId: 'lesson_1', dayIndex: 4, periodIndex: 5, roomId: 'room_1' }];
    assert.strictEqual(evaluateHardConflicts(tightReq, invalidPlacement), 1);
  });

  it('T2.B9.2: Room capacity boundary (threshold of 25 students)', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    // room_1 has capacity 25 (sufficient)
    req.rooms[0].capacity = 25;
    // room_2 has capacity 24 (insufficient)
    req.rooms[1].capacity = 24;

    const validPlacement = [{ lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' }];
    assert.strictEqual(evaluateHardConflicts(req, validPlacement), 0);

    const invalidPlacement = [{ lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_2' }];
    assert.strictEqual(evaluateHardConflicts(req, invalidPlacement), 1);
  });

  it('T2.B9.3: Exact boundary for maxConsecutivePeriods (N vs N + 1)', () => {
    const req = JSON.parse(JSON.stringify(baseReq));
    req.teachers.forEach((t) => (t.unavailableSlots = []));
    req.config.maxConsecutivePeriods = 3;

    // Exactly 3 consecutive periods: 0, 1, 2 (boundary allowed)
    const exactConsecutive = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 1, roomId: 'room_1' },
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 2, roomId: 'room_1' },
    ];
    assert.strictEqual(evaluateHardConflicts(req, exactConsecutive), 0);

    // 4 consecutive periods: 0, 1, 2, 3 (exceeds limit 3)
    const overConsecutive = [
      ...exactConsecutive,
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 3, roomId: 'room_1' },
    ];
    assert.ok(evaluateHardConflicts(req, overConsecutive) > 0);
  });

  it('T2.B9.4: Dual simultaneous conflict in one placement counted properly', () => {
    // Lesson 1 is placed at (0, 0, room_1) with teacher_1 and class_1
    // Second placement introduces BOTH teacher clash and room clash
    const placements = [
      { lessonId: 'lesson_1', dayIndex: 0, periodIndex: 0, roomId: 'room_1' }, // teacher_1, room_1, class_1
      { lessonId: 'lesson_3', dayIndex: 0, periodIndex: 0, roomId: 'room_1' }, // teacher_1, room_1, class_2
    ];
    const conflicts = evaluateHardConflicts(baseReq, placements);
    // Should flag teacher clash and room clash
    assert.ok(conflicts >= 2, `Expected at least 2 conflicts for dual collision, got ${conflicts}`);
  });

  it('T2.B9.5: Placements containing unmapped or unknown lesson IDs treated as hard conflicts', () => {
    const invalidPlacement = [
      { lessonId: 'non_existent_lesson_xyz', dayIndex: 0, periodIndex: 0, roomId: 'room_1' },
    ];
    const conflicts = evaluateHardConflicts(baseReq, invalidPlacement);
    assert.strictEqual(conflicts, 1, 'Unknown lesson must be flagged as conflict');
  });
});
