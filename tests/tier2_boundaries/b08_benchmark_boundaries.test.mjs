// opentimetable/tests/tier2_boundaries/b08_benchmark_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 8 (500+ Lesson Benchmark Suite)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticSchedule, solveTimetable } from '../helpers/solver-engine.mjs';

describe('Tier 2 - Boundary: Feature 8 (500+ Lesson Benchmark Suite)', () => {
  it('T2.B8.1: Exact 500 lessons boundary completes within 2000ms threshold', () => {
    const req500 = generateSyntheticSchedule(500, 50, 25, 20);
    assert.strictEqual(req500.lessons.length, 500);
    const res = solveTimetable(req500);
    assert.strictEqual(res.hardConflicts, 0);
    assert.ok(res.solveDurationMs < 2000, `Duration ${res.solveDurationMs}ms exceeded 2000ms`);
  });

  it('T2.B8.2: Stressed 600 lessons benchmark scales efficiently without quadratic explosion', () => {
    const req600 = generateSyntheticSchedule(600, 60, 30, 25);
    assert.strictEqual(req600.lessons.length, 600);
    const res = solveTimetable(req600);
    assert.ok(res.solveDurationMs < 3000, `Duration ${res.solveDurationMs}ms exceeded 3000ms`);
  });

  it('T2.B8.3: High-density room parity boundary: equal number of rooms and classes (zero idle rooms)', () => {
    // 20 classes and exactly 20 rooms (tight room contention)
    const tightReq = generateSyntheticSchedule(300, 40, 20, 20);
    const res = solveTimetable(tightReq);
    assert.strictEqual(res.hardConflicts, 0);
  });

  it('T2.B8.4: Benchmark execution with tight 1000ms timeout config parameter', () => {
    const req = generateSyntheticSchedule(200, 30, 15, 12);
    req.config.timeoutMs = 1000;
    const res = solveTimetable(req);
    assert.ok(res.solveDurationMs <= 1000, `Solve duration ${res.solveDurationMs} exceeded 1000ms`);
  });

  it('T2.B8.5: Memory heap growth boundary: repeated 500-lesson runs maintain stable memory', () => {
    const req = generateSyntheticSchedule(500, 50, 25, 20);
    const memBefore = process.memoryUsage().heapUsed;
    solveTimetable(req);
    solveTimetable(req);
    const memAfter = process.memoryUsage().heapUsed;
    const diffMb = (memAfter - memBefore) / (1024 * 1024);
    // Heap increase should be reasonable (under 50 MB)
    assert.ok(diffMb < 50, `Heap memory growth ${diffMb.toFixed(2)}MB exceeded 50MB`);
  });
});
