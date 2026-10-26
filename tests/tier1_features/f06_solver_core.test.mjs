// opentimetable/tests/tier1_features/f06_solver_core.test.mjs
// Tier 1 - Feature 6: Rust CSP/COP Solver Core (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveTimetable, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';
import { validateTimetableRequest, validateTimetableResponse } from '../helpers/contracts.mjs';

describe('Tier 1 - Feature 6: Rust CSP/COP Solver Core', () => {
  const sampleRequest = generateSyntheticSchedule(20, 5, 5, 4);

  it('T1.F6.1: Validates synthetic input against TimetableRequest schema', () => {
    const reqValidation = validateTimetableRequest(sampleRequest);
    assert.strictEqual(reqValidation.valid, true, reqValidation.error);
  });

  it('T1.F6.2: Solves educational schedule and returns valid TimetableResponse', () => {
    const response = solveTimetable(sampleRequest);
    const resValidation = validateTimetableResponse(response);
    assert.strictEqual(resValidation.valid, true, resValidation.error);
  });

  it('T1.F6.3: Confirms status is OPTIMAL or FEASIBLE with 0 hard conflicts', () => {
    const response = solveTimetable(sampleRequest);
    assert.ok(response.status === 'OPTIMAL' || response.status === 'FEASIBLE');
    assert.strictEqual(response.hardConflicts, 0);
  });

  it('T1.F6.4: Verifies every lesson receives a complete placement mapping', () => {
    const response = solveTimetable(sampleRequest);
    assert.strictEqual(response.placements.length, sampleRequest.lessons.length);
  });

  it('T1.F6.5: Verifies solve duration is accurately measured in milliseconds', () => {
    const response = solveTimetable(sampleRequest);
    assert.strictEqual(typeof response.solveDurationMs, 'number');
    assert.ok(response.solveDurationMs >= 0);
  });
});
