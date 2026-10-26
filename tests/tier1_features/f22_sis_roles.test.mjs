// opentimetable/tests/tier1_features/f22_sis_roles.test.mjs
// Tier 1 - Feature 22: 6 SIS Portal Roles (Min 5 tests)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SisRoles, PermissionsMatrix } from '../helpers/sis-engine.mjs';

describe('Tier 1 - Feature 22: 6 SIS Portal Roles', () => {
  it('T1.F22.1: Validates exact definition of all 6 SIS institutional roles', () => {
    const roles = Object.keys(SisRoles);
    assert.strictEqual(roles.length, 6);
    assert.ok(roles.includes('ADMIN'));
    assert.ok(roles.includes('DEPT_HEAD'));
    assert.ok(roles.includes('ACADEMIC_ADVISOR'));
    assert.ok(roles.includes('STAFF'));
    assert.ok(roles.includes('TEACHER'));
    assert.ok(roles.includes('STUDENT'));
  });

  it('T1.F22.2: ADMIN role holds comprehensive system governance permissions', () => {
    const p = PermissionsMatrix[SisRoles.ADMIN];
    assert.strictEqual(p.canManageUsers, true);
    assert.strictEqual(p.canRunSolver, true);
    assert.strictEqual(p.canPublishTimetable, true);
    assert.strictEqual(p.canViewAllSchedules, true);
  });

  it('T1.F22.3: DEPT_HEAD can run solver and edit curriculum but cannot publish', () => {
    const p = PermissionsMatrix[SisRoles.DEPT_HEAD];
    assert.strictEqual(p.canManageUsers, false);
    assert.strictEqual(p.canRunSolver, true);
    assert.strictEqual(p.canEditCurriculum, true);
    assert.strictEqual(p.canPublishTimetable, false);
  });

  it('T1.F22.4: ACADEMIC_ADVISOR has read-only schedule visibility across all classes', () => {
    const p = PermissionsMatrix[SisRoles.ACADEMIC_ADVISOR];
    assert.strictEqual(p.canViewAllSchedules, true);
    assert.strictEqual(p.canEditCurriculum, false);
    assert.strictEqual(p.canRunSolver, false);
    assert.strictEqual(p.canBookRooms, false);
  });

  it('T1.F22.5: TEACHER and STUDENT roles have strictly scoped visibility', () => {
    const teacherPerm = PermissionsMatrix[SisRoles.TEACHER];
    const studentPerm = PermissionsMatrix[SisRoles.STUDENT];

    assert.strictEqual(teacherPerm.canViewAllSchedules, false);
    assert.strictEqual(studentPerm.canViewAllSchedules, false);
    assert.strictEqual(teacherPerm.canRunSolver, false);
    assert.strictEqual(studentPerm.canRunSolver, false);
  });
});
