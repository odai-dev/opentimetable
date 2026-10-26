// opentimetable/tests/tier1_features/f05_cleanroom_boundary.test.mjs
// Tier 1 - Feature 5: Clean-Room Boundary Protocol (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { auditRepositoryCleanliness } from '../helpers/git-validator.mjs';

describe('Tier 1 - Feature 5: Clean-Room Boundary Protocol', () => {
  const repoRoot = path.resolve(process.cwd());
  const parentRoot = path.resolve(process.cwd(), '..');
  const researchDir = path.join(parentRoot, 'cleanroom_research');

  it('T1.F5.1: Verifies formal Clean-Room Boundary Protocol specification exists', () => {
    const protocolPath = path.join(researchDir, '02_cleanroom_boundary_protocol.md');
    assert.ok(fs.existsSync(protocolPath), 'Protocol document must exist in cleanroom_research');
    const content = fs.readFileSync(protocolPath, 'utf8');
    assert.match(content, /Zone A/i, 'Must define Zone A research');
    assert.match(content, /Zone B/i, 'Must define Zone B clean open-source repository');
  });

  it('T1.F5.2: Audits Zone B (opentimetable/) for zero forbidden proprietary terms', () => {
    const audit = auditRepositoryCleanliness(repoRoot);
    assert.strictEqual(audit.clean, true, `Zone B repository must be clean: ${audit.issues.join(', ')}`);
  });

  it('T1.F5.3: Confirms Zone B is the sole Git repository root', () => {
    const gitDirInZoneB = path.join(repoRoot, '.git');
    const gitDirInParent = path.join(parentRoot, '.git');
    assert.ok(fs.existsSync(gitDirInZoneB), 'Zone B must contain .git repository');
    assert.strictEqual(fs.existsSync(gitDirInParent), false, 'Parent directory MUST NOT contain .git');
  });

  it('T1.F5.4: Confirms research documentation is strictly quarantined in Zone A', () => {
    const leakedDocInZoneB = path.join(repoRoot, 'cleanroom_research');
    assert.strictEqual(fs.existsSync(leakedDocInZoneB), false, 'cleanroom_research must not exist in Zone B');
  });

  it('T1.F5.5: Verifies clean-room firewall rules: Zone B uses only functional specifications', () => {
    const protocolPath = path.join(researchDir, '02_cleanroom_boundary_protocol.md');
    const content = fs.readFileSync(protocolPath, 'utf8');
    assert.match(content, /STRICTLY FORBIDDEN|FORBIDDEN/i, 'Boundary protocol must mandate strict negative constraints');
  });
});
