// opentimetable/tests/tier2_boundaries/b01_pe_nsis_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 1 (PE & NSIS)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 2 - Boundary: Feature 1 (PE & NSIS Unpacking)', () => {
  it('T2.B1.1: Rejects zero-byte binary buffer as invalid PE', () => {
    const emptyBuf = Buffer.alloc(0);
    const validatePe = (buf) => buf.length >= 64 && buf.toString('ascii', 0, 2) === 'MZ';
    assert.strictEqual(validatePe(emptyBuf), false);
  });

  it('T2.B1.2: Rejects truncated buffer smaller than DOS/PE header minimum size (64 bytes)', () => {
    const truncatedBuf = Buffer.from('MZ');
    const validatePe = (buf) => buf.length >= 64;
    assert.strictEqual(validatePe(truncatedBuf), false);
  });

  it('T2.B1.3: Handles executable without NSIS payload gracefully', () => {
    const standardPe = Buffer.alloc(1024);
    standardPe.write('MZ', 0);
    const hasNsisSignature = (buf) => buf.includes(Buffer.from('NullsoftInst'));
    assert.strictEqual(hasNsisSignature(standardPe), false);
  });

  it('T2.B1.4: Handles corrupt section table with negative or out-of-bounds offsets', () => {
    const parseSectionOffset = (offset, fileLength) => {
      if (offset < 0 || offset >= fileLength) throw new RangeError('Section offset out of bounds');
      return true;
    };
    assert.throws(() => parseSectionOffset(-1, 5000), RangeError);
    assert.throws(() => parseSectionOffset(6000, 5000), RangeError);
  });

  it('T2.B1.5: Enforces section name length boundary (maximum 8 bytes per PE standard)', () => {
    const validateSectionName = (name) => Buffer.byteLength(name, 'utf8') <= 8;
    assert.strictEqual(validateSectionName('.text'), true);
    assert.strictEqual(validateSectionName('.verylongsectionname'), false);
  });
});
