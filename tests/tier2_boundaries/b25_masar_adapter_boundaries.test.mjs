// opentimetable/tests/tier2_boundaries/b25_masar_adapter_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 25 (Pluggable Masar Adapter)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MasarAdapter } from '../helpers/sis-engine.mjs';
import { validateSisAdapter } from '../helpers/contracts.mjs';

describe('Tier 2 - Boundary: Feature 25 (Pluggable Masar Adapter)', () => {
  const adapter = new MasarAdapter();

  it('T2.B25.1: Validates adapter complies with SisAdapter contract specification', () => {
    const validation = validateSisAdapter(adapter);
    assert.strictEqual(validation.valid, true, validation.error);
  });

  it('T2.B25.2: Exporting 0 placements produces valid sync result with syncedCount = 0', async () => {
    const res = await adapter.exportTimetable([]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.syncedCount, 0);
    assert.strictEqual(res.records.length, 0);
    assert.ok(res.timestamp);
  });

  it('T2.B25.3: Throws error when non-array placements argument is passed to exportTimetable', async () => {
    await assert.rejects(async () => {
      await adapter.exportTimetable(null);
    }, /placements must be an array/i);

    await assert.rejects(async () => {
      await adapter.exportTimetable('invalid_string');
    }, /placements must be an array/i);
  });

  it('T2.B25.4: Out-of-range dayIndex boundary: defaults cleanly to LUNDI without index overflow', async () => {
    const outOfBoundsPlacements = [{ lessonId: 'l1', dayIndex: 99, periodIndex: 2, roomId: 'r1' }];
    const res = await adapter.exportTimetable(outOfBoundsPlacements);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.records[0].jour, 'LUNDI');
    assert.strictEqual(res.records[0].seance, 3); // 2 + 1
  });

  it('T2.B25.5: All Masar entity import methods resolve valid non-empty arrays', async () => {
    const [teachers, classes, rooms, curriculum] = await Promise.all([
      adapter.importTeachers(),
      adapter.importClasses(),
      adapter.importRooms(),
      adapter.importCurriculum(),
    ]);

    assert.ok(Array.isArray(teachers) && teachers.length > 0);
    assert.ok(Array.isArray(classes) && classes.length > 0);
    assert.ok(Array.isArray(rooms) && rooms.length > 0);
    assert.ok(Array.isArray(curriculum) && curriculum.length > 0);
  });
});
