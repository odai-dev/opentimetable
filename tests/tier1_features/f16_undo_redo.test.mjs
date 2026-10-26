// opentimetable/tests/tier1_features/f16_undo_redo.test.mjs
// Tier 1 - Feature 16: Undo / Redo History (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UndoRedoStack } from '../helpers/studio-engine.mjs';

describe('Tier 1 - Feature 16: Undo / Redo History', () => {
  it('T1.F16.1: Pushes state snapshot onto undo stack', () => {
    const stack = new UndoRedoStack(50);
    stack.push({ placements: [{ lessonId: 'L1', slot: 1 }] });
    assert.strictEqual(stack.historyLength, 1);
    assert.strictEqual(stack.canUndo, true);
    assert.strictEqual(stack.canRedo, false);
  });

  it('T1.F16.2: Reverts timetable state upon undo action', () => {
    const stack = new UndoRedoStack(50);
    const state0 = { placements: [] };
    const state1 = { placements: [{ lessonId: 'L1', slot: 1 }] };

    stack.push(state0);
    const reverted = stack.undo(state1);
    assert.deepStrictEqual(reverted, state0);
    assert.strictEqual(stack.canRedo, true);
  });

  it('T1.F16.3: Restores undone state upon redo action', () => {
    const stack = new UndoRedoStack(50);
    const state0 = { placements: [] };
    const state1 = { placements: [{ lessonId: 'L1', slot: 1 }] };

    stack.push(state0);
    stack.undo(state1);
    const redone = stack.redo(state0);
    assert.deepStrictEqual(redone, state1);
  });

  it('T1.F16.4: Caps history stack at exactly 50 steps discarding oldest', () => {
    const stack = new UndoRedoStack(50);
    for (let i = 1; i <= 60; i++) {
      stack.push({ step: i });
    }
    assert.strictEqual(stack.historyLength, 50);
    // Oldest surviving should be step 11
    assert.strictEqual(stack.undoStack[0].step, 11);
  });

  it('T1.F16.5: Clears redo stack when a new mutation is pushed after undo', () => {
    const stack = new UndoRedoStack(50);
    stack.push({ step: 1 });
    stack.push({ step: 2 });
    stack.undo({ step: 3 });
    assert.strictEqual(stack.canRedo, true);

    // New action performed
    stack.push({ step: 'branched' });
    assert.strictEqual(stack.canRedo, false, 'Redo stack must be cleared after branching mutation');
  });
});
