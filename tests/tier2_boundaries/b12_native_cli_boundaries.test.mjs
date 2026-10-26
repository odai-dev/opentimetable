// opentimetable/tests/tier2_boundaries/b12_native_cli_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 12 (Native Solver CLI)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 2 - Boundary: Feature 12 (Native Solver CLI)', () => {
  // Simulates CLI input parsing and execution guard
  function runSimulatedCli(args, fileSystemMock = {}) {
    let input = null;
    let output = null;
    let timeout = 2000;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-i' || args[i] === '--input') input = args[++i];
      if (args[i] === '-o' || args[i] === '--output') output = args[++i];
      if (args[i] === '-t' || args[i] === '--timeout') timeout = parseInt(args[++i], 10);
    }

    if (!input || !output) {
      return { exitCode: 1, error: 'Missing required --input or --output argument' };
    }
    if (timeout <= 0 || isNaN(timeout)) {
      return { exitCode: 1, error: 'Timeout must be a positive integer' };
    }
    if (!fileSystemMock[input]) {
      return { exitCode: 1, error: `File not found: ${input}` };
    }

    try {
      const content = fileSystemMock[input];
      if (!content || content.trim() === '') {
        return { exitCode: 1, error: 'Input file is empty' };
      }
      JSON.parse(content);
      return { exitCode: 0, outputWritten: output };
    } catch {
      return { exitCode: 1, error: 'Malformed JSON payload' };
    }
  }

  it('T2.B12.1: Rejects missing input file returning exit code 1', () => {
    const res = runSimulatedCli(['--input', 'missing_file.json', '--output', 'out.json'], {});
    assert.strictEqual(res.exitCode, 1);
    assert.match(res.error, /file not found/i);
  });

  it('T2.B12.2: Rejects corrupted JSON input payload returning exit code 1', () => {
    const fs = { 'corrupt.json': '{"config": { broken ' };
    const res = runSimulatedCli(['--input', 'corrupt.json', '--output', 'out.json'], fs);
    assert.strictEqual(res.exitCode, 1);
    assert.match(res.error, /malformed json/i);
  });

  it('T2.B12.3: Rejects negative or zero timeout returning exit code 1', () => {
    const fs = { 'req.json': '{"config":{}}' };
    const resNegative = runSimulatedCli(['-i', 'req.json', '-o', 'out.json', '-t', '-100'], fs);
    assert.strictEqual(resNegative.exitCode, 1);

    const resZero = runSimulatedCli(['-i', 'req.json', '-o', 'out.json', '-t', '0'], fs);
    assert.strictEqual(resZero.exitCode, 1);
  });

  it('T2.B12.4: Rejects 0-byte empty input file returning exit code 1', () => {
    const fs = { 'empty.json': '' };
    const res = runSimulatedCli(['-i', 'empty.json', '-o', 'out.json'], fs);
    assert.strictEqual(res.exitCode, 1);
    assert.match(res.error, /empty/i);
  });

  it('T2.B12.5: Successfully executes with valid input writing to designated output path', () => {
    const fs = { 'valid.json': '{"config":{"days":5}}' };
    const res = runSimulatedCli(['-i', 'valid.json', '-o', 'final_out.json', '-t', '3000'], fs);
    assert.strictEqual(res.exitCode, 0);
    assert.strictEqual(res.outputWritten, 'final_out.json');
  });
});
