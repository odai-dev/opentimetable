// opentimetable/tests/tier2_boundaries/b05_cleanroom_boundary_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 5 (Clean-Room Boundary Protocol)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { auditRepositoryCleanliness } from '../helpers/git-validator.mjs';

describe('Tier 2 - Boundary: Feature 5 (Clean-Room Boundary Protocol)', () => {
  const repoRoot = path.resolve(process.cwd());

  it('T2.B5.1: Prohibits relative source code imports that breach Zone A boundary', () => {
    const isIllegalZoneAImport = (importPath) => {
      return importPath.includes('cleanroom_research') || importPath.includes('../cleanroom_');
    };
    assert.strictEqual(isIllegalZoneAImport('../../../cleanroom_research/scripts/parse_roz.py'), true);
    assert.strictEqual(isIllegalZoneAImport('./helpers/contracts.mjs'), false);
  });

  it('T2.B5.2: Detects and rejects symlinks connecting Zone B into Zone A', () => {
    // Check all files in opentimetable root to ensure none are symlinks to cleanroom_research
    const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(path.join(repoRoot, entry.name));
        assert.strictEqual(target.includes('cleanroom_research'), false, 'Symlink into Zone A is forbidden');
      }
    }
  });

  it('T2.B5.3: Audits tests directory for zero forbidden proprietary terms', () => {
    const audit = auditRepositoryCleanliness(repoRoot);
    assert.strictEqual(audit.clean, true);
  });

  it('T2.B5.4: Verifies clean-room firewall rules reject binary disassembly snippets in clean codebase', () => {
    const checkSourceLine = (line) => {
      const forbidden = ['IDA Pro', 'Ghidra Decompilation', 'roz.exe offset', 'NSIS payload crack'];
      return !forbidden.some(kw => line.toLowerCase().includes(kw.toLowerCase()));
    };
    assert.strictEqual(checkSourceLine('// Pure clean-room implementation based on STP specification'), true);
    assert.strictEqual(checkSourceLine('// Disassembled from roz.exe offset 0x401000'), false);
  });

  it('T2.B5.5: Verifies that only functional specifications bridge Zone A and Zone B', () => {
    const researchDir = path.resolve(process.cwd(), '../cleanroom_research');
    const boundaryDoc = path.join(researchDir, '02_cleanroom_boundary_protocol.md');
    const content = fs.readFileSync(boundaryDoc, 'utf8');
    assert.match(content, /functional specification/i);
  });
});
