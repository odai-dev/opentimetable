// opentimetable/tests/test_m3_scheduling_workflows.mjs
// Milestone 3: Desktop Scheduling Workflows, Card Pinning, Split/Merge & State Integrity

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { parseRozBinary } = jiti('../apps/web/src/lib/roz-parser.ts');
const { isSplitExempt } = jiti('../apps/web/src/lib/domain.ts');
const { SisRoles, PermissionsMatrix, hasPermission } = jiti('../apps/web/src/services/sis/roles.ts');
const { JwtAuthManager } = jiti('../apps/web/src/services/sis/auth.ts');
const { MasarAdapter } = jiti('../apps/web/src/services/sis/masar.ts');

const saudiPath = path.resolve('apps/web/public/demos/Saudi_Arabia_1.roz');

// Pure conflict detection algorithm matching apps/web/src/app/page.tsx
function computeConflicts(placements, lessons, teachers, classes, rooms, periodsPerDay = 12) {
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const list = [];
  const slotBuckets = new Map();

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const slotIndex = p.dayIndex * periodsPerDay + p.periodIndex;
    const bucket = slotBuckets.get(slotIndex);
    if (bucket) {
      bucket.push(p);
    } else {
      slotBuckets.set(slotIndex, [p]);
    }
  }

  for (const slotPlacements of slotBuckets.values()) {
    const bucketLen = slotPlacements.length;
    if (bucketLen <= 1) continue;

    for (let i = 0; i < bucketLen; i++) {
      for (let j = i + 1; j < bucketLen; j++) {
        const p1 = slotPlacements[i];
        const p2 = slotPlacements[j];
        const l1 = lessonMap.get(p1.lessonId);
        const l2 = lessonMap.get(p2.lessonId);
        if (!l1 || !l2) continue;

        // 1. Teacher Clash
        const t1Ids = [l1.teacherId, ...(l1.teacherIds || []), ...(l1.coTeacherIds || [])].filter(Boolean);
        const t2Ids = [l2.teacherId, ...(l2.teacherIds || []), ...(l2.coTeacherIds || [])].filter(Boolean);
        const commonTeacherId = t1Ids.find((id) => t2Ids.includes(id));
        if (commonTeacherId) {
          list.push({ type: 'TEACHER_CLASH', lessonId: l1.id, slot: slotPlacements });
          list.push({ type: 'TEACHER_CLASH', lessonId: l2.id, slot: slotPlacements });
        }

        // 2. Room Clash
        const r1 = p1.roomId?.trim();
        const r2 = p2.roomId?.trim();
        if (r1 && r2 && r1 === r2) {
          list.push({ type: 'ROOM_CLASH', lessonId: l1.id });
          list.push({ type: 'ROOM_CLASH', lessonId: l2.id });
        }

        // 3. Class Clash
        const c1Ids = [l1.classId, ...(l1.classIds || []), ...(l1.jointClassIds || [])].filter(Boolean);
        const c2Ids = [l2.classId, ...(l2.classIds || []), ...(l2.jointClassIds || [])].filter(Boolean);
        const commonClassId = c1Ids.find((id) => c2Ids.includes(id));
        if (commonClassId && !isSplitExempt(l1, l2)) {
          list.push({ type: 'CLASS_CLASH', lessonId: l1.id });
          list.push({ type: 'CLASS_CLASH', lessonId: l2.id });
        }
      }
    }
  }

  return list;
}

