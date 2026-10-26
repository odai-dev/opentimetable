// opentimetable/tests/tier2_boundaries/b07_bitmask_grid_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 7 (Bitmask Constraint Grid)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BitmaskGrid } from '../helpers/solver-engine.mjs';

describe('Tier 2 - Boundary: Feature 7 (Bitmask Constraint Grid)', () => {
  it('T2.B7.1: Throws error when slot coordinates are negative', () => {
    const grid = new BitmaskGrid(5, 7);
    assert.throws(() => grid.getSlotIndex(-1, 0), /out of bounds/i);
    assert.throws(() => grid.getSlotIndex(0, -1), /out of bounds/i);
    assert.throws(() => grid.getSlotMask(-1, -1), /out of bounds/i);
  });

  it('T2.B7.2: Throws error when slot coordinates exceed grid dimensions', () => {
    const grid = new BitmaskGrid(5, 7);
    assert.throws(() => grid.getSlotIndex(5, 0), /out of bounds/i);
    assert.throws(() => grid.getSlotIndex(0, 7), /out of bounds/i);
    assert.throws(() => grid.getSlotMask(10, 10), /out of bounds/i);
  });

  it('T2.B7.3: Minimum 1x1 grid dimension boundary behaves correctly', () => {
    const grid = new BitmaskGrid(1, 1);
    assert.strictEqual(grid.totalSlots, 1);
    assert.strictEqual(grid.getSlotIndex(0, 0), 0);
    assert.strictEqual(grid.getSlotMask(0, 0), 1n);

    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 0, 0), true);
    grid.setSlot('T1', 'R1', 'C1', 0, 0);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 0, 0), false);
    assert.strictEqual(grid.hasTeacherClash('T1', 0, 0), true);

    grid.clearSlot('T1', 'R1', 'C1', 0, 0);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 0, 0), true);
  });

  it('T2.B7.4: 64-bit capacity boundary: handles up to 64 slots without BigInt overflow', () => {
    const grid = new BitmaskGrid(8, 8); // 8x8 = 64 slots
    assert.strictEqual(grid.totalSlots, 64);
    const maxSlotMask = grid.getSlotMask(7, 7);
    assert.strictEqual(maxSlotMask, 1n << 63n);

    grid.setSlot('T_64', 'R_64', 'C_64', 7, 7);
    assert.strictEqual(grid.hasTeacherClash('T_64', 7, 7), true);
    assert.strictEqual(grid.hasTeacherClash('T_64', 0, 0), false);
  });

  it('T2.B7.5: Clearing an un-set slot is a safe no-op preserving other states', () => {
    const grid = new BitmaskGrid(5, 7);
    grid.setSlot('T1', 'R1', 'C1', 1, 2);

    // Clear unrelated slot
    grid.clearSlot('T1', 'R1', 'C1', 3, 4);

    // Slot (1, 2) must still remain occupied
    assert.strictEqual(grid.hasTeacherClash('T1', 1, 2), true);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 1, 2), false);
  });
});
