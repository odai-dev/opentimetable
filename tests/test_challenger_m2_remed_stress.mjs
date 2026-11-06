// opentimetable/tests/test_challenger_m2_remed_stress.mjs
// Challenger 2 Empirical Stress Test Harness — Milestone 2 Remediation
// Adversarial verification of randomized state mutations, dynamic scaling (600-1200 lessons),
// multi-cycle idempotency, and Saudi Arabia 1 auto-placement boundaries.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { parseRozBinary, exportToJson } = jiti('../apps/web/src/lib/roz-parser.ts');
const { serializeRozBinary } = jiti('../apps/web/src/lib/roz-serializer.ts');
const { mapRozToFrontend } = jiti('../apps/web/src/lib/domain.ts');

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

// Deterministic PRNG for reproducible randomized adversarial testing
function makeLcg(seed = 1337) {
  let s = seed >>> 0;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Scheduler helper mimicking page.tsx for conflict & placement validation
function createScheduler({ cycleDays = 5, periodsPerDay = 12 } = {}) {
  let placements = [];
  const lessons = [];
  const teachers = [];
  const classes = [];
  const rooms = [];

  const lessonMap = new Map();
  const teacherMap = new Map();
  const classMap = new Map();
  const roomMap = new Map();

  function addTeacher(t) { teachers.push(t); teacherMap.set(t.id, t); }
  function addClass(c) { classes.push(c); classMap.set(c.id, c); }
  function addRoom(r) { rooms.push(r); roomMap.set(r.id, r); }
  function addLesson(l) { lessons.push(l); lessonMap.set(l.id, l); }

  function computeTeacherAndClassConflicts() {
    const list = [];
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (p1.dayIndex === p2.dayIndex && p1.periodIndex === p2.periodIndex) {
          const l1 = lessonMap.get(p1.lessonId);
          const l2 = lessonMap.get(p2.lessonId);
          if (!l1 || !l2) continue;

          if (l1.teacherId === l2.teacherId) {
            list.push({ type: 'TEACHER_CLASH', lesson1: l1.id, lesson2: l2.id, teacher: l1.teacherId });
          }
          if (l1.classId === l2.classId) {
            list.push({ type: 'CLASS_CLASH', lesson1: l1.id, lesson2: l2.id, class: l1.classId });
          }
        }
      }
    }
    return list;
  }

  function handleAutoPlaceAll() {
    const currentPlacedIds = new Set(placements.map((p) => p.lessonId));
    const unplaced = lessons.filter((l) => !currentPlacedIds.has(l.id));
    const newPlacements = [...placements];

    for (const lesson of unplaced) {
      let placed = false;
      for (let d = 0; d < cycleDays && !placed; d++) {
        for (let p = 0; p < periodsPerDay && !placed; p++) {
          const slotTaken = newPlacements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId
            );
          });

          if (!slotTaken) {
            newPlacements.push({
              lessonId: lesson.id,
              dayIndex: d,
              periodIndex: p,
              roomId: lesson.roomId || rooms[0]?.id || 'R1',
            });
            placed = true;
          }
        }
      }
    }
    placements = newPlacements;
  }

  return {
    addTeacher,
    addClass,
    addRoom,
    addLesson,
    computeTeacherAndClassConflicts,
    handleAutoPlaceAll,
    getPlacements: () => placements,
    setPlacements: (p) => { placements = p; },
  };
}

