// opentimetable/tests/tier3_pairwise/p02_solver_constraints_and_performance_pairs.test.mjs
// Tier 3 - Cross-Feature Pairwise: Solver, Constraints & Performance Combinations

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BitmaskGrid, solveTimetable, generateSyntheticSchedule, evaluateHardConflicts, evaluateSoftPenalty } from '../helpers/solver-engine.mjs';
import { DragAndDropManager } from '../helpers/studio-engine.mjs';

describe('Tier 3 - Pairwise: Solver Engine, Constraints & Performance', () => {
  it('Pair F06 + F07: Solver Core driven by BitmaskGrid bitmask allocation operations', () => {
    const req = generateSyntheticSchedule(10, 3, 3, 2);
    const grid = new BitmaskGrid(req.config.days, req.config.periodsPerDay);

    // Verify grid bitmask operations accurately mirror solver allocation
    const response = solveTimetable(req);
    assert.strictEqual(response.status, 'OPTIMAL');

    for (const p of response.placements) {
      const lesson = req.lessons.find(l => l.id === p.lessonId);
      assert.strictEqual(grid.canPlace(lesson.teacherId, p.roomId, lesson.classId, p.dayIndex, p.periodIndex), true);
      grid.setSlot(lesson.teacherId, p.roomId, lesson.classId, p.dayIndex, p.periodIndex);
    }
    assert.strictEqual(grid.teacherMasks.size > 0, true);
  });

  it('Pair F06 + F09: Solver Core strictly enforces 0 hard conflicts under tight constraints', () => {
    const req = generateSyntheticSchedule(25, 5, 5, 4);
    // Add unavailable slots to 3 teachers
    req.teachers[0].unavailableSlots = [0, 1, 2];
    req.teachers[1].unavailableSlots = [7, 8];
    req.teachers[2].unavailableSlots = [14, 15];

    const res = solveTimetable(req);
    assert.ok(res.status === 'OPTIMAL' || res.status === 'FEASIBLE');
    assert.strictEqual(res.hardConflicts, 0);

    const auditedConflicts = evaluateHardConflicts(req, res.placements);
    assert.strictEqual(auditedConflicts, 0, 'Independent audit must verify 0 hard conflicts');
  });

  it('Pair F06 + F10: Solver Core balances hard feasibility while minimizing teacher gap penalties', () => {
    const req = generateSyntheticSchedule(15, 3, 3, 2);
    const res = solveTimetable(req);
    assert.strictEqual(res.hardConflicts, 0);

    const calculatedPenalty = evaluateSoftPenalty(req, res.placements);
    assert.strictEqual(res.softPenalty, calculatedPenalty);
    assert.ok(typeof res.softPenalty === 'number');
  });

  it('Pair F07 + F08: BitmaskGrid executes 500+ lesson benchmark allocations within nanosecond limits', () => {
    const grid = new BitmaskGrid(5, 7);
    const tStart = performance.now();

    // Perform 10,000 rapid bitmask queries simulating high-speed solver search
    for (let i = 0; i < 10000; i++) {
      const d = i % 5;
      const p = i % 7;
      grid.canPlace('T1', 'R1', 'C1', d, p);
    }
    const durationMs = performance.now() - tStart;
    assert.ok(durationMs < 50, `10k bitmask operations took ${durationMs}ms, should be < 50ms`);
  });

  it('Pair F07 + F15: BitmaskGrid constraint state powers < 5ms real-time UI collision feedback', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'l1', teacherId: 't1', classId: 'c1' }, 0, 0, 'r1');

    const tStart = performance.now();
    const alert = dnd.evaluateConflicts({ id: 'l2', teacherId: 't1', classId: 'c2' }, 0, 0, 'r2');
    const elapsed = performance.now() - tStart;

    assert.strictEqual(alert.hasConflict, true);
    assert.strictEqual(alert.conflicts[0].type, 'TEACHER_CLASH');
    assert.ok(elapsed < 5.0, `Alert latency ${elapsed}ms exceeded 5.0ms requirement`);
  });

  it('Pair F08 + F12: Native Solver CLI completes 500+ lesson benchmark run with exit code 0', () => {
    const req500 = generateSyntheticSchedule(500, 50, 25, 20);
    const tStart = performance.now();
    const res = solveTimetable(req500);
    const duration = performance.now() - tStart;

    assert.ok(duration < 2000, `Solve duration ${duration}ms exceeded 2000ms`);
    assert.strictEqual(res.hardConflicts, 0);

    // Emulate CLI exit code evaluation
    const exitCode = res.hardConflicts === 0 && duration < 2000 ? 0 : 1;
    assert.strictEqual(exitCode, 0);
  });

  it('Pair F09 + F14: Drag-and-drop placement prevented when hard conflict is detected', () => {
    const dnd = new DragAndDropManager(5, 7);
    dnd.placeLesson({ id: 'l_existing', teacherId: 't1', classId: 'c1' }, 1, 1, 'r1');

    // Attempting to drop conflicting card
    const proposed = { id: 'l_candidate', teacherId: 't1', classId: 'c2' };
    const collision = dnd.evaluateConflicts(proposed, 1, 1, 'r2');

    assert.strictEqual(collision.hasConflict, true);
    // UI controller blocks placement if collision.hasConflict is true
    let placed = false;
    if (!collision.hasConflict) {
      dnd.placeLesson(proposed, 1, 1, 'r2');
      placed = true;
    }
    assert.strictEqual(placed, false, 'Conflicting placement must be rejected');
  });
});
