// opentimetable/tests/test_roz_parser.mjs
// Automated Verification Suite for Client-Side TypeScript .roz Binary Parser

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js');
const {
  parseRozBinary,
  decodeBytes,
  exportToJson,
} = jiti(import.meta.url)('../apps/web/src/lib/roz-parser.ts');
const {
  isArabicText,
  mapRozToFrontend,
} = jiti(import.meta.url)('../apps/web/src/lib/domain.ts');

// Resolve sample files robustly whether running from repository root or tests/ directory
function resolveSamplePath(relPath) {
  const fromCwd = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromParent = path.resolve(process.cwd(), '..', relPath);
  if (fs.existsSync(fromParent)) return fromParent;
  const fromMeta = fileURLToPath(new URL(`../../${relPath}`, import.meta.url));
  if (fs.existsSync(fromMeta)) return fromMeta;
  throw new Error(`Sample file not found: ${relPath}`);
}

const demo1Path = resolveSamplePath('app_extracted/demos/Demo1.roz');
const saudi1Path = resolveSamplePath('app_extracted/demos/Arab/Saudi arabia 1.roz');

describe('.roz Binary Parser — Demo1.roz Modern Schema Verification', () => {
  it('loads Demo1.roz and identifies modern ASCTT magic and schema version', () => {
    assert.ok(fs.existsSync(demo1Path), 'Demo1.roz must exist');
    const buffer = fs.readFileSync(demo1Path);
    const result = parseRozBinary(buffer, 'Demo1.roz');

    assert.ok(result.schema_version >= 248, `Expected modern schema >= 248, got ${result.schema_version}`);
    assert.strictEqual(result.has_asctt_magic, true, 'Demo1.roz must have ASCTT magic header');
    assert.strictEqual(result.school_name, 'Hronská', 'Expected school name Hronská');
    assert.strictEqual(result.cycle_days, 7, 'Expected 7-day cycle for Demo1');
    assert.strictEqual(result.periods_per_day, 7, 'Expected 7 periods per day');
    assert.strictEqual(result.periods.length, 7, 'Expected 7 period definitions');
  });

  it('extracts exactly 45 teachers, 27 classes, 24 subjects, 35 rooms, and 216 cards from Demo1.roz', () => {
    const buffer = fs.readFileSync(demo1Path);
    const result = parseRozBinary(buffer, 'Demo1.roz');

    assert.strictEqual(result.counts.teachers, 45, 'Demo1 must have 45 teachers');
    assert.strictEqual(result.counts.classes, 27, 'Demo1 must have 27 classes');
    assert.strictEqual(result.counts.subjects, 24, 'Demo1 must have 24 subjects');
    assert.strictEqual(result.counts.rooms, 35, 'Demo1 must have 35 rooms');
    assert.strictEqual(result.counts.lessons, 216, 'Demo1 must have 216 lesson cards');

    // Also assert arrays match count lengths
    assert.strictEqual(result.teachers.length, 45);
    assert.strictEqual(result.classes.length, 27);
    assert.strictEqual(result.subjects.length, 24);
    assert.strictEqual(result.rooms.length, 35);
    assert.strictEqual(result.lessons.length, 216);
  });

  it('correctly maps Demo1.roz entities into frontend React models and initial placements', () => {
    const buffer = fs.readFileSync(demo1Path);
    const result = parseRozBinary(buffer, 'Demo1.roz');
    const { mapped } = result;

    assert.ok(mapped, 'Mapped frontend dataset must be present');
    assert.strictEqual(mapped.teachers.length, 45);
    assert.strictEqual(mapped.classes.length, 27);
    assert.strictEqual(mapped.subjects.length, 24);
    assert.strictEqual(mapped.rooms.length, 35);
    assert.strictEqual(mapped.lessons.length, 216);
    assert.strictEqual(mapped.placements.length, 216);

    // Verify entity structure fidelity
    const firstTeacher = mapped.teachers[0];
    assert.strictEqual(firstTeacher.name, 'Kayleigh Brown');
    assert.strictEqual(firstTeacher.speciality, 'Ka');
    assert.ok(firstTeacher.color.startsWith('#'), 'Teacher must have color assignment');

    const firstClass = mapped.classes[0];
    assert.strictEqual(firstClass.name, '5.A');
    assert.strictEqual(firstClass.grade, 5);

    const firstSubject = mapped.subjects[0];
    assert.strictEqual(firstSubject.name, 'Spanish language');
    assert.strictEqual(firstSubject.code, 'Sp');

    const firstPlacement = mapped.placements[0];
    assert.strictEqual(firstPlacement.lessonId, '1');
    assert.ok(firstPlacement.dayIndex >= 0 && firstPlacement.dayIndex < 5);
    assert.ok(firstPlacement.periodIndex >= 0 && firstPlacement.periodIndex < 7);
  });
});

