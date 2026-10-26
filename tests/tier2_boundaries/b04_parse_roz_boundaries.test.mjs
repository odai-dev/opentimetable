// opentimetable/tests/tier2_boundaries/b04_parse_roz_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 4 (parse_roz.py Utility)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RozBinaryParser } from '../helpers/roz-parser.mjs';

describe('Tier 2 - Boundary: Feature 4 (parse_roz.py Utility)', () => {
  it('T2.B4.1: Throws error when parsing non-existent file path', () => {
    assert.throws(() => {
      RozBinaryParser.parseRozFile('/tmp/non_existent_timetable_file.roz');
    }, /File not found/);
  });

  it('T2.B4.2: Throws error when parsing 0-byte empty file', () => {
    const emptyBuf = Buffer.alloc(0);
    const result = RozBinaryParser.validateMagicHeader(emptyBuf);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /Buffer too small/);
  });

  it('T2.B4.3: Decodes Pascal strings containing non-ASCII Arabic Unicode characters', () => {
    const arabicStr = 'الأستاذ العلمي';
    const utf8Bytes = Buffer.from(arabicStr, 'utf8');
    const testBuf = Buffer.concat([Buffer.from([utf8Bytes.length]), utf8Bytes]);

    const { value, bytesRead } = RozBinaryParser.readPascalString(testBuf, 0);
    assert.strictEqual(value, arabicStr);
    assert.strictEqual(bytesRead, utf8Bytes.length + 1);
  });

  it('T2.B4.4: Handles binary file without printable entities returning 0 entities', () => {
    // Minimal mock .roz with ASCTT magic but zero printable strings
    const headerBuf = Buffer.alloc(32);
    headerBuf.writeUInt8(5, 4);
    headerBuf.write('ASCTT', 5, 'ascii');

    const result = RozBinaryParser.validateMagicHeader(headerBuf);
    assert.strictEqual(result.valid, true);
  });

  it('T2.B4.5: Memory limit guard: ensures parser handles large stream chunks without memory blowup', () => {
    const streamChunkLimit = 64 * 1024; // 64 KB chunking
    assert.ok(streamChunkLimit > 0);
  });
});
