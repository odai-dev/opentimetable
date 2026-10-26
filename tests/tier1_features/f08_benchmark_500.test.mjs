// opentimetable/tests/tier1_features/f08_benchmark_500.test.mjs
// Tier 1 - Feature 8: 500+ Lesson Benchmark Suite (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticSchedule, solveTimetable } from '../helpers/solver-engine.mjs';

describe('Tier 1 - Feature 8: 500+ Lesson Benchmark Suite', () => {
  const benchmarkRequest = generateSyntheticSchedule(500, 50, 25, 20);

  it('T1.F8.1: Confirms benchmark problem contains at least 500 lessons', () => {
    assert.ok(benchmarkRequest.lessons.length >= 500);
    assert.strictEqual(benchmarkRequest.teachers.length, 50);
    assert.strictEqual(benchmarkRequest.rooms.length, 25);
    assert.strictEqual(benchmarkRequest.classes.length, 20);
  });

  it('T1.F8.2: Solves 500+ lessons in under 2.0 seconds (2000ms threshold)', () => {
    const response = solveTimetable(benchmarkRequest);
    assert.ok(
      response.solveDurationMs < 2000,
      `Solve duration ${response.solveDurationMs}ms exceeded 2000ms limit`
    );
  });

  it('T1.F8.3: Guarantees 0 hard conflicts in solved benchmark timetable', () => {
    const response = solveTimetable(benchmarkRequest);
    assert.strictEqual(response.hardConflicts, 0, 'Benchmark schedule must have 0 hard conflicts');
  });

  it('T1.F8.4: Confirms all 500 lessons are assigned room, day, and period', () => {
    const response = solveTimetable(benchmarkRequest);
    assert.strictEqual(response.placements.length, 500);
    for (const p of response.placements) {
      assert.ok(p.roomId, 'Placement must include roomId');
      assert.ok(p.dayIndex >= 0 && p.dayIndex < 5, 'dayIndex must be valid');
      assert.ok(p.periodIndex >= 0 && p.periodIndex < 7, 'periodIndex must be valid');
    }
  });

  it('T1.F8.5: Verifies benchmark performance repeatability across consecutive runs', () => {
    const run1 = solveTimetable(benchmarkRequest);
    const run2 = solveTimetable(benchmarkRequest);
    assert.ok(run1.solveDurationMs < 2000);
    assert.ok(run2.solveDurationMs < 2000);
    assert.strictEqual(run1.hardConflicts, 0);
    assert.strictEqual(run2.hardConflicts, 0);
  });
});
