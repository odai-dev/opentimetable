// opentimetable/tests/helpers/sis-engine.mjs
// SIS 6-roles RBAC governance, JWT auth verification, and Masar adapter integration

import crypto from 'node:crypto';

export const SisRoles = {
  ADMIN: 'ADMIN',
  DEPT_HEAD: 'DEPT_HEAD',
  ACADEMIC_ADVISOR: 'ACADEMIC_ADVISOR',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

export const PermissionsMatrix = {
  [SisRoles.ADMIN]: {
    canManageUsers: true,
    canEditCurriculum: true,
    canRunSolver: true,
    canPublishTimetable: true,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  [SisRoles.DEPT_HEAD]: {
    canManageUsers: false,
    canEditCurriculum: true,
    canRunSolver: true,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  [SisRoles.ACADEMIC_ADVISOR]: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: false,
    canExportReports: true,
  },
  [SisRoles.STAFF]: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: true,
    canBookRooms: true,
    canExportReports: true,
  },
  [SisRoles.TEACHER]: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: false, // Scoped to own schedule
    canBookRooms: false,
    canExportReports: true,     // Own schedule export
  },
  [SisRoles.STUDENT]: {
    canManageUsers: false,
    canEditCurriculum: false,
    canRunSolver: false,
    canPublishTimetable: false,
    canViewAllSchedules: false, // Scoped to enrolled class
    canBookRooms: false,
    canExportReports: true,     // Enrolled class export
  },
};

export class JwtAuthManager {
  constructor(secret = 'opentimetable_jwt_secret_key_super_secure_2026') {
    this.secret = secret;
  }

  generateToken(payload, expiresInSec = 3600) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSec,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token missing or invalid' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSig) {
      return { valid: false, error: 'Invalid JWT signature' };
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, error: 'Corrupt payload decoding' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired', expired: true };
    }

    return { valid: true, payload };
  }
}

export class MasarAdapter {
  constructor() {
    this.name = 'Masar-SIS-MENA-Sync';
  }

  async importTeachers() {
    return [
      { id: 'T_PPR_1001', name: 'Ahmed El Alami', speciality: 'Mathematics', unavailableSlots: [] },
      { id: 'T_PPR_1002', name: 'Fatima Zahra Mansouri', speciality: 'Physics', unavailableSlots: [0] },
      { id: 'T_PPR_1003', name: 'Youssef Bennani', speciality: 'Arabic Literature', unavailableSlots: [] },
    ];
  }

  async importClasses() {
    return [
      { id: 'C_1APIC_1', name: '1ère Année Collège - Groupe 1', studentCount: 32 },
      { id: 'C_1APIC_2', name: '1ère Année Collège - Groupe 2', studentCount: 30 },
      { id: 'C_2APIC_1', name: '2ème Année Collège - Groupe 1', studentCount: 28 },
    ];
  }

  async importRooms() {
    return [
      { id: 'R_SALLE_1', name: 'Salle 01', capacity: 36, roomType: 'STANDARD' },
      { id: 'R_SALLE_2', name: 'Salle 02', capacity: 36, roomType: 'STANDARD' },
      { id: 'R_LAB_PHY', name: 'Laboratoire Physique', capacity: 30, roomType: 'LAB' },
    ];
  }

  async importCurriculum() {
    return [
      { id: 'SUB_MATH', name: 'Mathématiques', requiredRoomType: 'STANDARD' },
      { id: 'SUB_PHYS', name: 'Physique-Chimie', requiredRoomType: 'LAB' },
      { id: 'SUB_ARAB', name: 'Langue Arabe', requiredRoomType: 'STANDARD' },
    ];
  }

  async exportTimetable(placements) {
    if (!Array.isArray(placements)) {
      throw new Error('Placements must be an array');
    }
    const daysMap = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
    const syncRecords = placements.map(p => ({
      masarSyncId: `MASAR_${p.lessonId}_SYNC`,
      lessonId: p.lessonId,
      jour: daysMap[p.dayIndex] || 'LUNDI',
      seance: p.periodIndex + 1,
      salleId: p.roomId,
      syncStatus: 'SYNCED',
    }));

    return {
      success: true,
      syncedCount: syncRecords.length,
      records: syncRecords,
      timestamp: new Date().toISOString(),
    };
  }
}
