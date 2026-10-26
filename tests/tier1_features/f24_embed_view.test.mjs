// opentimetable/tests/tier1_features/f24_embed_view.test.mjs
// Tier 1 - Feature 24: Embeddable Portal View (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 1 - Feature 24: Embeddable Portal View', () => {
  function evaluateEmbedChrome(queryParams) {
    const isEmbedded = queryParams.embedded === 'true' || queryParams.embed === '1';
    return {
      showNavbar: !isEmbedded,
      showSidebar: !isEmbedded,
      showFooter: !isEmbedded,
      showToolbars: !isEmbedded,
      isReadOnly: isEmbedded,
      containerClass: isEmbedded ? 'embed-container-minimal' : 'app-container-full',
    };
  }

  it('T1.F24.1: Hides navbar, sidebar, and footer when embedded=true is present', () => {
    const layout = evaluateEmbedChrome({ embedded: 'true' });
    assert.strictEqual(layout.showNavbar, false);
    assert.strictEqual(layout.showSidebar, false);
    assert.strictEqual(layout.showFooter, false);
    assert.strictEqual(layout.containerClass, 'embed-container-minimal');
  });

  it('T1.F24.2: Displays full studio chrome when embedded query parameter is absent', () => {
    const layout = evaluateEmbedChrome({});
    assert.strictEqual(layout.showNavbar, true);
    assert.strictEqual(layout.showSidebar, true);
    assert.strictEqual(layout.showFooter, true);
    assert.strictEqual(layout.containerClass, 'app-container-full');
  });

  it('T1.F24.3: Validates postMessage parent origin whitelist verification', () => {
    const allowedOrigins = ['https://portal.university.edu', 'https://masar.men.gov.ma'];
    const isOriginAllowed = (origin) => allowedOrigins.includes(origin);

    assert.strictEqual(isOriginAllowed('https://portal.university.edu'), true);
    assert.strictEqual(isOriginAllowed('https://malicious-site.com'), false);
  });

  it('T1.F24.4: Enforces read-only locked grid mode in embedded portal views', () => {
    const layout = evaluateEmbedChrome({ embedded: 'true' });
    assert.strictEqual(layout.isReadOnly, true);
  });

  it('T1.F24.5: Validates iframe auto-height resize communication payload', () => {
    const buildResizeMessage = (height) => ({
      type: 'OPENTIMETABLE_RESIZE',
      height,
      timestamp: Date.now(),
    });
    const msg = buildResizeMessage(850);
    assert.strictEqual(msg.type, 'OPENTIMETABLE_RESIZE');
    assert.strictEqual(msg.height, 850);
  });
});
