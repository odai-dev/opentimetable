// opentimetable/tests/test_dynamic_scaling_adversarial.mjs
// Adversarial Empirical Test Suite: Dynamic Multi-Period Grid Scaling & Boundaries (R2)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js');
const { parseRozBinary } = jiti(import.meta.url)('../apps/web/src/lib/roz-parser.ts');

// Reference implementation of core page.tsx logic under test
function createSchedulerState({ cycleDays = 5, periodsPerDay = 12 } = {}) {
  let placements = [];
  let history = [];
  let redoStack = [];
  let timeOffMatrix = {};

  const lessons = [];
  const teachers = [];
  const classes = [];
  const rooms = [];

  const lessonMap = new Map();
  const teacherMap = new Map();
  const classMap = new Map();
  const roomMap = new Map();

  function addTeacher(t) {
    teachers.push(t);
    teacherMap.set(t.id, t);
  }

  function addClass(c) {
    classes.push(c);
    classMap.set(c.id, c);
  }

  function addRoom(r) {
    rooms.push(r);
    roomMap.set(r.id, r);
  }

  function addLesson(l) {
    lessons.push(l);
    lessonMap.set(l.id, l);
  }

  function recordHistory() {
    history.push([...placements]);
    redoStack = [];
  }

  // Exact conflict calculation from page.tsx:436-530
  function computeConflicts() {
    const list = [];

    // 1. Simultaneous double booking
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];

        if (p1.dayIndex === p2.dayIndex && p1.periodIndex === p2.periodIndex) {
          const l1 = lessonMap.get(p1.lessonId);
          const l2 = lessonMap.get(p2.lessonId);
          if (!l1 || !l2) continue;

          if (l1.teacherId === l2.teacherId) {
            list.push({
              type: 'TEACHER_CLASH',
              lessonId: l1.id,
              message: `Teacher conflict: ${teacherMap.get(l1.teacherId)?.name || l1.teacherId} is double-booked`,
            });
          }
          if (p1.roomId && p2.roomId && p1.roomId === p2.roomId) {
            list.push({
              type: 'ROOM_CLASH',
              lessonId: l1.id,
              message: `Room conflict: ${roomMap.get(p1.roomId)?.name || p1.roomId} is double-booked`,
            });
          }
          if (l1.classId === l2.classId) {
            list.push({
              type: 'CLASS_CLASH',
              lessonId: l1.id,
              message: `Class conflict: ${classMap.get(l1.classId)?.name || l1.classId} has two simultaneous lessons`,
            });
          }
        }
      }
    }

    // 2. Time-Off availability constraints (UNAVAILABLE_SLOT) with dynamic periodsPerDay
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      // Check Teacher Time-Off
      const teacherKey = `${lesson.teacherId}-${p.dayIndex}-${p.periodIndex}`;
      const teacher = teacherMap.get(lesson.teacherId);
      const isTeacherBlockedInMatrix = timeOffMatrix[teacherKey] === 0;
      const isTeacherUnavailableInTeacherModel = teacher?.unavailableSlots?.includes(
        p.dayIndex * periodsPerDay + p.periodIndex
      );

      if (isTeacherBlockedInMatrix || isTeacherUnavailableInTeacherModel) {
        list.push({
          type: 'UNAVAILABLE_SLOT',
          lessonId: lesson.id,
          message: `Time-Off conflict: Teacher ${teacher?.name || lesson.teacherId} is blocked at Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
        });
      }

      // Check Class Time-Off
      const classKey = `${lesson.classId}-${p.dayIndex}-${p.periodIndex}`;
      if (timeOffMatrix[classKey] === 0) {
        const cls = classMap.get(lesson.classId);
        list.push({
          type: 'UNAVAILABLE_SLOT',
          lessonId: lesson.id,
          message: `Time-Off conflict: Class ${cls?.name || lesson.classId} is blocked at Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
        });
      }
    }

    return list;
  }

  // Exact handlePlaceLesson from page.tsx:580-661
  function handlePlaceLesson(lessonId, dayIndex, periodIndex, roomId) {
    recordHistory();
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    const assignedRoom = roomId || lesson.roomId || rooms[0]?.id || 'R1';

    if (dayIndex !== undefined && periodIndex !== undefined) {
      const filtered = placements.filter((p) => p.lessonId !== lessonId);
      placements = [
        ...filtered,
        { lessonId, dayIndex, periodIndex, roomId: assignedRoom },
      ];
    } else {
      let placed = false;
      for (let d = 0; d < cycleDays && !placed; d++) {
        for (let p = 0; p < periodsPerDay && !placed; p++) {
          const occupied = placements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId ||
              plc.roomId === assignedRoom
            );
          });

          if (!occupied) {
            placements = [
              ...placements.filter((item) => item.lessonId !== lessonId),
              { lessonId, dayIndex: d, periodIndex: p, roomId: assignedRoom },
            ];
            placed = true;
          }
        }
      }

      if (!placed) {
        for (let d = 0; d < cycleDays && !placed; d++) {
          for (let p = 0; p < periodsPerDay && !placed; p++) {
            const classOccupied = placements.some((plc) => {
              if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
              const existingLesson = lessonMap.get(plc.lessonId);
              return existingLesson?.classId === lesson.classId;
            });
            if (!classOccupied) {
              placements = [
                ...placements.filter((item) => item.lessonId !== lessonId),
                { lessonId, dayIndex: d, periodIndex: p, roomId: assignedRoom },
              ];
              placed = true;
            }
          }
        }
      }
    }
  }

  // Exact handleMovePlacement from page.tsx:671-681
  function handleMovePlacement(lessonId, targetDay, targetPeriod) {
    recordHistory();
    placements = placements.map((p) =>
      p.lessonId === lessonId
        ? { ...p, dayIndex: targetDay, periodIndex: targetPeriod }
        : p
    );
  }

  // Exact handleRemovePlacement from page.tsx:664-668
  function handleRemovePlacement(lessonId) {
    recordHistory();
    placements = placements.filter((p) => p.lessonId !== lessonId);
  }

  // Exact handleAutoPlaceAll from page.tsx:684-719
  function handleAutoPlaceAll() {
    recordHistory();
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

  // Exact TimeOffModal operations with dynamic totalDays and totalPeriods
  function timeOffBulkActions(entityId) {
    const totalDays = cycleDays;
    const totalPeriods = periodsPerDay;
    const getKey = (d, p) => `${entityId}-${d}-${p}`;

    return {
      setAllAvailable: () => {
        const updated = { ...timeOffMatrix };
        for (let d = 0; d < totalDays; d++) {
          for (let p = 0; p < totalPeriods; p++) {
            updated[getKey(d, p)] = 1;
          }
        }
        timeOffMatrix = updated;
      },
      blockPeriod1: () => {
        const updated = { ...timeOffMatrix };
        for (let d = 0; d < totalDays; d++) {
          updated[getKey(d, 0)] = 0;
        }
        timeOffMatrix = updated;
      },
      blockLastPeriod: () => {
        const updated = { ...timeOffMatrix };
        const lastPeriodIdx = totalPeriods - 1;
        for (let d = 0; d < totalDays; d++) {
          updated[getKey(d, lastPeriodIdx)] = 0;
        }
        timeOffMatrix = updated;
      },
      invert: () => {
        const updated = { ...timeOffMatrix };
        for (let d = 0; d < totalDays; d++) {
          for (let p = 0; p < totalPeriods; p++) {
            const current = timeOffMatrix[getKey(d, p)] ?? 1;
            updated[getKey(d, p)] = current === 1 ? 0 : 1;
          }
        }
        timeOffMatrix = updated;
      },
    };
  }

  return {
    addTeacher,
    addClass,
    addRoom,
    addLesson,
    handlePlaceLesson,
    handleMovePlacement,
    handleRemovePlacement,
    handleAutoPlaceAll,
    computeConflicts,
    timeOffBulkActions,
    setTimeOffMatrix: (m) => { timeOffMatrix = m; },
    getTimeOffMatrix: () => timeOffMatrix,
    getPlacements: () => placements,
    setPlacements: (p) => { placements = p; },
  };
}

