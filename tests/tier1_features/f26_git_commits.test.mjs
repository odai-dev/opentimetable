// opentimetable/tests/tier1_features/f26_git_commits.test.mjs
// Tier 1 - Feature 26: Conventional Git Commits (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConventionalCommit } from '../helpers/git-validator.mjs';

describe('Tier 1 - Feature 26: Conventional Git Commits', () => {
  it('T1.F26.1: Accepts valid feat: commit message', () => {
    const result = validateConventionalCommit('feat: add Kempe chain constraint optimizer');
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.type, 'feat');
    assert.strictEqual(result.scope, null);
  });

  it('T1.F26.2: Accepts valid scoped commit messages', () => {
    const result = validateConventionalCommit('fix(solver): resolve teacher clash bitmask shift boundary');
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.type, 'fix');
    assert.strictEqual(result.scope, 'solver');
  });

  it('T1.F26.3: Accepts docs:, chore:, and test: conventional commits', () => {
    assert.strictEqual(validateConventionalCommit('docs: update architecture layout in README').valid, true);
    assert.strictEqual(validateConventionalCommit('chore: initial commit for OpenTimetable').valid, true);
    assert.strictEqual(validateConventionalCommit('test(e2e): implement comprehensive 4-tier opaque-box test suite').valid, true);
  });

  it('T1.F26.4: Rejects non-conventional arbitrary commit messages', () => {
    assert.strictEqual(validateConventionalCommit('fixed stuff').valid, false);
    assert.strictEqual(validateConventionalCommit('WIP: trying something').valid, false);
    assert.strictEqual(validateConventionalCommit('updated files and solver').valid, false);
  });

  it('T1.F26.5: Rejects commit headers with trailing period or exceeding 100 chars', () => {
    const withPeriod = 'feat(ui): add bilingual toggle.';
    assert.strictEqual(validateConventionalCommit(withPeriod).valid, false);

    const longHeader = 'feat(solver): ' + 'a'.repeat(95);
    assert.strictEqual(validateConventionalCommit(longHeader).valid, false);
  });
});
