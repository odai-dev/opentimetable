import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js');
const { isSplitExempt, extractSlotsFromTimeOffMatrix } = jiti(import.meta.url)('../apps/web/src/lib/domain.ts');
const { generateAscttXml } = jiti(import.meta.url)('../apps/web/src/lib/export-xml.ts');

test('Milestone 2: Conflict Detection & Split Class Exemption', async (t) => {
  await t.test('isSplitExempt returns true for divided elective groups with distinct group names', () => {
    const l1 = {
      id: 'L1',
      subjectId: 'SUB_FRENCH',
      teacherId: 'T1',
      classId: 'C1',
      duration: 1,
      isSplitGroup: true,
      entireClass: false,
      groupName: 'French Group',
    };
    const l2 = {
      id: 'L2',
      subjectId: 'SUB_GERMAN',
      teacherId: 'T2',
      classId: 'C1',
      duration: 1,
      isSplitGroup: true,
      entireClass: false,
      groupName: 'German Group',
    };
    assert.equal(isSplitExempt(l1, l2), true);
  });

  await t.test('isSplitExempt returns false if either lesson is for the entire class', () => {
    const l1 = {
      id: 'L1',
      subjectId: 'SUB_MATH',
      teacherId: 'T1',
      classId: 'C1',
      duration: 1,
      entireClass: true,
      groupName: 'Entire Class',
    };
    const l2 = {
      id: 'L2',
      subjectId: 'SUB_PHYSICS',
      teacherId: 'T2',
      classId: 'C1',
      duration: 1,
      isSplitGroup: true,
      entireClass: false,
      groupName: 'Lab Group A',
    };
    assert.equal(isSplitExempt(l1, l2), false);
  });

  await t.test('isSplitExempt returns false if both lessons belong to the same split group', () => {
    const l1 = {
      id: 'L1',
      subjectId: 'SUB_CHEM',
      teacherId: 'T1',
      classId: 'C1',
      duration: 1,
      isSplitGroup: true,
      entireClass: false,
      groupName: 'Group 1',
    };
    const l2 = {
      id: 'L2',
      subjectId: 'SUB_BIO',
      teacherId: 'T2',
      classId: 'C1',
      duration: 1,
      isSplitGroup: true,
      entireClass: false,
      groupName: 'Group 1',
    };
    assert.equal(isSplitExempt(l1, l2), false);
  });

  await t.test('extractSlotsFromTimeOffMatrix separates unavailable and undesirable slots', () => {
    const matrix = {
      'T1-0-1': 0, // unavailable
      'T1-1-3': 2, // undesirable (state 2)
      'T1-2-4': 1, // available (state 1)
      'T2-0-0': 0, // unavailable for T2
    };
    const resT1 = extractSlotsFromTimeOffMatrix('T1', matrix, 7);
    assert.deepEqual(resT1.unavailableSlots, [1]);
    assert.deepEqual(resT1.undesirableSlots, [10]); // day 1 * 7 + 3 = 10

    const resT2 = extractSlotsFromTimeOffMatrix('T2', matrix, 7);
    assert.deepEqual(resT2.unavailableSlots, [0]);
    assert.deepEqual(resT2.undesirableSlots, []);
  });
});

test('Milestone 2: Official aSc 2012 XML Export Generator', async (t) => {
  const exportData = {
    schoolName: 'Al-Amal Secondary School',
    academicYear: '2025/2026',
    cycleDays: 5,
    periodsPerDay: 7,
    bellSchedule: [
      '08:00 - 08:45',
      '08:55 - 09:40',
      '09:50 - 10:35',
      '10:55 - 11:40',
      '11:50 - 12:35',
      '12:45 - 13:30',
      '13:40 - 14:25',
    ],
    daysList: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    teachers: [
      { id: 'T1', name: 'Ahmed', nameAr: 'أحمد', speciality: 'Math', color: '#2563eb', unavailableSlots: [] },
      { id: 'T2', name: 'Sara', nameAr: 'سارة', speciality: 'Physics', color: '#10b981', unavailableSlots: [] },
    ],
    classes: [
      { id: 'C1', name: 'Grade 10-A', nameAr: 'عاشر-أ', grade: 10 },
      { id: 'C2', name: 'Grade 10-B', nameAr: 'عاشر-ب', grade: 10 },
    ],
    rooms: [
      { id: 'R1', name: 'Lab 1', nameAr: 'مختبر 1', capacity: 35, type: 'LAB' },
    ],
    subjects: [
      { id: 'S1', name: 'Math', nameAr: 'رياضيات', code: 'MATH', color: '#3b82f6' },
      { id: 'S2', name: 'Physics', nameAr: 'فيزياء', code: 'PHYS', color: '#10b981' },
    ],
    lessons: [
      {
        id: 'L1',
        subjectId: 'S1',
        teacherId: 'T1',
        classId: 'C1',
        roomId: 'R1',
        duration: 1,
        jointClassIds: ['C2'],
        coTeacherIds: ['T2'],
      },
    ],
    placements: [
      { lessonId: 'L1', dayIndex: 0, periodIndex: 2, roomId: 'R1' },
    ],
  };

  const xml = generateAscttXml(exportData);

  assert.ok(xml.includes('<?xml version="1.0" encoding="utf-8"?>'));
  assert.ok(xml.includes('<timetable importtype="database" name="Al-Amal Secondary School" year="2025/2026"'));
  assert.ok(xml.includes('<period period="1" name="Period 1" short="1" starttime="08:00" endtime="08:45"/>'));
  assert.ok(xml.includes('<daysdef id="1" days="10000" name="Sunday" short="Sun"/>'));
  assert.ok(xml.includes('<subject id="S1" name="Math (رياضيات)" short="MATH" color="#3b82f6"/>'));
  assert.ok(xml.includes('<teacher id="T1" name="Ahmed (أحمد)" short="Math" color="#2563eb"/>'));
  assert.ok(xml.includes('<classroom id="R1" name="Lab 1 (مختبر 1)" short="R1" capacity="35"/>'));
  assert.ok(xml.includes('<class id="C1" name="Grade 10-A (عاشر-أ)" short="C1" grade="10"/>'));
  // Verify multi-class joint and co-teacher export in lessons
  assert.ok(xml.includes('classids="C1,C2"'));
  assert.ok(xml.includes('teacherids="T1,T2"'));
  // Verify cards placement
  assert.ok(xml.includes('<card lessonid="L1" period="3" days="10000" classroomids="R1"/>'));
});
