// opentimetable/tests/test_arrasheed_sample.mjs
// Automated Verification Suite for Ar-Rasheed Smart University (Sana'a) Sample Dataset

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { parseRozBinary } = jiti('../apps/web/src/lib/roz-parser.ts');
const { BitmaskGrid } = require('./helpers/solver-engine.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');
const jsonPath = path.resolve(opentimetableRoot, 'apps/web/public/demos/Ar_Rasheed_Smart_University.json');
const rozPath = path.resolve(opentimetableRoot, 'apps/web/public/demos/Ar_Rasheed_Smart_University.roz');

describe('Ar-Rasheed Smart University (Sana\'a) Sample Dataset Suite', () => {

  // ============================================================================
  // SECTION 1: Dataset File Integrity & Schema
  // ============================================================================
  describe('1. File Existence & Structural Schema', () => {
    it('verifies Ar_Rasheed_Smart_University.json exists and contains authentic metadata', () => {
      assert.ok(fs.existsSync(jsonPath), 'Ar_Rasheed_Smart_University.json must exist');
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(raw);

      assert.strictEqual(data.schoolName, 'جامعة الرشيد الذكية - صنعاء');
      assert.strictEqual(data.academicYear, '2025/2026');
      assert.strictEqual(data.cycleDays, 6, 'Must be 6 days (Saturday to Thursday)');
      assert.strictEqual(data.periodsPerDay, 18, 'Must be 18 university periods per day');
      assert.strictEqual(data.bellSchedule.length, 18, 'Must have 18 bell intervals');
      assert.strictEqual(data.bellSchedule[0], '08:00 - 08:29');
      assert.strictEqual(data.bellSchedule[17], '16:30 - 16:59');
    });

    it('verifies Ar_Rasheed_Smart_University.roz exists and is a valid binary container', () => {
      assert.ok(fs.existsSync(rozPath), 'Ar_Rasheed_Smart_University.roz must exist');
      const buffer = fs.readFileSync(rozPath);
      assert.ok(buffer.length > 50000, 'Binary file must be substantial in size');

      // Verify ASCTT magic header at offset 0x04
      const magic = buffer.subarray(5, 10).toString('ascii');
      assert.strictEqual(magic, 'ASCTT', 'Must have ASCTT container magic');

      // Verify parseRozBinary can parse it cleanly
      const parsed = parseRozBinary(buffer);
      assert.ok(parsed, 'parseRozBinary must parse container without throwing');
      assert.strictEqual(parsed.classes.length, 5, 'Must parse 5 class faculties');
      assert.ok(parsed.teachers.length >= 30, 'Must parse at least 30 faculty members');
      assert.ok(parsed.rooms.length >= 25, 'Must parse at least 25 classrooms/labs');
      assert.ok(parsed.lessons.length >= 50, 'Must parse at least 50 scheduled lessons');
    });
  });

  // ============================================================================
  // SECTION 2: Academic Programs & Class Groups
  // ============================================================================
  describe('2. Authentic University Faculties & Sections', () => {
    it('contains all 5 authentic academic programs from uploaded university evidence', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const classNames = data.classes.map((c) => c.name);

      assert.ok(classNames.includes('CyberSecuirtyLevel2-G1'), 'Must include Cybersecurity Level 2 Group 1');
      assert.ok(classNames.includes('Artificial Intelligence-L2-G1'), 'Must include AI Level 2 Group 1');
      assert.ok(classNames.includes('Denstistry-L2'), 'Must include Faculty of Dentistry Level 2');
      assert.ok(classNames.includes('Graphics and Multimedia-L2- G1-A'), 'Must include Graphics & Multimedia Level 2');
      assert.ok(classNames.includes('Laboratory -L2'), 'Must include Medical Laboratory Level 2');
    });

    it('verifies bilingual Arabic/English naming on all class groups', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      for (const c of data.classes) {
        assert.ok(c.name && c.name.length > 0, `Class ${c.id} must have English name`);
        assert.ok(c.nameAr && c.nameAr.length > 0, `Class ${c.id} must have Arabic name`);
        assert.strictEqual(Number(c.grade), 2, 'All verified sample sections are Level 2');
      }
    });
  });

  // ============================================================================
  // SECTION 3: Faculty Staff & Infrastructure
  // ============================================================================
  describe('3. Faculty Staff & Laboratory Infrastructure', () => {
    it('includes authentic professors, doctors, and teaching assistants from university evidence', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const teacherNames = data.teachers.map((t) => t.name);

      assert.ok(teacherNames.some((n) => n.includes('Senan Ghlab')), 'Must include Dr. Senan Ghallab');
      assert.ok(teacherNames.some((n) => n.includes('Anwar Al-Thari')), 'Must include Dr. Anwar Al-Thari');
      assert.ok(teacherNames.some((n) => n.includes('Ahmed Al-Gofi')), 'Must include Dr. Ahmed Al-Gofi');
      assert.ok(teacherNames.some((n) => n.includes('Abdul-salam Al-mekhlafi')), 'Must include Dr. Abdul-salam Al-mekhlafi');
      assert.ok(teacherNames.some((n) => n.includes('Dr.Ibrahim Al-Hadad')), 'Must include Dr. Ibrahim Al-Hadad');
      assert.ok(teacherNames.some((n) => n.includes('Dr. Fairoz')), 'Must include Dr. Fairoz');
      assert.ok(teacherNames.some((n) => n.includes('Asmaa Al-Rumima')), 'Must include Dr. Asmaa Al-Rumima');
      assert.ok(teacherNames.some((n) => n.includes('Sam Abdulkareem')), 'Must include Dr. Sam Abdulkareem');
      assert.ok(teacherNames.some((n) => n.includes('Abeer Al-Zarika')), 'Must include Dr. Abeer Al-Zarika');
      assert.ok(teacherNames.some((n) => n.includes('Shaima Al-harazi')), 'Must include Eng. Shaima Al-harazi');
      assert.ok(teacherNames.some((n) => n.includes('Osama Al-kabudi')), 'Must include Eng. Osama Al-kabudi');
      assert.ok(teacherNames.some((n) => n.includes('Qusai Almansoor')), 'Must include Eng. Qusai Almansoor');
      assert.ok(teacherNames.some((n) => n.includes('Yasser Alkhateeb')), 'Must include T. Yasser Alkhateeb');
    });

    it('includes authentic lecture halls and specialized laboratories in Sana\'a campus', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const roomNames = data.rooms.map((r) => r.name);

      // Lecture halls
      assert.ok(roomNames.includes('D401 (50)'));
      assert.ok(roomNames.includes('D402 (70)'));
      assert.ok(roomNames.includes('D404 (50)'));
      assert.ok(roomNames.includes('D405 (70)'));
      assert.ok(roomNames.includes('D406 (60)'));
      assert.ok(roomNames.includes('D408 (70)'));
      assert.ok(roomNames.includes('B401'));
      assert.ok(roomNames.includes('B109'));

      // Specialized labs
      assert.ok(roomNames.includes('C-Lab-D403'));
      assert.ok(roomNames.includes('C-Lab-D503'));
      assert.ok(roomNames.includes('C-Lab-103'));
      assert.ok(roomNames.includes('CLab-C202'));
      assert.ok(roomNames.includes('CLab-A105'));
      assert.ok(roomNames.includes('CYSLab3-A302'));
      assert.ok(roomNames.includes('GMMLab-A202'));
      assert.ok(roomNames.includes('BioChem-Lab-B303'));
      assert.ok(roomNames.includes('Phantom Lab'));
    });
  });

  // ============================================================================
  // SECTION 4: Multi-Period Lessons & Placements
  // ============================================================================
  describe('4. Lesson Placements, Durations & Coordinate Boundaries', () => {
    it('verifies all 61 placements conform strictly to 6-day x 18-period bounds', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      assert.strictEqual(data.placements.length, 61, 'Must contain 61 placed lessons');

      for (const p of data.placements) {
        assert.ok(p.dayIndex >= 0 && p.dayIndex < 6, `Day ${p.dayIndex} must be within 0..5`);
        assert.ok(p.periodIndex >= 0 && p.periodIndex < 18, `Period ${p.periodIndex} must be within 0..17`);
        const duration = p.duration || 1;
        assert.ok(
          p.periodIndex + duration <= 18,
          `Placement ending at ${p.periodIndex + duration} must not overflow 18 periods per day`
        );
        assert.strictEqual(p.isLocked, true, 'All authentic university placements are locked');
      }
    });

    it('verifies presence of multi-group divided laboratory sessions', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const groupLessons = data.lessons.filter((l) => l.group !== undefined);

      assert.ok(groupLessons.length >= 20, 'Must have at least 20 split group laboratory sessions');
      const groups = new Set(groupLessons.map((l) => l.group));
      assert.ok(groups.has('Group(A)') || groups.has('GA'), 'Must have Group A');
      assert.ok(groups.has('Group(B)') || groups.has('GB'), 'Must have Group B');
    });
  });

  // ============================================================================
  // SECTION 5: Bitmask Solver Conflict Verification
  // ============================================================================
  describe('5. Constraint Satisfaction & Bitmask Grid Integrity', () => {
    it('verifies 0 hard teacher clashes across all 61 university placements', () => {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const lessonMap = new Map(data.lessons.map((l) => [l.id, l]));

      // Verify that no teacher is double-booked at any slot
      const teacherSlots = new Map(); // `${teacherId}-${day}-${period}` -> placementId

      for (const p of data.placements) {
        const lesson = lessonMap.get(p.lessonId);
        if (!lesson) continue;
        const duration = p.duration || 1;

        for (let offset = 0; offset < duration; offset++) {
          const slotKey = `${lesson.teacherId}-${p.dayIndex}-${p.periodIndex + offset}`;
          assert.strictEqual(
            teacherSlots.has(slotKey),
            false,
            `Teacher ${lesson.teacherId} has double-booking at day ${p.dayIndex}, period ${p.periodIndex + offset}`
          );
          teacherSlots.set(slotKey, p.id);
        }
      }
    });
  });
});