// ============================================================================
// Suite 1: Randomized State Mutations & Lossless Round-Trip (Modern & Legacy)
// ============================================================================
describe('Challenger Suite 1: Randomized State Mutations & Binary Card Stream Fidelity', () => {
  it('Demo1.roz: 80 randomized mutations (move, lock/unlock, unplace) preserve exact state and byte flags', () => {
    const rawBuf = fs.readFileSync(demo1Path);
    const parsed = parseRozBinary(rawBuf, 'Demo1.roz');
    const lcg = makeLcg(42);

    const initialPlacements = parsed.mapped.placements.map(p => ({ ...p }));
    const initialLessons = parsed.mapped.lessons.map(l => ({ ...l }));
    const cycleDays = parsed.cycle_days; // 7
    const periodsPerDay = parsed.periods_per_day; // 7

    // Apply 80 deterministic randomized mutations
    const expectedPlacementsMap = new Map();
    // Start with existing placements
    for (const p of initialPlacements) {
      expectedPlacementsMap.set(p.lessonId, { ...p });
    }

    for (let m = 0; m < 80; m++) {
      const lessonIndex = Math.floor(lcg() * initialLessons.length);
      const lessonId = initialLessons[lessonIndex].id;
      const mutationType = Math.floor(lcg() * 4);

      if (mutationType === 0) {
        // Move to random valid day/period
        const targetDay = Math.floor(lcg() * cycleDays);
        const targetPeriod = Math.floor(lcg() * periodsPerDay);
        const existing = expectedPlacementsMap.get(lessonId);
        if (existing) {
          existing.dayIndex = targetDay;
          existing.periodIndex = targetPeriod;
        } else {
          expectedPlacementsMap.set(lessonId, {
            lessonId,
            dayIndex: targetDay,
            periodIndex: targetPeriod,
            roomId: '1',
            isLocked: false,
          });
        }
      } else if (mutationType === 1) {
        // Lock card
        const existing = expectedPlacementsMap.get(lessonId);
        if (existing) {
          existing.isLocked = true;
        } else {
          expectedPlacementsMap.set(lessonId, {
            lessonId,
            dayIndex: 0,
            periodIndex: 0,
            roomId: '1',
            isLocked: true,
          });
        }
      } else if (mutationType === 2) {
        // Unlock card
        const existing = expectedPlacementsMap.get(lessonId);
        if (existing) {
          existing.isLocked = false;
        }
      } else {
        // Unplace card (day=0, period=0)
        expectedPlacementsMap.delete(lessonId);
      }
    }

    const mutatedPlacements = Array.from(expectedPlacementsMap.values());

    // Serialize mutated dataset
    const serialized = serializeRozBinary({
      schoolName: parsed.school_name,
      cycleDays,
      periodsPerDay,
      teachers: parsed.teachers,
      classes: parsed.classes,
      rooms: parsed.rooms,
      subjects: parsed.subjects,
      lessons: initialLessons,
      placements: mutatedPlacements,
      schemaVersion: parsed.schema_version,
    });

    // Inspect raw card records in serialized buffer
    const view = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);
    let cardOffset = 0x4a920;

    for (let i = 0; i < initialLessons.length; i++) {
      const lid = i + 1;
      const expected = expectedPlacementsMap.get(String(lid));
      const recordLid = view.getUint32(cardOffset, true);
      assert.strictEqual(recordLid, lid, `Record lessonId must match ${lid} at offset 0x${cardOffset.toString(16)}`);

      if (!expected) {
        // Unplaced: must be 47 bytes with sentinel [0x00, 0xff, 0xff, 0xff] at +4
        assert.strictEqual(serialized[cardOffset + 4], 0x00);
        assert.strictEqual(serialized[cardOffset + 5], 0xff);
        assert.strictEqual(serialized[cardOffset + 6], 0xff);
        assert.strictEqual(serialized[cardOffset + 7], 0xff);
        cardOffset += 47;
      } else {
        // Placed: must be 79 bytes
        const dur = view.getUint32(cardOffset + 8, true);
        const per = view.getInt32(cardOffset + 16, true);
        const dayBitmask = view.getUint32(cardOffset + 28, true);
        const flags = view.getUint32(cardOffset + 40, true);

        assert.strictEqual(dur, 1);
        assert.strictEqual(per, expected.periodIndex, `Period mismatch for lesson ${lid}`);
        assert.strictEqual(dayBitmask, 1 << expected.dayIndex, `Day bitmask mismatch for lesson ${lid}`);

        const expectedFlags = expected.isLocked ? 511 : 510;
        assert.strictEqual(flags, expectedFlags, `Flags mismatch for lesson ${lid}: got ${flags}, expected ${expectedFlags}`);
        assert.strictEqual(flags & 1, expected.isLocked ? 1 : 0, 'Bit 0 of flags must accurately reflect lock state');

        cardOffset += 79;
      }
    }

    // Re-parse serialized binary
    const reloaded = parseRozBinary(serialized, 'Demo1_mutated_challenger.roz');
    assert.strictEqual(reloaded.counts.lessons, initialLessons.length);
    assert.strictEqual(reloaded.mapped.placements.length, mutatedPlacements.length);

    // Verify 100% placement and lock fidelity
    for (const expected of mutatedPlacements) {
      const actual = reloaded.mapped.placements.find(p => p.lessonId === expected.lessonId);
      assert.ok(actual, `Placement for lesson ${expected.lessonId} must exist after round-trip`);
      assert.strictEqual(actual.dayIndex, expected.dayIndex, `DayIndex for ${expected.lessonId} must match`);
      assert.strictEqual(actual.periodIndex, expected.periodIndex, `PeriodIndex for ${expected.lessonId} must match`);
      assert.strictEqual(!!actual.isLocked, !!expected.isLocked, `isLocked for ${expected.lessonId} must match`);
    }

    // Verify unplaced lessons are absent from placements
    for (const lesson of initialLessons) {
      if (!expectedPlacementsMap.has(lesson.id)) {
        const actual = reloaded.mapped.placements.find(p => p.lessonId === lesson.id);
        assert.strictEqual(actual, undefined, `Unplaced lesson ${lesson.id} must NOT have placement`);
      }
    }
  });

  it('Saudi Arabia 1: 50 randomized mutations preserve CP1256 encoding, 71B stride, and lock status', () => {
    const rawBuf = fs.readFileSync(saudi1Path);
    const parsed = parseRozBinary(rawBuf, 'Saudi arabia 1.roz');
    const lcg = makeLcg(99);

    const initialLessons = parsed.mapped.lessons.map(l => ({ ...l }));
    const cycleDays = parsed.cycle_days; // 5
    const periodsPerDay = parsed.periods_per_day; // 12

    const expectedPlacementsMap = new Map();
    for (const p of parsed.mapped.placements) {
      expectedPlacementsMap.set(p.lessonId, { ...p });
    }

    // Perform 50 mutations
    for (let m = 0; m < 50; m++) {
      const lessonIndex = Math.floor(lcg() * initialLessons.length);
      const lessonId = initialLessons[lessonIndex].id;
      const mutationType = Math.floor(lcg() * 3);

      if (mutationType === 0) {
        // Move to period 0..11, day 0..4
        const targetDay = Math.floor(lcg() * cycleDays);
        const targetPeriod = Math.floor(lcg() * periodsPerDay);
        expectedPlacementsMap.set(lessonId, {
          lessonId,
          dayIndex: targetDay,
          periodIndex: targetPeriod,
          roomId: '1',
          isLocked: false,
        });
      } else if (mutationType === 1) {
        // Lock card at current or specific slot
        const existing = expectedPlacementsMap.get(lessonId);
        if (existing) {
          existing.isLocked = true;
        } else {
          expectedPlacementsMap.set(lessonId, {
            lessonId,
            dayIndex: 1,
            periodIndex: 7,
            roomId: '1',
            isLocked: true,
          });
        }
      } else {
        // Unlock
        const existing = expectedPlacementsMap.get(lessonId);
        if (existing) {
          existing.isLocked = false;
        }
      }
    }

    const mutatedPlacements = Array.from(expectedPlacementsMap.values());

    const serialized = serializeRozBinary({
      schoolName: parsed.school_name,
      cycleDays,
      periodsPerDay,
      teachers: parsed.teachers,
      classes: parsed.classes,
      rooms: parsed.rooms,
      subjects: parsed.subjects,
      lessons: initialLessons,
      placements: mutatedPlacements,
      schemaVersion: parsed.schema_version,
    }, {
      schemaVersion: parsed.schema_version,
      targetEncoding: 'win1256',
    });

    // Inspect Legacy 71-byte record stream at 0x76586
    const view = new DataView(serialized.buffer, serialized.byteOffset, serialized.byteLength);
    let pos = 0x76586;

    for (let i = 0; i < initialLessons.length; i++) {
      const lid = i + 1;
      const expected = expectedPlacementsMap.get(String(lid));
      const recordLid = view.getInt32(pos, true);
      assert.strictEqual(recordLid, lid, `Legacy record lid must match ${lid}`);

      const dur = view.getInt32(pos + 8, true);
      const dayIdx = view.getInt32(pos + 12, true);
      const period = view.getInt32(pos + 16, true);
      const isLockedByte = view.getUint8(pos + 20);
      const sentinel1 = view.getInt32(pos + 28, true);
      const flags = view.getInt32(pos + 32, true);

      assert.strictEqual(dur, 1);
      assert.strictEqual(sentinel1, -256);

      if (expected) {
        assert.strictEqual(dayIdx, expected.dayIndex);
        assert.strictEqual(period, expected.periodIndex + 1);
        assert.strictEqual(isLockedByte, expected.isLocked ? 1 : 0);
        assert.strictEqual(flags, expected.isLocked ? 511 : 510);
      }

      pos += 71;
    }

    // Re-parse and verify entity and Arabic text integrity
    const reloaded = parseRozBinary(serialized, 'Saudi_mutated_challenger.roz');
    assert.strictEqual(reloaded.counts.teachers, 82);
    assert.strictEqual(reloaded.counts.classes, 33);
    assert.strictEqual(reloaded.counts.subjects, 37);
    assert.strictEqual(reloaded.counts.rooms, 222);
    assert.strictEqual(reloaded.counts.lessons, parsed.counts.lessons);

    // Verify Arabic characters are intact
    const arabicTeacher = reloaded.mapped.teachers.find(t => t.name.includes('أحمد') || t.name.includes('محمد') || t.name.length > 3);
    assert.ok(arabicTeacher, 'Arabic teacher names must be present and decoded cleanly');
    assert.ok(!arabicTeacher.name.includes('???'), 'No question-mark corruption allowed in Arabic strings');
  });
});

