// opentimetable/tests/tier2_boundaries/b22_sis_roles_boundaries.test.mjs
// Tier 2 - Boundary & Corner Cases: Feature 22 (6 SIS Portal Roles)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SisRoles, PermissionsMatrix } from '../helpers/sis-engine.mjs';

describe('Tier 2 - Boundary: Feature 22 (6 SIS Portal Roles)', () => {
  function getPermissions(role) {
    return PermissionsMatrix[role] || {
      canManageUsers: false,
      canEditCurriculum: false,
      canRunSolver: false,
      canPublishTimetable: false,
      canViewAllSchedules: false,
      canBookRooms: false,
      canExportReports: false,
    };
  }

  it('T2.B22.1: Unknown or unauthorized role yields zero administrative permissions', () => {
    const unknownPerms = getPermissions('SUPER_USER');
    assert.strictEqual(unknownPerms.canManageUsers, false);
    assert.strictEqual(unknownPerms.canRunSolver, false);
    assert.strictEqual(unknownPerms.canPublishTimetable, false);
  });

  it('T2.B22.2: Case sensitivity boundary: non-uppercase role strings do not leak default permissions', () => {
    const lowerAdmin = getPermissions('admin');
    assert.strictEqual(lowerAdmin.canManageUsers, false);
  });

  it('T2.B22.3: TEACHER role permission boundaries strictly enforce least privilege', () => {
    const teacherPerms = getPermissions(SisRoles.TEACHER);
    assert.strictEqual(teacherPerms.canEditCurriculum, false);
    assert.strictEqual(teacherPerms.canRunSolver, false);
    assert.strictEqual(teacherPerms.canPublishTimetable, false);
    assert.strictEqual(teacherPerms.canViewAllSchedules, false);
    assert.strictEqual(teacherPerms.canExportReports, true); // Can export own schedule
  });

  it('T2.B22.4: STUDENT role permission boundaries strictly lock out scheduling mutation', () => {
    const studentPerms = getPermissions(SisRoles.STUDENT);
    assert.strictEqual(studentPerms.canBookRooms, false);
    assert.strictEqual(studentPerms.canRunSolver, false);
    assert.strictEqual(studentPerms.canManageUsers, false);
    assert.strictEqual(studentPerms.canViewAllSchedules, false);
  });

  it('T2.B22.5: DEPT_HEAD publishing boundary: can run solver and edit curriculum, but cannot publish timetable', () => {
    const deptHeadPerms = getPermissions(SisRoles.DEPT_HEAD);
    assert.strictEqual(deptHeadPerms.canRunSolver, true);
    assert.strictEqual(deptHeadPerms.canEditCurriculum, true);
    assert.strictEqual(deptHeadPerms.canPublishTimetable, false, 'Only ADMIN role can publish final timetable');
  });
});
