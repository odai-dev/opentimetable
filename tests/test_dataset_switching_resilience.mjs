// opentimetable/tests/test_dataset_switching_resilience.mjs
// Empirical Stress Test Suite: One-Click Real-School Dataset Loading & Sample Switching (R1)
// Challenger M1-2 empirical verification harness.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js');
const { parseRozBinary } = jiti(import.meta.url)('../apps/web/src/lib/roz-parser.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');
const pageTsxPath = path.resolve(opentimetableRoot, 'apps/web/src/app/page.tsx');
const publicDemosDir = path.resolve(opentimetableRoot, 'apps/web/public/demos');
const saudiFile = path.resolve(publicDemosDir, 'Saudi_Arabia_1.roz');
const demo1File = path.resolve(publicDemosDir, 'Demo1.roz');

// ==============================================================================
// 1. Initial State in page.tsx Verification
// ==============================================================================
describe('1. Initial State in page.tsx — Elimination of Mock Data', () => {
  it('verifies page.tsx source no longer imports or references sample-data toy defaults', () => {
    assert.ok(fs.existsSync(pageTsxPath), `page.tsx must exist at ${pageTsxPath}`);
    const content = fs.readFileSync(pageTsxPath, 'utf8');

    // Must NOT import from sample-data
    assert.ok(!content.includes("from '../lib/sample-data'"), "page.tsx must NOT import from sample-data");
    assert.ok(!content.includes('sampleTeachers'), 'page.tsx must NOT reference sampleTeachers');
    assert.ok(!content.includes('sampleClasses'), 'page.tsx must NOT reference sampleClasses');
    assert.ok(!content.includes('sampleRooms'), 'page.tsx must NOT reference sampleRooms');
    assert.ok(!content.includes('sampleSubjects'), 'page.tsx must NOT reference sampleSubjects');
    assert.ok(!content.includes('sampleLessons'), 'page.tsx must NOT reference sampleLessons');
    assert.ok(!content.includes('initialPlacements'), 'page.tsx must NOT reference initialPlacements');
  });

  it('verifies page.tsx initializes all entity collections as clean empty arrays', () => {
    const content = fs.readFileSync(pageTsxPath, 'utf8');

    // Verify useState empty arrays
    assert.match(content, /useState<Teacher\[\]>\(\[\]\)/, 'teachers must initialize to []');
    assert.match(content, /useState<ClassGroup\[\]>\(\[\]\)/, 'classes must initialize to []');
    assert.match(content, /useState<Room\[\]>\(\[\]\)/, 'rooms must initialize to []');
    assert.match(content, /useState<Subject\[\]>\(\[\]\)/, 'subjects must initialize to []');
    assert.match(content, /useState<Lesson\[\]>\(\[\]\)/, 'lessons must initialize to []');
    assert.match(content, /useState<Placement\[\]>\(\[\]\)/, 'placements must initialize to []');
    assert.match(content, /useState<Placement\[\]\[\]>\(\[\]\)/, 'history must initialize to []');
    assert.match(content, /useState<string>\(''\)/, 'selectedEntityId must initialize to empty string');
  });
});

