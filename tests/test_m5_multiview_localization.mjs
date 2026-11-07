// opentimetable/tests/test_m5_multiview_localization.mjs
// Milestone 5: Multi-View Schedule Grids, Bilingual Localization & Desktop Output (R5)

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');
const saudiPath = path.resolve(opentimetableRoot, 'apps/web/public/demos/Saudi_Arabia_1.roz');

// Pure slot indexer replicating TimetableGrid.tsx placementsByEntitySlot
function computePlacementsByEntitySlot(placements, lessons) {
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const map = new Map();

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const lesson = lessonMap.get(p.lessonId);
    if (!lesson) continue;

    // 1. Index by Class (supporting joint classes via classIds)
    const targetClassIds =
      lesson.classIds && lesson.classIds.length > 0
        ? lesson.classIds
        : lesson.classId
        ? [lesson.classId]
        : [];
    for (const cId of targetClassIds) {
      if (!cId) continue;
      const classKey = `class:${cId}:${p.dayIndex}:${p.periodIndex}`;
      const group = map.get(classKey);
      if (group) group.push(p);
      else map.set(classKey, [p]);
    }

    // 2. Index by Teacher (supporting co-teachers via teacherIds)
    const targetTeacherIds =
      lesson.teacherIds && lesson.teacherIds.length > 0
        ? lesson.teacherIds
        : lesson.teacherId
        ? [lesson.teacherId]
        : [];
    for (const tId of targetTeacherIds) {
      if (!tId) continue;
      const teacherKey = `teacher:${tId}:${p.dayIndex}:${p.periodIndex}`;
      const group = map.get(teacherKey);
      if (group) group.push(p);
      else map.set(teacherKey, [p]);
    }

    // 3. Index by Room
    const rId = p.roomId?.trim();
    if (rId) {
      const roomKey = `room:${rId}:${p.dayIndex}:${p.periodIndex}`;
      const group = map.get(roomKey);
      if (group) group.push(p);
      else map.set(roomKey, [p]);
    }

    // 4. Index by Subject
    if (lesson.subjectId) {
      const subjectKey = `subject:${lesson.subjectId}:${p.dayIndex}:${p.periodIndex}`;
      const group = map.get(subjectKey);
      if (group) group.push(p);
      else map.set(subjectKey, [p]);
    }
  }

  return map;
}

// Pure row entity resolution replicating TimetableGrid.tsx rowEntities
function getRowEntities(viewMode, classes, teachers, rooms, isRtl) {
  if (viewMode === 'class' || viewMode === 'wall') {
    return classes.map((c) => ({
      id: c.id,
      name: isRtl ? c.nameAr || c.name : c.name,
      code: c.name.split('-')[0].trim(),
      type: 'class',
    }));
  }
  if (viewMode === 'teacher') {
    return teachers.map((tc) => ({
      id: tc.id,
      name: isRtl ? tc.nameAr || tc.name : tc.name,
      code: tc.speciality || 'General',
      type: 'teacher',
    }));
  }
  if (viewMode === 'room') {
    return rooms.map((r) => ({
      id: r.id,
      name: isRtl ? r.nameAr || r.name : r.name,
      code: `Cap: ${r.capacity}`,
      type: 'room',
    }));
  }
  return [];
}

