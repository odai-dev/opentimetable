// opentimetable/tests/test_roz_roundtrip_persistence.mjs
// Milestone 2 Adversarial Round-Trip Persistence & Lossless Serialization Verification Harness

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const {
  parseRozBinary,
  exportToJson,
} = jiti('../apps/web/src/lib/roz-parser.ts');

const {
  serializeRozBinary,
} = jiti('../apps/web/src/lib/roz-serializer.ts');

const {
  mapRozToFrontend,
  isArabicText,
} = jiti('../apps/web/src/lib/domain.ts');

function resolveSample(rel) {
  const p1 = path.resolve(process.cwd(), rel);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), '..', rel);
  if (fs.existsSync(p2)) return p2;
  const p3 = fileURLToPath(new URL(`../../${rel}`, import.meta.url));
  if (fs.existsSync(p3)) return p3;
  throw new Error(`File not found: ${rel}`);
}

const demo1Path = resolveSample('app_extracted/demos/Demo1.roz');
const saudi1Path = resolveSample('app_extracted/demos/Arab/Saudi arabia 1.roz');

// ============================================================================
// Suite 1: Anti-Cheating & Zero-Bypass Binary Verification
// ============================================================================
describe('Suite 1: Anti-Cheating & Zero-Bypass Binary Verification', () => {
  it('verifies Demo1.roz serializes to pure binary with ZERO JSON bypass or TOC chunk', () => {
    const originalBuf = fs.readFileSync(demo1Path);
    const parsed1 = parseRozBinary(originalBuf, 'Demo1.roz');

    const serializedBuf = serializeRozBinary({
      schoolName: parsed1.school_name,
      cycleDays: parsed1.cycle_days,
      periodsPerDay: parsed1.periods_per_day,
      teachers: parsed1.teachers,
      classes: parsed1.classes,
      rooms: parsed1.rooms,
      subjects: parsed1.subjects,
      lessons: parsed1.lessons,
      placements: parsed1.mapped.placements,
      schemaVersion: parsed1.schema_version,
    }, {
      schemaVersion: parsed1.schema_version,
    });

    const buf = Buffer.from(serializedBuf);

    // ANTI-CHEATING ASSERTIONS: No JSON chunk or TOC bypass allowed
    assert.strictEqual(buf.indexOf('ASCTT_CHUNK_TOC'), -1, 'Must NOT contain ASCTT_CHUNK_TOC backdoor');
    assert.strictEqual(buf.indexOf('{"schemaVersion"'), -1, 'Must NOT contain embedded JSON schemaVersion');
    assert.strictEqual(buf.indexOf('"teachers":['), -1, 'Must NOT contain embedded JSON teachers array');
    assert.strictEqual(buf.indexOf('"placements":['), -1, 'Must NOT contain embedded JSON placements array');

    // Container header integrity
    const view = new DataView(serializedBuf.buffer, serializedBuf.byteOffset, serializedBuf.byteLength);
    assert.strictEqual(view.getUint32(0, true), parsed1.schema_version, 'Schema version must match at 0x00');
    assert.strictEqual(view.getUint8(4), 0x05, 'Length prefix 0x05 expected');
    assert.strictEqual(buf.subarray(5, 10).toString('ascii'), 'ASCTT', "Magic 'ASCTT' expected");

    // Re-parse pure binary container
    const parsed2 = parseRozBinary(serializedBuf, 'Demo1_pure_binary.roz');
    assert.strictEqual(parsed2.counts.teachers, 45, 'Teachers must match 45');
    assert.strictEqual(parsed2.counts.classes, 27, 'Classes must match 27');
    assert.strictEqual(parsed2.counts.subjects, 24, 'Subjects must match 24');
    assert.strictEqual(parsed2.counts.rooms, 35, 'Rooms must match 35');
    assert.strictEqual(parsed2.counts.lessons, parsed1.counts.lessons, 'Lessons must match authentic binary count');
  });

  it('verifies Saudi Arabia 1 serializes with genuine CP1256 binary encoding and ZERO bypass', () => {
    const originalBuf = fs.readFileSync(saudi1Path);
    const parsed1 = parseRozBinary(originalBuf, 'Saudi arabia 1.roz');

    const serializedBuf = serializeRozBinary({
      schoolName: parsed1.school_name,
      cycleDays: parsed1.cycle_days,
      periodsPerDay: parsed1.periods_per_day,
      teachers: parsed1.teachers,
      classes: parsed1.classes,
      rooms: parsed1.rooms,
      subjects: parsed1.subjects,
      lessons: parsed1.lessons,
      placements: parsed1.mapped.placements,
      schemaVersion: parsed1.schema_version,
    }, {
      schemaVersion: parsed1.schema_version,
      targetEncoding: 'win1256',
    });

    const buf = Buffer.from(serializedBuf);
    assert.strictEqual(buf.indexOf('ASCTT_CHUNK_TOC'), -1, 'Must NOT contain ASCTT_CHUNK_TOC backdoor');
    assert.strictEqual(buf.indexOf('{"schemaVersion"'), -1, 'Must NOT contain embedded JSON');

    const parsed2 = parseRozBinary(serializedBuf, 'Saudi_pure_binary.roz');
    assert.strictEqual(parsed2.counts.teachers, 82, 'Teachers must match 82');
    assert.strictEqual(parsed2.counts.classes, 33, 'Classes must match 33');
    assert.strictEqual(parsed2.counts.subjects, 37, 'Subjects must match 37');
    assert.strictEqual(parsed2.counts.rooms, 222, 'Rooms must match 222');
    assert.strictEqual(parsed2.counts.lessons, parsed1.counts.lessons, 'Lessons must match authentic binary count');
  });
});

