// apps/web/src/services/sis/roles.ts
// 6-Role Institutional RBAC Governance for OpenTimetable

export type SisRole =
  | 'ADMIN'
  | 'DEPT_HEAD'
  | 'ACADEMIC_ADVISOR'
  | 'STAFF'
  | 'TEACHER'
  | 'STUDENT';

export interface SisPermissions {
  canManageUsers: boolean;
  canEditCurriculum: boolean;
  canRunSolver: boolean;
  canPublishTimetable: boolean;
  canViewAllSchedules: boolean;
  canBookRooms: boolean;
  canExportReports: boolean;
}

export const SisRoles: Record<string, SisRole> = {
  ADMIN: 'ADMIN',
  DEPT_HEAD: 'DEPT_HEAD',
  ACADEMIC_ADVISOR: 'ACADEMIC_ADVISOR',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

export const PermissionsMatrix: Record<SisRole, SisPermissions> = {
  ADMIN: {
    canManageUsers: true,
    canEditCurriculum: true,
    canRunSolver: true,
    canPublishTimetable: true,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  DEPT_HEAD: {
    canManageUsers: false,
    canEditCurriculum: true,
    canRunSolver: true,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  ACADEMIC_ADVISOR: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: false,
    canExportReports: true,
  },
  STAFF: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  TEACHER: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: false, // Scoped to own schedule
    canBookRooms: false,
    canExportReports: true,     // Own schedule export
  },
  STUDENT: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: false, // Scoped to enrolled class
    canBookRooms: false,
    canExportReports: true,     // Enrolled class export
  },
};

export function hasPermission(role: SisRole, permission: keyof SisPermissions): boolean {
  const perm = PermissionsMatrix[role];
  return perm ? perm[permission] : false;
}