// ==============================================================================
// 2. Binary Parsing & Authenticity of Public Demo Datasets
// ==============================================================================
describe('2. Binary Parsing of Public Demo Datasets', () => {
  it('loads and validates Saudi_Arabia_1.roz from public/demos/', () => {
    assert.ok(fs.existsSync(saudiFile), `Saudi_Arabia_1.roz must exist at ${saudiFile}`);
    const buffer = fs.readFileSync(saudiFile);
    assert.ok(buffer.length > 500000, `Expected file size > 500KB, got ${buffer.length}`);

    const parsed = parseRozBinary(buffer, 'Saudi Arabia 1.roz');
    assert.ok(parsed.mapped, 'Mapped frontend data must exist');

    // Entity counts verification
    assert.strictEqual(parsed.mapped.teachers.length, 82, 'Must have exactly 82 teachers');
    assert.strictEqual(parsed.mapped.classes.length, 33, 'Must have exactly 33 classes');
    assert.strictEqual(parsed.mapped.subjects.length, 37, 'Must have exactly 37 subjects');
    assert.strictEqual(parsed.mapped.rooms.length, 222, 'Must have exactly 222 rooms');
    assert.strictEqual(parsed.mapped.lessons.length, 1630, 'Must have exactly 1630 lessons');
    assert.strictEqual(parsed.mapped.placements.length, 1630, 'Must have exactly 1630 placements');

    // Arabic text validity (Windows-1256 decoding check)
    const arabicClass = parsed.mapped.classes.find(c => c.name === 'تمهيدي');
    assert.ok(arabicClass, "Must find Arabic class 'تمهيدي'");
    assert.strictEqual(arabicClass.nameAr, 'تمهيدي');

    const arabicSubject = parsed.mapped.subjects.find(s => s.name === 'رياضيات1');
    assert.ok(arabicSubject, "Must find Arabic subject 'رياضيات1'");

    // Check for corrupt Unicode replacement characters
    for (const t of parsed.mapped.teachers) {
      assert.ok(!t.name.includes('\uFFFD'), `Teacher name corrupted: ${t.name}`);
      assert.ok(!t.name.includes('???'), `Teacher name corrupted: ${t.name}`);
    }
  });

  it('loads and validates Demo1.roz from public/demos/', () => {
    assert.ok(fs.existsSync(demo1File), `Demo1.roz must exist at ${demo1File}`);
    const buffer = fs.readFileSync(demo1File);
    assert.ok(buffer.length > 300000, `Expected file size > 300KB, got ${buffer.length}`);

    const parsed = parseRozBinary(buffer, 'Demo1.roz');
    assert.ok(parsed.mapped, 'Mapped frontend data must exist');

    // Entity counts verification
    assert.strictEqual(parsed.mapped.teachers.length, 45, 'Must have exactly 45 teachers');
    assert.strictEqual(parsed.mapped.classes.length, 27, 'Must have exactly 27 classes');
    assert.strictEqual(parsed.mapped.subjects.length, 24, 'Must have exactly 24 subjects');
    assert.strictEqual(parsed.mapped.rooms.length, 35, 'Must have exactly 35 rooms');
    assert.strictEqual(parsed.mapped.lessons.length, 805, 'Must have exactly 805 lessons');
    assert.strictEqual(parsed.mapped.placements.length, 740, 'Must have exactly 740 placements (65 unplaced cards)');

    // Schema verification
    assert.ok(parsed.schema_version >= 248, `Modern schema version expected, got ${parsed.schema_version}`);
    assert.strictEqual(parsed.has_asctt_magic, true, 'Demo1.roz must have ASCTT magic');
    assert.strictEqual(parsed.school_name, 'Hronská');
  });
});

// State container simulating page.tsx state management exactly
class TimetableStudioState {
  constructor() {
    this.teachers = [];
    this.classes = [];
    this.rooms = [];
    this.subjects = [];
    this.lessons = [];
    this.placements = [];
    this.history = [];
    this.redoStack = [];
    this.timeOffMatrix = {};
    this.selectedEntityId = '';
    this.currentSampleId = 'saudi';
    this.scheduleCycleKind = 'saudi';
    this.cycleDays = 5;
    this.periodsPerDay = 12;
    this.schoolName = 'Saudi Arabia 1';
    this.currentFileName = 'Saudi Arabia 1.roz';
    this.schemaVersion = 115;
  }