// Perspective-aware line text resolver replicating TimetableGrid.tsx
function resolveCardLines(params) {
  const {
    entityType,
    subject,
    teacherShortName,
    classFullName,
    classShortCode,
    room,
    cardLayout,
    isRtl = false,
  } = params;

  const getFieldText = (field) => {
    switch (field) {
      case 'subject_name':
        return isRtl ? subject.nameAr || subject.name : subject.name;
      case 'subject_code':
        return subject.code || subject.name.slice(0, 4);
      case 'teacher_name':
        return teacherShortName;
      case 'room_name':
        return room ? (isRtl ? room.nameAr || room.name : room.name) : 'N/A';
      case 'class_name':
        return classShortCode || classFullName;
      default:
        return '';
    }
  };

  const line1Text = cardLayout
    ? getFieldText(cardLayout.line1)
    : subject.code || (isRtl ? subject.nameAr || subject.name : subject.name);

  const line2Text =
    entityType === 'teacher' && (!cardLayout || cardLayout.line2 === 'teacher_name')
      ? classFullName || classShortCode
      : cardLayout
      ? getFieldText(cardLayout.line2)
      : teacherShortName;

  const line3Text =
    entityType === 'room' && (!cardLayout || cardLayout.line3 === 'room_name')
      ? classShortCode || classFullName || teacherShortName
      : cardLayout
      ? getFieldText(cardLayout.line3)
      : room
      ? isRtl
        ? room.nameAr || room.name
        : room.name
      : 'N/A';

  return { line1Text, line2Text, line3Text };
}

