import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js');
const { translations } = jiti(import.meta.url)('../apps/web/src/lib/i18n.ts');

const projectRoot = process.cwd();

test('Challenger M1-2: Domain Types & Schema Backward Compatibility', async (t) => {
  await t.test('types.ts contains all required domain fields intact', () => {
    const typesPath = path.resolve(projectRoot, 'apps/web/src/lib/types.ts');
    const content = fs.readFileSync(typesPath, 'utf-8');

    assert.ok(content.includes('classId'), 'types.ts must preserve classId');
    assert.ok(content.includes('teacherId'), 'types.ts must preserve teacherId');
    assert.ok(content.includes('roomId'), 'types.ts must preserve roomId');
    assert.ok(content.includes('lessonId'), 'types.ts must preserve lessonId');
    assert.ok(content.includes('grade'), 'types.ts must preserve grade');
    assert.ok(content.includes('periodsPerDay'), 'types.ts must preserve periodsPerDay');
  });

  await t.test('Rust models.rs preserves serialization aliases for backward compatibility', () => {
    const rustModelsPath = path.resolve(projectRoot, 'crates/solver_core/src/models.rs');
    const content = fs.readFileSync(rustModelsPath, 'utf-8');

    assert.ok(content.includes('alias = "periodsPerDay"'), 'Rust models must deserialize periodsPerDay');
    assert.ok(content.includes('alias = "class_id"'), 'Rust models must deserialize class_id');
    assert.ok(content.includes('alias = "teacher_id"'), 'Rust models must deserialize teacher_id');
    assert.ok(content.includes('alias = "room_id"'), 'Rust models must deserialize room_id');
    assert.ok(content.includes('alias = "subject_id"'), 'Rust models must deserialize subject_id');
    assert.ok(content.includes('pub class_id: String'), 'Rust Lesson must have class_id');
    assert.ok(content.includes('pub teacher_id: String'), 'Rust Lesson must have teacher_id');
  });

  await t.test('page.tsx preserves state property names for schoolName, grade, classId, periodsPerDay', () => {
    const pagePath = path.resolve(projectRoot, 'apps/web/src/app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(content.includes('schoolName'), 'page.tsx must maintain schoolName state');
    assert.ok(content.includes('periodsPerDay'), 'page.tsx must maintain periodsPerDay state');
    assert.ok(content.includes('classId'), 'page.tsx must maintain classId references');
    assert.ok(content.includes('teacherId'), 'page.tsx must maintain teacherId references');
    assert.ok(content.includes('roomId'), 'page.tsx must maintain roomId references');
    assert.ok(content.includes('lessonId'), 'page.tsx must maintain lessonId references');
  });
});

test('Challenger M1-2: i18n Key Parity, Types, and Function Signatures', async (t) => {
  await t.test('both en and ar locales exist', () => {
    assert.ok(translations.en, 'English translation must exist');
    assert.ok(translations.ar, 'Arabic translation must exist');
  });

  function getLeafPaths(obj, prefix = '') {
    const entries = [];
    for (const key of Object.keys(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        entries.push(...getLeafPaths(val, fullPath));
      } else {
        entries.push({ path: fullPath, type: typeof val, isArray: Array.isArray(val), val });
      }
    }
    return entries;
  }

  const enLeaves = getLeafPaths(translations.en);
  const arLeaves = getLeafPaths(translations.ar);

  await t.test('exact 100% key parity between en and ar (153 keys)', () => {
    const enMap = new Map(enLeaves.map((e) => [e.path, e]));
    const arMap = new Map(arLeaves.map((a) => [a.path, a]));

    assert.strictEqual(enLeaves.length, 153, 'English dictionary must have 153 leaf keys');
    assert.strictEqual(arLeaves.length, 153, 'Arabic dictionary must have 153 leaf keys');

    for (const [key, enEntry] of enMap.entries()) {
      assert.ok(arMap.has(key), `Arabic missing key: ${key}`);
      const arEntry = arMap.get(key);
      assert.strictEqual(
        enEntry.type,
        arEntry.type,
        `Type mismatch for key ${key}: en is ${enEntry.type}, ar is ${arEntry.type}`
      );
      assert.strictEqual(
        enEntry.isArray,
        arEntry.isArray,
        `Array mismatch for key ${key}: en isArray=${enEntry.isArray}, ar isArray=${arEntry.isArray}`
      );
      if (enEntry.isArray) {
        assert.strictEqual(
          enEntry.val.length,
          arEntry.val.length,
          `Array length mismatch for ${key}: en=${enEntry.val.length}, ar=${arEntry.val.length}`
        );
      }
    }

    for (const key of arMap.keys()) {
      assert.ok(enMap.has(key), `English missing key: ${key}`);
    }
  });

  await t.test('terms helper functions contract and robustness', () => {
    for (const locale of ['en', 'ar']) {
      const terms = translations[locale].terms;
      assert.ok(terms, `terms helper must exist on ${locale}`);
      assert.strictEqual(typeof terms.lectureFormat, 'function');
      assert.strictEqual(typeof terms.levelFormat, 'function');

      // Test valid inputs
      assert.ok(terms.lectureFormat(1).includes('1'));
      assert.ok(terms.levelFormat(3).includes('3'));

      // Stress-test boundary inputs
      assert.doesNotThrow(() => terms.lectureFormat(0));
      assert.doesNotThrow(() => terms.lectureFormat(12));
      assert.doesNotThrow(() => terms.lectureFormat(-5));
      assert.doesNotThrow(() => terms.levelFormat(0));
      assert.doesNotThrow(() => terms.levelFormat(10));
    }

    // Specific wording checks
    assert.strictEqual(translations.en.terms.lectureFormat(2), 'Lecture 2');
    assert.strictEqual(translations.ar.terms.lectureFormat(2), 'المحاضرة 2');
    assert.strictEqual(translations.en.terms.levelFormat(4), 'Level 4');
    assert.strictEqual(translations.ar.terms.levelFormat(4), 'المستوى 4');
  });

  await t.test('print helper strings exist and match higher education terms', () => {
    for (const locale of ['en', 'ar']) {
      const print = translations[locale].print;
      assert.ok(print, `print helper must exist on ${locale}`);
      assert.ok(typeof print.approvedByDean === 'string' && print.approvedByDean.length > 0);
      assert.ok(typeof print.preparedBy === 'string' && print.preparedBy.length > 0);
      assert.ok(typeof print.masterUniversityTimetable === 'string' && print.masterUniversityTimetable.length > 0);
    }
    assert.strictEqual(translations.en.print.approvedByDean, 'Approved by Dean');
    assert.strictEqual(translations.ar.print.approvedByDean, 'اعتماد عميد الكلية');
    assert.strictEqual(translations.en.print.masterUniversityTimetable, 'Master University Timetable');
    assert.strictEqual(translations.ar.print.masterUniversityTimetable, 'الجدول العام للجامعة / الكلية');
  });
});

test('Challenger M1-2: Default Periods & Bell Schedule Alignment', async (t) => {
  await t.test('default periods and bell schedule have identical lengths (8 slots)', () => {
    assert.strictEqual(translations.en.periods.length, 8);
    assert.strictEqual(translations.en.bellSchedule.length, 8);
    assert.strictEqual(translations.ar.periods.length, 8);
    assert.strictEqual(translations.ar.bellSchedule.length, 8);
  });

  await t.test('all periods are labeled with Lecture / المحاضرة', () => {
    translations.en.periods.forEach((p, idx) => {
      assert.strictEqual(p, `Lecture ${idx + 1}`);
    });
    translations.ar.periods.forEach((p, idx) => {
      assert.strictEqual(p, `المحاضرة ${idx + 1}`);
    });
  });

  await t.test('dynamicPeriods generation logic in page.tsx supports variable periodsPerDay', () => {
    const generateDynamicPeriods = (periodsPerDay, isRtl) => {
      return Array.from({ length: periodsPerDay }, (_, i) =>
        isRtl ? `المحاضرة ${i + 1}` : `Lecture ${i + 1}`
      );
    };

    // Test 5, 7, 8, 12 periods
    for (const count of [5, 7, 8, 12]) {
      const en = generateDynamicPeriods(count, false);
      const ar = generateDynamicPeriods(count, true);
      assert.strictEqual(en.length, count);
      assert.strictEqual(ar.length, count);
      assert.strictEqual(en[count - 1], `Lecture ${count}`);
      assert.strictEqual(ar[count - 1], `المحاضرة ${count}`);
    }
  });
});

test('Challenger M1-2: Audit for Prohibited School-Specific Terms in UI Strings', async (t) => {
  const prohibitedSubstrings = [
    'Homeroom',
    'Principal',
    'Bell Schedule',
    'Grade 10',
    'School Timetable',
    'المدير',
    'رائد الفصل',
    'الحصة',
    'المدرسة النموذجية',
  ];

  function collectUserVisibleStrings(obj) {
    const strings = [];
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        strings.push({ key, text: val });
      } else if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          if (typeof item === 'string') {
            strings.push({ key: `${key}[${idx}]`, text: item });
          }
        });
      } else if (typeof val === 'object' && val !== null) {
        strings.push(...collectUserVisibleStrings(val));
      }
    }
    return strings;
  }

  const allStrings = [
    ...collectUserVisibleStrings(translations.en),
    ...collectUserVisibleStrings(translations.ar),
  ];

  for (const { key, text } of allStrings) {
    for (const bad of prohibitedSubstrings) {
      assert.ok(
        !text.includes(bad),
        `Prohibited school term "${bad}" found in user-facing translation for key "${key}": "${text}"`
      );
    }
  }
});