// ============================================================================
// Suite 2: Direct Binary Card Stream Byte-Level Inspection
// ============================================================================
describe('Suite 2: Direct Binary Card Stream Byte-Level Inspection', () => {
  it('inspects raw bytes of Modern card records at 0x4a920 for 47B/79B strides and flags', () => {
    const originalBuf = fs.readFileSync(demo1Path);
    const parsed = parseRozBinary(originalBuf, 'Demo1.roz');

    const serializedBuf = serializeRozBinary({
      schoolName: parsed.school_name,
      cycleDays: parsed.cycle_days,
      periodsPerDay: parsed.periods_per_day,
      teachers: parsed.teachers,
      classes: parsed.classes,
      rooms: parsed.rooms,
      subjects: parsed.subjects,
      lessons: parsed.lessons,
      placements: parsed.mapped.placements,
      schemaVersion: parsed.schema_version,
    });

    const view = new DataView(serializedBuf.buffer, serializedBuf.byteOffset, serializedBuf.byteLength);
    const rawData = serializedBuf;

    let pos = 0x4a920;
    let checkedCards = 0;
    let placedCount = 0;
    let unplacedCount = 0;

    while (checkedCards < 50 && pos + 47 <= rawData.length) {
      const isUnplaced =
        rawData[pos + 4] === 0x00 &&
        rawData[pos + 5] === 0xff &&
        rawData[pos + 6] === 0xff &&
        rawData[pos + 7] === 0xff;

      if (isUnplaced) {
        unplacedCount++;
        const lid = view.getUint32(pos, true);
        assert.ok(lid > 0 && lid <= 500, `Unplaced card lid must be valid, got ${lid}`);
        pos += 47;
      } else {
        placedCount++;
        const lid = view.getUint32(pos, true);
        const cidx = view.getUint32(pos + 4, true);
        const dur = view.getUint32(pos + 8, true);
        const room = view.getInt32(pos + 12, true);
        const per = view.getInt32(pos + 16, true);
        const dayBitmask = view.getUint32(pos + 28, true);
        const flags = view.getUint32(pos + 40, true);

        assert.ok(lid > 0 && lid <= 500, `Placed card lid must be valid, got ${lid}`);
        assert.ok(dur === 1 || dur === 2, `Duration must be 1 or 2, got ${dur}`);
        assert.ok(per >= 0 && per <= 6, `Period must be in [0..6], got ${per}`);
        assert.ok((dayBitmask & 0x7f) !== 0, `dayBitmask must have valid cycle day bit, got ${dayBitmask}`);
        assert.ok(flags === 510 || flags === 511, `Flags must be 510 or 511, got ${flags}`);

        pos += 79;
      }
      checkedCards++;
    }

    assert.ok(placedCount > 0, 'Must have inspected placed cards at raw byte level');
    assert.ok(unplacedCount > 0, 'Must have inspected unplaced cards at raw byte level');
  });

  it('inspects raw bytes of Legacy card records at 0x76586 for 71B stride and lock status', () => {
    const originalBuf = fs.readFileSync(saudi1Path);
    const parsed = parseRozBinary(originalBuf, 'Saudi arabia 1.roz');

    const serializedBuf = serializeRozBinary({
      schoolName: parsed.school_name,
      cycleDays: parsed.cycle_days,
      periodsPerDay: parsed.periods_per_day,
      teachers: parsed.teachers,
      classes: parsed.classes,
      rooms: parsed.rooms,
      subjects: parsed.subjects,
      lessons: parsed.lessons,
      placements: parsed.mapped.placements,
      schemaVersion: parsed.schema_version,
    }, {
      schemaVersion: parsed.schema_version,
      targetEncoding: 'win1256',
    });

    const view = new DataView(serializedBuf.buffer, serializedBuf.byteOffset, serializedBuf.byteLength);

    let pos = 0x76586;
    for (let c = 0; c < 30; c++) {
      const lid = view.getInt32(pos, true);
      const cidx = view.getInt32(pos + 4, true);
      const dur = view.getInt32(pos + 8, true);
      const dayIdx = view.getInt32(pos + 12, true);
      const period = view.getInt32(pos + 16, true);
      const isLockedByte = view.getUint8(pos + 20);
      const sentinel1 = view.getInt32(pos + 28, true);
      const flags = view.getInt32(pos + 32, true);

      assert.ok(lid > 0 && lid <= 1000, `Legacy lid must be valid, got ${lid}`);
      assert.ok(dur === 1 || dur === 2, `Legacy dur must be 1 or 2, got ${dur}`);
      assert.ok(dayIdx >= 0 && dayIdx < 5, `Legacy dayIdx must be in 0..4, got ${dayIdx}`);
      assert.ok(period >= 0 && period <= 12, `Legacy period must be in 0..12, got ${period}`);
      assert.ok(isLockedByte === 0 || isLockedByte === 1, `isLockedByte must be 0 or 1, got ${isLockedByte}`);
      assert.strictEqual(sentinel1, -256, `Sentinel1 at +28 must be -256, got ${sentinel1}`);
      assert.ok(flags === 510 || flags === 511, `Flags at +32 must be 510 or 511, got ${flags}`);

      pos += 71;
    }
  });
});

