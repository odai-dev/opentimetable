// opentimetable/tests/tier2_boundaries/b18_bilingual_rtl_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 18 (Arabic RTL & English LTR Toggle)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BilingualDictionary } from '../helpers/studio-engine.mjs';

describe('Tier 2 - Boundary: Feature 18 (Arabic RTL & English LTR Toggle)', () => {
  function getTranslation(locale) {
    const cleanLocale = (locale || '').trim().toLowerCase();
    return BilingualDictionary[cleanLocale] || BilingualDictionary['en'];
  }

  it('T2.B18.1: Fallback boundary: unsupported locale codes safely fall back to English dictionary', () => {
    const frDict = getTranslation('fr');
    assert.strictEqual(frDict.dir, 'ltr');
    assert.strictEqual(frDict.viewClass, 'Class View');

    const emptyDict = getTranslation('');
    assert.strictEqual(emptyDict.dir, 'ltr');
  });

  it('T2.B18.2: Case-insensitivity boundary: handles uppercase and mixed-case locale codes', () => {
    const arUpper = getTranslation('AR');
    assert.strictEqual(arUpper.dir, 'rtl');
    assert.strictEqual(arUpper.viewClass, 'عرض الفصول');

    const enMixed = getTranslation('En');
    assert.strictEqual(enMixed.dir, 'ltr');
  });

  it('T2.B18.3: Day array index boundaries (first day 0 and last day 4)', () => {
    const arDays = BilingualDictionary.ar.days;
    const enDays = BilingualDictionary.en.days;

    assert.strictEqual(arDays[0], 'الإثنين');
    assert.strictEqual(enDays[0], 'Monday');

    assert.strictEqual(arDays[4], 'الجمعة');
    assert.strictEqual(enDays[4], 'Friday');

    assert.strictEqual(arDays.length, 5);
    assert.strictEqual(enDays.length, 5);
  });

  it('T2.B18.4: Unicode glyph integrity boundary: Arabic string encoding preserved without escape corruptions', () => {
    const arTitle = BilingualDictionary.ar.appTitle;
    assert.ok(arTitle.includes('استوديو'));
    assert.strictEqual(Buffer.byteLength(arTitle, 'utf8') > arTitle.length, true, 'Multi-byte UTF-8 Arabic verified');
  });

  it('T2.B18.5: Directionality contract strictly aligns with locale standards', () => {
    assert.strictEqual(BilingualDictionary.ar.dir, 'rtl');
    assert.strictEqual(BilingualDictionary.en.dir, 'ltr');
  });
});