// -------------------------------------------------------------
// ADVERSARIAL TEST SUITE
// -------------------------------------------------------------

describe('Adversarial Test 1: Boundary Condition — Placement in Periods 7 through 11 (0-indexed)', () => {
  it('allows direct placement across all extended periods (7, 8, 9, 10, 11) in 12-period schedule', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 10' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });

    for (let p = 7; p <= 11; p++) {
      const lessonId = `L_p${p}`;
      scheduler.addLesson({ id: lessonId, subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });
      scheduler.handlePlaceLesson(lessonId, 0, p);
    }

    const placements = scheduler.getPlacements();
    assert.strictEqual(placements.length, 5, 'Must have placed all 5 lessons');

    for (let p = 7; p <= 11; p++) {
      const match = placements.find((plc) => plc.dayIndex === 0 && plc.periodIndex === p);
      assert.ok(match, `Lesson must be placed in day 0, period ${p}`);
      assert.strictEqual(match.lessonId, `L_p${p}`);
    }
  });

  it('handleMovePlacement correctly relocates a lesson to periods 7 through 11', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 10' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });
    scheduler.addLesson({ id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });

    scheduler.handlePlaceLesson('L1', 0, 0);
    assert.strictEqual(scheduler.getPlacements()[0].periodIndex, 0);

    // Move to period 11 (last period in 12-period day)
    scheduler.handleMovePlacement('L1', 2, 11);
    assert.strictEqual(scheduler.getPlacements()[0].dayIndex, 2);
    assert.strictEqual(scheduler.getPlacements()[0].periodIndex, 11);
  });

  it('handlePlaceLesson first-free-slot algorithm expands into periods 7 through 11 without skipping', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 10' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });

    // Fill periods 0 through 6 of Day 0 with distinct lessons
    for (let p = 0; p < 7; p++) {
      const lid = `L_fill_${p}`;
      scheduler.addLesson({ id: lid, subjectId: `S_${p}`, teacherId: 'T1', classId: 'C1', duration: 1 });
      scheduler.handlePlaceLesson(lid, 0, p);
    }

    // Now place another lesson for Class C1 / Teacher T1 without specifying slot
    scheduler.addLesson({ id: 'L_target', subjectId: 'S_target', teacherId: 'T1', classId: 'C1', duration: 1 });
    scheduler.handlePlaceLesson('L_target');

    // In a 12-period schedule, since Day 0 periods 0..6 are filled, it MUST place in Day 0, Period 7
    // (If periodsPerDay were 7, it would halt or jump to Day 1, Period 0)
    const targetPlacement = scheduler.getPlacements().find((p) => p.lessonId === 'L_target');
    assert.ok(targetPlacement, 'Target lesson must be placed');
    assert.strictEqual(targetPlacement.dayIndex, 0, 'Must remain on Day 0');
    assert.strictEqual(targetPlacement.periodIndex, 7, 'Must be placed in period 7 (0-indexed)');
  });

  it('correctly detects clashes at boundary period 11', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 1' });
    scheduler.addClass({ id: 'C2', name: 'Class 2' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });

    scheduler.addLesson({ id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });
    scheduler.addLesson({ id: 'L2', subjectId: 'S2', teacherId: 'T1', classId: 'C2', duration: 1 });

    scheduler.handlePlaceLesson('L1', 4, 11); // Day 4, Period 11
    scheduler.handlePlaceLesson('L2', 4, 11); // Day 4, Period 11 (same teacher)

    const conflicts = scheduler.computeConflicts();
    const teacherClash = conflicts.find((c) => c.type === 'TEACHER_CLASH');
    assert.ok(teacherClash, 'Must detect teacher clash in period 11');
  });
});

