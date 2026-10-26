// opentimetable/tests/tier2_boundaries/b06_solver_core_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 6 (Rust CSP/COP Solver Core)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveTimetable, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';
import { validateTimetableRequest, validateTimetableResponse } from '../helpers/contracts.mjs';

describe('Tier 2 - Boundary: Feature 6 (Rust CSP/COP Solver Core)', () => {
  it('T2.B6.1: Handles empty schedule (0 lessons) returning valid OPTIMAL solution', () => {
    const emptyReq = {
      config: { days: 5, periodsPerDay: 7, maxConsecutivePeriods: 4, timeoutMs: 2000 },
      teachers: [{ id: 't1', name: 'Teacher 1', unavailableSlots: [] }],
      classes: [{ id: 'c1', name: 'Class 1' }],
      rooms: [{ id: 'r1', name: 'Room 1' }],
      subjects: [{ id: 's1', name: 'Subject 1' }],
      lessons: [],
    };
    const reqVal = validateTimetableRequest(emptyReq);
    assert.strictEqual(reqVal.valid, true);

    const res = solveTimetable(emptyReq);
    assert.strictEqual(res.status, 'OPTIMAL');
    assert.strictEqual(res.hardConflicts, 0);
    assert.strictEqual(res.placements.length, 0);
    const resVal = validateTimetableResponse(res);
    assert.strictEqual(resVal.valid, true);
  });

  it('T2.B6.2: Single-slot minimal boundary: 1 day, 1 period, 1 lesson placed at (0, 0)', () => {
    const minReq = {
      config: { days: 1, periodsPerDay: 1, maxConsecutivePeriods: 1, timeoutMs: 1000 },
      teachers: [{ id: 't1', name: 'Solo Teacher', unavailableSlots: [] }],
      classes: [{ id: 'c1', name: 'Solo Class' }],
      rooms: [{ id: 'r1', name: 'Solo Room' }],
      subjects: [{ id: 's1', name: 'Solo Subject' }],
      lessons: [{ id: 'l1', subjectId: 's1', teacherId: 't1', classId: 'c1', roomId: 'r1', duration: 1 }],
    };
    const res = solveTimetable(minReq);
    assert.strictEqual(res.status, 'OPTIMAL');
    assert.strictEqual(res.placements.length, 1);
    assert.strictEqual(res.placements[0].dayIndex, 0);
    assert.strictEqual(res.placements[0].periodIndex, 0);
    assert.strictEqual(res.placements[0].roomId, 'r1');
  });

  it('T2.B6.3: Identifies infeasible schedule when teacher demand exceeds total weekly capacity', () => {
    // 5 days x 7 periods = 35 total slots, but 40 lessons demanded for single teacher
    const infeasibleReq = {
      config: { days: 5, periodsPerDay: 7, maxConsecutivePeriods: 4, timeoutMs: 2000 },
      teachers: [{ id: 't_overloaded', name: 'Overloaded', unavailableSlots: [] }],
      classes: [{ id: 'c1', name: 'Class 1' }],
      rooms: [{ id: 'r1', name: 'Room 1' }],
      subjects: [{ id: 's1', name: 'Subject 1' }],
      lessons: Array.from({ length: 40 }, (_, i) => ({
        id: `overload_${i}`,
        subjectId: 's1',
        teacherId: 't_overloaded',
        classId: 'c1',
        roomId: 'r1',
        duration: 1,
      })),
    };
    const res = solveTimetable(infeasibleReq);
    assert.strictEqual(res.status, 'INFEASIBLE');
    assert.ok(res.hardConflicts > 0, 'Must record unplaced lessons as hard conflicts');
  });

  it('T2.B6.4: Enforces request validation failure on negative or invalid timeout', () => {
    const invalidTimeoutReq = {
      config: { days: 5, periodsPerDay: 7, maxConsecutivePeriods: 4, timeoutMs: -500 },
      teachers: [],
      classes: [],
      rooms: [],
      subjects: [],
      lessons: [],
    };
    const validation = validateTimetableRequest(invalidTimeoutReq);
    assert.strictEqual(validation.valid, false);
    assert.match(validation.error, /timeoutMs/i);
  });

  it('T2.B6.5: Validates response schema contract integrity even on infeasible solutions', () => {
    // Single teacher with 40 lessons (capacity 35) guarantees unplaced lessons and INFEASIBLE status
    const infeasibleReq = {
      config: { days: 5, periodsPerDay: 7, maxConsecutivePeriods: 4, timeoutMs: 2000 },
      teachers: [{ id: 't1', name: 'Overworked', unavailableSlots: [] }],
      classes: [{ id: 'c1', name: 'Class 1' }],
      rooms: [{ id: 'r1', name: 'Room 1' }],
      subjects: [{ id: 's1', name: 'Subject 1' }],
      lessons: Array.from({ length: 40 }, (_, i) => ({
        id: `l_${i}`,
        subjectId: 's1',
        teacherId: 't1',
        classId: 'c1',
        roomId: 'r1',
        duration: 1,
      })),
    };
    const res = solveTimetable(infeasibleReq);
    assert.strictEqual(res.status, 'INFEASIBLE');
    const resVal = validateTimetableResponse(res);
    assert.strictEqual(resVal.valid, true, resVal.error);
  });
});