  loadRozBuffer(buffer, fileName) {
    const parsed = parseRozBinary(buffer, fileName);
    this.teachers = parsed.mapped.teachers;
    this.classes = parsed.mapped.classes;
    this.rooms = parsed.mapped.rooms;
    this.subjects = parsed.mapped.subjects;
    this.lessons = parsed.mapped.lessons;
    this.placements = parsed.mapped.placements;
    this.history = [];
    this.redoStack = [];
    this.schoolName = parsed.school_name;
    this.currentFileName = fileName;
    this.schemaVersion = parsed.schema_version;

    let kind = 'standard';
    let detectedDays = parsed.cycle_days || 5;
    let detectedPeriods = parsed.periods_per_day || 7;

    if (
      fileName.toLowerCase().includes('saudi') ||
      fileName.toLowerCase().includes('arab') ||
      parsed.school_name.includes('2006/2007')
    ) {
      kind = 'saudi';
      detectedDays = 5;
      detectedPeriods = 12;
      this.currentSampleId = 'saudi';
    } else if (
      fileName.toLowerCase().includes('demo1') ||
      parsed.cycle_days === 7
    ) {
      kind = 'seven_day';
      detectedDays = 7;
      detectedPeriods = 7;
      this.currentSampleId = 'demo1';
    } else {
      kind = 'standard';
      detectedDays = parsed.cycle_days || 5;
      detectedPeriods = parsed.periods_per_day || 7;
    }

    this.scheduleCycleKind = kind;
    this.cycleDays = detectedDays;
    this.periodsPerDay = detectedPeriods;

    const newTimeOff = {};
    for (const tc of parsed.mapped.teachers) {
      if (tc.unavailableSlots) {
        for (const slot of tc.unavailableSlots) {
          const d = Math.floor(slot / detectedPeriods);
          const p = slot % detectedPeriods;
          newTimeOff[`${tc.id}-${d}-${p}`] = 0;
        }
      }
    }
    this.timeOffMatrix = newTimeOff;

    if (parsed.mapped.classes.length > 0) {
      this.selectedEntityId = parsed.mapped.classes[0].id;
    } else if (parsed.mapped.teachers.length > 0) {
      this.selectedEntityId = parsed.mapped.teachers[0].id;
    } else {
      this.selectedEntityId = '';
    }
  }

  async loadNamedSample(sample, fetchMock) {
    if (sample === 'saudi') {
      this.currentSampleId = 'saudi';
      try {
        let res = await fetchMock('/demos/Saudi_Arabia_1.roz');
        let fname = 'Saudi Arabia 1.roz';
        if (!res.ok) {
          res = await fetchMock('/demos/Demo1.roz');
          fname = 'Demo1.roz';
        }
        if (res.ok) {
          const buf = await res.arrayBuffer();
          this.loadRozBuffer(buf, fname);
        }
      } catch (err) {
        console.error('Failed loading Saudi Arabia 1 sample:', err);
      }
    } else if (sample === 'demo1') {
      this.currentSampleId = 'demo1';
      try {
        const res = await fetchMock('/demos/Demo1.roz');
        if (res.ok) {
          const buf = await res.arrayBuffer();
          this.loadRozBuffer(buf, 'Demo1.roz');
        }
      } catch (err) {
        console.error('Failed loading Demo1 sample:', err);
      }
    } else if (sample === 'blank') {
      this.currentSampleId = 'blank';
      this.teachers = [];
      this.classes = [];
      this.rooms = [];
      this.subjects = [];
      this.lessons = [];
      this.placements = [];
      this.history = [];
      this.redoStack = [];
      this.timeOffMatrix = {};
      this.schoolName = 'مدرسة جديدة';
      this.currentFileName = 'untitled.roz';
      this.schemaVersion = 314;
      this.selectedEntityId = '';
      this.scheduleCycleKind = 'standard';
      this.cycleDays = 5;
      this.periodsPerDay = 7;
    }
  }
}

function createDiskFetch() {
  return async (url) => {
    const filename = path.basename(url);
    const filePath = path.resolve(publicDemosDir, filename);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      };
    }
    return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