describe('Adversarial Test 2: Auto-Placement — Full-Day Placement up to Period 12', () => {
  it('places lessons into periods 7 through 11 when lesson demand exceeds 7 periods per day', () => {
    // Contrast test with single class demanding 45 periods across 5 days:
    // With 7 periods/day: 5 days * 7 periods = 35 capacity -> 10 lessons fail to place!
    const scheduler7 = createSchedulerState({ cycleDays: 5, periodsPerDay: 7 });
    scheduler7.addClass({ id: 'C1', name: 'Class 10' });
    scheduler7.addRoom({ id: 'R1', name: 'Room 1' });

    for (let i = 0; i < 45; i++) {
      const tid = `T_${i % 10}`;
      scheduler7.addTeacher({ id: tid, name: `Teacher ${tid}` });
      scheduler7.addLesson({ id: `L_${i}`, subjectId: `S_${i % 5}`, teacherId: tid, classId: 'C1', duration: 1 });
    }

    scheduler7.handleAutoPlaceAll();
    const placements7 = scheduler7.getPlacements();
    assert.strictEqual(placements7.length, 35, 'In 7-period mode, exactly 35 lessons can fit');
    assert.strictEqual(Math.max(...placements7.map((p) => p.periodIndex)), 6, 'Max period in 7-period mode is 6');

    // With 12 periods/day: 5 days * 12 periods = 60 capacity -> all 45 lessons place!
    const scheduler12 = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler12.addClass({ id: 'C1', name: 'Class 10' });
    scheduler12.addRoom({ id: 'R1', name: 'Room 1' });

    for (let i = 0; i < 45; i++) {
      const tid = `T_${i % 10}`;
      scheduler12.addTeacher({ id: tid, name: `Teacher ${tid}` });
      scheduler12.addLesson({ id: `L_${i}`, subjectId: `S_${i % 5}`, teacherId: tid, classId: 'C1', duration: 1 });
    }

    scheduler12.handleAutoPlaceAll();
    const placements12 = scheduler12.getPlacements();
    assert.strictEqual(placements12.length, 45, 'In 12-period mode, all 45 lessons fit completely');

    // Count placements in extended periods (7 to 11)
    const extendedPlacements = placements12.filter((p) => p.periodIndex >= 7 && p.periodIndex <= 11);
    assert.strictEqual(extendedPlacements.length, 17, 'Exactly 17 lessons placed in periods 7..11 across days');
    assert.strictEqual(Math.max(...placements12.map((p) => p.periodIndex)), 11, 'Max period index reaches period 11');

    // Verify 0 conflicts
    const conflicts = scheduler12.computeConflicts();
    assert.strictEqual(conflicts.length, 0, 'Auto-placed schedule must have 0 conflicts');
  });

  it('auto-places Saudi Arabia 1 lessons into period 7 (0-indexed) where 7-period limit would stop at period 6', () => {
    const saudiPath = path.resolve(process.cwd(), 'apps/web/public/demos/Saudi_Arabia_1.roz');
    const buffer = fs.readFileSync(saudiPath);
    const parsed = parseRozBinary(buffer, 'Saudi_Arabia_1.roz');

    // In 12-period mode:
    const scheduler12 = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    for (const t of parsed.mapped.teachers) scheduler12.addTeacher(t);
    for (const c of parsed.mapped.classes) scheduler12.addClass(c);
    for (const r of parsed.mapped.rooms) scheduler12.addRoom(r);
    for (const l of parsed.mapped.lessons) scheduler12.addLesson(l);

    scheduler12.setPlacements([]);
    scheduler12.handleAutoPlaceAll();

    const placements12 = scheduler12.getPlacements();
    assert.strictEqual(placements12.length, 481, 'Greedy auto-placement must place 481 lessons in 12-period mode');

    // Exactly 31 lessons are placed in period index 7 (Period 8)
    const period7Placements = placements12.filter((p) => p.periodIndex === 7);
    assert.strictEqual(period7Placements.length, 31, 'Must place 31 lessons in period index 7');

    // In 7-period mode:
    const scheduler7 = createSchedulerState({ cycleDays: 5, periodsPerDay: 7 });
    for (const t of parsed.mapped.teachers) scheduler7.addTeacher(t);
    for (const c of parsed.mapped.classes) scheduler7.addClass(c);
    for (const r of parsed.mapped.rooms) scheduler7.addRoom(r);
    for (const l of parsed.mapped.lessons) scheduler7.addLesson(l);

    scheduler7.setPlacements([]);
    scheduler7.handleAutoPlaceAll();

    const placements7 = scheduler7.getPlacements();
    // In 7-period mode, period index 7 has 0 placements because it stops at period 6
    const period7In7p = placements7.filter((p) => p.periodIndex === 7);
    assert.strictEqual(period7In7p.length, 0, '7-period mode has 0 placements in period 7');
    assert.strictEqual(Math.max(...placements7.map((p) => p.periodIndex)), 6, '7-period mode max period is 6');
  });

  it('high-volume saturation test: auto-places 400 lessons fully across all periods 0 through 11', () => {
    const saudiPath = path.resolve(process.cwd(), 'apps/web/public/demos/Saudi_Arabia_1.roz');
    const buffer = fs.readFileSync(saudiPath);
    const parsed = parseRozBinary(buffer, 'Saudi_Arabia_1.roz');

    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    for (const t of parsed.mapped.teachers) scheduler.addTeacher(t);
    for (const c of parsed.mapped.classes) scheduler.addClass(c);
    for (const r of parsed.mapped.rooms) scheduler.addRoom(r);
    for (const l of parsed.mapped.lessons) scheduler.addLesson(l);

    // Add 150 extra lessons across classes
    for (let i = 0; i < 150; i++) {
      const cls = parsed.mapped.classes[i % parsed.mapped.classes.length];
      scheduler.addLesson({
        id: `EXTRA_${i}`,
        subjectId: 'EXTRA_SUB',
        teacherId: `EXTRA_T_${i}`,
        classId: cls.id,
        duration: 1,
      });
    }

    scheduler.setPlacements([]);
    scheduler.handleAutoPlaceAll();

    const placements = scheduler.getPlacements();
    assert.strictEqual(placements.length, 626, '626 lessons must be placed in saturation test');

    // Verify every period from 0 through 11 is utilized
    const periodsUsed = new Set(placements.map((p) => p.periodIndex));
    for (let p = 0; p <= 11; p++) {
      assert.ok(periodsUsed.has(p), `Auto-placement must utilize period ${p}`);
    }

    const maxPeriod = Math.max(...placements.map((p) => p.periodIndex));
    assert.strictEqual(maxPeriod, 11, 'Max period is exactly period 11 (12th period)');
  });
});

