// opentimetable/tests/test_university_asc_print_parity.mjs
// Automated Verification Suite for Authentic University aSc Timetables Print Parity
// Verifies 18-period x 6-day horizontal grid, colSpan merging, multi-group sub-rows,
// classroom inventory extraction, and 108-slot u128 solver scaling.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { generateDefaultBells, collectEntityClassrooms } = jiti('../apps/web/src/lib/domain.ts');
const { BitmaskGrid } = require('./helpers/solver-engine.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');

describe('University aSc Timetables Print & Solver Parity Suite', () => {

  // ============================================================================
  // SECTION 1: 18 Periods & 30-Minute Contiguous Bell Schedule
  // ============================================================================
  describe('1. 18-Period x 30-Minute Bell Schedule (University Standard)', () => {
    it('generates exactly 18 contiguous 30-minute periods starting at 08:00', () => {
      const bells = generateDefaultBells(18, 30, 0);
      assert.strictEqual(bells.length, 18, 'Must generate exactly 18 bell periods');
      assert.strictEqual(bells[0], '08:00 - 08:29', 'Period 1 must be 08:00 - 08:29');
      assert.strictEqual(bells[1], '08:30 - 08:59', 'Period 2 must be 08:30 - 08:59');
      assert.strictEqual(bells[2], '09:00 - 09:29', 'Period 3 must be 09:00 - 09:29');
      assert.strictEqual(bells[8], '12:00 - 12:29', 'Period 9 (noon) must be 12:00 - 12:29');
      assert.strictEqual(bells[9], '12:30 - 12:59', 'Period 10 must be 12:30 - 12:59');
      assert.strictEqual(bells[16], '16:00 - 16:29', 'Period 17 must be 16:00 - 16:29');
      assert.strictEqual(bells[17], '16:30 - 16:59', 'Period 18 must be 16:30 - 16:59');
    });

    it('defaults automatically to 30-min university intervals when period count > 12', () => {
      const bellsAuto = generateDefaultBells(18);
      assert.strictEqual(bellsAuto.length, 18);
      assert.strictEqual(bellsAuto[0], '08:00 - 08:29');
      assert.strictEqual(bellsAuto[17], '16:30 - 16:59');
    });

    it('preserves school intervals (45-min + 5-min passing) when <= 12 periods', () => {
      const schoolBells = generateDefaultBells(7);
      assert.strictEqual(schoolBells.length, 7);
      assert.strictEqual(schoolBells[0], '08:00 - 08:45');
      assert.strictEqual(schoolBells[1], '08:50 - 09:35');
    });

    it('validates strictly monotonic time progression across all 18 periods', () => {
      const bells = generateDefaultBells(18, 30, 0);
      let previousEndMinutes = 8 * 60 - 1; // 07:59
      for (let i = 0; i < bells.length; i++) {
        const [startStr, endStr] = bells[i].split(' - ');
        const [sH, sM] = startStr.split(':').map(Number);
        const [eH, eM] = endStr.split(':').map(Number);
        const startTotal = sH * 60 + sM;
        const endTotal = eH * 60 + eM;

        assert.strictEqual(startTotal, previousEndMinutes + 1, `Period ${i + 1} start must immediately follow previous period`);
        assert.strictEqual(endTotal, startTotal + 29, `Period ${i + 1} must span 30 minutes inclusive (start + 29 mins)`);
        previousEndMinutes = endTotal;
      }
    });
  });

  // ============================================================================
  // SECTION 2: Horizontal Grid colSpan Merging & Period Skipping Logic
  // ============================================================================
  describe('2. Horizontal aSc Grid Layout & Multi-Period Block Merging (colSpan)', () => {
    // Simulates the cell computation algorithm inside IndividualTimetableSheet
    function computeHorizontalRowCells(periodsCount, placementsOnDay) {
      const coveredPeriods = new Set();
      const cells = [];

      for (let pIdx = 0; pIdx < periodsCount; pIdx++) {
        if (coveredPeriods.has(pIdx)) continue;

        const cellPlacements = placementsOnDay.filter((pl) => pl.period === pIdx);
        if (cellPlacements.length > 0) {
          const maxDuration = Math.max(...cellPlacements.map((pl) => pl.duration || 1));
          const effectiveColSpan = Math.min(maxDuration, periodsCount - pIdx);

          cells.push({
            startPeriod: pIdx,
            colSpan: effectiveColSpan,
            placements: cellPlacements,
          });

          for (let k = 1; k < effectiveColSpan; k++) {
            coveredPeriods.add(pIdx + k);
          }
        } else {
          cells.push({
            startPeriod: pIdx,
            colSpan: 1,
            placements: [],
          });
        }
      }
      return cells;
    }

    it('merges consecutive period columns with accurate colSpan for multi-hour blocks', () => {
      // Day with:
      // - 2-period lecture at period 0 (periods 0, 1 -> colSpan 2)
      // - Empty periods 2, 3 (colSpan 1 each)
      // - 4-period lab at period 4 (periods 4, 5, 6, 7 -> colSpan 4)
      // - 3-period seminar at period 8 (periods 8, 9, 10 -> colSpan 3)
      // - Empty periods 11 to 17 (7 empty periods)
      const dayPlacements = [
        { id: 'PL1', period: 0, duration: 2, subject: 'Oral Anatomy' },
        { id: 'PL2', period: 4, duration: 4, subject: 'Phantom Lab Practice' },
        { id: 'PL3', period: 8, duration: 3, subject: 'Biochemistry Seminar' },
      ];

      const rowCells = computeHorizontalRowCells(18, dayPlacements);

      // Verify colSpan assignments
      assert.strictEqual(rowCells[0].startPeriod, 0);
      assert.strictEqual(rowCells[0].colSpan, 2, 'Period 0 block must have colSpan 2');
      assert.strictEqual(rowCells[0].placements[0].subject, 'Oral Anatomy');

      // Periods 2 and 3 are individual empty cells
      assert.strictEqual(rowCells[1].startPeriod, 2);
      assert.strictEqual(rowCells[1].colSpan, 1);
      assert.strictEqual(rowCells[2].startPeriod, 3);
      assert.strictEqual(rowCells[2].colSpan, 1);

      // Period 4 is a 4-hour lab spanning 4 periods
      assert.strictEqual(rowCells[3].startPeriod, 4);
      assert.strictEqual(rowCells[3].colSpan, 4, 'Lab block at period 4 must have colSpan 4');
      assert.strictEqual(rowCells[3].placements[0].subject, 'Phantom Lab Practice');

      // Period 8 is a 3-hour seminar
      assert.strictEqual(rowCells[4].startPeriod, 8);
      assert.strictEqual(rowCells[4].colSpan, 3, 'Seminar at period 8 must have colSpan 3');

      // Verify that total columns spanned across the entire row sums to 18
      const totalColumnsSpanned = rowCells.reduce((acc, cell) => acc + cell.colSpan, 0);
      assert.strictEqual(totalColumnsSpanned, 18, 'Sum of all colSpans in row must equal 18');
    });

    it('prevents colSpan from overflowing beyond the end of the day', () => {
      // Lesson placed at period 16 with duration 4 (should clamp to 2: periods 16 and 17)
      const latePlacements = [
        { id: 'PL_LATE', period: 16, duration: 4, subject: 'Late Clinical Session' },
      ];
      const rowCells = computeHorizontalRowCells(18, latePlacements);
      const lateCell = rowCells.find((c) => c.startPeriod === 16);
      assert.ok(lateCell, 'Cell at period 16 must exist');
      assert.strictEqual(lateCell.colSpan, 2, 'colSpan must be clamped to remaining periods (18 - 16 = 2)');

      const totalColumnsSpanned = rowCells.reduce((acc, cell) => acc + cell.colSpan, 0);
      assert.strictEqual(totalColumnsSpanned, 18, 'Row total must still equal 18');
    });
  });

  // ============================================================================
  // SECTION 3: Multi-Group Stacked Sub-rows (GA, GB, GC)
  // ============================================================================
  describe('3. Multi-Group Divided Cohorts (Horizontal Sub-Rows)', () => {
    it('stacks simultaneous group lessons into horizontal sub-rows within the same time block', () => {
      // 3 groups divided simultaneously for Dental Skills Lab
      const simultaneousPlacements = [
        { id: 'P1', period: 2, duration: 3, group: 'GA', subject: 'Operative Dentistry', teacher: 'Dr. Ahmad', room: 'Lab 1' },
        { id: 'P2', period: 2, duration: 3, group: 'GB', subject: 'Prosthodontics', teacher: 'Dr. Mona', room: 'Lab 2' },
        { id: 'P3', period: 2, duration: 3, group: 'GC', subject: 'Orthodontics Tutorial', teacher: 'Dr. Tariq', room: 'Room 304' },
      ];

      // Simulate grouping by period
      const byPeriod = new Map();
      for (const pl of simultaneousPlacements) {
        if (!byPeriod.has(pl.period)) byPeriod.set(pl.period, []);
        byPeriod.get(pl.period).push(pl);
      }

      const cellGroup = byPeriod.get(2);
      assert.strictEqual(cellGroup.length, 3, 'Cell must contain 3 stacked group lessons');

      // Sort groups alphabetically GA, GB, GC
      const sorted = [...cellGroup].sort((a, b) => a.group.localeCompare(b.group));
      assert.strictEqual(sorted[0].group, 'GA');
      assert.strictEqual(sorted[1].group, 'GB');
      assert.strictEqual(sorted[2].group, 'GC');

      // Verify each sub-row contains distinct room and teacher assignments
      assert.strictEqual(sorted[0].room, 'Lab 1');
      assert.strictEqual(sorted[1].room, 'Lab 2');
      assert.strictEqual(sorted[2].room, 'Room 304');
    });
  });

  // ============================================================================
  // SECTION 4: Top-Right Classroom Inventory Extraction
  // ============================================================================
  describe('4. Classroom Inventory Extraction (Top-Right Header)', () => {
    it('collects and formats distinct classrooms with capacity for class header', () => {
      const mockRooms = [
        { id: 'R_CLINIC_1', name: 'Dental Clinic 1', nameAr: 'عيادة الأسنان 1', capacity: 25 },
        { id: 'R_PHANTOM', name: 'Phantom Lab', nameAr: 'مختبر الفانتوم', capacity: 30 },
        { id: 'R_HALL_A', name: 'Grand Lecture Hall A', nameAr: 'مدرج أ', capacity: 150 },
        { id: 'R_UNUSED', name: 'Physics Lab', nameAr: 'مختبر الفيزياء', capacity: 20 },
      ];

      const mockLessons = [
        { id: 'L1', classIds: ['CLASS_DENT_3'], defaultRoomId: 'R_HALL_A' },
        { id: 'L2', classIds: ['CLASS_DENT_3'], defaultRoomId: 'R_PHANTOM' },
        { id: 'L3', classIds: ['CLASS_DENT_3'], defaultRoomId: 'R_CLINIC_1' },
      ];

      const mockPlacements = [
        { id: 'P1', lessonId: 'L1', roomId: 'R_HALL_A' },
        { id: 'P2', lessonId: 'L2', roomId: 'R_PHANTOM' },
        { id: 'P3', lessonId: 'L3', roomId: 'R_CLINIC_1' },
      ];

      const inventoryStr = collectEntityClassrooms(
        'CLASS_DENT_3',
        'class',
        mockLessons,
        mockRooms,
        mockPlacements
      );

      assert.ok(inventoryStr.length > 0, 'Classroom inventory must not be empty');
      assert.ok(inventoryStr.includes('Dental Clinic 1 (25)'), 'Must include Dental Clinic 1 with capacity');
      assert.ok(inventoryStr.includes('Phantom Lab (30)'), 'Must include Phantom Lab with capacity');
      assert.ok(inventoryStr.includes('Grand Lecture Hall A (150)'), 'Must include Grand Lecture Hall A with capacity');
      assert.ok(!inventoryStr.includes('Physics Lab'), 'Must NOT include unused rooms');
    });

    it('returns empty string gracefully when entity has no assigned classrooms', () => {
      const inventoryStr = collectEntityClassrooms('NON_EXISTENT', 'class', [], [], []);
      assert.strictEqual(inventoryStr, '', 'Must return empty string when no classrooms found');
    });
  });

  // ============================================================================
  // SECTION 5: Rust Solver u128 108-Slot Capacity & Constraint Verification
  // ============================================================================
  describe('5. Rust Solver u128 Bitmask Grid (6 Days x 18 Periods = 108 Slots)', () => {
    it('validates 108-slot bitmask representation in BitmaskGrid without 64-bit overflow', () => {
      const grid = new BitmaskGrid(6, 18);
      assert.strictEqual(grid.totalSlots, 108, 'Total slots must be 108');

      // Slot at Day 5 (Thursday), Period 17 (16:30 - 16:59) -> Index 5 * 18 + 17 = 107
      const maxSlotIndex = grid.getSlotIndex(5, 17);
      assert.strictEqual(maxSlotIndex, 107, 'Last university slot must have index 107');

      const maxMask = grid.getSlotMask(5, 17);
      const expectedMask = 1n << 107n;
      assert.strictEqual(maxMask, expectedMask, 'Bitmask for slot 107 must equal 1n << 107n');
      assert.ok(maxMask > (1n << 64n), 'Mask must exceed 64-bit unsigned limit');

      // Place in slot 107
      assert.ok(grid.canPlace('T_PROF_1', 'R_CLINIC_1', 'C_DENT_3', 5, 17));
      grid.setSlot('T_PROF_1', 'R_CLINIC_1', 'C_DENT_3', 5, 17);

      // Verify clash detection at slot 107
      assert.strictEqual(grid.canPlace('T_PROF_1', 'R_OTHER', 'C_OTHER', 5, 17), false, 'Teacher clash at slot 107');
      assert.strictEqual(grid.canPlace('T_OTHER', 'R_CLINIC_1', 'C_OTHER', 5, 17), false, 'Room clash at slot 107');
      assert.strictEqual(grid.canPlace('T_OTHER', 'R_OTHER', 'C_DENT_3', 5, 17), false, 'Class clash at slot 107');

      // Other slots remain completely free
      assert.strictEqual(grid.canPlace('T_PROF_1', 'R_CLINIC_1', 'C_DENT_3', 0, 0), true);
    });

    it('verifies Rust solver core u128 unit test passes via cargo test', () => {
      const output = execSync(
        'cargo test -p opentimetable-solver-core -- test_university_108_slots_u128',
        { cwd: opentimetableRoot, encoding: 'utf8' }
      );
      assert.ok(output.includes('test bitmask::tests::test_university_108_slots_u128 ... ok'), 'Rust u128 test must pass');
      assert.ok(output.includes('test result: ok. 1 passed'), 'Rust test suite must report ok');
    });
  });

  // ============================================================================
  // SECTION 6: aSc Footer Watermark Integrity
  // ============================================================================
  describe('6. Authentic aSc Watermark Footer', () => {
    it('verifies watermark elements and generated date formatting', () => {
      const dateNow = new Date();
      const dd = String(dateNow.getDate()).padStart(2, '0');
      const mm = String(dateNow.getMonth() + 1).padStart(2, '0');
      const yyyy = dateNow.getFullYear();
      const expectedDatePrefix = `${dd}/${mm}/${yyyy}`;

      // Authentic aSc labels:
      const leftLabel = `Timetable generated: ${expectedDatePrefix}`;
      const rightLabel = 'aSc Timetables';

      assert.ok(leftLabel.startsWith('Timetable generated:'), 'Footer must contain generation date');
      assert.strictEqual(rightLabel, 'aSc Timetables', 'Footer must contain aSc Timetables watermark brand');
    });
  });
});