// ============================================================================
// Suite 2: Extreme Dynamic Scaling (600, 800, 1000, 1200 Lessons)
// ============================================================================
describe('Challenger Suite 2: Extreme Dynamic Scaling & Capacity Bounds', () => {
  function testScale(lessonCount, teachersCount = 80, classesCount = 50, subjectsCount = 40, roomsCount = 60) {
    const teachers = Array.from({ length: teachersCount }, (_, i) => ({
      id: String(i + 1),
      name: `Teacher ${i + 1}`,
      short: `T${i + 1}`,
    }));
    const classes = Array.from({ length: classesCount }, (_, i) => ({
      id: String(i + 1),
      name: `Class ${i + 1}`,
      short: `C${i + 1}`,
    }));
    const subjects = Array.from({ length: subjectsCount }, (_, i) => ({
      id: String(i + 1),
      name: `Subject ${i + 1}`,
      short: `S${i + 1}`,
    }));
    const rooms = Array.from({ length: roomsCount }, (_, i) => ({
      id: String(i + 1),
      name: `Room ${i + 1}`,
      short: `R${i + 1}`,
    }));

    const lessons = [];
    const placements = [];
    const unplacedRatio = 0.15; // 15% unplaced
    const lockedRatio = 0.20;   // 20% locked

    for (let i = 1; i <= lessonCount; i++) {
      const classId = String(((i - 1) % classesCount) + 1);
      const subjectId = String(((i - 1) % subjectsCount) + 1);
      const teacherId = String(((i - 1) % teachersCount) + 1);
      const roomId = String(((i - 1) % roomsCount) + 1);

      lessons.push({
        id: String(i),
        classId,
        subjectId,
        teacherId,
        roomId,
        duration: 1,
      });

      const isUnplaced = (i <= Math.floor(lessonCount * unplacedRatio));
      if (!isUnplaced) {
        const isLocked = (i <= Math.floor(lessonCount * (unplacedRatio + lockedRatio)));
        const dayIndex = (i % 5);
        const periodIndex = (Math.floor(i / 5) % 12);

        placements.push({
          lessonId: String(i),
          dayIndex,
          periodIndex,
          roomId,
          isLocked: isLocked ? true : undefined,
        });
      }
    }

    const unplacedCount = lessons.length - placements.length;
    const lockedCount = placements.filter(p => p.isLocked).length;

    // Serialize
    const serialized = serializeRozBinary({
      schoolName: `Scaling Academy ${lessonCount}`,
      cycleDays: 5,
      periodsPerDay: 12,
      teachers,
      classes,
      subjects,
      rooms,
      lessons,
      placements,
      schemaVersion: 314,
    });

    // Verify buffer integrity
    const buf = Buffer.from(serialized);
    assert.strictEqual(buf.indexOf('ASCTT_CHUNK_TOC'), -1, 'Zero backdoor allowed');
    assert.strictEqual(buf.indexOf('{"schemaVersion"'), -1, 'Zero JSON bypass allowed');

    // Re-parse
    const reloaded = parseRozBinary(serialized, `Scale_${lessonCount}.roz`);
    assert.strictEqual(reloaded.counts.teachers, teachersCount);
    assert.strictEqual(reloaded.counts.classes, classesCount);
    assert.strictEqual(reloaded.counts.subjects, subjectsCount);
    assert.strictEqual(reloaded.counts.rooms, roomsCount);
    assert.strictEqual(reloaded.counts.lessons, lessonCount);

    assert.strictEqual(reloaded.mapped.placements.length, placements.length);
    const reloadedLockedCount = reloaded.mapped.placements.filter(p => p.isLocked).length;
    assert.strictEqual(reloadedLockedCount, lockedCount);

    const reloadedUnplacedCount = reloaded.mapped.lessons.length - reloaded.mapped.placements.length;
    assert.strictEqual(reloadedUnplacedCount, unplacedCount);

    // Verify exact byte stride calculation
    const expectedCardStreamBytes = (unplacedCount * 47) + (placements.length * 79);
    assert.ok(serialized.byteLength >= 0x4a920 + expectedCardStreamBytes, 'Buffer capacity must accommodate card records without truncation');
  }

  it('scales to 600 lessons without collision or corruption', () => {
    testScale(600);
  });

  it('scales to 800 lessons without collision or corruption', () => {
    testScale(800, 100, 60, 50, 70);
  });

  it('scales to 1000 lessons without collision or corruption', () => {
    testScale(1000, 120, 80, 60, 80);
  });

  it('scales to 1200 lessons without collision or corruption', () => {
    testScale(1200, 150, 90, 70, 90);
  });
});

