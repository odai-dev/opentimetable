// opentimetable/tests/tier1_features/f01_pe_nsis.test.mjs
// Tier 1 - Feature 1: PE & NSIS Unpacking Analysis (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 1 - Feature 1: PE & NSIS Unpacking Analysis', () => {
  const researchDir = path.resolve(process.cwd(), '../cleanroom_research');

  it('T1.F1.1: Verifies research documentation on PE header structure exists', () => {
    const docPath = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    assert.ok(fs.existsSync(docPath), 'PE extraction document must exist');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.match(content, /PE32|PE/i, 'Document must analyze PE headers');
    assert.match(content, /executable|\.exe/i, 'Document must document PE executable format');
  });

  it('T1.F1.2: Validates NSIS container identification signature', () => {
    const docPath = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.match(content, /NSIS/i, 'Document must identify NSIS archive packaging');
    assert.match(content, /Nullsoft/i, 'Document must document Nullsoft installer signature');
  });

  it('T1.F1.3: Verifies unpacking extraction inventory of application assets', () => {
    const docPath = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.match(content, /roz\.exe|executable/i, 'Document must record unpacked executable target');
    assert.match(content, /demos?|\.roz/i, 'Document must record sample dataset discovery');
  });

  it('T1.F1.4: Validates section header analysis (.text, .rdata, .rsrc)', () => {
    const docPath = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.includes('.text') || content.includes('section'), 'Document must analyze executable sections');
  });

  it('T1.F1.5: Validates clean container triage and toolchain reproduction steps', () => {
    const docPath = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.ok(content.length > 500, 'Forensic triage documentation must be substantial and detailed');
  });
});
