// opentimetable/tests/tier1_features/f25_masar_adapter.test.mjs
// Tier 1 - Feature 25: Pluggable Masar Adapter (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MasarAdapter } from '../helpers/sis-engine.mjs';
import { validateSisAdapter } from '../helpers/contracts.mjs';

describe('Tier 1 - Feature 25: Pluggable Masar Adapter', () => {
  const adapter = new MasarAdapter();

  it('T1.F25.1: Validates MasarAdapter implements SisAdapter interface contract', () => {
    const validation = validateSisAdapter(adapter);
    assert.strictEqual(validation.valid, true, validation.error);
    assert.ok(adapter.name.includes('Masar'));
  });

  it('T1.F25.2: Imports teachers with Masar PPR national identification codes', async () => {
    const teachers = await adapter.importTeachers();
    assert.ok(Array.isArray(teachers));
    assert.ok(teachers.length > 0);
    assert.ok(teachers[0].id.startsWith('T_PPR_'));
    assert.ok(teachers[0].name.length > 3);
  });

  it('T1.F25.3: Imports official Moroccan curriculum class divisions (APIC codes)', async () => {
    const classes = await adapter.importClasses();
    assert.ok(Array.isArray(classes));
    assert.ok(classes.length > 0);
    assert.ok(classes[0].id.includes('APIC'));
  });

  it('T1.F25.4: Imports school rooms and specialized physics/science laboratories', async () => {
    const rooms = await adapter.importRooms();
    assert.ok(Array.isArray(rooms));
    assert.ok(rooms.some(r => r.roomType === 'LAB'));
    assert.ok(rooms.some(r => r.roomType === 'STANDARD'));
  });

  it('T1.F25.5: Exports solved schedule back into Masar sync records', async () => {
    const placements = [
      { lessonId: 'L1', dayIndex: 0, periodIndex: 0, roomId: 'R_SALLE_1' },
      { lessonId: 'L2', dayIndex: 2, periodIndex: 3, roomId: 'R_LAB_PHY' },
    ];
    const result = await adapter.exportTimetable(placements);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.syncedCount, 2);
    assert.strictEqual(result.records[0].jour, 'LUNDI');
    assert.strictEqual(result.records[0].seance, 1);
    assert.strictEqual(result.records[1].jour, 'MERCREDI');
    assert.strictEqual(result.records[1].seance, 4);
  });
});