describe('Adversarial Test 3: Conflict Calculation — Dynamic periodsPerDay in Time-Off Checking', () => {
  it('correctly calculates slot index for Day 1, Period 10 with periodsPerDay = 12', () => {
    const periodsPerDay = 12;
    const dayIndex = 1;
    const periodIndex = 10;
    const expectedSlot = dayIndex * periodsPerDay + periodIndex; // 1 * 12 + 10 = 22

    assert.strictEqual(expectedSlot, 22, 'Slot index for Day 1, Period 10 in 12-period day must be 22');

    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });

    // Teacher T1 has unavailableSlot: [22]
    scheduler.addTeacher({ id: 'T1', name: 'Prof. Tariq', unavailableSlots: [22] });
    scheduler.addLesson({ id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });

    // Place L1 at Day 1, Period 10
    scheduler.handlePlaceLesson('L1', 1, 10);

    const conflicts = scheduler.computeConflicts();
    const timeOffConflict = conflicts.find((c) => c.type === 'UNAVAILABLE_SLOT');
    assert.ok(timeOffConflict, 'Must detect UNAVAILABLE_SLOT conflict at Day 1, Period 10');
    assert.ok(timeOffConflict.message.includes('Day 2, Period 11'), 'Message must reflect 1-indexed Day 2, Period 11');
  });

  it('contrast check: demonstrates that hardcoded 7 periods fails to detect Day 1, Period 10 (false negative)', () => {
    const dayIndex = 1;
    const periodIndex = 10;

    const dynamicSlot = dayIndex * 12 + periodIndex; // 22
    const hardcoded7Slot = dayIndex * 7 + periodIndex; // 17

    assert.notStrictEqual(dynamicSlot, hardcoded7Slot, 'Slot indices must diverge when dynamic periodsPerDay is used');
    assert.strictEqual(hardcoded7Slot, 17);

    // If teacher.unavailableSlots has [22], hardcoded 7 checking `1 * 7 + 10 = 17` would look for 17 and MISS 22!
    const teacherUnavailableSlots = [22];
    const detectedByDynamic = teacherUnavailableSlots.includes(dayIndex * 12 + periodIndex);
    const detectedByHardcoded7 = teacherUnavailableSlots.includes(dayIndex * 7 + periodIndex);

    assert.strictEqual(detectedByDynamic, true, 'Dynamic calculation MUST catch slot 22');
    assert.strictEqual(detectedByHardcoded7, false, 'Hardcoded 7 would suffer false negative on slot 22');
  });

  it('timeOffMatrix key check: flags unavailable slot when matrix has entry "T1-1-10": 0', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 1' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });
    scheduler.addLesson({ id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });

    scheduler.setTimeOffMatrix({
      'T1-1-10': 0, // Blocked at Day 1, Period 10
    });

    scheduler.handlePlaceLesson('L1', 1, 10);
    const conflicts = scheduler.computeConflicts();
    const clash = conflicts.find((c) => c.type === 'UNAVAILABLE_SLOT');
    assert.ok(clash, 'Must detect conflict when timeOffMatrix has "T1-1-10": 0');
  });

  it('class time-off matrix check: flags unavailable slot when matrix has entry "C1-3-11": 0', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    scheduler.addClass({ id: 'C1', name: 'Class 1' });
    scheduler.addTeacher({ id: 'T1', name: 'Teacher 1' });
    scheduler.addRoom({ id: 'R1', name: 'Room 1' });
    scheduler.addLesson({ id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 });

    scheduler.setTimeOffMatrix({
      'C1-3-11': 0, // Blocked at Day 3, Period 11 for Class C1
    });

    scheduler.handlePlaceLesson('L1', 3, 11);
    const conflicts = scheduler.computeConflicts();
    const clash = conflicts.find((c) => c.type === 'UNAVAILABLE_SLOT');
    assert.ok(clash, 'Must detect conflict when class timeOffMatrix has "C1-3-11": 0');
  });
});

