// opentimetable/tests/test_persistence_autosave_adversarial.mjs
// Adversarial Empirical Test Suite: State Persistence, Hydration & Auto-Save Guard (Milestone 1)
// Teamwork Preview Challenger 1 (Milestone 1) empirical verification harness.

import { describe, it, beforeEach } from 'node:test';
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
const basicDataModalPath = path.resolve(opentimetableRoot, 'apps/web/src/components/BasicDataModal.tsx');
const timeOffModalPath = path.resolve(opentimetableRoot, 'apps/web/src/components/TimeOffModal.tsx');
const testTimetableModalPath = path.resolve(opentimetableRoot, 'apps/web/src/components/TestTimetableModal.tsx');
const solverWorkerPath = path.resolve(opentimetableRoot, 'apps/web/src/workers/solver.worker.ts');
const useWasmSolverPath = path.resolve(opentimetableRoot, 'apps/web/src/lib/useWasmSolver.ts');

// Mock localStorage implementation
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
}

// Simulator for page.tsx persistence lifecycle
class StudioPersistenceSimulator {
  constructor(storage = new MockLocalStorage()) {
    this.storage = storage;
    this.isHydrated = false;
    this.fetchCalls = [];

    // State variables
    this.teachers = [];
    this.classes = [];
    this.rooms = [];
    this.subjects = [];
    this.lessons = [];
    this.placements = [];
    this.timeOffMatrix = {};
    this.schoolName = 'Saudi Arabia 1';
    this.academicYear = '2025 - 2026';
    this.customBellSchedule = undefined;
    this.currentFileName = 'Saudi Arabia 1.roz';
    this.schemaVersion = 115;
    this.scheduleCycleKind = 'saudi';
    this.cycleDays = 5;
    this.periodsPerDay = 12;
    this.currentSampleId = 'saudi';
    this.selectedEntityId = '';
    this.viewMode = 'classes';
    this.showWelcomeBanner = true;
  }

