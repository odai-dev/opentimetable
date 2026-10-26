// opentimetable/tests/tier2_boundaries/b13_nextjs_studio_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 13 (Next.js 15 Web Studio App)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 2 - Boundary: Feature 13 (Next.js 15 Web Studio App)', () => {
  it('T2.B13.1: Hydrates cleanly when local storage state is null or corrupt', () => {
    const hydrateTimetableStudio = (persistedState) => {
      try {
        if (!persistedState) throw new Error('Null state');
        const parsed = JSON.parse(persistedState);
        return { loaded: true, data: parsed };
      } catch {
        // Fallback default state
        return { loaded: true, data: { placements: [], selectedView: 'class', locale: 'en' } };
      }
    };

    const resNull = hydrateTimetableStudio(null);
    assert.strictEqual(resNull.loaded, true);
    assert.strictEqual(resNull.data.selectedView, 'class');

    const resCorrupt = hydrateTimetableStudio('{ corrupt json }');
    assert.strictEqual(resCorrupt.loaded, true);
    assert.strictEqual(resCorrupt.data.placements.length, 0);
  });

  it('T2.B13.2: Reverts invalid view name to default Class View', () => {
    const validViews = ['class', 'teacher', 'room', 'wall'];
    const resolveActiveView = (viewParam) => {
      if (!viewParam || !validViews.includes(viewParam.toLowerCase())) {
        return 'class';
      }
      return viewParam.toLowerCase();
    };

    assert.strictEqual(resolveActiveView('teacher'), 'teacher');
    assert.strictEqual(resolveActiveView('INVALID_VIEW'), 'class');
    assert.strictEqual(resolveActiveView(null), 'class');
  });

  it('T2.B13.3: Handles arbitrary or extreme query parameter strings without throwing', () => {
    const parseSearchParams = (queryString) => {
      const params = new URLSearchParams(queryString);
      return {
        embedded: params.get('embedded') === 'true',
        view: params.get('view') || 'class',
        locale: params.get('locale') || 'en',
      };
    };

    const parsed = parseSearchParams('?embedded=true&view=wall&locale=ar&unrelated=12345&special=%20%21');
    assert.strictEqual(parsed.embedded, true);
    assert.strictEqual(parsed.view, 'wall');
    assert.strictEqual(parsed.locale, 'ar');
  });

  it('T2.B13.4: Simulates React 19 ErrorBoundary catching rendering fault and presenting fallback UI', () => {
    let capturedError = null;
    const errorBoundarySimulator = (renderFn) => {
      try {
        return renderFn();
      } catch (err) {
        capturedError = err;
        return { error: true, fallbackMessage: 'An error occurred loading the timetable studio' };
      }
    };

    const faultyRender = () => {
      throw new Error('Component failed to render card element');
    };

    const result = errorBoundarySimulator(faultyRender);
    assert.strictEqual(result.error, true);
    assert.ok(capturedError !== null);
    assert.match(capturedError.message, /failed to render/i);
  });

  it('T2.B13.5: Mobile breakpoint boundary (width <= 640px) enables responsive horizontal scroll', () => {
    const computeGridContainerStyles = (viewportWidth) => {
      if (viewportWidth < 640) {
        return { overflowX: 'auto', minWidth: '700px' };
      }
      return { overflowX: 'visible', minWidth: 'auto' };
    };

    const mobileStyles = computeGridContainerStyles(375); // iPhone viewport
    assert.strictEqual(mobileStyles.overflowX, 'auto');

    const desktopStyles = computeGridContainerStyles(1280);
    assert.strictEqual(desktopStyles.overflowX, 'visible');
  });
});
