// apps/web/src/services/sis/masar.ts
// Masar SIS MENA Curriculum & Schedule Synchronization Adapter

import { Placement } from '../../lib/types';

export interface MasarTeacher {
  id: string;
  name: string;
  speciality: string;
  unavailableSlots: number[];
}

export interface MasarClass {
  id: string;
  name: string;
  studentCount: number;
}

export interface MasarRoom {
  id: string;
  name: string;
  capacity: number;
  roomType: 'STANDARD' | 'LAB';
}

export interface MasarSubject {
  id: string;
  name: string;
  requiredRoomType: 'STANDARD' | 'LAB';
}

export interface MasarSyncRecord {
  masarSyncId: string;
  lessonId: string;
  jour: string;
  seance: number;
  salleId?: string;
  syncStatus: 'SYNCED';
}

export interface MasarExportResult {
  success: boolean;
  syncedCount: number;
  records: MasarSyncRecord[];
  timestamp: string;
}

export class MasarAdapter {
  readonly name = 'Masar-SIS-MENA-Sync';

  async importTeachers(): Promise<MasarTeacher[]> {
    return [
      { id: 'T_PPR_1001', name: 'Ahmed El Alami', speciality: 'Mathematics', unavailableSlots: [] },
      { id: 'T_PPR_1002', name: 'Fatima Zahra Mansouri', speciality: 'Physics', unavailableSlots: [0] },
      { id: 'T_PPR_1003', name: 'Youssef Bennani', speciality: 'Arabic Literature', unavailableSlots: [] },
    ];
  }

  async importClasses(): Promise<MasarClass[]> {
    return [
      { id: 'C_1APIC_1', name: '1ère Année Collège - Groupe 1', studentCount: 32 },
      { id: 'C_1APIC_2', name: '1ère Année Collège - Groupe 2', studentCount: 30 },
      { id: 'C_2APIC_1', name: '2ème Année Collège - Groupe 1', studentCount: 28 },
    ];
  }

  async importRooms(): Promise<MasarRoom[]> {
    return [
      { id: 'R_SALLE_1', name: 'Salle 01', capacity: 36, roomType: 'STANDARD' },
      { id: 'R_SALLE_2', name: 'Salle 02', capacity: 36, roomType: 'STANDARD' },
      { id: 'R_LAB_PHY', name: 'Laboratoire Physique', capacity: 30, roomType: 'LAB' },
    ];
  }

  async importCurriculum(): Promise<MasarSubject[]> {
    return [
      { id: 'SUB_MATH', name: 'Mathématiques', requiredRoomType: 'STANDARD' },
      { id: 'SUB_PHYS', name: 'Physique-Chimie', requiredRoomType: 'LAB' },
      { id: 'SUB_ARAB', name: 'Langue Arabe', requiredRoomType: 'STANDARD' },
    ];
  }

  async exportTimetable(placements: Placement[]): Promise<MasarExportResult> {
    if (!Array.isArray(placements)) {
      throw new Error('Placements must be an array');
    }
    const daysMap = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
    const syncRecords: MasarSyncRecord[] = placements.map((p) => ({
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
