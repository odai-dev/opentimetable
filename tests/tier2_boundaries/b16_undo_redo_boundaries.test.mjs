// opentimetable/tests/tier2_boundaries/b16_undo_redo_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 16 (Undo / Redo History)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UndoRedoStack } from '../helpers/studio-engine.mjs';

describe('Tier 2 - Boundary: Feature 16 (Undo / Redo History)', () => {
  it('T2.B16.1: Undo on empty history stack returns null and canUndo is false', () => {
    const stack = new UndoRedoStack(50);
    assert.strictEqual(stack.canUndo, false);
    const undone = stack.undo({ count: 1 });
    assert.strictEqual(undone, null);
  });

  it('T2.B16.2: Redo on empty redo stack returns null and canRedo is false', () => {
    const stack = new UndoRedoStack(50);
    assert.strictEqual(stack.canRedo, false);
    const redone = stack.redo({ count: 1 });
    assert.strictEqual(redone, null);
  });

  it('T2.B16.3: Strict 50-step capacity boundary: pushing 55 states maintains exactly 50 steps', () => {
    const stack = new UndoRedoStack(50);
    for (let i = 1; i <= 55; i++) {
      stack.push({ version: i });
    }
    assert.strictEqual(stack.historyLength, 50);

    // Oldest snapshot should be version 6 (versions 1..5 were dropped)
    const oldest = stack.undoStack[0];
    assert.strictEqual(oldest.version, 6);
  });

  it('T2.B16.4: Branching mutation boundary: new push after multiple undos purges entire redo stack', () => {
    const stack = new UndoRedoStack(50);
    stack.push({ step: 1 });
    stack.push({ step: 2 });
    stack.push({ step: 3 });

    // Undo 2 steps
    stack.undo({ step: 3 });
    stack.undo({ step: 2 });
    assert.strictEqual(stack.canRedo, true);
    assert.strictEqual(stack.redoStack.length, 2);

    // Now branch by pushing a new mutation
    stack.push({ step: 'new_branch' });
    assert.strictEqual(stack.canRedo, false);
    assert.strictEqual(stack.redoStack.length, 0);
  });

  it('T2.B16.5: Snapshot isolation boundary: subsequent mutation does not alter stored history', () => {
    const stack = new UndoRedoStack(50);
    const mutableState = { cards: [{ id: 'card_1', slot: 1 }] };
    stack.push(mutableState);

    // Corrupt mutableState in place
    mutableState.cards[0].slot = 999;
    mutableState.cards.push({ id: 'card_corrupt', slot: 1000 });

    // The snapshot in the undo stack must remain untouched
    const stored = stack.undoStack[0];
    assert.strictEqual(stored.cards.length, 1);
    assert.strictEqual(stored.cards[0].slot, 1);
  });
});