describe('.roz Binary Parser — Saudi Arabia 1.roz Legacy Schema & Arabic Encoding', () => {
  it('loads Saudi arabia 1.roz and identifies legacy schema without ASCTT magic', () => {
    assert.ok(fs.existsSync(saudi1Path), 'Saudi arabia 1.roz must exist');
    const buffer = fs.readFileSync(saudi1Path);
    const result = parseRozBinary(buffer, 'Saudi arabia 1.roz');

    assert.ok(result.schema_version < 248, `Expected legacy schema < 248, got ${result.schema_version}`);
    assert.strictEqual(result.school_name, '2006/2007');
    assert.strictEqual(result.cycle_days, 5);
    assert.strictEqual(result.periods_per_day, 7);
  });

  it('extracts exactly 82 teachers, 33 classes, 37 subjects, 222 rooms, and 250 cards from Saudi arabia 1.roz', () => {
    const buffer = fs.readFileSync(saudi1Path);
    const result = parseRozBinary(buffer, 'Saudi arabia 1.roz');

    assert.strictEqual(result.counts.teachers, 82, 'Saudi arabia 1 must have 82 teachers');
    assert.strictEqual(result.counts.classes, 33, 'Saudi arabia 1 must have 33 classes');
    assert.strictEqual(result.counts.subjects, 37, 'Saudi arabia 1 must have 37 subjects');
    assert.strictEqual(result.counts.rooms, 222, 'Saudi arabia 1 must have 222 rooms');
    assert.strictEqual(result.counts.lessons, 250, 'Saudi arabia 1 must have 250 lesson cards');

    assert.strictEqual(result.teachers.length, 82);
    assert.strictEqual(result.classes.length, 33);
    assert.strictEqual(result.subjects.length, 37);
    assert.strictEqual(result.rooms.length, 222);
    assert.strictEqual(result.lessons.length, 250);
  });

  it('decodes Windows-1256 Arabic strings with zero character corruption or replacement bytes', () => {
    const buffer = fs.readFileSync(saudi1Path);
    const result = parseRozBinary(buffer, 'Saudi arabia 1.roz');

    // 1. Check known Arabic class names
    const classNames = result.classes.map(c => c.name);
    assert.ok(classNames.includes('تمهيدي'), "Classes must contain 'تمهيدي'");
    assert.ok(classNames.includes('1أ'), "Classes must contain '1أ'");
    assert.ok(classNames.includes('1ب'), "Classes must contain '1ب'");
    assert.ok(classNames.includes('1ج'), "Classes must contain '1ج'");
    assert.ok(classNames.includes('1د'), "Classes must contain '1د'");

    // 2. Check known Arabic subject names
    const subjectNames = result.subjects.map(s => s.name);
    assert.ok(subjectNames.includes('رياضيات1'), "Subjects must contain 'رياضيات1'");
    assert.ok(subjectNames.includes('رياضيات2'), "Subjects must contain 'رياضيات2'");
    assert.ok(subjectNames.includes('رياضيات انجليزي'), "Subjects must contain 'رياضيات انجليزي'");
    assert.ok(subjectNames.includes('علوم1'), "Subjects must contain 'علوم1'");
    assert.ok(subjectNames.includes('علوم2'), "Subjects must contain 'علوم2'");

    // 3. Verify zero replacement characters across all string entities
    const allStrings = [
      ...result.classes.flatMap(c => [c.name, c.short]),
      ...result.subjects.flatMap(s => [s.name, s.short]),
      ...result.teachers.flatMap(t => [t.name, t.short]),
      ...result.rooms.flatMap(r => [r.name, r.short]),
    ];

    for (const str of allStrings) {
      assert.ok(!str.includes('\uFFFD'), `String must not contain unicode replacement char: ${str}`);
      assert.ok(!str.includes('???'), `String must not contain corrupt ???: ${str}`);
    }

    // 4. Verify Arabic script detection
    assert.strictEqual(isArabicText('رياضيات1'), true);
    assert.strictEqual(isArabicText('تمهيدي'), true);
    assert.strictEqual(isArabicText('Mathematics'), false);

    // 5. Verify mapped objects preserve Arabic names in nameAr
    const mappedArabicClass = result.mapped.classes.find(c => c.name === 'تمهيدي');
    assert.ok(mappedArabicClass);
    assert.strictEqual(mappedArabicClass.nameAr, 'تمهيدي');
  });
});

describe('.roz Binary Parser — Input Types, Boundaries & JSON Serialization', () => {
  it('supports Node Buffer, Uint8Array, and ArrayBuffer seamlessly', () => {
    const rawBuffer = fs.readFileSync(demo1Path);

    // 1. Node Buffer
    const res1 = parseRozBinary(rawBuffer, 'Demo1.roz');
    assert.strictEqual(res1.counts.teachers, 45);

    // 2. Uint8Array
    const uint8 = new Uint8Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
    const res2 = parseRozBinary(uint8, 'Demo1.roz');
    assert.strictEqual(res2.counts.teachers, 45);

    // 3. ArrayBuffer
    const arrayBuf = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    const res3 = parseRozBinary(arrayBuf, 'Demo1.roz');
    assert.strictEqual(res3.counts.teachers, 45);
  });

  it('rejects truncated inputs under 32 bytes with informative error', () => {
    const tiny = new Uint8Array([0x01, 0x02, 0x03]);
    assert.throws(
      () => parseRozBinary(tiny),
      /File too small/i,
      'Should throw File too small for inputs under 32 bytes'
    );
  });

  it('serializes parsed dataset to clean JSON format via exportToJson', () => {
    const buffer = fs.readFileSync(demo1Path);
    const result = parseRozBinary(buffer, 'Demo1.roz');
    const jsonStr = exportToJson(result, true);

    assert.strictEqual(typeof jsonStr, 'string');
    const parsedJson = JSON.parse(jsonStr);
    assert.strictEqual(parsedJson.school_name, 'Hronská');
    assert.strictEqual(parsedJson.counts.teachers, 45);
    assert.strictEqual(parsedJson.counts.lessons, 216);
  });
});
