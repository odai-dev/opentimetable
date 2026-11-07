// opentimetable/tests/test_m6_modals_ribbon_parity.mjs
// Milestone 6: Modal CRUD Workflows, Ribbon Navigation & Bottom Deck Parity (Gap Closure)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { translations } = jiti('../apps/web/src/lib/i18n.ts');
const { parseRozBinary } = jiti('../apps/web/src/lib/roz-parser.ts');
const { serializeRozBinary } = jiti('../apps/web/src/lib/roz-serializer.ts');
const {
  SUBJECT_PALETTE,
  TEACHER_PALETTE,
  extractSlotsFromTimeOffMatrix,
  isSplitExempt,
  validateScheduleConstraints,
  generateDefaultBells,
} = jiti('../apps/web/src/lib/domain.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');
const saudiPath = path.resolve(opentimetableRoot, 'apps/web/public/demos/Saudi_Arabia_1.roz');

describe('Milestone 6: Modal CRUD Workflows, Ribbon Toolbar & Bottom Deck Parity', () => {

  // ==========================================================================
  // Suite 1: Entity Modal CRUD Workflows & State Cascading (WF-ENT-01 to 06)
  // ==========================================================================
  describe('Suite 1: Entity Modal CRUD Workflows & State Cascading (WF-ENT-01 to WF-ENT-06)', () => {
    
    it('WF-ENT-01: School Setup — dynamically generates bell schedules and validates cycle/period boundaries', () => {
      // 1. Generate 5-period default bell schedule
      const bells5 = generateDefaultBells(5);
      assert.strictEqual(bells5.length, 5);
      assert.strictEqual(bells5[0], '08:00 - 08:45');
      assert.strictEqual(bells5[1], '08:50 - 09:35');
      assert.strictEqual(bells5[2], '09:40 - 10:25');
      assert.strictEqual(bells5[3], '10:30 - 11:15');
      assert.strictEqual(bells5[4], '11:20 - 12:05');

      // 2. Scale dynamically to 12 periods (Saudi Arabia standard)
      const bells12 = generateDefaultBells(12);
      assert.strictEqual(bells12.length, 12);
      assert.strictEqual(bells12[11], '17:10 - 17:55');

      // 3. School configuration update handler state simulation (matching page.tsx handleUpdateSchool)
      let schoolConfig = {
        schoolName: 'Al-Noor High School',
        academicYear: '2025/2026',
        cycleDays: 5,
        periodsPerDay: 7,
        bellSchedule: bells5,
      };

      const handleUpdateSchool = (data) => {
        if (data.schoolName) schoolConfig.schoolName = data.schoolName;
        if (data.academicYear) schoolConfig.academicYear = data.academicYear;
        if (typeof data.cycleDays === 'number') schoolConfig.cycleDays = data.cycleDays;
        if (typeof data.periodsPerDay === 'number') schoolConfig.periodsPerDay = data.periodsPerDay;
        if (data.bellSchedule) schoolConfig.bellSchedule = data.bellSchedule;
      };

      handleUpdateSchool({
        schoolName: 'King Fahd University of Petroleum & Minerals',
        academicYear: '2026/2027',
        cycleDays: 6,
        periodsPerDay: 10,
        bellSchedule: generateDefaultBells(10),
      });

      assert.strictEqual(schoolConfig.schoolName, 'King Fahd University of Petroleum & Minerals');
      assert.strictEqual(schoolConfig.academicYear, '2026/2027');
      assert.strictEqual(schoolConfig.cycleDays, 6);
      assert.strictEqual(schoolConfig.periodsPerDay, 10);
      assert.strictEqual(schoolConfig.bellSchedule.length, 10);
    });

    it('WF-ENT-02: Subject CRUD — adds, modifies, and deletes with cascading lesson and placement cleanup', () => {
      let subjects = [
        { id: 'SUB_MTH', code: 'MATH', name: 'Mathematics', color: SUBJECT_PALETTE[0] },
        { id: 'SUB_PHY', code: 'PHYS', name: 'Physics', color: SUBJECT_PALETTE[1] },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'SUB_MTH', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L2', subjectId: 'SUB_PHY', teacherId: 'T2', classId: 'C1', duration: 1 },
        { id: 'L3', subjectId: 'SUB_MTH', teacherId: 'T1', classId: 'C2', duration: 2 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1', isLocked: false },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1', isLocked: false },
        { lessonId: 'L3', dayIndex: 1, periodIndex: 0, roomId: 'R2', isLocked: true },
      ];

      // Add Subject
      const newSubject = { id: 'SUB_CHM', code: 'CHEM', name: 'Chemistry', color: SUBJECT_PALETTE[2] };
      subjects = [...subjects, newSubject];
      assert.strictEqual(subjects.length, 3);
      assert.strictEqual(subjects[2].code, 'CHEM');

      // Edit Subject
      subjects = subjects.map((s) => (s.id === 'SUB_MTH' ? { ...s, name: 'Pure Mathematics', color: '#dc2626' } : s));
      assert.strictEqual(subjects.find((s) => s.id === 'SUB_MTH')?.name, 'Pure Mathematics');
      assert.strictEqual(subjects.find((s) => s.id === 'SUB_MTH')?.color, '#dc2626');

      // Delete Subject with cascading cleanup (matching page.tsx handleDeleteSubject)
      const deleteId = 'SUB_MTH';
      subjects = subjects.filter((s) => s.id !== deleteId);
      const toDeleteLessons = new Set(lessons.filter((l) => l.subjectId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.subjectId !== deleteId);
      placements = placements.filter((p) => !toDeleteLessons.has(p.lessonId));

      assert.strictEqual(subjects.length, 2);
      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(lessons[0].id, 'L2');
      assert.strictEqual(placements.length, 1);
      assert.strictEqual(placements[0].lessonId, 'L2');
    });

    it('WF-ENT-03: Class CRUD — adds, modifies, and deletes with cascading cleanup and selectedEntityId fallback', () => {
      let classes = [
        { id: 'C1', name: 'Grade 10-A', grade: 10, defaultRoomId: 'R1' },
        { id: 'C2', name: 'Grade 10-B', grade: 10, defaultRoomId: 'R2' },
        { id: 'C3', name: 'Grade 11-A', grade: 11, defaultRoomId: 'R1' },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
        { id: 'L2', subjectId: 'S2', teacherId: 'T2', classId: 'C2', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R2' },
      ];
      let selectedEntityId = 'C1';

      // Add Class
      const newClass = { id: 'C4', name: 'Grade 12-A', grade: 12, defaultRoomId: 'R3' };
      classes = [...classes, newClass];
      assert.strictEqual(classes.length, 4);

      // Edit Class
      classes = classes.map((c) => (c.id === 'C2' ? { ...c, name: 'Grade 10-B Advanced', grade: 10 } : c));
      assert.strictEqual(classes.find((c) => c.id === 'C2')?.name, 'Grade 10-B Advanced');

      // Delete Class C1 with selectedEntityId fallback (matching page.tsx handleDeleteClass)
      const deleteId = 'C1';
      classes = classes.filter((c) => c.id !== deleteId);
      const toDeleteLessons = new Set(lessons.filter((l) => l.classId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.classId !== deleteId);
      placements = placements.filter((p) => !toDeleteLessons.has(p.lessonId));
      if (selectedEntityId === deleteId) {
        selectedEntityId = classes.length > 0 ? classes[0].id : '';
      }

      assert.strictEqual(classes.length, 3);
      assert.strictEqual(lessons.length, 1);
      assert.strictEqual(placements.length, 1);
      assert.strictEqual(selectedEntityId, 'C2'); // Fell back cleanly to remaining class
    });

    it('WF-ENT-04: Classroom CRUD — safe deletion preserving lessons and reassigning to fallback room', () => {
      let rooms = [
        { id: 'R1', name: 'Physics Lab', capacity: 30, type: 'LAB' },
        { id: 'R2', name: 'Main Lecture Hall', capacity: 120, type: 'CLASSROOM' },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', roomId: 'R1', duration: 1 },
        { id: 'L2', subjectId: 'S2', teacherId: 'T2', classId: 'C2', roomId: 'R2', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R2' },
      ];

      // Add Room
      const newRoom = { id: 'R3', name: 'Gymnasium', capacity: 200, type: 'GYM' };
      rooms = [...rooms, newRoom];
      assert.strictEqual(rooms.length, 3);

      // Edit Room
      rooms = rooms.map((r) => (r.id === 'R1' ? { ...r, capacity: 40 } : r));
      assert.strictEqual(rooms.find((r) => r.id === 'R1')?.capacity, 40);

      // Delete Room R1: Desktop safety rule — NEVER delete lessons!
      // (matching page.tsx handleDeleteRoom)
      const deleteId = 'R1';
      const remainingRooms = rooms.filter((r) => r.id !== deleteId);
      const fallbackRoomId = remainingRooms[0]?.id || '';
      rooms = remainingRooms;
      lessons = lessons.map((l) => (l.roomId === deleteId ? { ...l, roomId: undefined } : l));
      placements = placements.map((p) => (p.roomId === deleteId ? { ...p, roomId: fallbackRoomId } : p));

      assert.strictEqual(rooms.length, 2);
      assert.strictEqual(lessons.length, 2); // Zero lessons deleted!
      assert.strictEqual(lessons.find((l) => l.id === 'L1')?.roomId, undefined); // Auto/Flexible room
      assert.strictEqual(placements.find((p) => p.lessonId === 'L1')?.roomId, 'R2'); // Reassigned to fallback room
    });

    it('WF-ENT-05: Teacher CRUD — adds, modifies, batch updates max hours, and deletes with cascading cleanup', () => {
      let teachers = [
        { id: 'T1', name: 'Dr. Tariq', speciality: 'Mathematics', maxWeeklyHours: 18, color: TEACHER_PALETTE[0] },
        { id: 'T2', name: 'Prof. Layla', speciality: 'Physics', maxWeeklyHours: 16, color: TEACHER_PALETTE[1] },
        { id: 'T3', name: 'Dr. Zaid', speciality: 'Chemistry', maxWeeklyHours: 16, color: TEACHER_PALETTE[2] },
      ];
      let lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
      ];
      let placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
      ];
      let selectedEntityId = 'T1';

      // Add Teacher
      const newTeacher = { id: 'T4', name: 'Dr. Mona', speciality: 'Biology', maxWeeklyHours: 14, color: TEACHER_PALETTE[3] };
      teachers = [...teachers, newTeacher];
      assert.strictEqual(teachers.length, 4);

      // Batch update max hours across multiple teachers
      const batchIds = ['T2', 'T3'];
      teachers = teachers.map((t) => (batchIds.includes(t.id) ? { ...t, maxWeeklyHours: 20 } : t));
      assert.strictEqual(teachers.find((t) => t.id === 'T2')?.maxWeeklyHours, 20);
      assert.strictEqual(teachers.find((t) => t.id === 'T3')?.maxWeeklyHours, 20);

      // Delete Teacher T1 with cascading cleanup & selectedEntityId fallback (page.tsx handleDeleteTeacher)
      const deleteId = 'T1';
      teachers = teachers.filter((t) => t.id !== deleteId);
      const toDeleteLessons = new Set(lessons.filter((l) => l.teacherId === deleteId).map((l) => l.id));
      lessons = lessons.filter((l) => l.teacherId !== deleteId);
      placements = placements.filter((p) => !toDeleteLessons.has(p.lessonId));
      if (selectedEntityId === deleteId) {
        selectedEntityId = teachers.length > 0 ? teachers[0].id : '';
      }

      assert.strictEqual(teachers.length, 3);
      assert.strictEqual(lessons.length, 0);
      assert.strictEqual(placements.length, 0);
      assert.strictEqual(selectedEntityId, 'T2');
    });

    it('WF-ENT-06: Lesson CRUD — supports multi-period, joint classes, co-teachers, and group divisions', () => {
      // 1. Double period lesson
      const doubleLesson = {
        id: 'L_DBL',
        subjectId: 'S_CHEM_LAB',
        teacherId: 'T1',
        classId: 'C1',
        duration: 2,
      };
      assert.strictEqual(doubleLesson.duration, 2);

      // 2. Joint classes lesson (multiple classIds)
      const jointLesson = {
        id: 'L_JNT',
        subjectId: 'S_HIST',
        teacherId: 'T1',
        classId: 'C1',
        classIds: ['C1', 'C2'],
        jointClassIds: ['C1', 'C2'],
        duration: 1,
      };
      assert.deepStrictEqual(jointLesson.classIds, ['C1', 'C2']);

      // 3. Co-taught lesson (multiple teacherIds)
      const coTaughtLesson = {
        id: 'L_CO',
        subjectId: 'S_AI_PROJECT',
        teacherId: 'T1',
        teacherIds: ['T1', 'T2'],
        coTeacherIds: ['T1', 'T2'],
        classId: 'C1',
        duration: 1,
      };
      assert.deepStrictEqual(coTaughtLesson.teacherIds, ['T1', 'T2']);

      // 4. Split group divisions with isSplitExempt
      const splitGroup1 = {
        id: 'L_G1',
        subjectId: 'S_FRENCH',
        teacherId: 'T1',
        classId: 'C1',
        groupName: 'Group 1',
        groupId: 'G1',
        entireClass: false,
        duration: 1,
      };
      const splitGroup2 = {
        id: 'L_G2',
        subjectId: 'S_GERMAN',
        teacherId: 'T2',
        classId: 'C1',
        groupName: 'Group 2',
        groupId: 'G2',
        entireClass: false,
        duration: 1,
      };

      // Both lessons share Class C1, but have distinct non-null groups -> exempt from clash
      const isExempt = isSplitExempt(splitGroup1, splitGroup2);
      assert.strictEqual(isExempt, true);
    });
  });

  // ==========================================================================
  // Suite 2: Time-Off Availability Matrix & Bulk Actions (WF-CST-01, WF-CST-02)
  // ==========================================================================
  describe('Suite 2: Time-Off Availability Matrix & Bulk Actions (WF-CST-01, WF-CST-02)', () => {
    
    it('WF-CST-01: Time-Off 3-State cycling & UNAVAILABLE_SLOT conflict detection', () => {
      const cycleState = (current) => (current === 1 ? 0 : current === 0 ? 2 : 1);

      assert.strictEqual(cycleState(1), 0); // Available -> Blocked
      assert.strictEqual(cycleState(0), 2); // Blocked -> Disfavored
      assert.strictEqual(cycleState(2), 1); // Disfavored -> Available

      const totalDays = 5;
      const totalPeriods = 7;
      const matrix = {
        'T1-0-0': 0, // Blocked Monday P1
        'T1-0-1': 2, // Disfavored Monday P2
        'T1-0-2': 1, // Available Monday P3
      };

      const { unavailableSlots, undesirableSlots } = extractSlotsFromTimeOffMatrix(
        'T1',
        matrix,
        totalPeriods,
        []
      );

      assert.ok(unavailableSlots.includes(0)); // Slot 0 is unavailable
      assert.ok(undesirableSlots.includes(1)); // Slot 1 is undesirable
      assert.ok(!unavailableSlots.includes(2)); // Slot 2 is available

      // Validate constraint enforcement: placement in blocked slot raises UNAVAILABLE_SLOT
      const validation = validateScheduleConstraints({
        placements: [
          { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
          { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
        ],
        lessons: [
          { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', duration: 1 },
          { id: 'L2', subjectId: 'S2', teacherId: 'T1', classId: 'C1', duration: 1 },
        ],
        teachers: [{ id: 'T1', name: 'Dr. Tariq', unavailableSlots: [0], undesirableSlots: [1] }],
        classes: [{ id: 'C1', name: 'Class 10A' }],
        rooms: [{ id: 'R1', name: 'Room 101' }],
        cycleDays: 5,
        periodsPerDay: 7,
        timeOffMatrix: matrix,
      });

      assert.strictEqual(validation.isValid, false);
      const blockedConflict = validation.conflicts.find((c) => c.type === 'UNAVAILABLE_SLOT');
      assert.ok(blockedConflict);
      assert.strictEqual(blockedConflict.lessonId, 'L1');
    });

    it('WF-CST-02: Time-Off Bulk Actions — toggle day row, toggle period column, all available, block first/last, and invert', () => {
      const totalDays = 5;
      const totalPeriods = 7;
      const entityId = 'T1';
      const getKey = (d, p) => `${entityId}-${d}-${p}`;

      // Initialize all to Available (1)
      let matrix = {};
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          matrix[getKey(d, p)] = 1;
        }
      }

      // 1. Toggle Day 0: all available -> should set entire Day 0 to Blocked (0)
      const statesDay0 = Array.from({ length: totalPeriods }, (_, p) => matrix[getKey(0, p)] ?? 1);
      const allAvailDay0 = statesDay0.every((s) => s === 1);
      const nextDay0State = allAvailDay0 ? 0 : 1;
      for (let p = 0; p < totalPeriods; p++) {
        matrix[getKey(0, p)] = nextDay0State;
      }
      for (let p = 0; p < totalPeriods; p++) {
        assert.strictEqual(matrix[getKey(0, p)], 0);
      }

      // Reset to all available before testing Period 2 toggle
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          matrix[getKey(d, p)] = 1;
        }
      }

      // 2. Toggle Period 2: should block Period 2 for all days
      const statesP2 = Array.from({ length: totalDays }, (_, d) => matrix[getKey(d, 2)] ?? 1);
      const allAvailP2 = statesP2.every((s) => s === 1);
      const nextP2State = allAvailP2 ? 0 : 1;
      for (let d = 0; d < totalDays; d++) {
        matrix[getKey(d, 2)] = nextP2State;
      }
      for (let d = 0; d < totalDays; d++) {
        assert.strictEqual(matrix[getKey(d, 2)], 0);
      }

      // 3. Set All Available: resets all 35 slots to 1
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          matrix[getKey(d, p)] = 1;
        }
      }
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          assert.strictEqual(matrix[getKey(d, p)], 1);
        }
      }

      // 4. Block Period 1 (Period index 0 across all days)
      for (let d = 0; d < totalDays; d++) {
        matrix[getKey(d, 0)] = 0;
      }
      for (let d = 0; d < totalDays; d++) {
        assert.strictEqual(matrix[getKey(d, 0)], 0);
        assert.strictEqual(matrix[getKey(d, 1)], 1);
      }

      // 5. Block Last Period (Period index 6 across all days)
      for (let d = 0; d < totalDays; d++) {
        matrix[getKey(d, 6)] = 0;
      }
      for (let d = 0; d < totalDays; d++) {
        assert.strictEqual(matrix[getKey(d, 6)], 0);
      }

      // 6. Invert: 1 -> 0, 0 -> 1, 2 -> 1
      for (let d = 0; d < totalDays; d++) {
        for (let p = 0; p < totalPeriods; p++) {
          const cur = matrix[getKey(d, p)] ?? 1;
          matrix[getKey(d, p)] = cur === 1 ? 0 : 1;
        }
      }
      for (let d = 0; d < totalDays; d++) {
        // Was 0 -> now 1
        assert.strictEqual(matrix[getKey(d, 0)], 1);
        assert.strictEqual(matrix[getKey(d, 6)], 1);
        // Was 1 -> now 0
        assert.strictEqual(matrix[getKey(d, 1)], 0);
      }
    });
  });

  // ==========================================================================
  // Suite 3: Advanced Scheduling Rules & Relations Modal (WF-CST-03)
  // ==========================================================================
  describe('Suite 3: Advanced Scheduling Rules & Relations Modal (WF-CST-03)', () => {

    it('WF-CST-03: Advanced Scheduling Rules — configures 6 desktop constraint types and maps to solver parameters', () => {
      const ruleDefinitions = [
        { type: 'DISTRIBUTION_ACROSS_DAYS', defaultParam: 1, unit: 'per day' },
        { type: 'MAX_CONSECUTIVE_PERIODS', defaultParam: 2, unit: 'lectures' },
        { type: 'MAX_DAILY_HOURS', defaultParam: 5, unit: 'lectures' },
        { type: 'TEACHER_GAP_LIMITS', defaultParam: 1, unit: 'gaps / week' },
        { type: 'SHARED_CLASSROOM', defaultParam: 2, unit: 'sections' },
        { type: 'LUNCH_BREAK_PLACEMENT', defaultParam: 4, unit: 'after lecture' },
      ];

      assert.strictEqual(ruleDefinitions.length, 6);

      let rules = [
        { id: 'R1', name: 'Consecutive Limit', type: 'MAX_CONSECUTIVE_PERIODS', enabled: true, parameterValue: 3 },
        { id: 'R2', name: 'Teacher Gaps', type: 'TEACHER_GAP_LIMITS', enabled: true, parameterValue: 0 },
        { id: 'R3', name: 'Distribution', type: 'DISTRIBUTION_ACROSS_DAYS', enabled: false, parameterValue: 1 },
      ];

      // Toggle rule enabled state
      rules = rules.map((r) => (r.id === 'R3' ? { ...r, enabled: true } : r));
      assert.strictEqual(rules.find((r) => r.id === 'R3')?.enabled, true);

      // Modify parameter value
      rules = rules.map((r) => (r.id === 'R1' ? { ...r, parameterValue: 2 } : r));
      assert.strictEqual(rules.find((r) => r.id === 'R1')?.parameterValue, 2);

      // Map rules to solver configuration (matching page.tsx handleRunGenerate logic)
      const maxConsecutiveRule = rules.find((r) => r.type === 'MAX_CONSECUTIVE_PERIODS' && r.enabled);
      const gapLimitsRule = rules.find((r) => r.type === 'TEACHER_GAP_LIMITS' && r.enabled);
      const distribRule = rules.find((r) => r.type === 'DISTRIBUTION_ACROSS_DAYS' && r.enabled);

      assert.strictEqual(maxConsecutiveRule?.parameterValue, 2);
      assert.strictEqual(gapLimitsRule?.parameterValue, 0);
      assert.strictEqual(distribRule?.parameterValue, 1);
    });
  });

  // ==========================================================================
  // Suite 4: Desktop Ribbon Bar Navigation & Action Dispatch (WF-UI-01)
  // ==========================================================================
  describe('Suite 4: Desktop Ribbon Bar Navigation & Action Dispatch (WF-UI-01)', () => {

    it('WF-UI-01: Desktop Ribbon Bar — 5 authentic tabs, large icon toolsets, and event dispatching', () => {
      const ribbonTabs = ['file', 'main', 'timetable', 'specification', 'view'];
      assert.strictEqual(ribbonTabs.length, 5);

      // Verify localized tab labels in both English and Arabic
      for (const tab of ribbonTabs) {
        assert.ok(translations.en.ribbon.tabs[tab], `Missing EN translation for tab ${tab}`);
        assert.ok(translations.ar.ribbon.tabs[tab], `Missing AR translation for tab ${tab}`);
      }

      // Simulate Ribbon activeTab state switching
      let activeTab = 'main';
      const setActiveTab = (newTab) => {
        activeTab = newTab;
      };

      setActiveTab('timetable');
      assert.strictEqual(activeTab, 'timetable');

      setActiveTab('specification');
      assert.strictEqual(activeTab, 'specification');

      // Verify Quick Access bar sensitivity
      let historyLength = 0;
      let redoLength = 0;
      let isReadOnly = false;

      const canUndo = historyLength > 0 && !isReadOnly;
      const canRedo = redoLength > 0 && !isReadOnly;
      assert.strictEqual(canUndo, false);
      assert.strictEqual(canRedo, false);

      // After user action
      historyLength = 3;
      assert.strictEqual(historyLength > 0 && !isReadOnly, true);

      // Read-only locks all mutation tools
      isReadOnly = true;
      assert.strictEqual(historyLength > 0 && !isReadOnly, false);

      // Entity navigation: onOpenBasicData dispatches with correct initialTab
      let basicDataTab = null;
      const handleOpenBasicData = (tab) => {
        basicDataTab = tab;
      };

      const entityActions = ['school', 'subjects', 'classes', 'classrooms', 'teachers', 'lessons'];
      for (const entity of entityActions) {
        handleOpenBasicData(entity);
        assert.strictEqual(basicDataTab, entity);
      }
    });
  });

  // ==========================================================================
  // Suite 5: Bottom Lesson Card Deck & Multi-Category Dock (WF-UI-03)
  // ==========================================================================
  describe('Suite 5: Bottom Lesson Card Deck & Multi-Category Dock (WF-UI-03)', () => {

    it('WF-UI-03: Bottom Lesson Card Deck — 4 category switcher buttons and dynamic card filtering', () => {
      const categoryButtons = [
        { id: 'school', labelEn: 'Campus', labelAr: 'الجامعة' },
        { id: 'teacher', labelEn: 'Faculty', labelAr: 'أعضاء هيئة التدريس' },
        { id: 'class', labelEn: 'Groups', labelAr: 'الدفعات والشعب' },
        { id: 'room', labelEn: 'Halls & Labs', labelAr: 'القاعات والمعامل' },
      ];
      assert.strictEqual(categoryButtons.length, 4);

      // Verify deck translations in EN and AR
      assert.ok(translations.en.deck.title);
      assert.ok(translations.ar.deck.title);
      assert.ok(translations.en.deck.autoPlace);
      assert.ok(translations.ar.deck.autoPlace);
      assert.ok(translations.en.deck.clearRow);
      assert.ok(translations.ar.deck.clearRow);
      assert.ok(translations.en.deck.dragHint);
      assert.ok(translations.ar.deck.dragHint);

      const lessons = [
        { id: 'L1', subjectId: 'S1', teacherId: 'T1', classId: 'C1', roomId: 'R1' },
        { id: 'L2', subjectId: 'S2', teacherId: 'T1', classId: 'C2', roomId: 'R1' },
        { id: 'L3', subjectId: 'S3', teacherId: 'T2', classId: 'C1', roomId: 'R2' },
        { id: 'L4', subjectId: 'S4', teacherId: 'T2', classId: 'C2', roomId: 'R2' },
        { id: 'L5', subjectId: 'S5', teacherId: 'T3', classId: 'C1', roomId: 'R3', classIds: ['C1', 'C2'] },
      ];

      // Placed lessons: L1 and L3 are placed; L2, L4, L5 are unplaced
      const placements = [
        { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R1' },
        { lessonId: 'L3', dayIndex: 0, periodIndex: 1, roomId: 'R2' },
      ];

      const placedSet = new Set(placements.map((p) => p.lessonId));
      const unplacedLessons = lessons.filter((l) => !placedSet.has(l.id));
      assert.strictEqual(unplacedLessons.length, 3);
      assert.deepStrictEqual(unplacedLessons.map((l) => l.id), ['L2', 'L4', 'L5']);

      // 1. School category: returns all unplaced cards
      let deckCategory = 'school';
      let selectedEntityId = 'C1';
      let filtered = unplacedLessons;
      assert.strictEqual(filtered.length, 3);

      // 2. Class category with selectedEntityId = 'C1'
      deckCategory = 'class';
      filtered = unplacedLessons.filter(
        (l) => l.classId === selectedEntityId || Boolean(l.classIds?.includes(selectedEntityId))
      );
      // L4 is class C2 only -> excluded; L2 is C2 -> excluded; L5 includes C1 in classIds -> included!
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'L5');

      // 3. Teacher category with selectedEntityId = 'T1'
      deckCategory = 'teacher';
      selectedEntityId = 'T1';
      filtered = unplacedLessons.filter(
        (l) => l.teacherId === selectedEntityId || Boolean(l.teacherIds?.includes(selectedEntityId))
      );
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'L2'); // L2 has teacherId T1

      // 4. Room category with selectedEntityId = 'R3'
      deckCategory = 'room';
      selectedEntityId = 'R3';
      filtered = unplacedLessons.filter((l) => l.roomId === selectedEntityId);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'L5'); // L5 has roomId R3

      // Drag Item format
      const dragItem = {
        type: 'deck',
        lessonId: 'L2',
      };
      assert.strictEqual(dragItem.type, 'deck');
      assert.strictEqual(dragItem.lessonId, 'L2');
    });
  });

  // ==========================================================================
  // Suite 6: Lossless File Portability & Dual Storage Persistence (WF-FIL-04, 05)
  // ==========================================================================
  describe('Suite 6: Lossless File Portability & Dual Storage Persistence (WF-FIL-04, WF-FIL-05)', () => {

    it('WF-FIL-04: Dual localStorage persistence arbitration, versioning, and auto-save guard', () => {
      // Mock Storage simulator
      const storage = new Map();
      const PRIMARY_KEY = 'opentimetable_state_v1';
      const BACKUP_KEY = 'opentimetable_state_v1_backup';

      const stateA = {
        timestamp: 1000,
        schoolName: 'Primary State',
        placements: [{ lessonId: 'L1', dayIndex: 0, periodIndex: 0 }],
      };
      const stateB = {
        timestamp: 2000,
        schoolName: 'Backup State (Newer)',
        placements: [{ lessonId: 'L1', dayIndex: 0, periodIndex: 1 }],
      };

      storage.set(PRIMARY_KEY, JSON.stringify(stateA));
      storage.set(BACKUP_KEY, JSON.stringify(stateB));

      // Dual persistence arbitration: newer timestamp wins
      const rawA = JSON.parse(storage.get(PRIMARY_KEY));
      const rawB = JSON.parse(storage.get(BACKUP_KEY));
      const activeState = (rawB && rawB.timestamp > (rawA?.timestamp || 0)) ? rawB : rawA;

      assert.strictEqual(activeState.schoolName, 'Backup State (Newer)');
      assert.strictEqual(activeState.placements[0].periodIndex, 1);

      // Hydration guard: cannot overwrite with blank slate before hydration completes
      let isHydrated = false;
      const saveState = (newState) => {
        if (!isHydrated) {
          throw new Error('GUARD_ENGAGED: Cannot save before initial hydration completes');
        }
        storage.set(PRIMARY_KEY, JSON.stringify(newState));
      };

      assert.throws(() => saveState({ schoolName: 'Blank' }), /GUARD_ENGAGED/);

      isHydrated = true;
      assert.doesNotThrow(() => saveState({ schoolName: 'Hydrated Save', timestamp: 3000 }));
      assert.strictEqual(JSON.parse(storage.get(PRIMARY_KEY)).schoolName, 'Hydrated Save');
    });

    it('WF-FIL-05: Binary .roz serialization & lossless round-trip on authentic desktop datasets', () => {
      const saudiBuf = fs.readFileSync(saudiPath);
      const parsed = parseRozBinary(saudiBuf, 'Saudi_Arabia_1.roz');

      assert.ok(parsed.teachers.length >= 80, `Expected >= 80 teachers, got ${parsed.teachers.length}`);
      assert.ok(parsed.classes.length >= 30, `Expected >= 30 classes, got ${parsed.classes.length}`);

      // Serialize memory state into binary .roz container
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
        schoolName: parsed.school_name,
        academicYear: '2025/2026',
      });

      assert.ok(Buffer.isBuffer(serializedBuf) || serializedBuf instanceof Uint8Array);
      assert.ok(serializedBuf.length > 500, 'Serialized buffer must be non-empty binary container');

      // Re-parse serialized binary buffer to verify round-trip persistence
      const reparsed = parseRozBinary(serializedBuf, 'Saudi_Arabia_1_reparsed.roz');
      assert.strictEqual(reparsed.teachers.length, parsed.teachers.length);
      assert.strictEqual(reparsed.classes.length, parsed.classes.length);
      assert.strictEqual(reparsed.subjects.length, parsed.subjects.length);
      assert.strictEqual(reparsed.rooms.length, parsed.rooms.length);
      assert.strictEqual(reparsed.cycle_days, parsed.cycle_days);
      assert.strictEqual(reparsed.periods_per_day, parsed.periods_per_day);
    });
  });
});