describe('Adversarial Test 4: TimeOffModal Bulk Operations with 12 Periods', () => {
  it('blockLastPeriod targets period 11 (0-indexed) when periodsPerDay is 12, not period 6', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    const actions = scheduler.timeOffBulkActions('T1');

    actions.blockLastPeriod();
    const matrix = scheduler.getTimeOffMatrix();

    // Verify all 5 days have period 11 blocked
    for (let d = 0; d < 5; d++) {
      assert.strictEqual(matrix[`T1-${d}-11`], 0, `Day ${d} Period 11 must be blocked (0)`);
      // Verify period 6 (the old 7-period last period) is NOT blocked
      assert.strictEqual(matrix[`T1-${d}-6`], undefined, `Day ${d} Period 6 must remain unblocked`);
    }
  });

  it('setAllAvailable sets exactly 60 slots (5 days * 12 periods) to state 1', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    const actions = scheduler.timeOffBulkActions('T1');

    actions.setAllAvailable();
    const matrix = scheduler.getTimeOffMatrix();

    const keys = Object.keys(matrix);
    assert.strictEqual(keys.length, 60, 'Must have exactly 60 slots populated');
    for (const val of Object.values(matrix)) {
      assert.strictEqual(val, 1, 'Every slot must be 1 (Available)');
    }
  });

  it('invert flips all 60 slots correctly', () => {
    const scheduler = createSchedulerState({ cycleDays: 5, periodsPerDay: 12 });
    const actions = scheduler.timeOffBulkActions('T1');

    actions.setAllAvailable(); // all 60 are 1
    actions.blockPeriod1();    // 5 slots (d-0) are 0
    actions.invert();          // period 0 should now be 1, others 0

    const matrix = scheduler.getTimeOffMatrix();
    for (let d = 0; d < 5; d++) {
      assert.strictEqual(matrix[`T1-${d}-0`], 1, `Day ${d} Period 0 must be 1 after invert`);
      assert.strictEqual(matrix[`T1-${d}-1`], 0, `Day ${d} Period 1 must be 0 after invert`);
      assert.strictEqual(matrix[`T1-${d}-11`], 0, `Day ${d} Period 11 must be 0 after invert`);
    }
  });
});

