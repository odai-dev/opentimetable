// opentimetable/tests/tier2_boundaries/b26_git_commits_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 26 (Conventional Git Commits)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConventionalCommit } from '../helpers/git-validator.mjs';

describe('Tier 2 - Boundary: Feature 26 (Conventional Git Commits)', () => {
  it('T2.B26.1: Header length boundary: exactly 100 characters passes, 101 characters fails', () => {
    // Prefix 'feat: ' is 6 chars, append 94 'a's -> total length = 100 chars
    const msg100 = 'feat: ' + 'a'.repeat(94);
    assert.strictEqual(msg100.length, 100);
    const res100 = validateConventionalCommit(msg100);
    assert.strictEqual(res100.valid, true, res100.error);

    // Prefix 'feat: ' is 6 chars, append 95 'a's -> total length = 101 chars
    const msg101 = 'feat: ' + 'a'.repeat(95);
    assert.strictEqual(msg101.length, 101);
    const res101 = validateConventionalCommit(msg101);
    assert.strictEqual(res101.valid, false);
    assert.match(res101.error, /exceeds 100 characters/i);
  });

  it('T2.B26.2: Trailing period boundary: rejects header ending with a period', () => {
    const periodMsg = 'feat(solver): add new kempe chain search.';
    const res = validateConventionalCommit(periodMsg);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /should not end with a period/i);
  });

  it('T2.B26.3: Empty message boundary: null, undefined, or empty string returns valid: false', () => {
    assert.strictEqual(validateConventionalCommit('').valid, false);
    assert.strictEqual(validateConventionalCommit(null).valid, false);
    assert.strictEqual(validateConventionalCommit('   ').valid, false);
  });

  it('T2.B26.4: Case boundary: uppercase type (e.g. FEAT:, FIX:) is rejected', () => {
    const upperMsg = 'FEAT(core): implement bitmask solver';
    const res = validateConventionalCommit(upperMsg);
    assert.strictEqual(res.valid, false);
  });

  it('T2.B26.5: Multi-line commit boundary: passes when header conforms regardless of body lines', () => {
    const multiLineMsg = [
      'feat(solver): implement tabu search optimization',
      '',
      'This commit introduces the Tabu Kempe Chain swap mechanism',
      'to resolve deep local minima in under 200 iterations.',
      '',
      'Refs: PROJECT.md § Architecture',
    ].join('\n');

    const res = validateConventionalCommit(multiLineMsg);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.type, 'feat');
    assert.strictEqual(res.scope, 'solver');
  });
});