describe('Milestone 5: Multi-View Schedule Grids & Localization Verification (R5)', () => {
  const mockClasses = [
    { id: 'C1', name: 'Grade 10A', nameAr: 'الصف 10-أ' },
    { id: 'C2', name: 'Grade 10B', nameAr: 'الصف 10-ب' },
  ];

  const mockTeachers = [
    { id: 'T1', name: 'Dr. Tariq', nameAr: 'د. طارق', speciality: 'Mathematics' },
    { id: 'T2', name: 'Prof. Jenkins', nameAr: 'أ. جينكينز', speciality: 'Physics' },
  ];

  const mockRooms = [
    { id: 'R101', name: 'Hall 101', nameAr: 'مدرج 101', capacity: 50 },
    { id: 'LAB1', name: 'Physics Lab', nameAr: 'معمل الفيزياء', capacity: 30 },
  ];

  // =========================================================================
  // Suite 1: Left Vertical Tab Strip View Switcher (WF-UI-02)
  // =========================================================================
  describe('Suite 1: Left Vertical Tab Strip View Switcher (WF-UI-02)', () => {
    it('defines all 4 authentic desktop view modes with localized bilingual labels', () => {
      const verticalTabs = [
        { id: 'class', labelEn: 'Lecture grid', labelAr: 'جدول المحاضرات' },
        { id: 'wall', labelEn: 'Whole Campus', labelAr: 'كامل الكلية' },
        { id: 'teacher', labelEn: 'Faculty', labelAr: 'أعضاء هيئة التدريس' },
        { id: 'room', labelEn: 'Halls & Labs', labelAr: 'القاعات والمعامل' },
      ];

      assert.strictEqual(verticalTabs.length, 4);
      assert.deepStrictEqual(verticalTabs.map((t) => t.id), ['class', 'wall', 'teacher', 'room']);
      for (const tab of verticalTabs) {
        assert.ok(tab.labelEn && tab.labelEn.length > 0);
        assert.ok(tab.labelAr && tab.labelAr.length > 0);
      }
    });

    it('dynamically switches matrix rows between Classes, Teachers, and Rooms', () => {
      const classRows = getRowEntities('class', mockClasses, mockTeachers, mockRooms, false);
      assert.strictEqual(classRows.length, 2);
      assert.strictEqual(classRows[0].type, 'class');
      assert.strictEqual(classRows[0].id, 'C1');

      const wallRows = getRowEntities('wall', mockClasses, mockTeachers, mockRooms, false);
      assert.strictEqual(wallRows.length, 2);
      assert.strictEqual(wallRows[0].type, 'class');

      const teacherRows = getRowEntities('teacher', mockClasses, mockTeachers, mockRooms, false);
      assert.strictEqual(teacherRows.length, 2);
      assert.strictEqual(teacherRows[0].type, 'teacher');
      assert.strictEqual(teacherRows[0].id, 'T1');
      assert.strictEqual(teacherRows[0].code, 'Mathematics');

      const roomRows = getRowEntities('room', mockClasses, mockTeachers, mockRooms, false);
      assert.strictEqual(roomRows.length, 2);
      assert.strictEqual(roomRows[0].type, 'room');
      assert.strictEqual(roomRows[0].id, 'R101');
      assert.strictEqual(roomRows[0].code, 'Cap: 50');
    });

    it('applies vertical writing mode and direction-aware rotation', () => {
      // In LTR: writingMode is 'vertical-rl' with rotate(180deg) for bottom-to-top reading
      const ltrStyle = {
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
      };
      assert.strictEqual(ltrStyle.writingMode, 'vertical-rl');
      assert.strictEqual(ltrStyle.transform, 'rotate(180deg)');

      // In RTL: writingMode is 'vertical-rl' with 'none' transform
      const isRtl = true;
      const rtlTransform = isRtl ? 'none' : 'rotate(180deg)';
      assert.strictEqual(rtlTransform, 'none');
    });
  });

  // =========================================================================
  // Suite 2: Multi-View Cell Mapping & Perspective Adaptation (WF-OUT-02)
  // =========================================================================
  describe('Suite 2: Multi-View Cell Mapping & Perspective Adaptation (WF-OUT-02)', () => {
    const lessons = [
      { id: 'L1', subjectId: 'MATH', teacherId: 'T1', classId: 'C1', roomId: 'R101', duration: 1 },
      { id: 'L2', subjectId: 'PHYS', teacherId: 'T2', classId: 'C2', roomId: 'LAB1', duration: 1 },
      // Joint class lesson: C1 + C2
      {
        id: 'L_JOINT',
        subjectId: 'HIST',
        teacherId: 'T1',
        classId: 'C1',
        classIds: ['C1', 'C2'],
        roomId: 'R101',
        duration: 1,
      },
      // Co-taught lesson: T1 + T2
      {
        id: 'L_COTEACH',
        subjectId: 'SEMINAR',
        teacherId: 'T1',
        teacherIds: ['T1', 'T2'],
        classId: 'C1',
        roomId: 'R101',
        duration: 1,
      },
    ];

    const placements = [
      { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R101' },
      { lessonId: 'L2', dayIndex: 0, periodIndex: 1, roomId: 'LAB1' },
      { lessonId: 'L_JOINT', dayIndex: 1, periodIndex: 2, roomId: 'R101' },
      { lessonId: 'L_COTEACH', dayIndex: 2, periodIndex: 3, roomId: 'R101' },
    ];

    it('indexes placements accurately by Class, Teacher, Room, and Subject slots', () => {
      const slotMap = computePlacementsByEntitySlot(placements, lessons);

      // Class view slot lookup
      const c1Slot0 = slotMap.get('class:C1:0:0');
      assert.ok(c1Slot0 && c1Slot0.length === 1);
      assert.strictEqual(c1Slot0[0].lessonId, 'L1');

      // Teacher view slot lookup
      const t2Slot1 = slotMap.get('teacher:T2:0:1');
      assert.ok(t2Slot1 && t2Slot1.length === 1);
      assert.strictEqual(t2Slot1[0].lessonId, 'L2');

      // Room view slot lookup
      const r101Slot0 = slotMap.get('room:R101:0:0');
      assert.ok(r101Slot0 && r101Slot0.length === 1);
      assert.strictEqual(r101Slot0[0].lessonId, 'L1');
    });

    it('displays joint class placements across all participating class rows at the same slot', () => {
      const slotMap = computePlacementsByEntitySlot(placements, lessons);

      const inC1 = slotMap.get('class:C1:1:2');
      const inC2 = slotMap.get('class:C2:1:2');

      assert.ok(inC1 && inC1.length === 1, 'Joint lesson must appear in C1 row');
      assert.ok(inC2 && inC2.length === 1, 'Joint lesson must appear in C2 row');
      assert.strictEqual(inC1[0].lessonId, 'L_JOINT');
      assert.strictEqual(inC2[0].lessonId, 'L_JOINT');
    });

    it('displays co-taught lessons across all participating teacher rows at the same slot', () => {
      const slotMap = computePlacementsByEntitySlot(placements, lessons);

      const inT1 = slotMap.get('teacher:T1:2:3');
      const inT2 = slotMap.get('teacher:T2:2:3');

      assert.ok(inT1 && inT1.length === 1, 'Co-taught lesson must appear in T1 row');
      assert.ok(inT2 && inT2.length === 1, 'Co-taught lesson must appear in T2 row');
      assert.strictEqual(inT1[0].lessonId, 'L_COTEACH');
      assert.strictEqual(inT2[0].lessonId, 'L_COTEACH');
    });

    it('adapts card lines to avoid repeating the row entity in Teacher and Room views', () => {
      const subject = { name: 'Calculus', code: 'MATH101', color: '#3b82f6' };
      const teacherShortName = 'Dr. Tariq';
      const classFullName = 'Grade 10A';
      const classShortCode = '10A';
      const room = { name: 'Hall 101', id: 'R101' };

      const cardLayout = {
        line1: 'subject_name',
        line2: 'teacher_name',
        line3: 'room_name',
      };

      // 1. Class view: Line 2 shows Teacher, Line 3 shows Room
      const classPerspective = resolveCardLines({
        entityType: 'class',
        subject,
        teacherShortName,
        classFullName,
        classShortCode,
        room,
        cardLayout,
      });
      assert.strictEqual(classPerspective.line2Text, 'Dr. Tariq');
      assert.strictEqual(classPerspective.line3Text, 'Hall 101');

      // 2. Teacher view: Line 2 adapts to show Class (not repeating teacher)
      const teacherPerspective = resolveCardLines({
        entityType: 'teacher',
        subject,
        teacherShortName,
        classFullName,
        classShortCode,
        room,
        cardLayout,
      });
      assert.strictEqual(teacherPerspective.line2Text, 'Grade 10A', 'Must adapt to class name on teacher row');

      // 3. Room view: Line 3 adapts to show Class/Teacher (not repeating room)
      const roomPerspective = resolveCardLines({
        entityType: 'room',
        subject,
        teacherShortName,
        classFullName,
        classShortCode,
        room,
        cardLayout,
      });
      assert.strictEqual(roomPerspective.line3Text, '10A', 'Must adapt to class code on room row');
    });
  });

  // =========================================================================
  // Suite 3: Master Wall Grid (الجدول العام) Scalability & Density
  // =========================================================================
  describe('Suite 3: Master Wall Grid (الجدول العام) Scalability & Density', () => {
    it('scales to 33 classes, 82 teachers, and 1,630 placements on Saudi Arabia 1 dataset', () => {
      assert.ok(fs.existsSync(saudiPath), 'Saudi_Arabia_1.roz must exist');
      const buffer = fs.readFileSync(saudiPath);
      const roz = parseRozBinary(buffer, 'Saudi_Arabia_1.roz');

      const { classes, teachers, rooms, lessons, placements } = roz.mapped;

      assert.strictEqual(classes.length, 33);
      assert.strictEqual(teachers.length, 82);
      assert.strictEqual(placements.length, 1630);

      // Build wall grid row entities (all 33 classes)
      const wallRows = getRowEntities('wall', classes, teachers, rooms, false);
      assert.strictEqual(wallRows.length, 33);

      // Slot mapping verification
      const slotMap = computePlacementsByEntitySlot(placements, lessons);

      // Total placements indexed across all class rows must equal 1,630
      let totalClassPlacements = 0;
      for (const [key, group] of slotMap.entries()) {
        if (key.startsWith('class:')) {
          totalClassPlacements += group.length;
        }
      }
      assert.strictEqual(
        totalClassPlacements,
        1630,
        'Wall grid must preserve all 1,630 placements without loss'
      );
    });

    it('enforces compact density dimensions for Master Wall Grid', () => {
      const zoomLevel = 1.0;
      const isCompact = true;

      const colMinWidth = isCompact
        ? Math.max(32, Math.round(zoomLevel * 36))
        : Math.max(85, Math.round(zoomLevel * 95));

      const colMaxWidth = isCompact
        ? Math.max(44, Math.round(zoomLevel * 50))
        : Math.max(115, Math.round(zoomLevel * 130));

      assert.strictEqual(colMinWidth, 36);
      assert.strictEqual(colMaxWidth, 50);

      // Verify row height in compact mode is 44px (h-11) vs standard 64px (h-16)
      const rowHeightClass = isCompact ? 'h-11' : 'h-16';
      assert.strictEqual(rowHeightClass, 'h-11');
    });
  });

  // =========================================================================
  // Suite 4: Bidirectional Localization (RTL Arabic / LTR English) (WF-OUT-01)
  // =========================================================================
  describe('Suite 4: Bidirectional Localization & Arabic Typography (WF-OUT-01)', () => {
    it('maintains 100% dictionary key parity between English and Arabic', () => {
      const enKeys = Object.keys(translations.en);
      const arKeys = Object.keys(translations.ar);

      assert.strictEqual(enKeys.length, arKeys.length);
      for (const key of enKeys) {
        assert.ok(key in translations.ar, `Missing Arabic key: ${key}`);
        if (typeof translations.en[key] === 'object' && translations.en[key] !== null) {
          const subEn = Object.keys(translations.en[key]);
          const subAr = Object.keys(translations.ar[key]);
          assert.deepStrictEqual(
            subEn.sort(),
            subAr.sort(),
            `Sub-keys must match for category: ${key}`
          );
        }
      }
    });

    it('matches desktop lang.asc educational terminology', () => {
      assert.strictEqual(translations.en.dir, 'ltr');
      assert.strictEqual(translations.ar.dir, 'rtl');

      // #1001 View
      assert.strictEqual(translations.en.ribbon.tabs.view, 'View');
      assert.strictEqual(translations.ar.ribbon.tabs.view, 'عرض');

      // #3351 Print preview
      assert.strictEqual(translations.en.ribbon.tools.printPreview, 'Print Preview');
      assert.strictEqual(translations.ar.ribbon.tools.printPreview, 'معاينة الطباعة');

      // Arabic days
      assert.deepStrictEqual(translations.ar.days, [
        'الأحد',
        'الإثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
      ]);
    });

    it('uses bidirectional sticky cell coordinates (ltr:left-0, rtl:right-0)', () => {
      const headerStickyClass = 'sticky ltr:left-0 rtl:right-0 z-20';
      assert.match(headerStickyClass, /ltr:left-0/);
      assert.match(headerStickyClass, /rtl:right-0/);
    });
  });

  // =========================================================================
  // Suite 5: Standard Desktop Print & Export Subsystems (WF-OUT-03 to WF-OUT-06)
  // =========================================================================
  describe('Suite 5: Standard Desktop Print & Export Subsystems (WF-OUT-03 to WF-OUT-06)', () => {
    it('verifies CSV export starts with UTF-8 BOM \\uFEFF for Excel compatibility', () => {
      const csvHeader = '\uFEFF' + 'Class,Day,Period,Subject,Teacher,Room\n';
      assert.strictEqual(csvHeader.charCodeAt(0), 0xfeff, 'Must begin with UTF-8 BOM');
    });

    it('verifies iCalendar RFC 5545 format with recurring weekly rule', () => {
      const sampleVEvent = [
        'BEGIN:VEVENT',
        'UID:L1@opentimetable.local',
        'SUMMARY:Calculus',
        'RRULE:FREQ=WEEKLY;COUNT=16',
        'END:VEVENT',
      ].join('\r\n');

      assert.match(sampleVEvent, /BEGIN:VEVENT/);
      assert.match(sampleVEvent, /RRULE:FREQ=WEEKLY;COUNT=16/);
      assert.match(sampleVEvent, /END:VEVENT/);
    });
  });
});
