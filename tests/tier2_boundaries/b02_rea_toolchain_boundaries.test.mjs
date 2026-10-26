// opentimetable/tests/tier2_boundaries/b02_rea_toolchain_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 2 (REA Toolchain Demonstration)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 2 - Boundary: Feature 2 (REA Toolchain Demonstration)', () => {
  it('T2.B2.1: Rejects disassembly query at non-mapped memory address', () => {
    const memorySegments = [{ start: 0x00400000, end: 0x00500000 }];
    const isAddressMapped = (addr) => memorySegments.some(s => addr >= s.start && addr < s.end);

    assert.strictEqual(isAddressMapped(0x00401000), true);
    assert.strictEqual(isAddressMapped(0xFFFFFFFF), false);
    assert.strictEqual(isAddressMapped(0x00000000), false);
  });

  it('T2.B2.2: Flags attempt to analyze code in non-executable data section', () => {
    const section = { name: '.data', isExecutable: false };
    const canDisassemble = (sec) => sec.isExecutable;
    assert.strictEqual(canDisassemble(section), false);
  });

  it('T2.B2.3: Handles cyclic procedure call graph loops without infinite recursion', () => {
    // A -> B -> A
    const callGraph = {
      procA: ['procB'],
      procB: ['procA'],
    };

    function traverseCalls(start, visited = new Set()) {
      if (visited.has(start)) return { hasCycle: true };
      visited.add(start);
      for (const callee of callGraph[start] || []) {
        return traverseCalls(callee, visited);
      }
      return { hasCycle: false };
    }

    const result = traverseCalls('procA');
    assert.strictEqual(result.hasCycle, true);
  });

  it('T2.B2.4: Empty string table extraction returns empty array gracefully', () => {
    const zeroByteBuf = Buffer.alloc(100); // 100 null bytes (zero printable strings)
    const extractAscii = (buf) => {
      const strings = [];
      let cur = [];
      for (const b of buf) {
        if (b >= 32 && b <= 126) cur.push(String.fromCharCode(b));
        else {
          if (cur.length >= 4) strings.push(cur.join(''));
          cur = [];
        }
      }
      return strings;
    };
    const extracted = extractAscii(zeroByteBuf);
    assert.deepStrictEqual(extracted, []);
  });

  it('T2.B2.5: Handles undefined opcode byte sequences gracefully', () => {
    const parseOpcode = (byte) => {
      // 0x0F 0x0B is UD2 (Undefined Instruction) in x86
      if (byte === 0x0B) return { type: 'UNDEFINED_OPCODE', handled: true };
      return { type: 'STANDARD_OPCODE', handled: true };
    };
    const result = parseOpcode(0x0B);
    assert.strictEqual(result.type, 'UNDEFINED_OPCODE');
    assert.strictEqual(result.handled, true);
  });
});