  // Simulated dynamic bell generation conforming to page.tsx:186-226
  get dynamicBells() {
    if (this.customBellSchedule && this.customBellSchedule.length === this.periodsPerDay) {
      return this.customBellSchedule;
    }
    if (this.periodsPerDay === 12) {
      return [
        '08:00 - 08:45', '08:55 - 09:40', '09:50 - 10:35', '10:55 - 11:40',
        '11:50 - 12:35', '12:45 - 13:30', '13:40 - 14:25', '14:35 - 15:20',
        '15:30 - 16:15', '16:25 - 17:10', '17:20 - 18:05', '18:15 - 19:00',
      ];
    }
    if (this.periodsPerDay === 7) {
      return [
        '08:00 - 08:45', '08:55 - 09:40', '09:50 - 10:35', '10:55 - 11:40',
        '11:50 - 12:35', '12:45 - 13:30', '13:40 - 14:25',
      ];
    }
    return Array.from({ length: this.periodsPerDay }, (_, i) => {
      const startH = 8 + Math.floor((i * 55) / 60);
      const startM = (i * 55) % 60;
      const endH = 8 + Math.floor(((i * 55) + 45) / 60);
      const endM = ((i * 55) + 45) % 60;
      return `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    });
  }

  // Simulated mock fetch
  async mockFetch(url) {
    this.fetchCalls.push(url);
    if (url === '/demos/Saudi_Arabia_1.roz') {
      const p = path.resolve(opentimetableRoot, 'apps/web/public/demos/Saudi_Arabia_1.roz');
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
    }
    if (url === '/demos/Demo1.roz') {
      const p = path.resolve(opentimetableRoot, 'apps/web/public/demos/Demo1.roz');
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        };
      }
    }
    return { ok: false, status: 404 };
  }

  // Simulated page.tsx:384-474 initBoot
  async initBoot() {
    const isMounted = true;
    try {
      const rawSaved = this.storage.getItem('opentimetable_saved_state');
      const rawAutosave = this.storage.getItem('opentimetable_autosave_state');

      let savedState = null;
      let autosaveState = null;

      if (rawSaved) {
        try { savedState = JSON.parse(rawSaved); } catch {}
      }
      if (rawAutosave) {
        try { autosaveState = JSON.parse(rawAutosave); } catch {}
      }

      let targetState = null;
      if (savedState && autosaveState) {
        targetState =
          (autosaveState.timestamp || 0) >= (savedState.timestamp || 0)
            ? autosaveState
            : savedState;
      } else {
        targetState = savedState || autosaveState;
      }

      if (
        targetState &&
        ((Array.isArray(targetState.teachers) && targetState.teachers.length > 0) ||
          (Array.isArray(targetState.lessons) && targetState.lessons.length > 0) ||
          (Array.isArray(targetState.classes) && targetState.classes.length > 0) ||
          (targetState.schoolName && targetState.schoolName !== 'Saudi Arabia 1'))
      ) {
        if (isMounted) {
          if (Array.isArray(targetState.teachers)) this.teachers = targetState.teachers;
          if (Array.isArray(targetState.classes)) this.classes = targetState.classes;
          if (Array.isArray(targetState.rooms)) this.rooms = targetState.rooms;
          if (Array.isArray(targetState.subjects)) this.subjects = targetState.subjects;
          if (Array.isArray(targetState.lessons)) this.lessons = targetState.lessons;
          if (Array.isArray(targetState.placements)) this.placements = targetState.placements;
          if (targetState.timeOffMatrix) this.timeOffMatrix = targetState.timeOffMatrix;
          if (targetState.schoolName) this.schoolName = targetState.schoolName;
          if (targetState.academicYear) this.academicYear = targetState.academicYear;
          if (Array.isArray(targetState.bellSchedule)) this.customBellSchedule = targetState.bellSchedule;
          if (targetState.currentFileName) this.currentFileName = targetState.currentFileName;
          if (targetState.schemaVersion) this.schemaVersion = targetState.schemaVersion;
          if (targetState.scheduleCycleKind) this.scheduleCycleKind = targetState.scheduleCycleKind;
          if (typeof targetState.cycleDays === 'number') this.cycleDays = targetState.cycleDays;
          if (typeof targetState.periodsPerDay === 'number') this.periodsPerDay = targetState.periodsPerDay;
          if (targetState.currentSampleId) this.currentSampleId = targetState.currentSampleId;
          if (targetState.selectedEntityId) this.selectedEntityId = targetState.selectedEntityId;
          if (targetState.viewMode) this.viewMode = targetState.viewMode;

          this.showWelcomeBanner = false;
          this.isHydrated = true;
          return;
        }
      }
    } catch (err) {
      console.warn('Error restoring state from localStorage:', err);
    }

    try {
      let res = await this.mockFetch('/demos/Saudi_Arabia_1.roz');
      let fname = 'Saudi Arabia 1.roz';
      if (!res.ok) {
        res = await this.mockFetch('/demos/Demo1.roz');
        fname = 'Demo1.roz';
      }
      if (res.ok && isMounted) {
        const buf = await res.arrayBuffer();
        const parsed = parseRozBinary(Buffer.from(buf), fname);
        this.teachers = parsed.mapped.teachers;
        this.classes = parsed.mapped.classes;
        this.rooms = parsed.mapped.rooms;
        this.subjects = parsed.mapped.subjects;
        this.lessons = parsed.mapped.lessons;
        this.placements = parsed.mapped.placements;
        this.schoolName = parsed.school_name;
        this.currentFileName = fname;
      }
    } catch (err) {
      console.warn('Initial demo pre-load error:', err);
    } finally {
      if (isMounted) {
        this.isHydrated = true;
      }
    }
  }

  // Simulated page.tsx:480-523 autoSaveEffect
  triggerAutoSave() {
    if (!this.isHydrated) return;
    if (this.lessons.length === 0 && this.teachers.length === 0) return;
    try {
      const stateToSave = {
        teachers: this.teachers,
        classes: this.classes,
        rooms: this.rooms,
        subjects: this.subjects,
        lessons: this.lessons,
        placements: this.placements,
        timeOffMatrix: this.timeOffMatrix,
        schoolName: this.schoolName,
        academicYear: this.academicYear,
        currentFileName: this.currentFileName,
        schemaVersion: this.schemaVersion,
        scheduleCycleKind: this.scheduleCycleKind,
        cycleDays: this.cycleDays,
        periodsPerDay: this.periodsPerDay,
        bellSchedule: this.dynamicBells,
        timestamp: Date.now(),
      };
      this.storage.setItem('opentimetable_autosave_state', JSON.stringify(stateToSave));
    } catch {}
  }

  // Simulated page.tsx:914-948 handleSaveFile
  handleSaveFile() {
    const stateToSave = {
      teachers: this.teachers,
      classes: this.classes,
      rooms: this.rooms,
      subjects: this.subjects,
      lessons: this.lessons,
      placements: this.placements,
      timeOffMatrix: this.timeOffMatrix,
      schoolName: this.schoolName,
      academicYear: this.academicYear,
      currentFileName: this.currentFileName,
      schemaVersion: this.schemaVersion,
      scheduleCycleKind: this.scheduleCycleKind,
      cycleDays: this.cycleDays,
      periodsPerDay: this.periodsPerDay,
      bellSchedule: this.dynamicBells,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(stateToSave);
    this.storage.setItem('opentimetable_saved_state', serialized);
    this.storage.setItem('opentimetable_autosave_state', serialized);
    return stateToSave;
  }

  // Simulated page.tsx:951-991 handleSaveAs
  handleSaveAs() {
    const stateToSave = {
      teachers: this.teachers,
      classes: this.classes,
      rooms: this.rooms,
      subjects: this.subjects,
      lessons: this.lessons,
      placements: this.placements,
      timeOffMatrix: this.timeOffMatrix,
      schoolName: this.schoolName,
      academicYear: this.academicYear,
      currentFileName: this.currentFileName,
      schemaVersion: this.schemaVersion,
      scheduleCycleKind: this.scheduleCycleKind,
      cycleDays: this.cycleDays,
      periodsPerDay: this.periodsPerDay,
      bellSchedule: this.dynamicBells,
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(stateToSave, null, 2);
    this.storage.setItem('opentimetable_saved_state', JSON.stringify(stateToSave));
    this.storage.setItem('opentimetable_autosave_state', JSON.stringify(stateToSave));

    const safeName = (this.schoolName || 'timetable').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    const filename = `${safeName}.json`;
    return {
      serialized,
      filename,
      stateToSave,
    };
  }

  // Simulated handleUpdateSchool from BasicDataModal
  handleUpdateSchool(data) {
    if (data.schoolName) this.schoolName = data.schoolName;
    if (data.academicYear) this.academicYear = data.academicYear;
    if (typeof data.cycleDays === 'number') this.cycleDays = data.cycleDays;
    if (typeof data.periodsPerDay === 'number') this.periodsPerDay = data.periodsPerDay;
    if (data.bellSchedule) this.customBellSchedule = data.bellSchedule;
    this.triggerAutoSave();
  }
}

// ==============================================================================
// 1. Cold Boot LocalStorage Hydration & Fetch Bypass
// ==============================================================================
describe('1. Cold Boot LocalStorage Hydration & Fetch Bypass (Feature 1)', () => {
  it('restores pre-populated saved state without fetching /demos/Saudi_Arabia_1.roz', async () => {
    const storage = new MockLocalStorage();
    const customSchool = {
      teachers: [{ id: 'T101', name: 'أ. محمد الغامدي', short: 'م.غ' }],
      classes: [{ id: 'C101', name: 'الصف الأول الثانوي', short: '1/ث' }],
      rooms: [{ id: 'R101', name: 'مختبر الفيزياء', capacity: 30 }],
      subjects: [{ id: 'S101', name: 'فيزياء 1', code: 'PHY1', color: '#38bdf8' }],
      lessons: [{ id: 'L101', teacherId: 'T101', classId: 'C101', subjectId: 'S101', duration: 1 }],
      placements: [{ lessonId: 'L101', dayIndex: 0, periodIndex: 1, roomId: 'R101' }],
      timeOffMatrix: { 'T101-0-0': 0 },
      schoolName: 'ثانوية الملك فهد النموذجية',
      academicYear: '2026 - 2027',
      bellSchedule: ['07:30 - 08:15', '08:25 - 09:10'],
      cycleDays: 6,
      periodsPerDay: 8,
      timestamp: 1700000000000,
    };

    storage.setItem('opentimetable_saved_state', JSON.stringify(customSchool));

    const sim = new StudioPersistenceSimulator(storage);
    await sim.initBoot();

    // Verify exact state restored
    assert.strictEqual(sim.isHydrated, true, 'isHydrated must be true');
    assert.strictEqual(sim.schoolName, 'ثانوية الملك فهد النموذجية');
    assert.strictEqual(sim.academicYear, '2026 - 2027');
    assert.strictEqual(sim.cycleDays, 6);
    assert.strictEqual(sim.periodsPerDay, 8);
    assert.strictEqual(sim.teachers.length, 1);
    assert.strictEqual(sim.teachers[0].name, 'أ. محمد الغامدي');
    assert.strictEqual(sim.classes.length, 1);
    assert.strictEqual(sim.lessons.length, 1);
    assert.strictEqual(sim.placements.length, 1);
    assert.strictEqual(sim.timeOffMatrix['T101-0-0'], 0);
    assert.strictEqual(sim.showWelcomeBanner, false);

    // CRITICAL ADVERSARIAL CHECK: fetch must NEVER have been called!
    assert.strictEqual(sim.fetchCalls.length, 0, 'Must NOT fetch demo file when saved state exists');
  });

  it('dual storage arbitration: selects autosave state when it is newer than saved state', async () => {
    const storage = new MockLocalStorage();
    const olderSaved = {
      schoolName: 'Older Saved School',
      teachers: [{ id: 'T1', name: 'Teacher 1' }],
      lessons: [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 }],
      timestamp: 1000,
    };
    const newerAutosave = {
      schoolName: 'Newer Autosaved School',
      teachers: [{ id: 'T1', name: 'Teacher 1' }, { id: 'T2', name: 'Teacher 2' }],
      lessons: [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 }],
      timestamp: 2000,
    };

    storage.setItem('opentimetable_saved_state', JSON.stringify(olderSaved));
    storage.setItem('opentimetable_autosave_state', JSON.stringify(newerAutosave));

    const sim = new StudioPersistenceSimulator(storage);
    await sim.initBoot();

    assert.strictEqual(sim.schoolName, 'Newer Autosaved School', 'Must pick newer autosave state');
    assert.strictEqual(sim.teachers.length, 2);
    assert.strictEqual(sim.fetchCalls.length, 0);
  });

  it('dual storage arbitration: selects manual saved state when it is newer than autosave state', async () => {
    const storage = new MockLocalStorage();
    const newerSaved = {
      schoolName: 'Manual Saved School (Latest)',
      teachers: [{ id: 'T1', name: 'Teacher 1' }],
      lessons: [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 }],
      timestamp: 5000,
    };
    const olderAutosave = {
      schoolName: 'Older Autosaved School',
      teachers: [{ id: 'T1', name: 'Teacher 1' }],
      lessons: [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 }],
      timestamp: 3000,
    };

    storage.setItem('opentimetable_saved_state', JSON.stringify(newerSaved));
    storage.setItem('opentimetable_autosave_state', JSON.stringify(olderAutosave));

    const sim = new StudioPersistenceSimulator(storage);
    await sim.initBoot();

    assert.strictEqual(sim.schoolName, 'Manual Saved School (Latest)', 'Must pick newer manual saved state');
    assert.strictEqual(sim.fetchCalls.length, 0);
  });

  it('corrupted JSON recovery: recovers gracefully and falls back to demo when storage is invalid JSON', async () => {
    const storage = new MockLocalStorage();
    storage.setItem('opentimetable_saved_state', '{ invalid-json-syntax: unquoted ');
    storage.setItem('opentimetable_autosave_state', '<<<NOT JSON>>>');

    const sim = new StudioPersistenceSimulator(storage);
    await sim.initBoot();

    assert.strictEqual(sim.isHydrated, true, 'isHydrated must still be marked true after fallback');
    assert.ok(sim.fetchCalls.includes('/demos/Saudi_Arabia_1.roz'), 'Must fall back to fetch demo');
    assert.strictEqual(sim.teachers.length, 82, 'Must load Saudi Arabia 1 demo');
  });

  it('empty storage cold boot: falls back to demo fetch when localStorage has no data', async () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);

    await sim.initBoot();

    assert.strictEqual(sim.isHydrated, true);
    assert.ok(sim.fetchCalls.includes('/demos/Saudi_Arabia_1.roz'));
    assert.strictEqual(sim.teachers.length, 82);
  });
});

// ==============================================================================
// 2. Auto-Save Synchronization Guard & Race Prevention
// ==============================================================================
describe('2. Auto-Save Synchronization Guard (Feature 2)', () => {
  it('prevents auto-save from clobbering storage before hydration completes', () => {
    const storage = new MockLocalStorage();
    const existingValuableData = {
      schoolName: 'Valuable User Work',
      teachers: Array.from({ length: 40 }, (_, i) => ({ id: `T${i}`, name: `Teacher ${i}` })),
      lessons: Array.from({ length: 120 }, (_, i) => ({ id: `L${i}`, teacherId: `T0`, classId: `C0`, subjectId: `S0`, duration: 1 })),
      timestamp: 999999,
    };
    storage.setItem('opentimetable_autosave_state', JSON.stringify(existingValuableData));

    const sim = new StudioPersistenceSimulator(storage);
    // Notice sim.isHydrated is false (before initBoot completes)
    assert.strictEqual(sim.isHydrated, false);

    // Simulate 50 rapid state changes / triggers before hydration
    for (let i = 0; i < 50; i++) {
      sim.teachers = [{ id: 'temp', name: 'Temp' }];
      sim.lessons = [{ id: 'tempL', teacherId: 'temp', classId: 'C1', subjectId: 'S1', duration: 1 }];
      sim.triggerAutoSave();
    }

    // Verify storage was NEVER overwritten
    const currentStorage = JSON.parse(storage.getItem('opentimetable_autosave_state'));
    assert.strictEqual(currentStorage.schoolName, 'Valuable User Work', 'Storage must NOT be clobbered before hydration');
    assert.strictEqual(currentStorage.teachers.length, 40);
    assert.strictEqual(currentStorage.lessons.length, 120);
    assert.strictEqual(currentStorage.timestamp, 999999);
  });

  it('does not write auto-save when lessons and teachers are empty even if hydrated', () => {
    const storage = new MockLocalStorage();
    storage.setItem('opentimetable_autosave_state', JSON.stringify({ marker: 'preserved', timestamp: 123 }));

    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;
    sim.teachers = [];
    sim.lessons = [];
    sim.triggerAutoSave();

    const stored = JSON.parse(storage.getItem('opentimetable_autosave_state'));
    assert.strictEqual(stored.marker, 'preserved', 'Empty lessons and teachers must not trigger auto-save');
  });

  it('successfully auto-saves once hydrated upon entity or school updates', () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;
    sim.teachers = [{ id: 'T1', name: 'Teacher 1' }];
    sim.lessons = [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 }];
    sim.schoolName = 'Active Testing School';
    sim.cycleDays = 6;
    sim.periodsPerDay = 9;

    sim.triggerAutoSave();

    const saved = JSON.parse(storage.getItem('opentimetable_autosave_state'));
    assert.ok(saved, 'Autosave item must exist');
    assert.strictEqual(saved.schoolName, 'Active Testing School');
    assert.strictEqual(saved.cycleDays, 6);
    assert.strictEqual(saved.periodsPerDay, 9);
    assert.strictEqual(saved.bellSchedule.length, 9);
    assert.ok(saved.timestamp > 0);
  });
});

// ==============================================================================
// 3. Dual Persistence: handleSaveFile Synchronization
// ==============================================================================
describe('3. Dual Persistence: handleSaveFile Synchronization (Feature 3)', () => {
  it('synchronizes opentimetable_saved_state and opentimetable_autosave_state with identical data', () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;
    sim.schoolName = 'Al-Faisal Academy';
    sim.academicYear = '2026 - 2027';
    sim.cycleDays = 7;
    sim.periodsPerDay = 10;
    sim.teachers = [{ id: 'T1', name: 'Dr. Tariq' }];
    sim.classes = [{ id: 'C1', name: 'Grade 12 Advanced' }];
    sim.rooms = [{ id: 'R1', name: 'Physics Lab' }];
    sim.subjects = [{ id: 'S1', name: 'AP Physics', code: 'APP' }];
    sim.lessons = [{ id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 2 }];
    sim.placements = [{ lessonId: 'L1', dayIndex: 1, periodIndex: 3, roomId: 'R1' }];
    sim.timeOffMatrix = { 'T1-1-0': 0 };

    const savedResult = sim.handleSaveFile();

    const rawSaved = storage.getItem('opentimetable_saved_state');
    const rawAutosave = storage.getItem('opentimetable_autosave_state');

    assert.ok(rawSaved, 'opentimetable_saved_state must be populated');
    assert.ok(rawAutosave, 'opentimetable_autosave_state must be populated');
    assert.strictEqual(rawSaved, rawAutosave, 'Both persistence keys must be byte-for-byte identical');

    const parsedSaved = JSON.parse(rawSaved);
    assert.strictEqual(parsedSaved.schoolName, 'Al-Faisal Academy');
    assert.strictEqual(parsedSaved.academicYear, '2026 - 2027');
    assert.strictEqual(parsedSaved.cycleDays, 7);
    assert.strictEqual(parsedSaved.periodsPerDay, 10);
    assert.strictEqual(parsedSaved.teachers.length, 1);
    assert.strictEqual(parsedSaved.placements.length, 1);
    assert.strictEqual(parsedSaved.timeOffMatrix['T1-1-0'], 0);
    assert.strictEqual(parsedSaved.timestamp, savedResult.timestamp);
  });
});

// ==============================================================================
// 4. Save As Project Export & JSON Serialization
// ==============================================================================
describe('4. Save As Project Export & JSON Serialization (Feature 3)', () => {
  it('generates valid, formatted JSON with all active entities and metadata', () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;
    sim.schoolName = 'مدارس رياض الصالحين النموذجية';
    sim.academicYear = '2026 - 2027';
    sim.cycleDays = 5;
    sim.periodsPerDay = 7;
    sim.teachers = [
      { id: 'T1', name: 'أحمد', short: 'أح' },
      { id: 'T2', name: 'خالد', short: 'خل' },
    ];
    sim.classes = [{ id: 'C1', name: 'أول ثانوي أ' }];
    sim.rooms = [{ id: 'R1', name: 'معمل 1' }];
    sim.subjects = [{ id: 'S1', name: 'رياضيات' }];
    sim.lessons = [
      { id: 'L1', teacherId: 'T1', classId: 'C1', subjectId: 'S1', duration: 1 },
      { id: 'L2', teacherId: 'T2', classId: 'C1', subjectId: 'S1', duration: 1 },
    ];
    sim.placements = [
      { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
    ];
    sim.timeOffMatrix = { 'T1-0-1': 2, 'T2-4-6': 0 };

    const { serialized, filename, stateToSave } = sim.handleSaveAs();

    // Verify filename preserves Arabic characters cleanly
    assert.strictEqual(filename, 'مدارس_رياض_الصالحين_النموذجية.json', 'Filename must sanitize and keep Arabic');

    // Verify serialized format: 2-space indentation
    assert.ok(serialized.includes('  "schoolName": "مدارس رياض الصالحين النموذجية"'), 'Must have 2-space indentation');

    // Roundtrip verification: JSON.parse must restore all objects identically
    const reloaded = JSON.parse(serialized);
    assert.deepStrictEqual(reloaded.teachers, stateToSave.teachers);
    assert.deepStrictEqual(reloaded.classes, stateToSave.classes);
    assert.deepStrictEqual(reloaded.rooms, stateToSave.rooms);
    assert.deepStrictEqual(reloaded.subjects, stateToSave.subjects);
    assert.deepStrictEqual(reloaded.lessons, stateToSave.lessons);
    assert.deepStrictEqual(reloaded.placements, stateToSave.placements);
    assert.deepStrictEqual(reloaded.timeOffMatrix, stateToSave.timeOffMatrix);
    assert.strictEqual(reloaded.cycleDays, 5);
    assert.strictEqual(reloaded.periodsPerDay, 7);
    assert.strictEqual(reloaded.bellSchedule.length, 7);

    // Verify localStorage was also synchronized
    assert.strictEqual(storage.getItem('opentimetable_saved_state'), JSON.stringify(stateToSave));
    assert.strictEqual(storage.getItem('opentimetable_autosave_state'), JSON.stringify(stateToSave));
  });

  it('safely handles special characters and edge-case school names in export filename', () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;

    // School name with slashes, question marks, spaces, colons
    sim.schoolName = 'Al-Noor / School : Branch #1 (Girls) [2026]';
    const { filename } = sim.handleSaveAs();
    assert.strictEqual(filename, 'Al-Noor___School___Branch__1__Girls___2026_.json');

    // Empty school name fallback
    sim.schoolName = '';
    const { filename: fallbackName } = sim.handleSaveAs();
    assert.strictEqual(fallbackName, 'timetable.json');
  });
});

// ==============================================================================
// 5. Dynamic School Setup Tab & Limits Elimination (Features 4, 5, 6, 7)
// ==============================================================================
describe('5. Dynamic School Setup Tab & Limits Elimination (Features 4, 5, 6, 7)', () => {
  it('BasicDataModal School tab updates dimensions and bell schedule', () => {
    const storage = new MockLocalStorage();
    const sim = new StudioPersistenceSimulator(storage);
    sim.isHydrated = true;
    sim.teachers = [{ id: 'T1', name: 'Teacher 1' }];

    sim.handleUpdateSchool({
      schoolName: 'Al-Khobar High School',
      academicYear: '2026 - 2027',
      cycleDays: 6,
      periodsPerDay: 8,
      bellSchedule: [
        '07:00 - 07:45', '07:50 - 08:35', '08:40 - 09:25', '09:45 - 10:30',
        '10:35 - 11:20', '11:25 - 12:10', '12:15 - 13:00', '13:05 - 13:50',
      ],
    });

    assert.strictEqual(sim.schoolName, 'Al-Khobar High School');
    assert.strictEqual(sim.academicYear, '2026 - 2027');
    assert.strictEqual(sim.cycleDays, 6);
    assert.strictEqual(sim.periodsPerDay, 8);
    assert.deepStrictEqual(sim.dynamicBells.length, 8);
    assert.strictEqual(sim.dynamicBells[0], '07:00 - 07:45');

    // Verify auto-save captured the update
    const autoSaved = JSON.parse(storage.getItem('opentimetable_autosave_state'));
    assert.strictEqual(autoSaved.schoolName, 'Al-Khobar High School');
    assert.strictEqual(autoSaved.cycleDays, 6);
    assert.strictEqual(autoSaved.periodsPerDay, 8);
  });

  it('TimeOffModal source verification: default initialMatrix is {} without hardcoded T2-0-0', () => {
    assert.ok(fs.existsSync(timeOffModalPath), `TimeOffModal.tsx must exist`);
    const content = fs.readFileSync(timeOffModalPath, 'utf8');

    // Must NOT have 'T2-0-0': 0
    assert.ok(!content.includes("'T2-0-0': 0"), "TimeOffModal.tsx must NOT contain hardcoded 'T2-0-0': 0");
    assert.ok(content.includes('initialMatrix = {}'), 'TimeOffModal.tsx must default initialMatrix to {}');
  });

  it('TestTimetableModal source verification: derives capacity dynamically from cycleDays * periodsPerDay', () => {
    assert.ok(fs.existsSync(testTimetableModalPath), `TestTimetableModal.tsx must exist`);
    const content = fs.readFileSync(testTimetableModalPath, 'utf8');

    // Must derive totalCapacity dynamically
    assert.match(content, /totalCapacity\s*=\s*\(cycleDays\s*\|\|\s*5\)\s*\*\s*\(periodsPerDay\s*\|\|\s*7\)/);
    assert.match(content, /highWorkloadThreshold\s*=\s*Math\.round\(totalCapacity\s*\*\s*0\.85\)/);

    // Must NOT have hardcoded assignedLessons.length <= 35
    assert.ok(!content.includes('assignedLessons.length <= 35'), 'Must not hardcode <= 35 limit');
    assert.ok(!content.includes('maxCapacity: 35'), 'Must not hardcode maxCapacity: 35');
  });

  it('solver.worker.ts source verification: dynamic coordinate mapping with resolvedPeriodsPerDay', () => {
    assert.ok(fs.existsSync(solverWorkerPath), `solver.worker.ts must exist`);
    const content = fs.readFileSync(solverWorkerPath, 'utf8');

    // Must resolve resolvedPeriodsPerDay and map dayIndex/periodIndex dynamically
    assert.match(content, /resolvedPeriodsPerDay/);
    assert.match(content, /Math\.floor\(p\.slot\s*\/\s*resolvedPeriodsPerDay\)/);
    assert.match(content, /p\.slot\s*%\s*resolvedPeriodsPerDay/);

    // Must not have p.slot % 5
    assert.ok(!content.includes('p.slot % 5'), 'Must not hardcode p.slot % 5 for day calculation');
  });

  it('useWasmSolver.ts fallback solver: computes totalCapacity and coordinates dynamically', () => {
    assert.ok(fs.existsSync(useWasmSolverPath), `useWasmSolver.ts must exist`);
    const content = fs.readFileSync(useWasmSolverPath, 'utf8');

    assert.match(content, /totalCapacity\s*=\s*Math\.max\(1,\s*days\s*\*\s*periods\)/);
    assert.match(content, /Math\.floor\(currentSlot\s*\/\s*periods\)/);
    assert.match(content, /currentSlot\s*%\s*periods/);
    assert.ok(!content.includes('slot % days'), 'Must not use inverted slot % days in fallback');
  });
});