// ============================================================================
// Suite 3: State Mutation & Placement Locking Round-Trip Fidelity
// ============================================================================
describe('Suite 3: State Mutation & Placement Locking Round-Trip Fidelity', () => {
  it('accurately encodes mutations and locking into raw bytes and recovers exact state', () => {
    const originalBuf = fs.readFileSync(demo1Path);
    const parsed = parseRozBinary(originalBuf, 'Demo1.roz');
    const { mapped } = parsed;

    // Clone mutable structures
    let placements = mapped.placements.map((p) => ({ ...p }));
    let lessons = mapped.lessons.map((l) => ({ ...l }));

    // Mutation A: Move Lesson 1 to Slot [Day 3, Period 5] (0-indexed) with Room '35' and lock it
    // If lesson 1 was unplaced in Demo1, add placement; if placed, update it
    const existingP1 = placements.find((p) => p.lessonId === '1');
    if (existingP1) {
      existingP1.dayIndex = 3;
      existingP1.periodIndex = 5;
      existingP1.roomId = '35';
      existingP1.isLocked = true;
    } else {
      placements.push({
        lessonId: '1',
        dayIndex: 3,
        periodIndex: 5,
        roomId: '35',
        isLocked: true,
      });
    }

    // Mutation B: Move Lesson 2 to Slot [Day 4, Period 6] and Lock it
    const existingP2 = placements.find((p) => p.lessonId === '2');
    if (existingP2) {
      existingP2.dayIndex = 4;
      existingP2.periodIndex = 6;
      existingP2.isLocked = true;
    } else {
      placements.push({
        lessonId: '2',
        dayIndex: 4,
        periodIndex: 6,
        isLocked: true,
      });
    }

    // Mutation C: Unplace Lesson 3 (simulate dragging back to unplaced deck)
    placements = placements.filter((p) => p.lessonId !== '3');

    // Serialize mutated timetable
    const mutatedBuf = serializeRozBinary({
      schoolName: parsed.school_name,
      cycleDays: parsed.cycle_days,
      periodsPerDay: parsed.periods_per_day,
      teachers: mapped.teachers,
      classes: mapped.classes,
      rooms: mapped.rooms,
      subjects: mapped.subjects,
      lessons,
      placements,
      schemaVersion: parsed.schema_version,
    });

    // Adversarial Check 1: Inspect raw bytes of Card 1 at 0x4a920
    const view = new DataView(mutatedBuf.buffer, mutatedBuf.byteOffset, mutatedBuf.byteLength);
    const rawData = mutatedBuf;

    // Card 1 is at 0x4a920 (79 bytes because placed)
    const card1Lid = view.getUint32(0x4a920, true);
    assert.strictEqual(card1Lid, 1, 'Card 1 lid must be 1');
    const card1Dur = view.getUint32(0x4a920 + 8, true);
    assert.strictEqual(card1Dur, 1, 'Card 1 duration must be 1');
    const card1Room = view.getInt32(0x4a920 + 12, true);
    assert.strictEqual(card1Room, 34, 'Card 1 room index must be 34 (Room 35 is 0-indexed 34)');
    const card1Per = view.getInt32(0x4a920 + 16, true);
    assert.strictEqual(card1Per, 5, 'Card 1 raw period must be 5');
    const card1DayMask = view.getUint32(0x4a920 + 28, true);
    assert.strictEqual(card1DayMask, 1 << 3, 'Card 1 dayMask must be 1 << 3 = 8');
    const card1Flags = view.getUint32(0x4a920 + 40, true);
    assert.strictEqual(card1Flags, 511, 'Card 1 flags must be 511 (bit 0 = locked)');

    // Card 2 is at 0x4a920 + 79 = 0x4a96f
    const card2Offset = 0x4a920 + 79;
    const card2Lid = view.getUint32(card2Offset, true);
    assert.strictEqual(card2Lid, 2, 'Card 2 lid must be 2');
    const card2Per = view.getInt32(card2Offset + 16, true);
    assert.strictEqual(card2Per, 6, 'Card 2 raw period must be 6');
    const card2DayMask = view.getUint32(card2Offset + 28, true);
    assert.strictEqual(card2DayMask, 1 << 4, 'Card 2 dayMask must be 1 << 4 = 16');
    const card2Flags = view.getUint32(card2Offset + 40, true);
    assert.strictEqual(card2Flags, 511, 'Card 2 flags must be 511 (bit 0 = locked)');

    // Card 3 is at card2Offset + 79 = 0x4a9be (47 bytes because unplaced)
    const card3Offset = card2Offset + 79;
    const card3Lid = view.getUint32(card3Offset, true);
    assert.strictEqual(card3Lid, 3, 'Card 3 lid must be 3');
    assert.strictEqual(rawData[card3Offset + 4], 0x00, 'Card 3 unplaced sentinel byte 0');
    assert.strictEqual(rawData[card3Offset + 5], 0xff, 'Card 3 unplaced sentinel byte 1');
    assert.strictEqual(rawData[card3Offset + 6], 0xff, 'Card 3 unplaced sentinel byte 2');
    assert.strictEqual(rawData[card3Offset + 7], 0xff, 'Card 3 unplaced sentinel byte 3');

    // Re-parse with parseRozBinary
    const reloaded = parseRozBinary(mutatedBuf, 'Demo1_mutated.roz');
    const remapped = reloaded.mapped;

    // Verify Lesson 1 is placed at [Day 3, Period 5] with isLocked === true
    const p1 = remapped.placements.find((p) => p.lessonId === '1');
    assert.ok(p1, 'Lesson 1 must have placement');
    assert.strictEqual(p1.dayIndex, 3, 'Lesson 1 dayIndex must survive as 3');
    assert.strictEqual(p1.periodIndex, 5, 'Lesson 1 periodIndex must survive as 5');
    assert.strictEqual(p1.isLocked, true, 'Lesson 1 isLocked must survive as true');

    // Verify Lesson 2 is placed at [Day 4, Period 6] with isLocked === true
    const p2 = remapped.placements.find((p) => p.lessonId === '2');
    assert.ok(p2, 'Lesson 2 must have placement');
    assert.strictEqual(p2.dayIndex, 4, 'Lesson 2 dayIndex must survive as 4');
    assert.strictEqual(p2.periodIndex, 6, 'Lesson 2 periodIndex must survive as 6');
    assert.strictEqual(p2.isLocked, true, 'Lesson 2 isLocked must survive as true');

    // Verify Lesson 3 is unplaced (omitted from placements array)
    const p3 = remapped.placements.find((p) => p.lessonId === '3');
    assert.strictEqual(p3, undefined, 'Lesson 3 must remain unplaced');
  });
});

