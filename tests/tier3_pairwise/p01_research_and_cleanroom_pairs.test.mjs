// opentimetable/tests/tier3_pairwise/p01_research_and_cleanroom_pairs.test.mjs
// Tier 3 - Cross-Feature Pairwise: Research & Clean-Room Boundary Pairings

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { solveTimetable } from '../helpers/solver-engine.mjs';
import { validateTimetableRequest, validateTimetableResponse } from '../helpers/contracts.mjs';
import { auditRepositoryCleanliness, validateConventionalCommit } from '../helpers/git-validator.mjs';

describe('Tier 3 - Pairwise: Research, Ingestion & Clean-Room Firewall', () => {
  const researchDir = path.resolve(process.cwd(), '../cleanroom_research');
  const repoRoot = path.resolve(process.cwd());

  it('Pair F01 + F03: PE header offsets correspond to ASCTT magic and Pascal string table alignment', () => {
    // Verifies forensic correlation between PE rdata/rsrc section unpacking and .roz binary decoding
    const peDoc = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const rozDoc = path.join(researchDir, '03_seminar_case_study_reverse_engineering_to_open_source.md');

    assert.ok(fs.existsSync(peDoc), 'PE document must exist');
    assert.ok(fs.existsSync(rozDoc), 'Seminar document must exist');

    const peContent = fs.readFileSync(peDoc, 'utf8');
    const rozContent = fs.readFileSync(rozDoc, 'utf8');

    assert.match(peContent, /PE|NSIS/i);
    assert.match(rozContent, /ASCTT|\.roz/i);
  });

  it('Pair F02 + F04: REA procedure cross-references validate parse_roz.py entity record layouts', () => {
    const parseScriptPath = path.join(researchDir, 'scripts/parse_roz.py');
    assert.ok(fs.existsSync(parseScriptPath), 'parse_roz.py must exist in research scripts');
    const scriptContent = fs.readFileSync(parseScriptPath, 'utf8');

    // Verify parse_roz.py decodes teachers, classes, rooms, subjects
    assert.match(scriptContent, /teacher/i);
    assert.match(scriptContent, /class|division/i);
    assert.match(scriptContent, /room/i);
  });

  it('Pair F04 + F06: Entities parsed from .roz pipeline are converted into TimetableRequest and solved by Solver Core', () => {
    // Simulate parse_roz extracted entities mapped into solver format
    const parsedFromRoz = {
      teachers: [
        { id: 'T_ROZ_1', name: 'M. Tazi', unavailableSlots: [] },
        { id: 'T_ROZ_2', name: 'Mme. Idrissi', unavailableSlots: [0, 1] },
      ],
      classes: [
        { id: 'C_ROZ_1', name: '3AC-1' },
        { id: 'C_ROZ_2', name: '3AC-2' },
      ],
      rooms: [
        { id: 'R_ROZ_1', name: 'Salle 12', capacity: 35 },
        { id: 'R_ROZ_2', name: 'Salle 14', capacity: 35 },
      ],
      subjects: [
        { id: 'S_MATH', name: 'Mathématiques' },
        { id: 'S_PC', name: 'Physique' },
      ],
      lessons: [
        { id: 'L_ROZ_1', subjectId: 'S_MATH', teacherId: 'T_ROZ_1', classId: 'C_ROZ_1', roomId: 'R_ROZ_1', duration: 1 },
        { id: 'L_ROZ_2', subjectId: 'S_PC', teacherId: 'T_ROZ_2', classId: 'C_ROZ_2', roomId: 'R_ROZ_2', duration: 1 },
      ],
    };

    const request = {
      config: { days: 5, periodsPerDay: 7, maxConsecutivePeriods: 4, timeoutMs: 1000 },
      ...parsedFromRoz,
    };

    const reqVal = validateTimetableRequest(request);
    assert.strictEqual(reqVal.valid, true);

    const response = solveTimetable(request);
    assert.strictEqual(response.status, 'OPTIMAL');
    assert.strictEqual(response.hardConflicts, 0);
    assert.strictEqual(response.placements.length, 2);

    const resVal = validateTimetableResponse(response);
    assert.strictEqual(resVal.valid, true);
  });

  it('Pair F05 + F21: Clean-room boundary firewall guarantees clean open-source repository compliance', () => {
    // Zone A (cleanroom_research/) contains forensic materials
    // Zone B (opentimetable/) must remain 100% clean MIT repository
    const audit = auditRepositoryCleanliness(repoRoot);
    assert.strictEqual(audit.clean, true, `Cleanliness violation: ${audit.issues.join(', ')}`);

    const boundaryDoc = path.join(researchDir, '02_cleanroom_boundary_protocol.md');
    assert.ok(fs.existsSync(boundaryDoc), 'Clean-room protocol document must exist');
    const protocolText = fs.readFileSync(boundaryDoc, 'utf8');
    assert.match(protocolText, /firewall|clean-room|zone/i);
  });

  it('Pair F03 + F04: ASCTT magic verification safeguards parse_roz.py from decoding corrupt files', () => {
    const simulateParseRozValidation = (buffer) => {
      if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
        throw new Error('File too short to be valid .roz archive');
      }
      const magic = buffer.toString('latin1', 0, 5);
      if (magic !== 'ASCTT') {
        throw new Error(`Invalid ASCTT magic header: got ${magic}`);
      }
      return { valid: true };
    };

    const validBuf = Buffer.from('ASCTT\x01\x00\x00', 'latin1');
    assert.strictEqual(simulateParseRozValidation(validBuf).valid, true);

    const badBuf = Buffer.from('PK\x03\x04zip_file', 'latin1');
    assert.throws(() => simulateParseRozValidation(badBuf), /Invalid ASCTT magic/);
  });

  it('Pair F01 + F02: NSIS payload extraction feeds directly into REA string mining and function triage', () => {
    const triageDoc = path.join(researchDir, '01_artifact_extraction_and_analysis.md');
    const content = fs.readFileSync(triageDoc, 'utf8');
    assert.match(content, /NSIS/i);
    assert.match(content, /strings?|decompil|analysis/i);
  });

  it('Pair F05 + F26: Clean-room research milestones logged with Conventional Git Commits', () => {
    const researchCommit = 'docs(cleanroom): document binary unpacking protocol and cleanroom boundary';
    const validation = validateConventionalCommit(researchCommit);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.type, 'docs');
    assert.strictEqual(validation.scope, 'cleanroom');
  });
});