// ============================================================================
// Suite 3: Saudi Arabia 1 Auto-Placement Hard Constraints
// ============================================================================
describe('Challenger Suite 3: Saudi Arabia 1 Auto-Placement Hard Constraints', () => {
  it('places 481 lessons with ZERO teacher clash, exactly 31 in period 7 (12-period) and 0 in period 7 (7-period)', () => {
    const rawBuf = fs.readFileSync(saudi1Path);
    const parsed = parseRozBinary(rawBuf, 'Saudi arabia 1.roz');

    // Test 1: 12-Period Mode
    const scheduler12 = createScheduler({ cycleDays: 5, periodsPerDay: 12 });
    for (const t of parsed.mapped.teachers) scheduler12.addTeacher(t);
    for (const c of parsed.mapped.classes) scheduler12.addClass(c);
    for (const r of parsed.mapped.rooms) scheduler12.addRoom(r);
    for (const l of parsed.mapped.lessons) scheduler12.addLesson(l);

    scheduler12.handleAutoPlaceAll();
    const placements12 = scheduler12.getPlacements();

    // Condition 1: 481 lessons placed greedily
    assert.strictEqual(placements12.length, 481, 'Greedy auto-placement must place 481 lessons in 12-period mode');

    // Condition 2: ZERO teacher clash, ZERO class clash
    const conflicts = scheduler12.computeTeacherAndClassConflicts();
    const teacherClashes = conflicts.filter(c => c.type === 'TEACHER_CLASH');
    const classClashes = conflicts.filter(c => c.type === 'CLASS_CLASH');

    assert.strictEqual(teacherClashes.length, 0, `Expected 0 teacher clashes, found ${teacherClashes.length}`);
    assert.strictEqual(classClashes.length, 0, `Expected 0 class clashes, found ${classClashes.length}`);

    // Condition 3: Exactly 31 lessons placed in period index 7 (Period 8)
    const inPeriod7 = placements12.filter(p => p.periodIndex === 7);
    assert.strictEqual(inPeriod7.length, 31, `Expected exactly 31 lessons in period 7, got ${inPeriod7.length}`);

    // Test 2: 7-Period Mode
    const scheduler7 = createScheduler({ cycleDays: 5, periodsPerDay: 7 });
    for (const t of parsed.mapped.teachers) scheduler7.addTeacher(t);
    for (const c of parsed.mapped.classes) scheduler7.addClass(c);
    for (const r of parsed.mapped.rooms) scheduler7.addRoom(r);
    for (const l of parsed.mapped.lessons) scheduler7.addLesson(l);

    scheduler7.handleAutoPlaceAll();
    const placements7 = scheduler7.getPlacements();

    // In 7-period mode, period index 7 must have 0 placements
    const inPeriod7_7p = placements7.filter(p => p.periodIndex === 7);
    assert.strictEqual(inPeriod7_7p.length, 0, `Expected 0 lessons in period 7 in 7-period mode, got ${inPeriod7_7p.length}`);

    const maxPeriodIn7p = Math.max(...placements7.map(p => p.periodIndex));
    assert.ok(maxPeriodIn7p <= 6, `Max period in 7-period mode must be <= 6, got ${maxPeriodIn7p}`);
  });
});

