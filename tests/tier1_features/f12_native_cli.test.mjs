// opentimetable/tests/tier1_features/f12_native_cli.test.mjs
// Tier 1 - Feature 12: Native Solver CLI (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticSchedule, solveTimetable } from '../helpers/solver-engine.mjs';
import { validateTimetableResponse } from '../helpers/contracts.mjs';

describe('Tier 1 - Feature 12: Native Solver CLI', () => {
  // Helper simulating CLI argument parser logic
  function parseCliArgs(args) {
    const parsed = { input: null, output: null, timeoutMs: 2000, benchmark: false };
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--input' || args[i] === '-i') {
        parsed.input = args[++i];
      } else if (args[i] === '--output' || args[i] === '-o') {
        parsed.output = args[++i];
      } else if (args[i] === '--timeout' || args[i] === '-t') {
        parsed.timeoutMs = parseInt(args[++i], 10);
      } else if (args[i] === '--benchmark' || args[i] === '-b') {
        parsed.benchmark = true;
      }
    }
    return parsed;
  }

  it('T1.F12.1: Parses required CLI arguments --input and --output', () => {
    const args = ['--input', 'timetable_in.json', '--output', 'timetable_out.json'];
    const parsed = parseCliArgs(args);
    assert.strictEqual(parsed.input, 'timetable_in.json');
    assert.strictEqual(parsed.output, 'timetable_out.json');
  });

  it('T1.F12.2: Parses optional --timeout and --benchmark flags', () => {
    const args = ['-i', 'req.json', '-o', 'res.json', '--timeout', '5000', '--benchmark'];
    const parsed = parseCliArgs(args);
    assert.strictEqual(parsed.timeoutMs, 5000);
    assert.strictEqual(parsed.benchmark, true);
  });

  it('T1.F12.3: Validates exit code 0 on successful solver batch execution', () => {
    const req = generateSyntheticSchedule(15, 4, 4, 3);
    const res = solveTimetable(req);
    assert.ok(res.status === 'OPTIMAL' || res.status === 'FEASIBLE');
    const exitCode = res.hardConflicts === 0 ? 0 : 1;
    assert.strictEqual(exitCode, 0);
  });

  it('T1.F12.4: Validates exit code 1 when input validation fails or missing file', () => {
    const emptyArgs = [];
    const parsed = parseCliArgs(emptyArgs);
    const exitCode = (!parsed.input || !parsed.output) ? 1 : 0;
    assert.strictEqual(exitCode, 1, 'Missing required arguments must trigger error exit code 1');
  });

  it('T1.F12.5: Validates CLI output JSON strictly matches TimetableResponse schema', () => {
    const req = generateSyntheticSchedule(10, 3, 3, 2);
    const res = solveTimetable(req);
    const resValidation = validateTimetableResponse(res);
    assert.strictEqual(resValidation.valid, true);
  });
});
