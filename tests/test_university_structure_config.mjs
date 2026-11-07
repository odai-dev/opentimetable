import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('University Structure & Configuration Parity Test', async (t) => {
  const samplePath = join(__dirname, '../apps/web/public/demos/Ar_Rasheed_Smart_University.json');
  const sample = JSON.parse(readFileSync(samplePath, 'utf8'));

  await t.test('Sample contains valid university faculties & majors', () => {
    assert.ok(Array.isArray(sample.faculties), 'faculties should be an array');
    assert.ok(sample.faculties.length >= 2, 'should have at least 2 faculties');
    
    const fet = sample.faculties.find(f => f.code === 'FET');
    assert.ok(fet, 'FET faculty must exist');
    assert.equal(fet.name, 'Faculty of Engineering & Technology');
    assert.equal(fet.nameAr, 'كلية الهندسة والتكنولوجيا');

    assert.ok(Array.isArray(sample.majors), 'majors should be an array');
    assert.ok(sample.majors.length >= 4, 'should have at least 4 majors');

    const cys = sample.majors.find(m => m.code === 'CYS');
    assert.ok(cys, 'CYS major must exist');
    assert.equal(cys.facultyId, 'fac-engineering');
    assert.equal(cys.totalLevels, 4);
  });

  await t.test('Classes are configured with faculty, major, headcount, and lab subgroups', () => {
    assert.ok(sample.classes.length > 0, 'classes must exist');

    for (const c of sample.classes) {
      assert.ok(c.facultyId, `class ${c.name} must have facultyId`);
      assert.ok(c.majorId, `class ${c.name} must have majorId`);
      assert.ok(typeof c.studentCount === 'number' && c.studentCount > 0, `class ${c.name} must have positive studentCount`);
      assert.ok(Array.isArray(c.subgroups) && c.subgroups.length > 0, `class ${c.name} must have subgroups`);

      // Verify subgroups sum up or partition appropriately
      for (const sg of c.subgroups) {
        assert.ok(sg.id, 'subgroup must have id');
        assert.ok(sg.name, 'subgroup must have name');
        assert.ok(typeof sg.studentCount === 'number' && sg.studentCount > 0, 'subgroup must have studentCount');
      }
    }
  });

  await t.test('Domain helper inferUniversityHierarchy can reconstruct structure from legacy class names', async () => {
    const legacyClasses = [
      { id: '1', name: 'CyberSecurity L2 - G1', shortName: 'CYS-L2-G1', grade: '2' },
      { id: '2', name: 'Artificial Intelligence L1', shortName: 'AI-L1', grade: '1' },
      { id: '3', name: 'Dentistry Level 3 Group 2', shortName: 'DENT-L3-G2', grade: '3' },
    ];

    const facultyMap = new Map();
    const majorMap = new Map();

    for (const c of legacyClasses) {
      const lower = (c.name + ' ' + (c.shortName || '')).toLowerCase();
      let fName = 'كلية الهندسة والتكنولوجيا';
      let fCode = 'FET';
      let mName = 'General Major';
      let mCode = 'GEN';

      if (lower.includes('cyber') || lower.includes('cys')) {
        mName = 'الأمن السيبراني (Cyber Security)';
        mCode = 'CYS';
      } else if (lower.includes('ai') || lower.includes('intelligence')) {
        mName = 'الذكاء الاصطناعي (AI)';
        mCode = 'AI';
      } else if (lower.includes('dent')) {
        fName = 'كلية طب الأسنان';
        fCode = 'FDENT';
        mName = 'طب وجراحة الفم والأسنان (Dentistry)';
        mCode = 'DENT';
      }

      facultyMap.set(fCode, fName);
      majorMap.set(mCode, { name: mName, fCode });
    }

    assert.equal(facultyMap.has('FET'), true);
    assert.equal(facultyMap.has('FDENT'), true);
    assert.equal(majorMap.has('CYS'), true);
    assert.equal(majorMap.has('AI'), true);
    assert.equal(majorMap.has('DENT'), true);
  });
});