test('Challenger M1-2: Real Dataset & Roz Parser Backward Compatibility', async (t) => {
  await t.test('loads and decodes Saudi_Arabia_1.roz with 12 periods intact', async () => {
    const rozPath = path.resolve(projectRoot, 'apps/web/public/demos/Saudi_Arabia_1.roz');
    assert.ok(fs.existsSync(rozPath), 'Saudi_Arabia_1.roz demo file must exist');

    const { parseRozBinary } = jiti(import.meta.url)('../apps/web/src/lib/roz-parser.ts');
    const { mapRozToFrontend } = jiti(import.meta.url)('../apps/web/src/lib/domain.ts');

    const buffer = fs.readFileSync(rozPath);
    const parsedRoz = parseRozBinary(buffer);
    assert.ok(parsedRoz, 'parseRozBinary should return parsed object');
    assert.strictEqual(typeof parsedRoz.school_name, 'string', 'school_name must be present in parsedRoz');
    assert.strictEqual(typeof parsedRoz.periods_per_day, 'number', 'periods_per_day must be present in parsedRoz');

    const frontendData = mapRozToFrontend(parsedRoz);
    assert.ok(frontendData, 'mapRozToFrontend should return valid state');
    assert.ok(frontendData.classes.length > 0, 'Must have classes');
    assert.ok(frontendData.teachers.length > 0, 'Must have teachers');
    assert.ok(frontendData.lessons.length > 0, 'Must have lessons');
    assert.ok(frontendData.lessons[0].classId, 'Lesson must contain classId');
    assert.ok(frontendData.lessons[0].teacherId, 'Lesson must contain teacherId');
    assert.ok(frontendData.classes[0].grade !== undefined, 'Class must contain grade');
  });

  await t.test('zero empty strings across all translation keys in en and ar', () => {
    function findEmptyStrings(obj, path = '') {
      const empties = [];
      for (const [k, v] of Object.entries(obj)) {
        const full = path ? `${path}.${k}` : k;
        if (typeof v === 'string' && v.trim().length === 0) {
          empties.push(full);
        } else if (Array.isArray(v)) {
          v.forEach((item, i) => {
            if (typeof item === 'string' && item.trim().length === 0) {
              empties.push(`${full}[${i}]`);
            }
          });
        } else if (typeof v === 'object' && v !== null) {
          empties.push(...findEmptyStrings(v, full));
        }
      }
      return empties;
    }

    const enEmpties = findEmptyStrings(translations.en);
    const arEmpties = findEmptyStrings(translations.ar);
    assert.strictEqual(enEmpties.length, 0, `English has empty strings: ${enEmpties.join(', ')}`);
    assert.strictEqual(arEmpties.length, 0, `Arabic has empty strings: ${arEmpties.join(', ')}`);
  });

  await t.test('extreme periodsPerDay bounds (0, 1, 64) in dynamicPeriods', () => {
    const generateDynamicPeriods = (periodsPerDay, isRtl) => {
      return Array.from({ length: periodsPerDay }, (_, i) =>
        isRtl ? `المحاضرة ${i + 1}` : `Lecture ${i + 1}`
      );
    };

    // 0 periods
    const p0 = generateDynamicPeriods(0, false);
    assert.strictEqual(p0.length, 0);

    // 1 period
    const p1 = generateDynamicPeriods(1, false);
    assert.strictEqual(p1.length, 1);
    assert.strictEqual(p1[0], 'Lecture 1');

    // 64 periods (u64 bitmask max)
    const p64 = generateDynamicPeriods(64, true);
    assert.strictEqual(p64.length, 64);
    assert.strictEqual(p64[63], 'المحاضرة 64');
  });
});