// ============================================================================
// Suite 4: Adversarial Dynamic Scaling (600+ Lessons Schedule)
// ============================================================================
describe('Suite 4: Adversarial Dynamic Scaling (600+ Lessons Schedule)', () => {
  it('serializes and round-trips a 600-lesson schedule without buffer collision or entity corruption', () => {
    // 1. Synthesize 60 teachers, 40 classes, 30 subjects, 40 rooms
    const teachers = Array.from({ length: 60 }, (_, i) => ({
      id: String(i + 1),
      name: `Teacher ${i + 1}`,
      short: `T${i + 1}`,
    }));

    const classes = Array.from({ length: 40 }, (_, i) => ({
      id: String(i + 1),
      name: `Class ${i + 1}`,
      short: `C${i + 1}`,
    }));

    const subjects = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      name: `Subject ${i + 1}`,
      short: `S${i + 1}`,
    }));

    const rooms = Array.from({ length: 40 }, (_, i) => ({
      id: String(i + 1),
      name: `Room ${i + 1}`,
      short: `R${i + 1}`,
    }));

    // 2. Synthesize 600 lessons (60 unplaced, 60 locked, 480 placed)
    const lessons = [];
    const placements = [];

    for (let i = 1; i <= 600; i++) {
      const classId = String(((i - 1) % classes.length) + 1);
      const subjectId = String(((i - 1) % subjects.length) + 1);
      const teacherId = String(((i - 1) % teachers.length) + 1);
      const roomId = String(((i - 1) % rooms.length) + 1);

      lessons.push({
        id: String(i),
        subjectId,
        teacherId,
        classId,
        roomId,
        duration: 1,
      });

      if (i > 60) {
        // Placed card
        const isLocked = i <= 120; // 60 locked cards
        const dayIndex = (i % 5);
        const periodIndex = (Math.floor(i / 5) % 7);

        placements.push({
          lessonId: String(i),
          dayIndex,
          periodIndex,
          roomId,
          isLocked: isLocked ? true : undefined,
        });
      }
    }

    assert.strictEqual(lessons.length, 600);
    assert.strictEqual(placements.length, 540); // 60 unplaced

    // 3. Serialize 600-lesson schedule
    const serializedBuf = serializeRozBinary({
      schoolName: 'Adversarial Dynamic Academy',
      cycleDays: 5,
      periodsPerDay: 7,
      teachers,
      classes,
      rooms,
      subjects,
      lessons,
      placements,
      schemaVersion: 314,
    });

    const buf = Buffer.from(serializedBuf);
    assert.strictEqual(buf.indexOf('ASCTT_CHUNK_TOC'), -1, 'Must NOT contain ASCTT_CHUNK_TOC backdoor');
    assert.strictEqual(buf.indexOf('{"schemaVersion"'), -1, 'Must NOT contain embedded JSON');

    // 4. Re-parse
    const reloaded = parseRozBinary(serializedBuf, 'Adversarial_600.roz');

    // 5. Assert 100% Entity & Schedule Parity
    assert.strictEqual(reloaded.counts.teachers, 60, 'Teachers count must be 60');
    assert.strictEqual(reloaded.counts.classes, 40, 'Classes count must be 40');
    assert.strictEqual(reloaded.counts.subjects, 30, 'Subjects count must be 30');
    assert.strictEqual(reloaded.counts.rooms, 40, 'Rooms count must be 40');
    assert.strictEqual(reloaded.counts.lessons, 600, 'Lessons count must be 600');

    assert.strictEqual(reloaded.mapped.placements.length, 540, 'Placements count must be 540');
    const unplacedCount = reloaded.mapped.lessons.length - reloaded.mapped.placements.length;
    assert.strictEqual(unplacedCount, 60, 'Unplaced cards count must be exactly 60');

    // Assert locked cards retained their lock status
    const lockedCards = reloaded.mapped.placements.filter((p) => p.isLocked);
    assert.strictEqual(lockedCards.length, 60, 'Exactly 60 cards must be locked');
  });
});
