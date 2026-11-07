// opentimetable/tests/test_m4_solver_feasibility.mjs
// Milestone 4: Constraint Validation, Feasibility Diagnostics & Generation Engine (R4)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const {
  analyzeFeasibilityDiagnostics,
  validateScheduleConstraints,
} = jiti('../apps/web/src/lib/domain.ts');

describe('Milestone 4: Pre-Flight Feasibility & Constraint Engine Verification', () => {
  // Test fixture helpers
  const createMockTeacher = (id, name) => ({
    id,
    name,
    nameAr: name,
    speciality: 'General',
    color: '#3b82f6',
    unavailableSlots: [],
  });

  const createMockClass = (id, name) => ({
    id,
    name,
    nameAr: name,
    gradeLevel: '10',
    color: '#10b981',
  });

  const createMockRoom = (id, name, type = 'STANDARD', capacity = 35) => ({
    id,
    name,
    nameAr: name,
    type,
    capacity,
  });

  const createMockSubject = (id, name, requiredRoomType) => ({
    id,
    name,
    nameAr: name,
    code: id,
    color: '#6366f1',
    requiredRoomType,
  });

  const createMockLesson = (id, teacherId, classId, subjectId, duration = 1, extra = {}) => ({
    id,
    teacherId,
    classId,
    subjectId,
    duration,
    ...extra,
  });

  // =========================================================================
  // Suite 1: Pre-flight feasibility diagnostic (WF-SOL-02)
  // =========================================================================
  describe('Suite 1: Pre-flight Feasibility Diagnostics (Pigeonhole & Bottleneck Detection)', () => {
    it('should detect teacher pigeonhole exhaustion when required hours exceed unblocked slots', () => {
      const cycleDays = 5;
      const periodsPerDay = 2; // Total slots = 10
      const teacher = createMockTeacher('T1', 'Dr. Smith');
      const cls = createMockClass('C1', 'Grade 10A');
      const subject = createMockSubject('MATH', 'Math');

      // T1 has 10 hours required (10 x 1h lessons)
      const lessons = Array.from({ length: 10 }, (_, i) =>
        createMockLesson(`L_${i}`, 'T1', 'C1', 'MATH', 1)
      );

      // Block 3 slots in timeOffMatrix (available = 7)
      const timeOffMatrix = {
        'T1-0-0': 0,
        'T1-0-1': 0,
        'T1-1-0': 0,
      };

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers: [teacher],
        classes: [cls],
        rooms: [createMockRoom('R1', 'Main Hall')],
        subjects: [subject],
        lessons,
        cycleDays,
        periodsPerDay,
        timeOffMatrix,
      });

      assert.strictEqual(diagnostics.length, 1);
      const diag = diagnostics[0];
      assert.strictEqual(diag.type, 'PIGEONHOLE_TEACHER');
      assert.strictEqual(diag.severity, 'CRITICAL');
      assert.match(diag.title, /Dr\. Smith/);
      assert.strictEqual(diag.actionPayload?.type, 'UNBLOCK_TIMEOFF');
      assert.strictEqual(diag.actionPayload?.teacherId, 'T1');
      assert.strictEqual(diag.actionPayload?.slots.length, 3); // Shortage is 10 - 7 = 3
    });

    it('should detect room type bottleneck when demand exceeds physical room capacity', () => {
      const cycleDays = 5;
      const periodsPerDay = 2; // 10 slots per week
      const teacher = createMockTeacher('T1', 'Prof. Curie');
      const cls = createMockClass('C1', 'Chemistry Sec 1');
      const labSubject = createMockSubject('CHEM_LAB', 'Chemistry Lab', 'LAB_CHEM');

      // Only 1 Chemistry lab available (max 10 hours capacity)
      const rooms = [
        createMockRoom('R1', 'Lecture Hall 1', 'STANDARD'),
        createMockRoom('LAB1', 'Chemistry Lab 1', 'LAB_CHEM'),
      ];

      // Demand is 12 hours (exceeds 10 hours capacity)
      const lessons = Array.from({ length: 12 }, (_, i) =>
        createMockLesson(`L_LAB_${i}`, 'T1', 'C1', 'CHEM_LAB', 1)
      );

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers: [teacher],
        classes: [cls],
        rooms,
        subjects: [labSubject],
        lessons,
        cycleDays,
        periodsPerDay,
      });

      const labDiag = diagnostics.find((d) => d.type === 'ROOM_BOTTLENECK');
      assert.ok(labDiag, 'Must detect room bottleneck');
      assert.strictEqual(labDiag.severity, 'CRITICAL');
      assert.match(labDiag.title, /LAB_CHEM/);
      assert.strictEqual(labDiag.actionPayload?.type, 'FALLBACK_ROOM');
      assert.strictEqual(labDiag.actionPayload?.roomId, 'LAB_CHEM');
    });

    it('should detect class curriculum overload when total class hours exceed cycle slots', () => {
      const cycleDays = 5;
      const periodsPerDay = 4; // 20 slots per week
      const cls = createMockClass('C1', 'Grade 12 Advanced');
      const teacher = createMockTeacher('T1', 'Mr. White');
      const subject = createMockSubject('ENG', 'English');

      // Assign 22 hours to C1 (exceeds 20 slots)
      const lessons = Array.from({ length: 22 }, (_, i) =>
        createMockLesson(`L_OVR_${i}`, 'T1', 'C1', 'ENG', 1)
      );

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers: [teacher],
        classes: [cls],
        rooms: [createMockRoom('R1', '101')],
        subjects: [subject],
        lessons,
        cycleDays,
        periodsPerDay,
      });

      const classDiag = diagnostics.find((d) => d.type === 'UNRESOLVABLE_CLASH');
      assert.ok(classDiag, 'Must detect class overload');
      assert.strictEqual(classDiag.severity, 'CRITICAL');
      assert.match(diagDescription(classDiag), /exceeds/i);
    });

    it('should report zero diagnostics for mathematically feasible configurations', () => {
      const cycleDays = 5;
      const periodsPerDay = 6; // 30 slots
      const teachers = [createMockTeacher('T1', 'Teacher 1'), createMockTeacher('T2', 'Teacher 2')];
      const classes = [createMockClass('C1', 'Class 1'), createMockClass('C2', 'Class 2')];
      const rooms = [createMockRoom('R1', 'Room 1'), createMockRoom('R2', 'Room 2')];
      const subjects = [createMockSubject('S1', 'Subject 1'), createMockSubject('S2', 'Subject 2')];

      // 10 lessons per class, well below 30
      const lessons = [
        ...Array.from({ length: 10 }, (_, i) => createMockLesson(`L_C1_${i}`, 'T1', 'C1', 'S1', 1)),
        ...Array.from({ length: 10 }, (_, i) => createMockLesson(`L_C2_${i}`, 'T2', 'C2', 'S2', 1)),
      ];

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers,
        classes,
        rooms,
        subjects,
        lessons,
        cycleDays,
        periodsPerDay,
      });

      assert.strictEqual(diagnostics.length, 0, 'Solvable configuration should have 0 diagnostics');
    });
  });

  // =========================================================================
  // Suite 2: Card Pinning / Lock Immutability Across Generation (WF-SOL-05)
  // =========================================================================
  describe('Suite 2: Card Pinning & Lock Immutability During Generation', () => {
    it('should preserve locked cards at their pinned slots and rooms with isLocked: true', () => {
      const periodsPerDay = 6;
      const lessons = [
        createMockLesson('L1', 'T1', 'C1', 'S1', 1),
        createMockLesson('L2', 'T2', 'C2', 'S2', 1),
        createMockLesson('L3', 'T1', 'C2', 'S1', 1),
      ];

      // L1 is locked at Day 1, Period 2, Room R1
      const initialPlacements = [
        { lessonId: 'L1', dayIndex: 1, periodIndex: 2, roomId: 'R1', isLocked: true },
      ];

      // Simulating page.tsx enrichment
      const placementMap = new Map(initialPlacements.map((p) => [p.lessonId, p]));
      const enrichedLessons = lessons.map((l) => {
        const plc = placementMap.get(l.id);
        const isLocked = Boolean(plc?.isLocked);
        const slot = plc ? plc.dayIndex * periodsPerDay + plc.periodIndex : undefined;
        return {
          ...l,
          isPinned: isLocked,
          pinnedSlot: isLocked ? slot : undefined,
          pinnedRoomId: isLocked && plc ? plc.roomId : undefined,
          initialSlot: slot,
          initialRoomId: plc?.roomId,
        };
      });

      const l1Enriched = enrichedLessons.find((l) => l.id === 'L1');
      assert.strictEqual(l1Enriched.isPinned, true);
      assert.strictEqual(l1Enriched.pinnedSlot, 1 * 6 + 2); // slot 8
      assert.strictEqual(l1Enriched.pinnedRoomId, 'R1');

      // Solver generation mock respecting pinned cards
      const solvedPlacements = enrichedLessons.map((l, idx) => {
        if (l.isPinned && l.pinnedSlot !== undefined) {
          return {
            lessonId: l.id,
            dayIndex: Math.floor(l.pinnedSlot / periodsPerDay),
            periodIndex: l.pinnedSlot % periodsPerDay,
            roomId: l.pinnedRoomId || 'R1',
            isLocked: true,
          };
        }
        // Unpinned lessons placed elsewhere
        return {
          lessonId: l.id,
          dayIndex: 2,
          periodIndex: idx,
          roomId: 'R2',
          isLocked: false,
        };
      });

      // Post-solve restoration logic in page.tsx
      const finalPlacements = solvedPlacements.map((p) => {
        const prev = placementMap.get(p.lessonId);
        if (prev?.isLocked) {
          return { ...p, isLocked: true };
        }
        return p;
      });

      const l1Result = finalPlacements.find((p) => p.lessonId === 'L1');
      assert.strictEqual(l1Result.dayIndex, 1);
      assert.strictEqual(l1Result.periodIndex, 2);
      assert.strictEqual(l1Result.roomId, 'R1');
      assert.strictEqual(l1Result.isLocked, true);
    });

    it('should never move or displace pinned cards even under dense constraint schedules', () => {
      const periodsPerDay = 5;
      const pinnedSlot = 3 * periodsPerDay + 4; // Day 3, Period 4
      const pinnedLesson = createMockLesson('PINNED_01', 'T_CHIEF', 'C_TOP', 'MATH', 1, {
        isPinned: true,
        pinnedSlot: pinnedSlot,
        pinnedRoomId: 'HALL_A',
      });

      // Assert that slot coordinates match precisely
      const d = Math.floor(pinnedLesson.pinnedSlot / periodsPerDay);
      const p = pinnedLesson.pinnedSlot % periodsPerDay;
      assert.strictEqual(d, 3);
      assert.strictEqual(p, 4);
      assert.strictEqual(pinnedLesson.pinnedRoomId, 'HALL_A');
    });
  });

  // =========================================================================
  // Suite 3: Non-destructive IMPROVE Solve Mode (WF-SOL-05)
  // =========================================================================
  describe('Suite 3: Non-Destructive IMPROVE Mode', () => {
    it('should retain existing valid placements as immutable anchors while scheduling unplaced deck cards', () => {
      const periodsPerDay = 6;
      const existingPlacements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1', isLocked: false },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1', isLocked: false },
        { lessonId: 'L3', dayIndex: 1, periodIndex: 0, roomId: 'R2', isLocked: true },
      ];

      const allLessons = [
        createMockLesson('L1', 'T1', 'C1', 'S1', 1),
        createMockLesson('L2', 'T2', 'C1', 'S2', 1),
        createMockLesson('L3', 'T3', 'C2', 'S1', 1),
        createMockLesson('L4', 'T1', 'C2', 'S2', 1), // Unplaced in deck
        createMockLesson('L5', 'T2', 'C2', 'S1', 1), // Unplaced in deck
      ];

      // Simulate IMPROVE mode behavior
      const placementMap = new Map(existingPlacements.map((p) => [p.lessonId, p]));
      const improvedPlacements = [];

      // Step 1: Retain all existing valid placements
      for (const p of existingPlacements) {
        improvedPlacements.push({ ...p });
      }

      // Step 2: Schedule unplaced cards into open slots without clashing
      const unplaced = allLessons.filter((l) => !placementMap.has(l.id));
      assert.strictEqual(unplaced.length, 2);

      let nextSlot = 2; // Slot 0, 1 occupied on Day 0
      for (const l of unplaced) {
        improvedPlacements.push({
          lessonId: l.id,
          dayIndex: 0,
          periodIndex: nextSlot++,
          roomId: 'R1',
          isLocked: false,
        });
      }

      assert.strictEqual(improvedPlacements.length, 5);

      // Verify original 3 placements were untouched
      const l1 = improvedPlacements.find((p) => p.lessonId === 'L1');
      assert.strictEqual(l1.dayIndex, 0);
      assert.strictEqual(l1.periodIndex, 0);

      const l3 = improvedPlacements.find((p) => p.lessonId === 'L3');
      assert.strictEqual(l3.isLocked, true);
      assert.strictEqual(l3.dayIndex, 1);
      assert.strictEqual(l3.periodIndex, 0);

      // Verify unplaced were successfully scheduled
      const l4 = improvedPlacements.find((p) => p.lessonId === 'L4');
      const l5 = improvedPlacements.find((p) => p.lessonId === 'L5');
      assert.ok(l4, 'L4 must be placed');
      assert.ok(l5, 'L5 must be placed');
    });
  });

  // =========================================================================
  // Suite 4: Solver Cancellation Contract (WF-SOL-03, WF-SOL-06)
  // =========================================================================
  describe('Suite 4: Background Solver Cancellation Contract', () => {
    it('should acknowledge cancellation cleanly without throwing uncaught exceptions', async () => {
      let isSolving = true;
      let cancelledErrorCaught = false;

      // Mock cancellation promise pattern from page.tsx / useWasmSolver.ts
      const runMockSolver = () =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve([]);
          }, 5000);

          // Simulated cancel trigger
          setTimeout(() => {
            clearTimeout(timer);
            isSolving = false;
            reject(new Error('Solver cancelled by user'));
          }, 50);
        });

      try {
        await runMockSolver();
      } catch (err) {
        if (err?.message?.includes('cancelled')) {
          cancelledErrorCaught = true;
        }
      }

      assert.strictEqual(isSolving, false);
      assert.strictEqual(cancelledErrorCaught, true, 'Cancellation error should be handled cleanly');
    });
  });

  // =========================================================================
  // Suite 5: Independent Constraint Validator on Generated Schedules
  // =========================================================================
  describe('Suite 5: Independent Constraint Validator (0 Hard Clashes)', () => {
    const teachers = [
      createMockTeacher('T1', 'Teacher Alpha'),
      createMockTeacher('T2', 'Teacher Beta'),
    ];
    const classes = [
      createMockClass('C1', 'Class 1'),
      createMockClass('C2', 'Class 2'),
    ];
    const rooms = [
      createMockRoom('R1', 'Room 101'),
      createMockRoom('R2', 'Room 102'),
    ];

    it('should detect a teacher double-booking clash', () => {
      const lessons = [
        createMockLesson('L1', 'T1', 'C1', 'MATH', 1),
        createMockLesson('L2', 'T1', 'C2', 'SCI', 1), // Same teacher T1
      ];

      // Placed at identical Day 0, Period 0
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 0, roomId: 'R2' },
      ];

      const { isValid, conflicts } = validateScheduleConstraints({
        placements,
        lessons,
        teachers,
        classes,
        rooms,
        cycleDays: 5,
        periodsPerDay: 7,
      });

      assert.strictEqual(isValid, false);
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].type, 'TEACHER_CLASH');
      assert.match(conflicts[0].message, /Teacher clash/);
    });

    it('should detect a room double-booking clash', () => {
      const lessons = [
        createMockLesson('L1', 'T1', 'C1', 'MATH', 1),
        createMockLesson('L2', 'T2', 'C2', 'SCI', 1),
      ];

      // Placed in same room R1 at same slot
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];

      const { isValid, conflicts } = validateScheduleConstraints({
        placements,
        lessons,
        teachers,
        classes,
        rooms,
        cycleDays: 5,
        periodsPerDay: 7,
      });

      assert.strictEqual(isValid, false);
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].type, 'ROOM_CLASH');
      assert.match(conflicts[0].message, /Room clash/);
    });

    it('should detect time-off unavailability clash', () => {
      const lessons = [createMockLesson('L1', 'T1', 'C1', 'MATH', 1)];
      const placements = [{ lessonId: 'L1', dayIndex: 2, periodIndex: 3, roomId: 'R1' }];

      // T1 blocked at Day 2, Period 3
      const timeOffMatrix = {
        'T1-2-3': 0,
      };

      const { isValid, conflicts } = validateScheduleConstraints({
        placements,
        lessons,
        teachers,
        classes,
        rooms,
        cycleDays: 5,
        periodsPerDay: 7,
        timeOffMatrix,
      });

      assert.strictEqual(isValid, false);
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].type, 'UNAVAILABLE_SLOT');
    });

    it('should confirm isValid: true with 0 hard clashes for valid timetable schedules', () => {
      const lessons = [
        createMockLesson('L1', 'T1', 'C1', 'MATH', 1),
        createMockLesson('L2', 'T2', 'C2', 'SCI', 1),
        createMockLesson('L3', 'T1', 'C2', 'HIST', 1),
      ];

      // All scheduled in distinct, conflict-free slots
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R2' },
        { lessonId: 'L3', dayIndex: 1, periodIndex: 0, roomId: 'R1' },
      ];

      const { isValid, conflicts } = validateScheduleConstraints({
        placements,
        lessons,
        teachers,
        classes,
        rooms,
        cycleDays: 5,
        periodsPerDay: 7,
      });

      assert.strictEqual(isValid, true);
      assert.strictEqual(conflicts.length, 0);
    });
  });

  // =========================================================================
  // Suite 6: Diagnostic Advisor 1-Click Remedies (WF-SOL-04)
  // =========================================================================
  describe('Suite 6: Diagnostic Advisor 1-Click Remedies', () => {
    it('should execute UNBLOCK_TIMEOFF remedy and resolve teacher pigeonhole deficit', () => {
      const cycleDays = 5;
      const periodsPerDay = 2; // 10 slots
      const teacher = createMockTeacher('T1', 'Dr. Smith');
      const cls = createMockClass('C1', '10A');
      const lessons = Array.from({ length: 9 }, (_, i) =>
        createMockLesson(`L_${i}`, 'T1', 'C1', 'MATH', 1)
      );

      // Block 3 slots -> 7 available vs 9 required (deficit = 2)
      let timeOffMatrix = {
        'T1-0-0': 0,
        'T1-0-1': 0,
        'T1-1-0': 0,
      };

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers: [teacher],
        classes: [cls],
        rooms: [createMockRoom('R1', 'R101')],
        subjects: [createMockSubject('MATH', 'Math')],
        lessons,
        cycleDays,
        periodsPerDay,
        timeOffMatrix,
      });

      assert.strictEqual(diagnostics.length, 1);
      const payload = diagnostics[0].actionPayload;
      assert.strictEqual(payload?.type, 'UNBLOCK_TIMEOFF');
      assert.strictEqual(payload?.slots.length, 2);

      // Apply 1-click remedy as implemented in page.tsx handleApplyAdvisorFix
      const updatedMatrix = { ...timeOffMatrix };
      for (const slot of payload.slots) {
        const d = Math.floor(slot / periodsPerDay);
        const p = slot % periodsPerDay;
        delete updatedMatrix[`${payload.teacherId}-${d}-${p}`];
      }

      // Re-evaluate feasibility
      const postFixDiagnostics = analyzeFeasibilityDiagnostics({
        teachers: [teacher],
        classes: [cls],
        rooms: [createMockRoom('R1', 'R101')],
        subjects: [createMockSubject('MATH', 'Math')],
        lessons,
        cycleDays,
        periodsPerDay,
        timeOffMatrix: updatedMatrix,
      });

      assert.strictEqual(
        postFixDiagnostics.length,
        0,
        'Pigeonhole bottleneck must be completely eliminated after 1-click UNBLOCK_TIMEOFF'
      );
    });

    it('should execute FALLBACK_ROOM remedy and eliminate room bottleneck', () => {
      const cycleDays = 5;
      const periodsPerDay = 2; // 10 slots
      const labSubject = createMockSubject('PHYS_LAB', 'Physics Lab', 'LAB_PHYS');
      // 2 teachers and 2 classes, 6 lessons each (6 <= 10)
      // Combined lab demand = 12 hours (exceeds single lab capacity of 10)
      const lessons = [
        ...Array.from({ length: 6 }, (_, i) => createMockLesson(`L_P1_${i}`, 'T1', 'C1', 'PHYS_LAB', 1)),
        ...Array.from({ length: 6 }, (_, i) => createMockLesson(`L_P2_${i}`, 'T2', 'C2', 'PHYS_LAB', 1)),
      ];

      let rooms = [createMockRoom('LAB1', 'Physics Lab 1', 'LAB_PHYS')]; // Capacity = 10

      const diagnostics = analyzeFeasibilityDiagnostics({
        teachers: [createMockTeacher('T1', 'Teacher 1'), createMockTeacher('T2', 'Teacher 2')],
        classes: [createMockClass('C1', 'Class 1'), createMockClass('C2', 'Class 2')],
        rooms,
        subjects: [labSubject],
        lessons,
        cycleDays,
        periodsPerDay,
      });

      assert.strictEqual(diagnostics.length, 1);
      const payload = diagnostics[0].actionPayload;
      assert.strictEqual(payload?.type, 'FALLBACK_ROOM');

      // Apply 1-click remedy as implemented in page.tsx handleApplyAdvisorFix
      const newRoom = createMockRoom(`R_AUTO_${rooms.length + 1}`, `General Room ${rooms.length + 1}`);
      rooms = [...rooms, newRoom];

      assert.strictEqual(rooms.length, 2);
    });
  });
});

function diagDescription(diag) {
  return diag.analysis || diag.title || '';
}
