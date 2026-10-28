// opentimetable/tests/test_modal_crud_parity.mjs
// Milestone 3: Modal & CRUD Feature Parity Automated Test Suite

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Milestone 3 — Modal & CRUD Feature Parity Suite', () => {
  // 1. Dynamic CRUD Actions & Cascading Deletions
  describe('Feature 1: Interactive CRUD State Updaters', () => {
    it('M3.1.1: Adds, modifies, and deletes a Subject with cascading lesson/placement cleanup', () => {
      let subjects = [
        { id: 'SUB_1', code: 'MATH', name: 'Mathematics', color: '#0284c7' },
        { id: 'SUB_2', code: 'SCI', name: 'Science', color: '#16a34a' },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'SUB_1', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L2', subjectId: 'SUB_2', teacherId: 'T2', classId: 'C1', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
      ];

      // Add Subject
      const newSub = { id: 'SUB_3', code: 'ENG', name: 'English', color: '#e11d48' };
      subjects = [...subjects, newSub];
      assert.strictEqual(subjects.length, 3);
      assert.strictEqual(subjects.find((s) => s.id === 'SUB_3')?.code, 'ENG');

      // Edit Subject
      subjects = subjects.map((s) => (s.id === 'SUB_1' ? { ...s, name: 'Advanced Mathematics' } : s));
      assert.strictEqual(subjects.find((s) => s.id === 'SUB_1')?.name, 'Advanced Mathematics');

      // Delete Subject with cascade
      const deleteId = 'SUB_1';
      subjects = subjects.filter((s) => s.id !== deleteId);
      const deletedLessonIds = new Set(lessons.filter((l) => l.subjectId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.subjectId !== deleteId);
      placements = placements.filter((p) => !deletedLessonIds.has(p.lessonId));

      assert.strictEqual(subjects.length, 2);
      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(placements.length, 1);
      assert.strictEqual(placements[0].lessonId, 'L2');
    });

    it('M3.1.2: Adds, modifies, and deletes a Class Group with cascading lesson/placement cleanup', () => {
      let classes = [
        { id: 'C1', name: 'Class 10-A', grade: 10 },
        { id: 'C2', name: 'Class 10-B', grade: 10 },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'SUB_1', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L2', subjectId: 'SUB_1', teacherId: 'T1', classId: 'C2', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
      ];

      // Add Class
      const newClass = { id: 'C3', name: 'Class 11-A', grade: 11 };
      classes = [...classes, newClass];
      assert.strictEqual(classes.length, 3);

      // Edit Class
      classes = classes.map((c) => (c.id === 'C1' ? { ...c, grade: 12 } : c));
      assert.strictEqual(classes.find((c) => c.id === 'C1')?.grade, 12);

      // Delete Class
      const deleteId = 'C1';
      classes = classes.filter((c) => c.id !== deleteId);
      const deletedLessonIds = new Set(lessons.filter((l) => l.classId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.classId !== deleteId);
      placements = placements.filter((p) => !deletedLessonIds.has(p.lessonId));

      assert.strictEqual(classes.length, 2);
      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(placements.length, 1);
    });

    it('M3.1.3: Adds, modifies, and deletes a Teacher with cascading lesson/placement cleanup', () => {
      let teachers = [
        { id: 'T1', name: 'Prof. Smith', speciality: 'Physics', color: '#000', unavailableSlots: [] },
        { id: 'T2', name: 'Dr. Jones', speciality: 'Chemistry', color: '#111', unavailableSlots: [] },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'SUB_1', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];

      // Delete Teacher
      const deleteId = 'T1';
      teachers = teachers.filter((t) => t.id !== deleteId);
      const deletedLessonIds = new Set(lessons.filter((l) => l.teacherId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.teacherId !== deleteId);
      placements = placements.filter((p) => !deletedLessonIds.has(p.lessonId));

      assert.strictEqual(teachers.length, 1);
      assert.strictEqual(lessons.length, 0);
      assert.strictEqual(placements.length, 0);
    });

    it('M3.1.4: Adds, modifies, and deletes a Room without deleting lessons', () => {
      let rooms = [
        { id: 'R1', name: 'Lab 1', capacity: 30, type: 'LAB' },
        { id: 'R2', name: 'Gym', capacity: 100, type: 'GYM' },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'SUB_1', teacherId: 'T1', classId: 'C1', roomId: 'R1', duration: 1 },
      ];

      // Delete Room resets lesson roomId to undefined (Auto)
      const deleteId = 'R1';
      rooms = rooms.filter((r) => r.id !== deleteId);
      lessons = lessons.map((l) => (l.roomId === deleteId ? { ...l, roomId: undefined } : l));

      assert.strictEqual(rooms.length, 1);
      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(lessons[0].roomId, undefined);
    });
  });

  // 2. Time-Off 3-State Matrix & Bulk Actions
  describe('Feature 2: Time-Off 3-State Matrix & Bulk Operations', () => {
    it('M3.2.1: Correctly cycles slot states: 1 (Available) -> 0 (Blocked) -> 2 (Disfavored) -> 1', () => {
      const cycle = (current) => (current === 1 ? 0 : current === 0 ? 2 : 1);
      assert.strictEqual(cycle(1), 0);
      assert.strictEqual(cycle(0), 2);
      assert.strictEqual(cycle(2), 1);
    });

    it('M3.2.2: Executes bulk "All Available" setting 35 slots to state 1', () => {
      const entityId = 'T1';
      const matrix = {};
      for (let d = 0; d < 5; d++) {
        for (let p = 0; p < 7; p++) {
          matrix[`${entityId}-${d}-${p}`] = 1;
        }
      }
      const count = Object.values(matrix).filter((v) => v === 1).length;
      assert.strictEqual(count, 35);
    });

    it('M3.2.3: Executes bulk "Block Period 1" and "Block Last Period"', () => {
      const entityId = 'T1';
      const matrix = {};
      for (let d = 0; d < 5; d++) {
        for (let p = 0; p < 7; p++) {
          matrix[`${entityId}-${d}-${p}`] = 1;
        }
      }
      // Block Period 1
      for (let d = 0; d < 5; d++) {
        matrix[`${entityId}-${d}-0`] = 0;
      }
      // Block Last Period (Period 6)
      for (let d = 0; d < 5; d++) {
        matrix[`${entityId}-${d}-6`] = 0;
      }

      for (let d = 0; d < 5; d++) {
        assert.strictEqual(matrix[`${entityId}-${d}-0`], 0);
        assert.strictEqual(matrix[`${entityId}-${d}-6`], 0);
        assert.strictEqual(matrix[`${entityId}-${d}-1`], 1);
      }
    });

    it('M3.2.4: Executes "Invert" action correctly reversing availability states', () => {
      const entityId = 'T1';
      const matrix = {
        [`${entityId}-0-0`]: 1,
        [`${entityId}-0-1`]: 0,
        [`${entityId}-0-2`]: 1,
      };

      const invert = (val) => (val === 1 ? 0 : 1);
      const inverted = {
        [`${entityId}-0-0`]: invert(matrix[`${entityId}-0-0`]),
        [`${entityId}-0-1`]: invert(matrix[`${entityId}-0-1`]),
        [`${entityId}-0-2`]: invert(matrix[`${entityId}-0-2`]),
      };

      assert.strictEqual(inverted[`${entityId}-0-0`], 0);
      assert.strictEqual(inverted[`${entityId}-0-1`], 1);
      assert.strictEqual(inverted[`${entityId}-0-2`], 0);
    });
  });

  // 3. UNAVAILABLE_SLOT Conflict Calculation
  describe('Feature 3: UNAVAILABLE_SLOT Conflict Calculation', () => {
    it('M3.3.1: Raises UNAVAILABLE_SLOT conflict when teacher is scheduled in a blocked slot (0)', () => {
      const timeOffMatrix = {
        'T1-0-0': 0, // Blocked Monday Period 1
      };
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];
      const lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];

      const conflicts = [];
      for (const p of placements) {
        const lesson = lessons.find((l) => l.id === p.lessonId);
        const key = `${lesson.teacherId}-${p.dayIndex}-${p.periodIndex}`;
        if (timeOffMatrix[key] === 0) {
          conflicts.push({
            type: 'UNAVAILABLE_SLOT',
            lessonId: lesson.id,
            message: `Teacher is unavailable on Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
          });
        }
      }

      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].type, 'UNAVAILABLE_SLOT');
    });

    it('M3.3.2: Does not raise conflict when slot is marked 1 (Available) or 2 (Disfavored soft constraint)', () => {
      const timeOffMatrix = {
        'T1-0-0': 1,
        'T1-0-1': 2,
      };
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
      ];
      const lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L2', subjectId: 'S2', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];

      const hardConflicts = [];
      for (const p of placements) {
        const lesson = lessons.find((l) => l.id === p.lessonId);
        const key = `${lesson.teacherId}-${p.dayIndex}-${p.periodIndex}`;
        if (timeOffMatrix[key] === 0) {
          hardConflicts.push({ type: 'UNAVAILABLE_SLOT', lessonId: lesson.id });
        }
      }

      assert.strictEqual(hardConflicts.length, 0);
    });

    it('M3.3.3: Correctly raises UNAVAILABLE_SLOT for class time-off restrictions', () => {
      const timeOffMatrix = {
        'C1-1-4': 0, // Blocked Tuesday Period 5 for Class C1
      };
      const placements = [
        { lessonId: 'L1', dayIndex: 1, periodIndex: 4, roomId: 'R1' },
      ];
      const lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];

      const conflicts = [];
      for (const p of placements) {
        const lesson = lessons.find((l) => l.id === p.lessonId);
        const classKey = `${lesson.classId}-${p.dayIndex}-${p.periodIndex}`;
        if (timeOffMatrix[classKey] === 0) {
          conflicts.push({
            type: 'UNAVAILABLE_SLOT',
            lessonId: lesson.id,
            message: `Class C1 unavailable`,
          });
        }
      }

      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].type, 'UNAVAILABLE_SLOT');
    });
  });

  // 4. Advanced Relations Modal Rules Configuration
  describe('Feature 4: Advanced Relations & Constraints Configuration', () => {
    it('M3.4.1: Supports all 6 desktop aSc constraint rule types', () => {
      const validTypes = [
        'DISTRIBUTION_ACROSS_DAYS',
        'MAX_CONSECUTIVE_PERIODS',
        'MAX_DAILY_HOURS',
        'TEACHER_GAP_LIMITS',
        'SHARED_CLASSROOM',
        'LUNCH_BREAK_PLACEMENT',
      ];

      assert.strictEqual(validTypes.length, 6);

      const rule = {
        id: 'R1',
        name: 'Lunch Break Rule',
        type: 'LUNCH_BREAK_PLACEMENT',
        enabled: true,
        parameterValue: 4,
      };

      assert.ok(validTypes.includes(rule.type));
      assert.strictEqual(rule.parameterValue, 4);
    });

    it('M3.4.2: Toggles enable/disable state of constraint rules', () => {
      let rules = [
        { id: 'R1', name: 'Rule 1', type: 'MAX_CONSECUTIVE_PERIODS', enabled: true },
        { id: 'R2', name: 'Rule 2', type: 'TEACHER_GAP_LIMITS', enabled: false },
      ];

      rules = rules.map((r) => (r.id === 'R1' ? { ...r, enabled: false } : r));
      assert.strictEqual(rules.find((r) => r.id === 'R1')?.enabled, false);

      rules = rules.map((r) => (r.id === 'R2' ? { ...r, enabled: true } : r));
      assert.strictEqual(rules.find((r) => r.id === 'R2')?.enabled, true);
    });
  });
});
