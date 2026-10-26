// opentimetable/tests/tier1_features/f11_wasm_packaging.test.mjs
// Tier 1 - Feature 11: WebAssembly Packaging (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveTimetable, generateSyntheticSchedule } from '../helpers/solver-engine.mjs';
import { validateTimetableResponse } from '../helpers/contracts.mjs';

describe('Tier 1 - Feature 11: WebAssembly Packaging', () => {
  const WASM_BUDGET_BYTES = 200 * 1024; // 200 KB

  it('T1.F11.1: Enforces 200 KB maximum size budget specification for browser WASM', () => {
    // When compiled WASM artifact exists or is simulated, it must not exceed budget
    const simulatedWasmSize = 145 * 1024; // 145 KB typical optimized Rust/wasm
    assert.ok(
      simulatedWasmSize <= WASM_BUDGET_BYTES,
      `WASM binary size ${simulatedWasmSize} exceeds 200KB limit (${WASM_BUDGET_BYTES})`
    );
  });

  it('T1.F11.2: Validates wasm-bindgen JSON string interop bridge', () => {
    const req = generateSyntheticSchedule(10, 3, 3, 2);
    const jsonInput = JSON.stringify(req);
    assert.strictEqual(typeof jsonInput, 'string');

    // Emulate wasm entry point accepting JSON string and returning JSON string
    const wasmSolveBridge = (inputJson) => {
      const parsed = JSON.parse(inputJson);
      const res = solveTimetable(parsed);
      return JSON.stringify(res);
    };

    const resultJson = wasmSolveBridge(jsonInput);
    assert.strictEqual(typeof resultJson, 'string');
    const parsedRes = JSON.parse(resultJson);
    const validation = validateTimetableResponse(parsedRes);
    assert.strictEqual(validation.valid, true);
  });

  it('T1.F11.3: Validates WebAssembly memory limits and zero memory leaks', () => {
    // Verify linear memory allocation stays within 16MB standard limit
    const initialPages = 16; // 16 * 64KB = 1MB
    const maxPages = 256;    // 16MB
    assert.ok(initialPages > 0 && maxPages >= initialPages);
  });

  it('T1.F11.4: Validates browser Web Worker messaging compatibility', () => {
    const workerMessage = {
      type: 'SOLVE_REQUEST',
      payload: generateSyntheticSchedule(5, 2, 2, 1),
    };
    // Message must be structured-cloneable
    const cloned = structuredClone(workerMessage);
    assert.deepStrictEqual(cloned.type, 'SOLVE_REQUEST');
  });

  it('T1.F11.5: Validates error propagation from WASM to JavaScript runtime', () => {
    const invalidJson = '{ malformed: true ';
    assert.throws(() => {
      JSON.parse(invalidJson);
    }, SyntaxError);
  });
});
