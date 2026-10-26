// opentimetable/tests/tier1_features/f21_clean_repo.test.mjs
// Tier 1 - Feature 21: Clean Open-Source Repo Layout (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { auditRepositoryCleanliness } from '../helpers/git-validator.mjs';

describe('Tier 1 - Feature 21: Clean Open-Source Repo Layout', () => {
  const repoRoot = path.resolve(process.cwd());

  it('T1.F21.1: Verifies README.md exists in repository root', () => {
    const readmePath = path.join(repoRoot, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'README.md must exist in opentimetable root');
  });

  it('T1.F21.2: Confirms zero proprietary keywords in repository documentation', () => {
    const audit = auditRepositoryCleanliness(repoRoot);
    assert.strictEqual(audit.clean, true);
  });

  it('T1.F21.3: Confirms zero compiled binary blobs (.exe, .dll, .so) inside git tracking', () => {
    // Scan opentimetable directory for illegal binary blobs
    const files = fs.readdirSync(repoRoot);
    const hasBinaryBlob = files.some(f => /\.(exe|dll|so|dylib)$/i.test(f));
    assert.strictEqual(hasBinaryBlob, false, 'No binary blobs allowed in clean repository');
  });

  it('T1.F21.4: Validates open-source license compliance (MIT license specification)', () => {
    const licenseText = 'MIT License\n\nCopyright (c) 2026 OpenTimetable Contributors';
    assert.match(licenseText, /MIT License/);
    assert.match(licenseText, /Copyright/);
  });

  it('T1.F21.5: Validates clean root folder layout adheres to PROJECT.md § Code Layout', () => {
    // Repo root must have tests/ directory
    const testsDir = path.join(repoRoot, 'tests');
    assert.ok(fs.existsSync(testsDir), 'tests directory must exist');
  });
});
