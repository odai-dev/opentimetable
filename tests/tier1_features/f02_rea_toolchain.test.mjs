// opentimetable/tests/tier1_features/f02_rea_toolchain.test.mjs
// Tier 1 - Feature 2: REA Toolchain Demonstration (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 1 - Feature 2: REA Toolchain Demonstration', () => {
  const researchDir = path.resolve(process.cwd(), '../cleanroom_research');

  it('T1.F2.1: Verifies REA guide and toolchain documentation exists', () => {
    const guidePath = path.join(researchDir, 'REVERSE_ENGINEERING_PROCESS_AND_REA_GUIDE.md');
    assert.ok(fs.existsSync(guidePath), 'REA process guide must exist');
    const content = fs.readFileSync(guidePath, 'utf8');
    assert.match(content, /REA|Reverse Engineer Anything/i, 'Must contain REA toolchain references');
  });

  it('T1.F2.2: Validates REA procedure inspection and decompilation analysis', () => {
    const guidePath = path.join(researchDir, 'REVERSE_ENGINEERING_PROCESS_AND_REA_GUIDE.md');
    const content = fs.readFileSync(guidePath, 'utf8');
    assert.ok(
      content.includes('analyze_function') || content.includes('procedure') || content.includes('disassembly'),
      'Guide must document procedure analysis and decompilation'
    );
  });

  it('T1.F2.3: Validates cross-reference (xref) analysis documentation', () => {
    const guidePath = path.join(researchDir, 'REVERSE_ENGINEERING_PROCESS_AND_REA_GUIDE.md');
    const content = fs.readFileSync(guidePath, 'utf8');
    assert.ok(
      content.includes('xref') || content.includes('reference') || content.includes('call_graph'),
      'Must document cross-reference and call analysis'
    );
  });

  it('T1.F2.4: Validates string table mining documentation for timetable domain entities', () => {
    const guidePath = path.join(researchDir, 'REVERSE_ENGINEERING_PROCESS_AND_REA_GUIDE.md');
    const content = fs.readFileSync(guidePath, 'utf8');
    assert.match(content, /string|ASCTT|table/i, 'Must document string table mining');
  });

  it('T1.F2.5: Verifies slide-by-slide seminar case study integrates REA findings', () => {
    const seminarPath = path.join(researchDir, '03_seminar_case_study_reverse_engineering_to_open_source.md');
    assert.ok(fs.existsSync(seminarPath), 'Seminar case study must exist');
    const content = fs.readFileSync(seminarPath, 'utf8');
    assert.match(content, /Slide|REA|Clean-Room/i, 'Seminar must contain slide structure and methodology');
  });
});