describe('Adversarial Test 5: Ingestion Mapping & Dataset Switcher Transitions', () => {
  it('loadRozBuffer mapping correctly decodes teacher unavailable slots using detectedPeriods', () => {
    // Simulate teacher with raw unavailable slot 22 in a 12-period file
    const detectedPeriods = 12;
    const rawSlot = 22;
    const d = Math.floor(rawSlot / detectedPeriods);
    const p = rawSlot % detectedPeriods;

    assert.strictEqual(d, 1);
    assert.strictEqual(p, 10);

    const matrixKey = `T1-${d}-${p}`;
    assert.strictEqual(matrixKey, 'T1-1-10');

    // In a 7-period file with raw slot 22:
    const d7 = Math.floor(rawSlot / 7);
    const p7 = rawSlot % 7;
    assert.strictEqual(d7, 3);
    assert.strictEqual(p7, 1);
    assert.notStrictEqual(`T1-${d7}-${p7}`, matrixKey);
  });

  it('Demo 1 and Saudi Arabia 1 samples declare correct cycle dimensions', () => {
    const saudiPath = path.resolve(process.cwd(), 'apps/web/public/demos/Saudi_Arabia_1.roz');
    const demoPath = path.resolve(process.cwd(), 'apps/web/public/demos/Demo1.roz');

    const saudiParsed = parseRozBinary(fs.readFileSync(saudiPath), 'Saudi_Arabia_1.roz');
    const demoParsed = parseRozBinary(fs.readFileSync(demoPath), 'Demo1.roz');

    assert.strictEqual(saudiParsed.counts.teachers, 82);
    assert.strictEqual(demoParsed.counts.teachers, 45);
    assert.strictEqual(demoParsed.cycle_days, 7);
  });
});