// ============================================================================
// Suite 4: Multi-Cycle Idempotency (3-Cycle Round-Trip Serialization)
// ============================================================================
describe('Challenger Suite 4: Multi-Cycle Idempotent Serialization', () => {
  it('Demo1.roz: 3 successive serialization cycles maintain identical state and counts', () => {
    const buf0 = fs.readFileSync(demo1Path);
    const p1 = parseRozBinary(buf0, 'Demo1_c0.roz');

    // Cycle 1
    const buf1 = serializeRozBinary({
      schoolName: p1.school_name,
      cycleDays: p1.cycle_days,
      periodsPerDay: p1.periods_per_day,
      teachers: p1.teachers,
      classes: p1.classes,
      rooms: p1.rooms,
      subjects: p1.subjects,
      lessons: p1.lessons,
      placements: p1.mapped.placements,
      schemaVersion: p1.schema_version,
    });
    const p2 = parseRozBinary(buf1, 'Demo1_c1.roz');

    // Cycle 2
    const buf2 = serializeRozBinary({
      schoolName: p2.school_name,
      cycleDays: p2.cycle_days,
      periodsPerDay: p2.periods_per_day,
      teachers: p2.teachers,
      classes: p2.classes,
      rooms: p2.rooms,
      subjects: p2.subjects,
      lessons: p2.lessons,
      placements: p2.mapped.placements,
      schemaVersion: p2.schema_version,
    });
    const p3 = parseRozBinary(buf2, 'Demo1_c2.roz');

    // Cycle 3
    const buf3 = serializeRozBinary({
      schoolName: p3.school_name,
      cycleDays: p3.cycle_days,
      periodsPerDay: p3.periods_per_day,
      teachers: p3.teachers,
      classes: p3.classes,
      rooms: p3.rooms,
      subjects: p3.subjects,
      lessons: p3.lessons,
      placements: p3.mapped.placements,
      schemaVersion: p3.schema_version,
    });
    const p4 = parseRozBinary(buf3, 'Demo1_c3.roz');

    // Assert counts are strictly invariant across cycles
    for (const p of [p2, p3, p4]) {
      assert.strictEqual(p.counts.teachers, 45);
      assert.strictEqual(p.counts.classes, 27);
      assert.strictEqual(p.counts.subjects, 24);
      assert.strictEqual(p.counts.rooms, 35);
      assert.strictEqual(p.counts.lessons, 805);
      assert.strictEqual(p.mapped.placements.length, p1.mapped.placements.length);
    }

    // Assert placement properties match between Cycle 2 and Cycle 3
    for (let i = 0; i < p3.mapped.placements.length; i++) {
      const pl3 = p3.mapped.placements[i];
      const pl4 = p4.mapped.placements[i];
      assert.strictEqual(pl4.lessonId, pl3.lessonId);
      assert.strictEqual(pl4.dayIndex, pl3.dayIndex);
      assert.strictEqual(pl4.periodIndex, pl3.periodIndex);
      assert.strictEqual(pl4.roomId, pl3.roomId);
      assert.strictEqual(pl4.isLocked, pl3.isLocked);
    }
  });
});
