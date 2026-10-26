// opentimetable/tests/tier2_boundaries/b17_multi_views_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 17 (Multi-View Schedule Grids)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MultiViewTransformer } from '../helpers/studio-engine.mjs';

describe('Tier 2 - Boundary: Feature 17 (Multi-View Schedule Grids)', () => {
  const dummyClasses = [{ id: 'c1', name: 'Class 1' }, { id: 'c2', name: 'Class 2' }];
  const dummyTeachers = [{ id: 't1', name: 'Teacher 1' }];
  const dummyRooms = [{ id: 'r1', name: 'Room 1' }];

  it('T2.B17.1: Zero-lesson schedule renders all 4 views with pristine null slots', () => {
    const classViews = MultiViewTransformer.transformByClass([], [], dummyClasses);
    assert.strictEqual(classViews.size, 2);
    const c1Grid = classViews.get('c1').grid;
    assert.strictEqual(c1Grid.length, 5); // 5 days
    assert.strictEqual(c1Grid[0].length, 7); // 7 periods
    assert.ok(c1Grid.every(day => day.every(period => period === null)));

    const wallGrid = MultiViewTransformer.transformMasterWall([], [], dummyClasses);
    assert.strictEqual(wallGrid.length, 2);
    assert.ok(wallGrid[0].slots.every(s => s === null));
  });

  it('T2.B17.2: Unscheduled entity boundary: entity with 0 placements returns empty grid alongside active entities', () => {
    const lessons = [{ id: 'l1', teacherId: 't1', classId: 'c1', subjectId: 's1' }];
    const placements = [{ lessonId: 'l1', dayIndex: 0, periodIndex: 0, roomId: 'r1' }];

    const classViews = MultiViewTransformer.transformByClass(placements, lessons, dummyClasses);
    // c1 has lesson at (0, 0)
    assert.notStrictEqual(classViews.get('c1').grid[0][0], null);
    // c2 has 0 lessons -> all null
    assert.ok(classViews.get('c2').grid.every(d => d.every(p => p === null)));
  });

  it('T2.B17.3: Teacher View with unscheduled teacher renders empty 5x7 matrix', () => {
    const teacherViews = MultiViewTransformer.transformByTeacher([], [], dummyTeachers);
    const t1Grid = teacherViews.get('t1').grid;
    assert.strictEqual(t1Grid.length, 5);
    assert.strictEqual(t1Grid[4][6], null);
  });

  it('T2.B17.4: Room View with unscheduled room renders empty 5x7 matrix', () => {
    const roomViews = MultiViewTransformer.transformByRoom([], [], dummyRooms);
    const r1Grid = roomViews.get('r1').grid;
    assert.strictEqual(r1Grid.length, 5);
    assert.strictEqual(r1Grid[4][6], null);
  });

  it('T2.B17.5: Master Wall Grid scalability boundary: 50 classes render exactly 50 rows of 35 slots', () => {
    const largeClasses = Array.from({ length: 50 }, (_, i) => ({ id: `c_${i}`, name: `Class ${i}` }));
    const wallGrid = MultiViewTransformer.transformMasterWall([], [], largeClasses);
    assert.strictEqual(wallGrid.length, 50);
    for (const row of wallGrid) {
      assert.strictEqual(row.slots.length, 35); // 5 x 7 = 35 slots
    }
  });
});
