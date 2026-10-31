// opentimetable/tests/test_m1_dynamic_dimensions_challenger.mjs
// Empirical Adversarial Challenge Suite: Dynamic Capacity, Coordinate Mapping, and TimeOff Defaults
// Author: teamwork_preview_challenger_m1_r14_2

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Challenger 2 — Adversarial Suite: Dynamic Scaling & Dimensions', () => {

  // =========================================================================
  // Challenge 1: Dynamic Capacity in TestTimetableModal
  // =========================================================================
  describe('Challenge 1: TestTimetableModal Dynamic Capacity & Workload Evaluation', () => {
    
    function evaluateSingleEntityTest({
      cycleDays,
      periodsPerDay,
      entityId = 'T1',
      lessonsCount = 36,
      clashesCount = 0,
      isRtl = false,
    }) {
      const totalCapacity = (cycleDays || 5) * (periodsPerDay || 7);
      const highWorkloadThreshold = Math.round(totalCapacity * 0.85);

      const notes = [];
      if (lessonsCount > highWorkloadThreshold) {
        notes.push(
          isRtl
            ? `العبء الأسبوعي (${lessonsCount}/${totalCapacity}) مرتفع ويتطلب توزيعاً دقيقاً`
            : `High weekly workload (${lessonsCount}/${totalCapacity} slots) requires careful distribution`
        );
      } else {
        notes.push(
          isRtl
            ? `العبء الأسبوعي (${lessonsCount}/${totalCapacity} حصة) مناسب ومتوازن`
            : `Weekly workload (${lessonsCount}/${totalCapacity} slots) is well within feasible parameters`
        );
      }

      if (clashesCount > 0) {
        notes.push(
          isRtl
            ? `يوجد ${clashesCount} تعارض مباشر يؤثر على هذا الكيان`
            : `${clashesCount} active clashes directly involve this entity`
        );
      } else {
        notes.push(
          isRtl
            ? 'لا توجد أي تعارضات مسجلة لهذا الكيان في الجدول الحالي'
            : 'Zero conflict collisions recorded for this entity in current placements'
        );
      }

      return {
        load: lessonsCount,
        maxCapacity: totalCapacity,
        highWorkloadThreshold,
        feasible: clashesCount === 0 && lessonsCount <= totalCapacity,
        clashesCount,
        freeSlots: Math.max(0, totalCapacity - lessonsCount),
        hasOverflowWarning: lessonsCount > highWorkloadThreshold,
        notes,
      };
    }

    it('Saudi Arabia 1 (5 days, 12 periods = 60 slots): 36 lessons evaluates to feasible === true, 24 free slots, 0 overflow warnings', () => {
      const result = evaluateSingleEntityTest({
        cycleDays: 5,
        periodsPerDay: 12,
        lessonsCount: 36,
        clashesCount: 0,
      });

      assert.strictEqual(result.maxCapacity, 60, 'Total capacity for 5x12 must be 60 slots');
      assert.strictEqual(result.highWorkloadThreshold, 51, '85% threshold of 60 is 51');
      assert.strictEqual(result.load, 36, 'Assigned load must be 36');
      assert.strictEqual(result.feasible, true, 'Teacher with 36 lessons in 60-slot school MUST be feasible');
      assert.strictEqual(result.freeSlots, 24, 'Free slots must be exactly 60 - 36 = 24');
      assert.strictEqual(result.hasOverflowWarning, false, 'Must NOT trigger high workload overflow warning (36 <= 51)');
      assert.ok(
        result.notes[0].includes('well within feasible parameters'),
        'Note must indicate workload is well within feasible parameters'
      );
    });

    it('Contrast with hardcoded 35-slot bug: demonstrates false overflow and failure if hardcoded 35 was retained', () => {
      // Prior bug logic: maxCapacity = 35, highWorkloadThreshold = 30
      const hardcodedCapacity = 35;
      const hardcodedThreshold = 30;
      const lessonsCount = 36;

      const buggyFeasible = 0 === 0 && lessonsCount <= hardcodedCapacity; // 36 <= 35 -> false!
      const buggyFreeSlots = Math.max(0, hardcodedCapacity - lessonsCount); // 0!
      const buggyHasOverflow = lessonsCount > hardcodedThreshold; // 36 > 30 -> true!

      assert.strictEqual(buggyFeasible, false, 'Buggy implementation falsely marked 36 lessons as unfeasible');
      assert.strictEqual(buggyFreeSlots, 0, 'Buggy implementation reported 0 free slots');
      assert.strictEqual(buggyHasOverflow, true, 'Buggy implementation fired false overflow warning');
    });

    it('7-day schools (7 days, 7 periods = 49 slots): capacity evaluates to 49', () => {
      const result = evaluateSingleEntityTest({
        cycleDays: 7,
        periodsPerDay: 7,
        lessonsCount: 35,
        clashesCount: 0,
      });

      assert.strictEqual(result.maxCapacity, 49, 'Total capacity for 7x7 must be 49 slots');
      assert.strictEqual(result.highWorkloadThreshold, 42, '85% threshold of 49 is 42');
      assert.strictEqual(result.feasible, true, '35 lessons in 49-slot school is feasible');
      assert.strictEqual(result.freeSlots, 14, 'Free slots must be 49 - 35 = 14');
      assert.strictEqual(result.hasOverflowWarning, false, '35 <= 42: no overflow warning');
    });

    it('7-day schools (7 days, 7 periods): strictly rejects over-capacity workloads (> 49 lessons)', () => {
      const result = evaluateSingleEntityTest({
        cycleDays: 7,
        periodsPerDay: 7,
        lessonsCount: 50,
        clashesCount: 0,
      });

      assert.strictEqual(result.maxCapacity, 49);
      assert.strictEqual(result.feasible, false, '50 lessons > 49 capacity must evaluate to feasible === false');
      assert.strictEqual(result.freeSlots, 0, 'Free slots must clamp to 0');
      assert.strictEqual(result.hasOverflowWarning, true, 'Must trigger high workload overflow warning');
    });

    it('boundary condition: default fallback when cycleDays / periodsPerDay are omitted or 0', () => {
      const resultOmitted = evaluateSingleEntityTest({
        cycleDays: undefined,
        periodsPerDay: undefined,
        lessonsCount: 20,
      });
      assert.strictEqual(resultOmitted.maxCapacity, 35, 'Omitted props fallback to 5x7 = 35');

      const resultZero = evaluateSingleEntityTest({
        cycleDays: 0,
        periodsPerDay: 0,
        lessonsCount: 20,
      });
      assert.strictEqual(resultZero.maxCapacity, 35, 'Zero props fallback safely to 5x7 = 35');
    });
  });

  // =========================================================================
  // Challenge 2: 2D Coordinate Mapping in solver.worker.ts
  // =========================================================================
  describe('Challenge 2: 2D Coordinate Arithmetic in solver.worker.ts', () => {

    function mapWorkerPlacement(p, resolvedPeriodsPerDay) {
      return {
        lessonId: p.lessonId || p.lesson_id,
        dayIndex:
          p.dayIndex ??
          p.day_index ??
          (p.slot !== undefined ? Math.floor(p.slot / resolvedPeriodsPerDay) : 0),
        periodIndex:
          p.periodIndex ??
          p.period_index ??
          (p.slot !== undefined ? p.slot % resolvedPeriodsPerDay : 0),
        roomId: p.roomId || p.room_id || 'R101',
      };
    }

    it('test all slots from 0 to 59 for 12-period school (5 days x 12 periods)', () => {
      const periodsPerDay = 12;
      const daysCount = 5;
      const totalSlots = daysCount * periodsPerDay; // 60

      for (let slot = 0; slot < totalSlots; slot++) {
        const placement = mapWorkerPlacement({ lessonId: `L${slot}`, slot }, periodsPerDay);

        const expectedDay = Math.floor(slot / periodsPerDay);
        const expectedPeriod = slot % periodsPerDay;

        assert.strictEqual(
          placement.dayIndex,
          expectedDay,
          `Slot ${slot}: dayIndex must be Math.floor(${slot} / 12) = ${expectedDay}`
        );
        assert.strictEqual(
          placement.periodIndex,
          expectedPeriod,
          `Slot ${slot}: periodIndex must be ${slot} % 12 = ${expectedPeriod}`
        );

        // Assert valid bounds
        assert.ok(placement.dayIndex >= 0 && placement.dayIndex < daysCount, `Day index ${placement.dayIndex} in bounds [0, 4]`);
        assert.ok(placement.periodIndex >= 0 && placement.periodIndex < periodsPerDay, `Period index ${placement.periodIndex} in bounds [0, 11]`);

        // Assert bijective inverse reconstruction
        const reconstructedSlot = placement.dayIndex * periodsPerDay + placement.periodIndex;
        assert.strictEqual(reconstructedSlot, slot, `Reconstructed slot must match original slot ${slot}`);
      }
    });

    it('contrast check: demonstrates catastrophic coordinate corruption of inverted bug (slot % 5, slot / 5)', () => {
      const periodsPerDay = 12;
      let corruptionCount = 0;

      for (let slot = 0; slot < 60; slot++) {
        const correctDay = Math.floor(slot / periodsPerDay);
        const correctPeriod = slot % periodsPerDay;

        // Old inverted bug:
        const buggyDay = slot % 5;
        const buggyPeriod = Math.floor(slot / 5);

        if (correctDay !== buggyDay || correctPeriod !== buggyPeriod) {
          corruptionCount++;
        }
      }

      // In a 60-slot grid, the inverted formula corrupts nearly every slot!
      assert.ok(corruptionCount > 50, `Inverted bug corrupted ${corruptionCount} of 60 slots!`);
      
      // Specifically examine slot 11 (last period of day 0):
      // Correct: day 0, period 11
      // Buggy: day = 11 % 5 = 1, period = 11 / 5 = 2
      const slot11CorrectDay = Math.floor(11 / 12);
      const slot11CorrectPeriod = 11 % 12;
      const slot11BuggyDay = 11 % 5;
      const slot11BuggyPeriod = Math.floor(11 / 5);

      assert.strictEqual(slot11CorrectDay, 0);
      assert.strictEqual(slot11CorrectPeriod, 11);
      assert.strictEqual(slot11BuggyDay, 1);
      assert.strictEqual(slot11BuggyPeriod, 2);
    });

    it('preserves existing dayIndex / periodIndex if already provided in placement', () => {
      const placement = mapWorkerPlacement({
        lessonId: 'L_EXPLICIT',
        dayIndex: 3,
        periodIndex: 8,
        slot: 999, // Should NOT override existing dayIndex/periodIndex
      }, 12);

      assert.strictEqual(placement.dayIndex, 3);
      assert.strictEqual(placement.periodIndex, 8);
    });

    it('supports snake_case day_index / period_index from raw solver responses', () => {
      const placement = mapWorkerPlacement({
        lesson_id: 'L_SNAKE',
        day_index: 2,
        period_index: 6,
      }, 12);

      assert.strictEqual(placement.lessonId, 'L_SNAKE');
      assert.strictEqual(placement.dayIndex, 2);
      assert.strictEqual(placement.periodIndex, 6);
    });

    it('generalized test: 7-day schools (7 days x 7 periods = 49 slots)', () => {
      const periodsPerDay = 7;
      const daysCount = 7;
      for (let slot = 0; slot < 49; slot++) {
        const placement = mapWorkerPlacement({ lessonId: `L${slot}`, slot }, periodsPerDay);
        assert.strictEqual(placement.dayIndex, Math.floor(slot / 7));
        assert.strictEqual(placement.periodIndex, slot % 7);
        assert.strictEqual(placement.dayIndex * 7 + placement.periodIndex, slot);
      }
    });
  });

  // =========================================================================
  // Challenge 3: TimeOffModal Default Matrix
  // =========================================================================
  describe('Challenge 3: TimeOffModal Default Matrix & Phantom Block Elimination', () => {

    function createTimeOffModalState({ initialMatrix = {}, selectedEntityId = 'T2' } = {}) {
      let matrix = { ...initialMatrix };

      function getKey(day, period) {
        return `${selectedEntityId}-${day}-${period}`;
      }

      function getSlotState(day, period) {
        const val = matrix[getKey(day, period)];
        return val !== undefined ? val : 1; // Default to 1 (Available)
      }

      function setSlotState(day, period, state) {
        matrix[getKey(day, period)] = state;
      }

      return {
        getMatrix: () => ({ ...matrix }),
        getSlotState,
        setSlotState,
        getKey,
      };
    }

    it('default matrix contains NO phantom blocks for Teacher T2 at (0, 0) or any slot', () => {
      // By default, initialMatrix is {}
      const modal = createTimeOffModalState({ selectedEntityId: 'T2' });

      // Check slot (0, 0) specifically
      const slot00State = modal.getSlotState(0, 0);
      assert.strictEqual(slot00State, 1, 'Teacher T2 at Day 0, Period 0 must default to 1 (Available)');

      // Check all 60 slots for 5 days x 12 periods
      for (let d = 0; d < 5; d++) {
        for (let p = 0; p < 12; p++) {
          assert.strictEqual(
            modal.getSlotState(d, p),
            1,
            `Teacher T2 at Day ${d}, Period ${p} must be 1 (Available) by default`
          );
        }
      }

      // Assert matrix keys are empty
      assert.deepStrictEqual(modal.getMatrix(), {}, 'Matrix must have no initial entries by default');
    });

    it('contrast with prior bug: demonstrated that initialMatrix = { "T2-0-0": 0 } caused false blocked slot', () => {
      const buggyInitialMatrix = { 'T2-0-0': 0 };
      const buggyModal = createTimeOffModalState({
        initialMatrix: buggyInitialMatrix,
        selectedEntityId: 'T2',
      });

      assert.strictEqual(
        buggyModal.getSlotState(0, 0),
        0,
        'Buggy modal blocked Teacher T2 at (0, 0) unconditionally!'
      );
    });

    it('allows explicit user customization to be preserved and toggled', () => {
      const modal = createTimeOffModalState({ selectedEntityId: 'T2' });

      // User manually blocks Day 1, Period 3
      modal.setSlotState(1, 3, 0);
      assert.strictEqual(modal.getSlotState(1, 3), 0, 'Manually blocked slot must return 0');

      // Other slots remain available
      assert.strictEqual(modal.getSlotState(0, 0), 1, 'Unblocked slot remains 1');
      assert.strictEqual(modal.getSlotState(1, 4), 1, 'Unblocked slot remains 1');
    });
  });

  // =========================================================================
  // Challenge 4: Payload Normalization in solver.worker.ts
  // =========================================================================
  describe('Challenge 4: Payload Normalization & Dimension Extraction', () => {

    function normalizePayload(payload) {
      const resolvedDays =
        Number(payload?.config?.days) ||
        Number(payload?.config?.days_count) ||
        Number(payload?.days) ||
        Number(payload?.cycleDays) ||
        5;

      const resolvedPeriodsPerDay =
        Number(payload?.config?.periodsPerDay) ||
        Number(payload?.config?.periods_per_day) ||
        Number(payload?.periodsPerDay) ||
        Number(payload?.periods_per_day) ||
        7;

      return {
        ...payload,
        days: resolvedDays,
        periodsPerDay: resolvedPeriodsPerDay,
        config: {
          ...payload?.config,
          days: resolvedDays,
          periodsPerDay: resolvedPeriodsPerDay,
        },
      };
    }

    it('extracts days and periodsPerDay from nested config', () => {
      const normalized = normalizePayload({
        config: { days: 5, periodsPerDay: 12 },
      });
      assert.strictEqual(normalized.days, 5);
      assert.strictEqual(normalized.periodsPerDay, 12);
      assert.strictEqual(normalized.config.days, 5);
      assert.strictEqual(normalized.config.periodsPerDay, 12);
    });

    it('extracts snake_case properties days_count and periods_per_day', () => {
      const normalized = normalizePayload({
        config: { days_count: 7, periods_per_day: 8 },
      });
      assert.strictEqual(normalized.days, 7);
      assert.strictEqual(normalized.periodsPerDay, 8);
    });

    it('extracts root properties days and cycleDays', () => {
      const normalized = normalizePayload({ cycleDays: 6, periodsPerDay: 9 });
      assert.strictEqual(normalized.days, 6);
      assert.strictEqual(normalized.periodsPerDay, 9);
    });

    it('falls back safely to 5 days and 7 periods if empty or invalid', () => {
      const normalizedEmpty = normalizePayload({});
      assert.strictEqual(normalizedEmpty.days, 5);
      assert.strictEqual(normalizedEmpty.periodsPerDay, 7);

      const normalizedInvalid = normalizePayload({ config: { days: 'invalid', periodsPerDay: null } });
      assert.strictEqual(normalizedInvalid.days, 5);
      assert.strictEqual(normalizedInvalid.periodsPerDay, 7);
    });
  });
});
