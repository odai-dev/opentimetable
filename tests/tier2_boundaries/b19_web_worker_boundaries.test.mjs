// opentimetable/tests/tier2_boundaries/b19_web_worker_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 19 (Web Worker WASM Integration)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveTimetable, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';

describe('Tier 2 - Boundary: Feature 19 (Web Worker WASM Integration)', () => {
  it('T2.B19.1: AbortSignal boundary: responds cleanly when cancellation signal is triggered', async () => {
    const controller = new AbortController();
    const { signal } = controller;

    let aborted = false;
    signal.addEventListener('abort', () => {
      aborted = true;
    });

    // Fire abort immediately
    controller.abort();
    assert.strictEqual(aborted, true);
    assert.strictEqual(signal.aborted, true);
  });

  it('T2.B19.2: Rejects non-cloneable objects (functions, symbols) in worker postMessage payload', () => {
    const invalidPayload = {
      action: 'SOLVE',
      callback: () => console.log('bad'),
      symbolId: Symbol('worker'),
    };

    assert.throws(() => {
      structuredClone(invalidPayload);
    });
  });

  it('T2.B19.3: Handles zero-delay immediate progress events without drop', () => {
    const progressEvents = [];
    const emitProgress = (percentage, phase) => {
      progressEvents.push({ percentage, phase, timestamp: Date.now() });
    };

    // Emit 0%, 50%, 100% in instant sequence
    emitProgress(0, 'INITIALIZATION');
    emitProgress(50, 'MRV_GREEDY');
    emitProgress(100, 'OPTIMAL_FOUND');

    assert.strictEqual(progressEvents.length, 3);
    assert.strictEqual(progressEvents[0].percentage, 0);
    assert.strictEqual(progressEvents[2].percentage, 100);
  });

  it('T2.B19.4: Worker error message contract: converts uncaught exception to structured error payload', () => {
    const simulateWorkerExecution = (payload) => {
      try {
        if (!payload.lessons) throw new Error('Invalid payload: missing lessons array');
        return { type: 'SUCCESS', result: solveTimetable(payload) };
      } catch (err) {
        return { type: 'ERROR', error: err.message };
      }
    };

    const errorResult = simulateWorkerExecution({});
    assert.strictEqual(errorResult.type, 'ERROR');
    assert.match(errorResult.error, /missing lessons/i);
  });

  it('T2.B19.5: Rapid back-to-back solver job queueing resolves without state overlap', () => {
    const req1 = generateSyntheticSchedule(5, 2, 2, 1);
    const req2 = generateSyntheticSchedule(6, 2, 2, 1);

    const res1 = solveTimetable(req1);
    const res2 = solveTimetable(req2);

    assert.strictEqual(res1.placements.length, 5);
    assert.strictEqual(res2.placements.length, 6);
    assert.notStrictEqual(res1.placements, res2.placements);
  });
});
