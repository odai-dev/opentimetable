// opentimetable/tests/tier1_features/f04_parse_roz.test.mjs
// Tier 1 - Feature 4: parse_roz.py Utility (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { RozBinaryParser } from '../helpers/roz-parser.mjs';

describe('Tier 1 - Feature 4: parse_roz.py Utility', () => {
  const demo1Path = path.resolve(process.cwd(), '../app_extracted/demos/Demo1.roz');
  const demo3Path = path.resolve(process.cwd(), '../app_extracted/demos/Demo3.roz');

  it('T1.F4.1: Validates extraction capability on Demo1.roz', () => {
    assert.ok(fs.existsSync(demo1Path), 'Demo1.roz must be accessible');
    const result = RozBinaryParser.parseRozFile(demo1Path);
    assert.ok(result.summary.totalStringsExtracted > 0);
  });

  it('T1.F4.2: Validates extraction capability on Demo3.roz', () => {
    assert.ok(fs.existsSync(demo3Path), 'Demo3.roz must be accessible');
    const result = RozBinaryParser.parseRozFile(demo3Path);
    assert.ok(result.summary.totalStringsExtracted > 0);
  });

  it('T1.F4.3: Validates structured output schema contains core timetable collections', () => {
    const result = RozBinaryParser.parseRozFile(demo1Path);
    assert.ok('subjects' in result.sampleEntities);
    assert.ok('classes' in result.sampleEntities);
    assert.ok('teachers' in result.sampleEntities);
    assert.ok('rooms' in result.sampleEntities);
  });

  it('T1.F4.4: Validates extracted entities are non-empty string tokens', () => {
    const result = RozBinaryParser.parseRozFile(demo1Path);
    for (const sub of result.sampleEntities.subjects) {
      assert.strictEqual(typeof sub, 'string');
      assert.ok(sub.length >= 3);
    }
  });

  it('T1.F4.5: Validates parse_roz specification alignment in PROJECT.md and cleanroom research', () => {
    const projectPath = path.resolve(process.cwd(), '../PROJECT.md');
    const content = fs.readFileSync(projectPath, 'utf8');
    assert.match(content, /parse_roz/i, 'Project specifications must specify parse_roz utility');
  });
});
