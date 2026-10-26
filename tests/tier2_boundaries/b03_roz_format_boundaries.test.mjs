// opentimetable/tests/tier2_boundaries/b03_roz_format_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 3 (.roz Binary Format Decoding)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RozBinaryParser } from '../helpers/roz-parser.mjs';

describe('Tier 2 - Boundary: Feature 3 (.roz Binary Format Decoding)', () => {
  it('T2.B3.1: Rejects corrupted magic header string', () => {
    const corruptBuf = Buffer.alloc(32);
    corruptBuf.writeUInt8(5, 4);
    corruptBuf.write('CORRP', 5, 'ascii');

    const result = RozBinaryParser.validateMagicHeader(corruptBuf);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /Invalid magic string/);
  });

  it('T2.B3.2: Rejects magic header with incorrect length byte', () => {
    const corruptBuf = Buffer.alloc(32);
    corruptBuf.writeUInt8(4, 4); // Expected 5
    corruptBuf.write('ASCT', 5, 'ascii');

    const result = RozBinaryParser.validateMagicHeader(corruptBuf);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /Invalid magic length/);
  });

  it('T2.B3.3: Handles zero-length Pascal string cleanly', () => {
    const emptyPascal = Buffer.from([0x00]); // Length 0
    const { value, bytesRead } = RozBinaryParser.readPascalString(emptyPascal, 0);
    assert.strictEqual(value, '');
    assert.strictEqual(bytesRead, 1);
  });

  it('T2.B3.4: Prevents buffer overrun when Pascal string length byte exceeds buffer boundary', () => {
    const overrunBuf = Buffer.from([0xFF, 0x41, 0x42]); // Length 255 but only 2 data bytes
    assert.throws(() => {
      RozBinaryParser.readPascalString(overrunBuf, 0);
    }, /extends beyond buffer bounds/);
  });

  it('T2.B3.5: Handles bitmask with all 64 bits set (0xFFFFFFFFFFFFFFFFn)', () => {
    const fullMask = 0xFFFFFFFFFFFFFFFFn;
    const isSlotSet = (mask, slot) => ((mask & (1n << BigInt(slot))) !== 0n);
    assert.strictEqual(isSlotSet(fullMask, 0), true);
    assert.strictEqual(isSlotSet(fullMask, 34), true);
    assert.strictEqual(isSlotSet(fullMask, 63), true);
  });
});