// ==============================================================================
// 3. Dataset Switching Sequence Simulation (Saudi -> Demo1 -> Blank -> Saudi)
// ==============================================================================
describe('3. Dataset Switching Sequence (Saudi -> Demo1 -> Blank -> Saudi)', () => {
  it('executes full sequence saudi -> demo1 -> blank -> saudi cleanly without ghost state', async () => {
    const fetchMock = createDiskFetch();
    const studio = new TimetableStudioState();


    // -------------------------------------------------------------
    // Step 1: Initial state check (Empty before sample load)
    // -------------------------------------------------------------
    assert.strictEqual(studio.teachers.length, 0);
    assert.strictEqual(studio.classes.length, 0);
    assert.strictEqual(studio.placements.length, 0);

    // -------------------------------------------------------------
    // Step 2: Load Saudi Arabia 1
    // -------------------------------------------------------------
    await studio.loadNamedSample('saudi', fetchMock);

    assert.strictEqual(studio.currentSampleId, 'saudi');
    assert.strictEqual(studio.teachers.length, 82, 'Saudi must have 82 teachers');
    assert.strictEqual(studio.classes.length, 33, 'Saudi must have 33 classes');
    assert.strictEqual(studio.rooms.length, 222, 'Saudi must have 222 rooms');
    assert.strictEqual(studio.subjects.length, 37, 'Saudi must have 37 subjects');
    assert.strictEqual(studio.lessons.length, 1630, 'Saudi must have 1630 lessons');
    assert.strictEqual(studio.placements.length, 1630, 'Saudi must have 1630 placements');
    assert.strictEqual(studio.cycleDays, 5, 'Saudi must have 5 cycle days');
    assert.strictEqual(studio.periodsPerDay, 12, 'Saudi must have 12 periods');
    assert.strictEqual(studio.scheduleCycleKind, 'saudi');
    assert.strictEqual(studio.selectedEntityId, studio.classes[0].id);

    // Collect all Saudi entity IDs to check against later
    const saudiTeacherIds = new Set(studio.teachers.map(t => t.id));
    const saudiClassIds = new Set(studio.classes.map(c => c.id));
    const saudiLessonIds = new Set(studio.lessons.map(l => l.id));

    // Simulate user editing: add an action to history
    studio.history.push([...studio.placements]);
    assert.strictEqual(studio.history.length, 1);

    // -------------------------------------------------------------
    // Step 3: Switch to Demo 1
    // -------------------------------------------------------------
    await studio.loadNamedSample('demo1', fetchMock);

    assert.strictEqual(studio.currentSampleId, 'demo1');
    assert.strictEqual(studio.teachers.length, 45, 'Demo1 must have 45 teachers');
    assert.strictEqual(studio.classes.length, 27, 'Demo1 must have 27 classes');
    assert.strictEqual(studio.rooms.length, 35, 'Demo1 must have 35 rooms');
    assert.strictEqual(studio.subjects.length, 24, 'Demo1 must have 24 subjects');
    assert.strictEqual(studio.lessons.length, 805, 'Demo1 must have 805 lessons');
    assert.strictEqual(studio.placements.length, 740, 'Demo1 must have 740 placements (65 unplaced cards)');
    assert.strictEqual(studio.cycleDays, 7, 'Demo1 must scale grid to 7 cycle days');
    assert.strictEqual(studio.periodsPerDay, 7, 'Demo1 must scale grid to 7 periods');
    assert.strictEqual(studio.scheduleCycleKind, 'seven_day');
    assert.strictEqual(studio.selectedEntityId, studio.classes[0].id);
    assert.strictEqual(studio.history.length, 0, 'History must be cleared on sample switch');
    assert.strictEqual(studio.redoStack.length, 0, 'Redo stack must be cleared on sample switch');

    // Ghost placement check: Every placement.lessonId must be in Demo1 lessons
    const demo1LessonIds = new Set(studio.lessons.map(l => l.id));
    for (const p of studio.placements) {
      assert.ok(demo1LessonIds.has(p.lessonId), `Placement references invalid lesson: ${p.lessonId}`);
      assert.ok(p.dayIndex >= 0 && p.dayIndex < studio.cycleDays, `Placement day ${p.dayIndex} out of bounds`);
      assert.ok(p.periodIndex >= 0 && p.periodIndex < studio.periodsPerDay, `Placement period ${p.periodIndex} out of bounds`);
    }

    // Verify zero Saudi entities linger in Demo1
    const currentTeacherNames = new Set(studio.teachers.map(t => t.name));
    assert.ok(!currentTeacherNames.has('عبدالله'), 'No Arabic teacher names should linger in Demo1');

    // -------------------------------------------------------------
    // Step 4: Switch to Blank
    // -------------------------------------------------------------
    await studio.loadNamedSample('blank', fetchMock);

    assert.strictEqual(studio.currentSampleId, 'blank');
    assert.strictEqual(studio.teachers.length, 0, 'Blank must have 0 teachers');
    assert.strictEqual(studio.classes.length, 0, 'Blank must have 0 classes');
    assert.strictEqual(studio.rooms.length, 0, 'Blank must have 0 rooms');
    assert.strictEqual(studio.subjects.length, 0, 'Blank must have 0 subjects');
    assert.strictEqual(studio.lessons.length, 0, 'Blank must have 0 lessons');
    assert.strictEqual(studio.placements.length, 0, 'Blank must have 0 placements');
    assert.strictEqual(studio.selectedEntityId, '', 'Selected entity must be empty string');
    assert.strictEqual(Object.keys(studio.timeOffMatrix).length, 0, 'Time-off matrix must be empty');
    assert.strictEqual(studio.history.length, 0);
    assert.strictEqual(studio.redoStack.length, 0);
    assert.strictEqual(studio.cycleDays, 5);
    assert.strictEqual(studio.periodsPerDay, 7);

    // -------------------------------------------------------------
    // Step 5: Switch back to Saudi Arabia 1
    // -------------------------------------------------------------
    await studio.loadNamedSample('saudi', fetchMock);

    assert.strictEqual(studio.currentSampleId, 'saudi');
    assert.strictEqual(studio.teachers.length, 82, 'Must reload 82 teachers');
    assert.strictEqual(studio.classes.length, 33, 'Must reload 33 classes');
    assert.strictEqual(studio.lessons.length, 1630, 'Must reload 1630 lessons');
    assert.strictEqual(studio.placements.length, 1630, 'Must reload 1630 placements');
    assert.strictEqual(studio.cycleDays, 5);
    assert.strictEqual(studio.periodsPerDay, 12);
  });
});

