// opentimetable/tests/tier1_features/f03_roz_format.test.mjs
// Tier 1 - Feature 3: .roz Binary Format Decoding (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { RozBinaryParser } from '../helpers/roz-parser.mjs';

describe('Tier 1 - Feature 3: .roz Binary Format Decoding', () => {
  const demoPath = path.resolve(process.cwd(), '../app_extracted/demos/Demo1.roz');

  it('T1.F3.1: Validates ASCTT magic signature at offset 4', () => {
    assert.ok(fs.existsSync(demoPath), 'Sample Demo1.roz must exist in app_extracted');
    const buffer = fs.readFileSync(demoPath);
    const result = RozBinaryParser.validateMagicHeader(buffer);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.magic, 'ASCTT');
  });

  it('T1.F3.2: Decodes Pascal-style length-prefixed strings accurately', () => {
    // Construct test buffer with a 9-byte Pascal string: \x09"Timetable"
    const str = 'Timetable';
    const testBuf = Buffer.concat([Buffer.from([str.length]), Buffer.from(str, 'utf8')]);
    const { value, bytesRead } = RozBinaryParser.readPascalString(testBuf, 0);
    assert.strictEqual(value, 'Timetable');
    assert.strictEqual(bytesRead, 10);
  });

  it('T1.F3.3: Parses complete sample .roz file and extracts binary metadata', () => {
    const parsed = RozBinaryParser.parseRozFile(demoPath);
    assert.strictEqual(parsed.magic, 'ASCTT');
    assert.ok(parsed.fileSizeBytes > 1000, 'Demo file size should be substantial');
    assert.ok(parsed.summary.totalStringsExtracted > 20, 'Should extract strings from binary');
  });

  it('T1.F3.4: Extracts domain subjects and teachers from .roz demo', () => {
    const parsed = RozBinaryParser.parseRozFile(demoPath);
    assert.ok(parsed.summary.subjectsCount > 0, 'Must detect subject strings');
    assert.ok(parsed.summary.teachersCount > 0 || parsed.summary.classesCount > 0, 'Must detect teachers/classes');
  });

  it('T1.F3.5: Verifies bitmask slot encoding specification documentation', () => {
    const researchDir = path.resolve(process.cwd(), '../cleanroom_research');
    const docPath = path.join(researchDir, 'REVERSE_ENGINEERING_PROCESS_AND_REA_GUIDE.md');
    assert.ok(fs.existsSync(docPath), 'Research guide doc must exist');
    const content = fs.readFileSync(docPath, 'utf8');
    assert.match(content, /bitmask|slot|availability/i, 'Must document bitmask availability representation');
  });
});