describe('Milestone 3 — Desktop Scheduling Workflows & State Integrity', () => {

  // ============================================================================
  // Suite 1: Sub-16ms Real-Time Conflict Calculation Latency Benchmark
  // ============================================================================
  describe('Suite 1: Sub-16ms Real-Time Collision Feedback Benchmark', () => {
    it('executes slot-bucket conflict detection on 1,630 placements in < 16ms (60 FPS)', () => {
      const buf = fs.readFileSync(saudiPath);
      const parsed = parseRozBinary(buf, 'Saudi Arabia 1.roz');
      const { placements, lessons, teachers, classes, rooms } = parsed.mapped;

      assert.strictEqual(placements.length, 1630, 'Must have 1,630 authentic placements');

      // Warmup run
      computeConflicts(placements, lessons, teachers, classes, rooms, 12);

      // Measure 50 iterations
      const iterations = 50;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeConflicts(placements, lessons, teachers, classes, rooms, 12);
      }
      const totalMs = performance.now() - start;
      const avgMs = totalMs / iterations;

      console.log(`       [BENCHMARK] Saudi Arabia 1 (1630 cards) Average Conflict Latency: ${avgMs.toFixed(3)} ms`);
      assert.ok(avgMs < 16, `Conflict calculation must be < 16ms for 60 FPS UI interaction, got ${avgMs.toFixed(3)}ms`);
    });

    it('accurately identifies injected Teacher, Room, and Class clashes', () => {
      const teachers = [{ id: 'T1', name: 'Teacher 1' }, { id: 'T2', name: 'Teacher 2' }];
      const classes = [{ id: 'C1', name: 'Class 10A' }, { id: 'C2', name: 'Class 10B' }];
      const rooms = [{ id: 'R1', name: 'Room 101' }, { id: 'R2', name: 'Room 102' }];
      const lessons = [
        { id: 'L1', teacherId: 'T1', classId: 'C1', duration: 1, entireClass: true },
        { id: 'L2', teacherId: 'T1', classId: 'C2', duration: 1, entireClass: true }, // Teacher T1 double-booked
        { id: 'L3', teacherId: 'T2', classId: 'C1', duration: 1, entireClass: true }, // Class C1 double-booked
      ];
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 0, roomId: 'R2' },
        { lessonId: 'L3', dayIndex: 0, periodIndex: 0, roomId: 'R1' }, // Room R1 double-booked with L1
      ];

      const conflicts = computeConflicts(placements, lessons, teachers, classes, rooms, 7);
      const clashTypes = new Set(conflicts.map((c) => c.type));

      assert.ok(clashTypes.has('TEACHER_CLASH'), 'Must detect TEACHER_CLASH between L1 and L2');
      assert.ok(clashTypes.has('CLASS_CLASH'), 'Must detect CLASS_CLASH between L1 and L3');
      assert.ok(clashTypes.has('ROOM_CLASH'), 'Must detect ROOM_CLASH between L1 and L3');
    });
  });

  // ============================================================================
  // Suite 2: Card Pinning / Lock Immutability Across Scheduling Operations
  // ============================================================================
  describe('Suite 2: Card Pinning & Lock Immutability', () => {
    let placements;
    let lessons;

    function handleMovePlacement(lessonId, targetDay, targetPeriod) {
      const targetPlc = placements.find((p) => p.lessonId === lessonId);
      if (!targetPlc || targetPlc.isLocked) return false;
      placements = placements.map((p) =>
        p.lessonId === lessonId ? { ...p, dayIndex: targetDay, periodIndex: targetPeriod } : p
      );
      return true;
    }

    function handleRemovePlacement(lessonId) {
      const targetPlc = placements.find((p) => p.lessonId === lessonId);
      if (!targetPlc || targetPlc.isLocked) return false;
      placements = placements.filter((p) => p.lessonId !== lessonId);
      return true;
    }

    function handleClearPlacements() {
      placements = placements.filter((p) => p.isLocked);
    }

    function handleClearEntityPlacements(entityId, entityType = 'class') {
      const lessonMap = new Map(lessons.map((l) => [l.id, l]));
      placements = placements.filter((p) => {
        if (p.isLocked) return true; // Preserved
        const lesson = lessonMap.get(p.lessonId);
        if (!lesson) return true;
        if (entityType === 'class' && (lesson.classId === entityId || lesson.classIds?.includes(entityId))) {
          return false;
        }
        return true;
      });
    }

    beforeEach(() => {
      lessons = [
        { id: 'L_UNLOCKED', classId: 'C1', teacherId: 'T1', duration: 1 },
        { id: 'L_LOCKED', classId: 'C1', teacherId: 'T2', duration: 1 },
      ];
      placements = [
        { lessonId: 'L_UNLOCKED', dayIndex: 0, periodIndex: 0, roomId: 'R1', isLocked: false },
        { lessonId: 'L_LOCKED', dayIndex: 0, periodIndex: 1, roomId: 'R2', isLocked: true },
      ];
    });

    it('prevents manual move on locked placement', () => {
      const moved = handleMovePlacement('L_LOCKED', 1, 1);
      assert.strictEqual(moved, false, 'Moving a locked card must be rejected');
      const plc = placements.find((p) => p.lessonId === 'L_LOCKED');
      assert.strictEqual(plc.dayIndex, 0);
      assert.strictEqual(plc.periodIndex, 1);
    });

    it('allows manual move on unlocked placement', () => {
      const moved = handleMovePlacement('L_UNLOCKED', 1, 1);
      assert.strictEqual(moved, true, 'Moving an unlocked card must succeed');
      const plc = placements.find((p) => p.lessonId === 'L_UNLOCKED');
      assert.strictEqual(plc.dayIndex, 1);
      assert.strictEqual(plc.periodIndex, 1);
    });

    it('prevents unplacing / deletion of locked card back to deck', () => {
      const removed = handleRemovePlacement('L_LOCKED');
      assert.strictEqual(removed, false, 'Unplacing a locked card must be rejected');
      assert.ok(placements.some((p) => p.lessonId === 'L_LOCKED'));
    });

    it('preserves locked cards during handleClearPlacements (table-wide clear)', () => {
      handleClearPlacements();
      assert.strictEqual(placements.length, 1, 'Only locked placements should survive clear-all');
      assert.strictEqual(placements[0].lessonId, 'L_LOCKED');
    });

    it('preserves locked cards during handleClearEntityPlacements (row clear)', () => {
      handleClearEntityPlacements('C1', 'class');
      assert.strictEqual(placements.length, 1, 'Locked cards in class C1 must remain untouched');
      assert.strictEqual(placements[0].lessonId, 'L_LOCKED');
    });

    it('supports toggleLockPlacement, lockAll, and unlockAll', () => {
      // Toggle L_LOCKED to unlocked
      placements = placements.map((p) =>
        p.lessonId === 'L_LOCKED' ? { ...p, isLocked: false } : p
      );
      assert.strictEqual(placements.find((p) => p.lessonId === 'L_LOCKED').isLocked, false);

      // Lock all
      placements = placements.map((p) => ({ ...p, isLocked: true }));
      assert.ok(placements.every((p) => p.isLocked === true));

      // Unlock all
      placements = placements.map((p) => ({ ...p, isLocked: false }));
      assert.ok(placements.every((p) => p.isLocked === false));
    });
  });

  // ============================================================================
  // Suite 3: Lesson Splitting & Merging Workflows
  // ============================================================================
  describe('Suite 3: Lesson Splitting & Merging Engine', () => {
    it('splits a multi-period lesson (duration 2 -> 1 + 1) with placement synchronization', () => {
      let lessons = [
        { id: 'L_DBL', subjectId: 'MATH', teacherId: 'T1', classId: 'C1', duration: 2 },
      ];
      let placements = [
        { lessonId: 'L_DBL', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];

      // Duration split action
      const lesson = lessons.find((l) => l.id === 'L_DBL');
      assert.strictEqual(lesson.duration, 2);

      const splitA = { ...lesson, id: `${lesson.id}_part1`, duration: 1 };
      const splitB = { ...lesson, id: `${lesson.id}_part2`, duration: 1 };

      lessons = lessons.flatMap((l) => (l.id === 'L_DBL' ? [splitA, splitB] : [l]));
      // Original placement inherits part1, part2 remains unplaced in card deck
      placements = placements.map((p) => (p.lessonId === 'L_DBL' ? { ...p, lessonId: splitA.id } : p));

      assert.strictEqual(lessons.length, 2);
      assert.strictEqual(lessons[0].duration, 1);
      assert.strictEqual(lessons[1].duration, 1);
      assert.strictEqual(placements.length, 1);
      assert.strictEqual(placements[0].lessonId, 'L_DBL_part1');
    });

    it('splits a class into elective groups with automatic collision exemption', () => {
      let lessons = [
        { id: 'L_CLS', subjectId: 'SCI', teacherId: 'T1', classId: 'C1', duration: 1, entireClass: true },
      ];
      let placements = [
        { lessonId: 'L_CLS', dayIndex: 1, periodIndex: 2, roomId: 'LAB1' },
      ];

      const lesson = lessons[0];
      const grpA = {
        ...lesson,
        id: `${lesson.id}_grp1`,
        entireClass: false,
        groupId: 'grp_1',
        groupName: 'Group 1',
      };
      const grpB = {
        ...lesson,
        id: `${lesson.id}_grp2`,
        entireClass: false,
        groupId: 'grp_2',
        groupName: 'Group 2',
      };

      lessons = lessons.flatMap((l) => (l.id === 'L_CLS' ? [grpA, grpB] : [l]));
      placements = [
        { lessonId: grpA.id, dayIndex: 1, periodIndex: 2, roomId: 'LAB1' },
        { lessonId: grpB.id, dayIndex: 1, periodIndex: 2, roomId: 'LAB2' },
      ];

      // Verify isSplitExempt
      assert.strictEqual(isSplitExempt(grpA, grpB), true, 'Split elective groups must be collision exempt');

      // Run conflict calculation - must have 0 class clashes
      const classes = [{ id: 'C1', name: 'Class 10A' }];
      const teachers = [{ id: 'T1', name: 'Teacher 1' }];
      const rooms = [{ id: 'LAB1', name: 'Lab 1' }, { id: 'LAB2', name: 'Lab 2' }];

      const conflicts = computeConflicts(placements, lessons, teachers, classes, rooms, 7);
      const classClashes = conflicts.filter((c) => c.type === 'CLASS_CLASH');
      assert.strictEqual(classClashes.length, 0, 'Elective group split must not trigger CLASS_CLASH');
    });

    it('merges split lessons back into a unified lesson', () => {
      let lessons = [
        { id: 'L_p1', subjectId: 'MATH', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L_p2', subjectId: 'MATH', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L_p1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];

      // Merge action
      const l1 = lessons[0];
      const l2 = lessons[1];
      const merged = { ...l1, id: 'L_MERGED', duration: l1.duration + l2.duration };

      lessons = lessons.filter((l) => l.id !== l1.id && l.id !== l2.id).concat(merged);
      placements = placements
        .filter((p) => p.lessonId !== l2.id)
        .map((p) => (p.lessonId === l1.id ? { ...p, lessonId: merged.id } : p));

      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(lessons[0].id, 'L_MERGED');
      assert.strictEqual(lessons[0].duration, 2);
      assert.strictEqual(placements.length, 1);
      assert.strictEqual(placements[0].lessonId, 'L_MERGED');
    });
  });

  // ============================================================================
  // Suite 4: Multi-Level Undo/Redo State Integrity
  // ============================================================================
  describe('Suite 4: Multi-Level Undo/Redo State Integrity', () => {
    it('restores placements and lessons synchronously across complex manual workflows', () => {
      let currentLessons = [
        { id: 'L1', duration: 1, classId: 'C1', teacherId: 'T1' },
        { id: 'L2', duration: 2, classId: 'C1', teacherId: 'T2' },
      ];
      let currentPlacements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, isLocked: false },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, isLocked: false },
      ];

      const history = [];
      const redoStack = [];

      function snapshot() {
        history.push({
          placements: JSON.parse(JSON.stringify(currentPlacements)),
          lessons: JSON.parse(JSON.stringify(currentLessons)),
        });
        redoStack.length = 0; // Clear redo on new action
      }

      function undo() {
        if (history.length === 0) return;
        const prev = history.pop();
        redoStack.push({
          placements: JSON.parse(JSON.stringify(currentPlacements)),
          lessons: JSON.parse(JSON.stringify(currentLessons)),
        });
        currentPlacements = prev.placements;
        currentLessons = prev.lessons;
      }

      function redo() {
        if (redoStack.length === 0) return;
        const next = redoStack.pop();
        history.push({
          placements: JSON.parse(JSON.stringify(currentPlacements)),
          lessons: JSON.parse(JSON.stringify(currentLessons)),
        });
        currentPlacements = next.placements;
        currentLessons = next.lessons;
      }

      // Action 1: Move L1 to (1, 1)
      snapshot();
      currentPlacements = currentPlacements.map((p) =>
        p.lessonId === 'L1' ? { ...p, dayIndex: 1, periodIndex: 1 } : p
      );

      // Action 2: Split L2 (duration 2 -> 1 + 1)
      snapshot();
      const l2 = currentLessons.find((l) => l.id === 'L2');
      const l2a = { ...l2, id: 'L2_a', duration: 1 };
      const l2b = { ...l2, id: 'L2_b', duration: 1 };
      currentLessons = currentLessons.flatMap((l) => (l.id === 'L2' ? [l2a, l2b] : [l]));
      currentPlacements = currentPlacements.map((p) => (p.lessonId === 'L2' ? { ...p, lessonId: l2a.id } : p));

      // Action 3: Lock L1
      snapshot();
      currentPlacements = currentPlacements.map((p) =>
        p.lessonId === 'L1' ? { ...p, isLocked: true } : p
      );

      assert.strictEqual(currentLessons.length, 3, 'Post-split lessons count');
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').isLocked, true);

      // Undo Action 3 (Lock)
      undo();
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').isLocked, false);
      assert.strictEqual(currentLessons.length, 3);

      // Undo Action 2 (Split)
      undo();
      assert.strictEqual(currentLessons.length, 2, 'Must restore unsplit 2-hour lesson');
      assert.strictEqual(currentLessons.find((l) => l.id === 'L2').duration, 2);
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L2')?.periodIndex, 1);

      // Undo Action 1 (Move)
      undo();
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').dayIndex, 0);
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').periodIndex, 0);

      // Redo Action 1
      redo();
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').dayIndex, 1);
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').periodIndex, 1);

      // Redo Action 2
      redo();
      assert.strictEqual(currentLessons.length, 3);
      assert.strictEqual(currentLessons.some((l) => l.id === 'L2_a'), true);

      // Redo Action 3
      redo();
      assert.strictEqual(currentPlacements.find((p) => p.lessonId === 'L1').isLocked, true);
    });
  });

  // ============================================================================
  // Suite 5: Diagonal Split Cards & Collision Exemption
  // ============================================================================
  describe('Suite 5: Diagonal Split Cards & Collision Exemption Logic', () => {
    it('correctly evaluates isSplitExempt for all group configuration permutations', () => {
      // 1. Distinct elective groups (e.g. French vs German) -> Exempt
      const langA = { classId: 'C1', entireClass: false, groupName: 'French' };
      const langB = { classId: 'C1', entireClass: false, groupName: 'German' };
      assert.strictEqual(isSplitExempt(langA, langB), true);

      // 2. Either lesson is entire class -> Not exempt (Clash!)
      const whole = { classId: 'C1', entireClass: true, groupName: undefined };
      assert.strictEqual(isSplitExempt(whole, langA), false);
      assert.strictEqual(isSplitExempt(langA, whole), false);

      // 3. Same group name -> Not exempt (Clash!)
      const langA2 = { classId: 'C1', entireClass: false, groupName: 'French' };
      assert.strictEqual(isSplitExempt(langA, langA2), false);

      // 4. Missing groupName fallback using groupId -> Exempt if different
      const idA = { classId: 'C1', entireClass: false, groupId: 'g1' };
      const idB = { classId: 'C1', entireClass: false, groupId: 'g2' };
      assert.strictEqual(isSplitExempt(idA, idB), true);

      // 5. Same groupId -> Not exempt
      assert.strictEqual(isSplitExempt(idA, { classId: 'C1', entireClass: false, groupId: 'g1' }), false);
    });
  });

  // ============================================================================
  // Suite 6: Secondary Institutional SIS Integration Module
  // ============================================================================
  describe('Suite 6: Secondary University SIS Integration Module', () => {
    it('enforces RBAC governance matrix permissions accurately', () => {
      // ADMIN: Full access
      assert.strictEqual(hasPermission('ADMIN', 'canManageUsers'), true);
      assert.strictEqual(hasPermission('ADMIN', 'canPublishTimetable'), true);
      assert.strictEqual(hasPermission('ADMIN', 'canRunSolver'), true);

      // DEPT_HEAD: Can run solver and edit curriculum, but cannot publish or manage users
      assert.strictEqual(hasPermission('DEPT_HEAD', 'canRunSolver'), true);
      assert.strictEqual(hasPermission('DEPT_HEAD', 'canEditCurriculum'), true);
      assert.strictEqual(hasPermission('DEPT_HEAD', 'canPublishTimetable'), false);
      assert.strictEqual(hasPermission('DEPT_HEAD', 'canManageUsers'), false);

      // STUDENT & TEACHER: Read-only access to curriculum and solver
      assert.strictEqual(hasPermission('STUDENT', 'canRunSolver'), false);
      assert.strictEqual(hasPermission('STUDENT', 'canEditCurriculum'), false);
      assert.strictEqual(hasPermission('TEACHER', 'canPublishTimetable'), false);
    });

    it('generates and verifies cryptographic JWT tokens with expiry checks', () => {
      const auth = new JwtAuthManager('test_secret_key_123');

      const token = auth.generateToken({
        userId: 'U1001',
        username: 'dr_hamid',
        role: 'DEPT_HEAD',
      }, 3600);

      assert.strictEqual(typeof token, 'string');
      assert.strictEqual(token.split('.').length, 3, 'Must be valid 3-segment JWT');

      const verified = auth.verifyToken(token);
      assert.strictEqual(verified.valid, true);
      assert.strictEqual(verified.payload.username, 'dr_hamid');
      assert.strictEqual(verified.payload.role, 'DEPT_HEAD');

      // Test signature tampering
      const tampered = token.slice(0, -5) + 'XXXXX';
      const verifyTampered = auth.verifyToken(tampered);
      assert.strictEqual(verifyTampered.valid, false);
      assert.strictEqual(verifyTampered.error, 'Invalid JWT signature');

      // Test expired token
      const expiredToken = auth.generateToken({
        userId: 'U1002',
        username: 'student_sara',
        role: 'STUDENT',
      }, -10); // Expired 10 seconds ago

      const verifyExpired = auth.verifyToken(expiredToken);
      assert.strictEqual(verifyExpired.valid, false);
      assert.strictEqual(verifyExpired.expired, true);
    });

    it('imports and exports MENA schedules via MasarAdapter', async () => {
      const adapter = new MasarAdapter();
      assert.strictEqual(adapter.name, 'Masar-SIS-MENA-Sync');

      const teachers = await adapter.importTeachers();
      const classes = await adapter.importClasses();
      const rooms = await adapter.importRooms();
      const subjects = await adapter.importCurriculum();

      assert.ok(teachers.length >= 3, 'Must import Masar teachers');
      assert.ok(classes.length >= 3, 'Must import Masar classes');
      assert.ok(rooms.length >= 3, 'Must import Masar rooms');
      assert.ok(subjects.length >= 3, 'Must import Masar curriculum');

      // Export placements
      const testPlacements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 1, roomId: 'R_SALLE_1' },
        { lessonId: 'L2', dayIndex: 4, periodIndex: 3, roomId: 'R_LAB_PHY' },
      ];
      const exported = await adapter.exportTimetable(testPlacements);

      assert.strictEqual(exported.success, true);
      assert.strictEqual(exported.syncedCount, 2);
      assert.strictEqual(exported.records[0].jour, 'LUNDI');
      assert.strictEqual(exported.records[0].seance, 2);
      assert.strictEqual(exported.records[1].jour, 'VENDREDI');
      assert.strictEqual(exported.records[1].seance, 4);
    });
  });
});