// ==============================================================================
// 4. Fallback Resilience Stress Testing
// ==============================================================================
describe('4. Fallback Resilience Stress Testing', () => {
  it('cleanly falls back to Demo1.roz when Saudi_Arabia_1.roz returns 404', async () => {
    let saudiRequested = false;
    let demo1Requested = false;

    const fallbackFetch = async (url) => {
      if (url.includes('Saudi_Arabia_1.roz')) {
        saudiRequested = true;
        return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (url.includes('Demo1.roz')) {
        demo1Requested = true;
        const buf = fs.readFileSync(demo1File);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
      return { ok: false, status: 404 };
    };

    // Simulate page.tsx logic
    let res = await fallbackFetch('/demos/Saudi_Arabia_1.roz');
    let fname = 'Saudi Arabia 1.roz';
    if (!res.ok) {
      res = await fallbackFetch('/demos/Demo1.roz');
      fname = 'Demo1.roz';
    }

    assert.strictEqual(saudiRequested, true, 'Must have attempted Saudi_Arabia_1.roz first');
    assert.strictEqual(demo1Requested, true, 'Must have fallen back to Demo1.roz');
    assert.strictEqual(res.ok, true, 'Fallback response must be ok');
    assert.strictEqual(fname, 'Demo1.roz');

    const buf = await res.arrayBuffer();
    const parsed = parseRozBinary(buf, fname);
    assert.strictEqual(parsed.mapped.teachers.length, 45, 'Fallback must cleanly parse Demo1 with 45 teachers');
  });

  it('safely handles double 404 (both Saudi and Demo1 unavailable) without crashing', async () => {
    const double404Fetch = async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    let res = await double404Fetch('/demos/Saudi_Arabia_1.roz');
    let fname = 'Saudi Arabia 1.roz';
    if (!res.ok) {
      res = await double404Fetch('/demos/Demo1.roz');
      fname = 'Demo1.roz';
    }

    assert.strictEqual(res.ok, false);
    // When res.ok is false, loadRozBuffer is NOT called, preserving default/blank state safely
  });

  it('empirically demonstrates that network exception on Saudi fetch halts fallback to Demo1', async () => {
    let demo1Attempted = false;

    // Simulate network error (e.g. offline / aborted fetch)
    const throwingFetch = async (url) => {
      if (url.includes('Saudi_Arabia_1.roz')) {
        throw new TypeError('Failed to fetch (NetworkError)');
      }
      if (url.includes('Demo1.roz')) {
        demo1Attempted = true;
        return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(100) };
      }
      return { ok: false, status: 404 };
    };

    let caughtError = null;
    let res = null;
    try {
      res = await throwingFetch('/demos/Saudi_Arabia_1.roz');
      if (!res.ok) {
        res = await throwingFetch('/demos/Demo1.roz');
      }
    } catch (err) {
      caughtError = err;
    }

    // Notice: Because throwingFetch threw, control immediately jumped to catch,
    // so Demo1 was NEVER attempted. This is an empirical finding to report.
    assert.ok(caughtError instanceof TypeError, 'Network exception was caught');
    assert.strictEqual(demo1Attempted, false, 'Demo1 was NOT attempted when Saudi fetch rejected with TypeError');
  });
});

// ==============================================================================
// 5. Adversarial Stress & Edge Cases
// ==============================================================================
describe('5. Adversarial Edge Cases: Dirty State Reset & Data Boundary Audits', () => {
  it('resets completely cleanly after extensive user mutations (dirty state purge)', async () => {
    const studio = new TimetableStudioState();
    const fetchMock = createDiskFetch();

    // 1. Load Saudi Arabia 1
    await studio.loadNamedSample('saudi', fetchMock);
    assert.strictEqual(studio.teachers.length, 82);

    // 2. Perform extensive mutations: add custom teacher, class, lesson, placement, and time-off
    const customTeacher = { id: 'T_CUSTOM_999', name: 'Custom Teacher', speciality: 'CT', color: '#ff0000' };
    const customClass = { id: 'C_CUSTOM_999', name: 'Grade 99', grade: 99 };
    const customLesson = { id: 'L_CUSTOM_999', teacherId: 'T_CUSTOM_999', classId: 'C_CUSTOM_999', subjectId: '1', duration: 1 };
    const customPlacement = { lessonId: 'L_CUSTOM_999', dayIndex: 0, periodIndex: 0, roomId: '1' };

    studio.teachers.push(customTeacher);
    studio.classes.push(customClass);
    studio.lessons.push(customLesson);
    studio.placements.push(customPlacement);
    studio.timeOffMatrix['T_CUSTOM_999-0-0'] = 0;
    studio.history.push([...studio.placements]);

    assert.strictEqual(studio.teachers.length, 83);
    assert.strictEqual(studio.lessons.length, 1631);
    assert.strictEqual(studio.placements.length, 1631);

    // 3. Switch to Demo 1
    await studio.loadNamedSample('demo1', fetchMock);

    // Verify ZERO custom entities remain
    assert.strictEqual(studio.teachers.length, 45, 'Must have exactly 45 Demo1 teachers');
    assert.ok(!studio.teachers.some(t => t.id === 'T_CUSTOM_999'), 'Custom teacher must be purged');
    assert.ok(!studio.classes.some(c => c.id === 'C_CUSTOM_999'), 'Custom class must be purged');
    assert.ok(!studio.lessons.some(l => l.id === 'L_CUSTOM_999'), 'Custom lesson must be purged');
    assert.ok(!studio.placements.some(p => p.lessonId === 'L_CUSTOM_999'), 'Custom placement must be purged');
    assert.strictEqual(studio.timeOffMatrix['T_CUSTOM_999-0-0'], undefined, 'Custom time-off must be purged');
    assert.strictEqual(studio.history.length, 0, 'History must be purged');
  });

  it('audits placement coordinates against grid dimensions for both datasets', () => {
    const saudiBuf = fs.readFileSync(saudiFile);
    const saudiParsed = parseRozBinary(saudiBuf, 'Saudi Arabia 1.roz');

    // Saudi Arabia 1 has 5 days and 12 periods
    for (const p of saudiParsed.mapped.placements) {
      assert.ok(p.dayIndex >= 0 && p.dayIndex < 5, `Saudi placement day out of range: ${p.dayIndex}`);
      assert.ok(p.periodIndex >= 0 && p.periodIndex < 12, `Saudi placement period out of range: ${p.periodIndex}`);
      assert.ok(saudiParsed.mapped.lessons.some(l => l.id === p.lessonId), `Placement references invalid lesson: ${p.lessonId}`);
    }

    const demo1Buf = fs.readFileSync(demo1File);
    const demo1Parsed = parseRozBinary(demo1Buf, 'Demo1.roz');

    // Demo1 has 7 days and 7 periods
    for (const p of demo1Parsed.mapped.placements) {
      assert.ok(p.dayIndex >= 0 && p.dayIndex < 7, `Demo1 placement day out of range: ${p.dayIndex}`);
      assert.ok(p.periodIndex >= 0 && p.periodIndex < 7, `Demo1 placement period out of range: ${p.periodIndex}`);
      assert.ok(demo1Parsed.mapped.lessons.some(l => l.id === p.lessonId), `Placement references invalid lesson: ${p.lessonId}`);
    }
  });

  it('verifies that corrupted buffer parsing rejects safely without modifying existing state', () => {
    const studio = new TimetableStudioState();
    const fetchMock = createDiskFetch();

    // Load Saudi first
    const saudiBuf = fs.readFileSync(saudiFile);
    studio.loadRozBuffer(saudiBuf, 'Saudi Arabia 1.roz');
    assert.strictEqual(studio.teachers.length, 82);

    // Try loading a corrupt buffer
    const corruptBuffer = new Uint8Array([0x01, 0x02, 0x03]); // too small
    let thrown = false;
    try {
      studio.loadRozBuffer(corruptBuffer, 'corrupt.roz');
    } catch (e) {
      thrown = true;
    }

    // Because parseRozBinary throws before any setTeachers/setPlacements, state is unchanged
    assert.strictEqual(thrown, true);
    assert.strictEqual(studio.teachers.length, 82, 'Teachers state must remain intact after corrupt file rejection');
    assert.strictEqual(studio.currentFileName, 'Saudi Arabia 1.roz');
  });

  it('runs live conflict calculation on Saudi Arabia 1 without runtime exceptions', () => {
    const saudiBuf = fs.readFileSync(saudiFile);
    const parsed = parseRozBinary(saudiBuf, 'Saudi Arabia 1.roz');

    const teacherMap = new Map(parsed.mapped.teachers.map(t => [t.id, t]));
    const classMap = new Map(parsed.mapped.classes.map(c => [c.id, c]));
    const roomMap = new Map(parsed.mapped.rooms.map(r => [r.id, r]));
    const lessonMap = new Map(parsed.mapped.lessons.map(l => [l.id, l]));
    const placements = parsed.mapped.placements;

    const conflicts = [];
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (p1.dayIndex === p2.dayIndex && p1.periodIndex === p2.periodIndex) {
          const l1 = lessonMap.get(p1.lessonId);
          const l2 = lessonMap.get(p2.lessonId);
          if (!l1 || !l2) continue;

          if (l1.teacherId === l2.teacherId) {
            conflicts.push({ type: 'TEACHER_CLASH', lessonId: l1.id });
          }
          if (p1.roomId === p2.roomId) {
            conflicts.push({ type: 'ROOM_CLASH', lessonId: l1.id });
          }
          if (l1.classId === l2.classId) {
            conflicts.push({ type: 'CLASS_CLASH', lessonId: l1.id });
          }
        }
      }
    }

    assert.ok(Array.isArray(conflicts), 'Conflicts calculation must produce an array');
  });
});
