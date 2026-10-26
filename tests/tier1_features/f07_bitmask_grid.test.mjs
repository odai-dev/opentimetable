// opentimetable/tests/tier1_features/f07_bitmask_grid.test.mjs
// Tier 1 - Feature 7: Bitmask Constraint Grid (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BitmaskGrid } from '../helpers/solver-engine.mjs';

describe('Tier 1 - Feature 7: Bitmask Constraint Grid', () => {
  it('T1.F7.1: Calculates exact slot index for 35 weekly slots (5 days x 7 periods)', () => {
    const grid = new BitmaskGrid(5, 7);
    assert.strictEqual(grid.getSlotIndex(0, 0), 0);
    assert.strictEqual(grid.getSlotIndex(0, 6), 6);
    assert.strictEqual(grid.getSlotIndex(1, 0), 7);
    assert.strictEqual(grid.getSlotIndex(4, 6), 34);
  });

  it('T1.F7.2: Generates correct 64-bit BigInt mask corresponding to slot', () => {
    const grid = new BitmaskGrid(5, 7);
    assert.strictEqual(grid.getSlotMask(0, 0), 1n);
    assert.strictEqual(grid.getSlotMask(0, 1), 2n);
    assert.strictEqual(grid.getSlotMask(4, 6), 1n << 34n);
  });

  it('T1.F7.3: Detects collision when two entities target the same slot', () => {
    const grid = new BitmaskGrid(5, 7);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 0, 0), true);
    grid.setSlot('T1', 'R1', 'C1', 0, 0);

    // T1 cannot be placed in another room at (0, 0)
    assert.strictEqual(grid.canPlace('T1', 'R2', 'C2', 0, 0), false);
    // R1 cannot host another class at (0, 0)
    assert.strictEqual(grid.canPlace('T2', 'R1', 'C2', 0, 0), false);
    // C1 cannot have another lesson at (0, 0)
    assert.strictEqual(grid.canPlace('T2', 'R2', 'C1', 0, 0), false);
    // Unrelated entity can be placed
    assert.strictEqual(grid.canPlace('T2', 'R2', 'C2', 0, 0), true);
  });

  it('T1.F7.4: Clears slot bitmask and restores availability', () => {
    const grid = new BitmaskGrid(5, 7);
    grid.setSlot('T1', 'R1', 'C1', 2, 3);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 2, 3), false);

    grid.clearSlot('T1', 'R1', 'C1', 2, 3);
    assert.strictEqual(grid.canPlace('T1', 'R1', 'C1', 2, 3), true);
  });

  it('T1.F7.5: Handles 64-bit integer limits without numerical truncation or overflow', () => {
    const grid = new BitmaskGrid(5, 7);
    // Set all 35 slots
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 7; p++) {
        grid.setSlot('T_ALL', 'R_ALL', 'C_ALL', d, p);
      }
    }
    const tMask = grid.teacherMasks.get('T_ALL');
    const expectedFullMask = (1n << 35n) - 1n;
    assert.strictEqual(tMask, expectedFullMask);
  });
});
