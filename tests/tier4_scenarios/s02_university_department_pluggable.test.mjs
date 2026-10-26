// opentimetable/tests/tier4_scenarios/s02_university_department_pluggable.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SisRoles, PermissionsMatrix, JwtAuthManager, MasarAdapter } from '../helpers/sis-engine.mjs';
import { solveTimetable } from '../helpers/solver-engine.mjs';

describe('Tier 4 - Scenario 2: University Multi-Role SIS Integration (Masar)', () => {
  it('should authenticate roles, import from Masar SIS, run solver, and export synced schedule', async () => {
    const authManager = new JwtAuthManager();
    const masar = new MasarAdapter();

    // 1. Verify SSO for Head of Department
    const hodToken = authManager.generateToken({
      sub: 'hod_cs_01',
      role: SisRoles.DEPT_HEAD,
      deptId: 'COMPUTER_SCIENCE',
      institution: 'State University',
    });
    const hodAuth = authManager.verifyToken(hodToken);
    assert.ok(hodAuth.valid, 'HoD token must be valid');
    assert.equal(hodAuth.payload.role, SisRoles.DEPT_HEAD);
    assert.ok(PermissionsMatrix[SisRoles.DEPT_HEAD].canRunSolver, 'HoD can run solver');

    // 2. Import Department Curriculum & Faculty from Masar
    const teachers = await masar.importTeachers();
    const classes = await masar.importClasses();
    const rooms = await masar.importRooms();
    const curriculum = await masar.importCurriculum();

    assert.equal(teachers.length, 3);
    assert.equal(classes.length, 3);
    assert.equal(rooms.length, 3);
    assert.equal(curriculum.length, 3);

    // 3. Create Department Lessons
    const lessons = [
      { id: 'L_MATH_1', subjectId: 'SUB_MATH', teacherId: 'T_PPR_1001', classId: 'C_1APIC_1', duration: 1 },
      { id: 'L_PHYS_1', subjectId: 'SUB_PHYS', teacherId: 'T_PPR_1002', classId: 'C_1APIC_1', roomId: 'R_LAB_PHY', duration: 1 },
      { id: 'L_ARAB_1', subjectId: 'SUB_ARAB', teacherId: 'T_PPR_1003', classId: 'C_1APIC_2', duration: 1 },
    ];

    const request = {
      config: { days: 5, periodsPerDay: 6, maxConsecutivePeriods: 3 },
      teachers,
      classes,
      rooms,
      subjects: curriculum,
      lessons,
    };

    // 4. Solve Timetable
    const result = solveTimetable(request);
    assert.ok(['OPTIMAL', 'FEASIBLE'].includes(result.status));
    assert.equal(result.placements.length, 3);
    assert.equal(result.hardConflicts, 0);

    // 5. Export back to Masar SIS via Adapter
    const exportResult = await masar.exportTimetable(result.placements);
    assert.ok(exportResult.success, 'Masar export must succeed');
    assert.equal(exportResult.syncedCount, 3);
    assert.equal(exportResult.records[0].syncStatus, 'SYNCED');

    // 6. Student views schedule (scoped permission check)
    const studentToken = authManager.generateToken({
      sub: 'student_9901',
      role: SisRoles.STUDENT,
      classId: 'C_1APIC_1',
    });
    const studentAuth = authManager.verifyToken(studentToken);
    assert.ok(studentAuth.valid);
    assert.equal(PermissionsMatrix[SisRoles.STUDENT].canManageUsers, false);
    assert.equal(PermissionsMatrix[SisRoles.STUDENT].canRunSolver, false);
  });
});
