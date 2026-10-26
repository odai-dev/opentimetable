// opentimetable/tests/tier1_features/f17_multi_views.test.mjs
// Tier 1 - Feature 17: Multi-View Schedule Grids (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MultiViewTransformer } from '../helpers/studio-engine.mjs';

describe('Tier 1 - Feature 17: Multi-View Schedule Grids', () => {
  const classes = [{ id: 'C1', name: 'Grade 10A' }, { id: 'C2', name: 'Grade 10B' }];
  const teachers = [{ id: 'T1', name: 'Prof. Smith' }, { id: 'T2', name: 'Dr. Jones' }];
  const rooms = [{ id: 'R1', name: 'Room 101' }, { id: 'R2', name: 'Lab 201' }];
  const lessons = [
    { id: 'L1', subjectId: 'MATH', teacherId: 'T1', classId: 'C1' },
    { id: 'L2', subjectId: 'PHYS', teacherId: 'T2', classId: 'C2' },
  ];
  const placements = [
    { lessonId: 'L1', dayIndex: 0, periodIndex: 1, roomId: 'R1' },
    { lessonId: 'L2', dayIndex: 1, periodIndex: 3, roomId: 'R2' },
  ];

  it('T1.F17.1: Generates Class View schedule grid', () => {
    const classViews = MultiViewTransformer.transformByClass(placements, lessons, classes);
    assert.strictEqual(classViews.size, 2);
    const c1Grid = classViews.get('C1').grid;
    assert.strictEqual(c1Grid[0][1].lessonId, 'L1');
    assert.strictEqual(c1Grid[0][0], null); // Empty period
  });

  it('T1.F17.2: Generates Teacher View schedule grid', () => {
    const teacherViews = MultiViewTransformer.transformByTeacher(placements, lessons, teachers);
    assert.strictEqual(teacherViews.size, 2);
    const t1Grid = teacherViews.get('T1').grid;
    assert.strictEqual(t1Grid[0][1].lessonId, 'L1');
    assert.strictEqual(t1Grid[0][1].classId, 'C1');
  });

  it('T1.F17.3: Generates Room View schedule grid', () => {
    const roomViews = MultiViewTransformer.transformByRoom(placements, lessons, rooms);
    assert.strictEqual(roomViews.size, 2);
    const r1Grid = roomViews.get('R1').grid;
    assert.strictEqual(r1Grid[0][1].lessonId, 'L1');
  });

  it('T1.F17.4: Generates Master Wall Grid containing all classes across 35 slots', () => {
    const wallGrid = MultiViewTransformer.transformMasterWall(placements, lessons, classes, 5, 7);
    assert.strictEqual(wallGrid.length, 2); // 2 class rows
    assert.strictEqual(wallGrid[0].slots.length, 35); // 5 x 7 = 35 total slots
    // L1 is at day 0, period 1 -> slot index 1
    assert.strictEqual(wallGrid[0].slots[1].lessonId, 'L1');
  });

  it('T1.F17.5: Unscheduled periods in all views are rendered as empty/null without errors', () => {
    const classViews = MultiViewTransformer.transformByClass([], lessons, classes);
    const grid = classViews.get('C1').grid;
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 7; p++) {
        assert.strictEqual(grid[d][p], null);
      }
    }
  });
});
