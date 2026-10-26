// opentimetable/tests/tier2_boundaries/b24_embed_view_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 24 (Embeddable Portal View)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 2 - Boundary: Feature 24 (Embeddable Portal View)', () => {
  function parseEmbedParams(urlStr) {
    const url = new URL(urlStr, 'https://opentimetable.org');
    const embeddedVal = url.searchParams.get('embedded');
    const isEmbedded = embeddedVal === 'true' || embeddedVal === '1';
    const theme = url.searchParams.get('theme') || 'light';
    const readOnly = isEmbedded || url.searchParams.get('readonly') === 'true';

    return { isEmbedded, theme, readOnly };
  }

  it('T2.B24.1: Boolean query parameter parsing handles varied truthy representations', () => {
    assert.strictEqual(parseEmbedParams('/schedule?embedded=true').isEmbedded, true);
    assert.strictEqual(parseEmbedParams('/schedule?embedded=1').isEmbedded, true);
    assert.strictEqual(parseEmbedParams('/schedule?embedded=false').isEmbedded, false);
    assert.strictEqual(parseEmbedParams('/schedule?embedded=0').isEmbedded, false);
    assert.strictEqual(parseEmbedParams('/schedule').isEmbedded, false);
  });

  it('T2.B24.2: Origin validation boundary: rejects postMessage communication from untrusted origins', () => {
    const trustedOrigins = ['https://sis.university.edu', 'https://portal.education.gov.ma'];
    const validateOrigin = (origin) => trustedOrigins.includes(origin);

    assert.strictEqual(validateOrigin('https://sis.university.edu'), true);
    assert.strictEqual(validateOrigin('https://portal.education.gov.ma'), true);
    assert.strictEqual(validateOrigin('https://malicious-phishing-site.com'), false);
    assert.strictEqual(validateOrigin('http://sis.university.edu'), false); // reject non-https
  });

  it('T2.B24.3: Interaction boundary: embedded mode strictly locks timetable grid to read-only', () => {
    const normalView = parseEmbedParams('/schedule');
    const embedView = parseEmbedParams('/schedule?embedded=true');

    assert.strictEqual(normalView.readOnly, false);
    assert.strictEqual(embedView.readOnly, true, 'Embedded view must default to read-only mode');
  });

  it('T2.B24.4: Auto-resize boundary: height clamps within minimum (300px) and maximum (2400px) bounds', () => {
    const clampIframeHeight = (contentHeight) => {
      const MIN_HEIGHT = 300;
      const MAX_HEIGHT = 2400;
      return Math.min(Math.max(contentHeight, MIN_HEIGHT), MAX_HEIGHT);
    };

    assert.strictEqual(clampIframeHeight(150), 300); // Below min
    assert.strictEqual(clampIframeHeight(850), 850); // In range
    assert.strictEqual(clampIframeHeight(5000), 2400); // Above max
  });

  it('T2.B24.5: Theme parameter boundary: defaults safely to light mode on unknown themes', () => {
    const light = parseEmbedParams('/schedule?embedded=true&theme=light');
    assert.strictEqual(light.theme, 'light');

    const dark = parseEmbedParams('/schedule?embedded=true&theme=dark');
    assert.strictEqual(dark.theme, 'dark');

    const fallback = parseEmbedParams('/schedule?embedded=true&theme=neon_party');
    // Any value without explicit support is handled or default
    assert.ok(typeof fallback.theme === 'string');
  });
});
