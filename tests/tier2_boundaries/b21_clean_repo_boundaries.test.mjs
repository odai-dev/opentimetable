// opentimetable/tests/tier2_boundaries/b21_clean_repo_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 21 (Clean Open-Source Repo Layout)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { auditRepositoryCleanliness } from '../helpers/git-validator.mjs';

describe('Tier 2 - Boundary: Feature 21 (Clean Open-Source Repo Layout)', () => {
  const opentimetableRoot = path.resolve(process.cwd());
  const parentRoot = path.resolve(process.cwd(), '..');

  it('T2.B21.1: Git repository isolation boundary: Tables/ parent MUST NOT contain .git directory', () => {
    const parentGitPath = path.join(parentRoot, '.git');
    assert.strictEqual(fs.existsSync(parentGitPath), false, 'Parent workspace must not have a git repository');

    const cleanGitPath = path.join(opentimetableRoot, '.git');
    assert.strictEqual(fs.existsSync(cleanGitPath), true, 'opentimetable must be the sole git repository');
  });

  it('T2.B21.2: Repository audit detects forbidden proprietary keywords regardless of casing', () => {
    const checkKeyword = (text) => {
      const forbidden = ['roz.exe', 'ghidra', 'ida pro'];
      return forbidden.some(kw => text.toLowerCase().includes(kw));
    };

    assert.strictEqual(checkKeyword('Reverse engineered with GHIDRA and IDA Pro'), true);
    assert.strictEqual(checkKeyword('Extracted from Roz.EXE container'), true);
    assert.strictEqual(checkKeyword('OpenTimetable MIT clean-room scheduling suite'), false);
  });

  it('T2.B21.3: Clean repository audit reports 0 cleanliness issues', () => {
    const audit = auditRepositoryCleanliness(opentimetableRoot);
    assert.strictEqual(audit.clean, true);
    assert.strictEqual(audit.issues.length, 0);
  });

  it('T2.B21.4: Zero compiled executable binary blobs inside repository source tree', () => {
    const checkBinaryExtension = (fileName) => {
      const forbiddenExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.obj'];
      const ext = path.extname(fileName).toLowerCase();
      return forbiddenExtensions.includes(ext);
    };

    assert.strictEqual(checkBinaryExtension('roz.exe'), true);
    assert.strictEqual(checkBinaryExtension('solver.dll'), true);
    assert.strictEqual(checkBinaryExtension('main.rs'), false);
    assert.strictEqual(checkBinaryExtension('package.json'), false);
  });

  it('T2.B21.5: Cargo workspace configuration integrity boundary: Cargo.toml contains clean workspace members', () => {
    const cargoPath = path.join(opentimetableRoot, 'Cargo.toml');
    assert.strictEqual(fs.existsSync(cargoPath), true);
    const cargoContent = fs.readFileSync(cargoPath, 'utf8');
    assert.match(cargoContent, /\[workspace\]/);
    assert.match(cargoContent, /solver_core/);
  });
});
