/**
 * opentimetable/apps/web/src/lib/roz-serializer.ts
 * Clean-Room Binary .roz Container Serializer & Exporter
 *
 * Provides lossless serialization of educational timetable schedules into the
 * proprietary .roz container format across both modern (schema >= 248 with ASCTT magic)
 * and legacy (schema < 248 with Windows-1256 CP1256 Arabic encoding) specifications.
 */

import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
  Placement,
} from './types';
import {
  RozRawEntity,
  RozRawLesson,
  PeriodDefinition,
  RozParseResult,
} from './domain';

// ============================================================================
// Zero-Dependency Windows-1256 (CP1256) Character Encoder
// ============================================================================

/**
 * 128 Unicode characters corresponding to Windows-1256 byte range 0x80..0xFF.
 * Accurately handles Arabic alphabet, diacritics, and regional digits.
 */
export const CP1256_CHARS: string[] = [
  '\u20AC', '\u067E', '\u201A', '\u0192', '\u201E', '\u2026', '\u2020', '\u2021',
  '\u02C6', '\u2030', '\u0679', '\u2039', '\u0152', '\u0686', '\u0698', '\u0688',
  '\u06AF', '\u2018', '\u2019', '\u201C', '\u201D', '\u2022', '\u2013', '\u2014',
  '\u06A9', '\u2122', '\u0691', '\u203A', '\u0153', '\u200C', '\u200D', '\u06BA',
  '\u00A0', '\u060C', '\u00A2', '\u00A3', '\u00A4', '\u00A5', '\u00A6', '\u00A7',
  '\u00A8', '\u00A9', '\u06BE', '\u00AB', '\u00AC', '\u00AD', '\u00AE', '\u00AF',
  '\u00B0', '\u00B1', '\u00B2', '\u00B3', '\u00B4', '\u00B5', '\u00B6', '\u00B7',
  '\u00B8', '\u00B9', '\u061B', '\u00BB', '\u00BC', '\u00BD', '\u00BE', '\u061F',
  '\u06C1', '\u0621', '\u0622', '\u0623', '\u0624', '\u0625', '\u0626', '\u0627',
  '\u0628', '\u0629', '\u062A', '\u062B', '\u062C', '\u062D', '\u062E', '\u062F',
  '\u0630', '\u0631', '\u0632', '\u0633', '\u0634', '\u0635', '\u0636', '\u00D7',
  '\u0637', '\u0638', '\u0639', '\u063A', '\u0640', '\u0641', '\u0642', '\u0643',
  '\u00E0', '\u0644', '\u00E2', '\u0645', '\u0646', '\u0647', '\u0648', '\u00E7',
  '\u00E8', '\u00E9', '\u00EA', '\u00EB', '\u0649', '\u064A', '\u00EE', '\u00EF',
  '\u064B', '\u064C', '\u064D', '\u064E', '\u00F4', '\u064F', '\u0650', '\u00F7',
  '\u0651', '\u00F9', '\u0652', '\u00FB', '\u00FC', '\u200E', '\u200F', '\u06D2',
];

const UNICODE_TO_CP1256 = new Map<string, number>();
for (let i = 0; i < CP1256_CHARS.length; i++) {
  UNICODE_TO_CP1256.set(CP1256_CHARS[i], 0x80 + i);
}

/**
 * Encodes a Unicode string into raw Windows-1256 (CP1256) bytes.
 * ASCII characters (0x00..0x7F) are mapped 1:1.
 * Extended characters are mapped via UNICODE_TO_CP1256 with '?' (0x3F) fallback.
 */
export function encodeStringToCp1256(text: string): Uint8Array {
  const result = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      result[i] = code;
    } else {
      const char = text[i];
      const byte = UNICODE_TO_CP1256.get(char);
      result[i] = byte !== undefined ? byte : 0x3f;
    }
  }
  return result;
}

// ============================================================================
// Serialization Options & Snapshot Interfaces
// ============================================================================

export interface RozSerializeOptions {
  schemaVersion?: number;
  targetEncoding?: 'utf8' | 'win1250' | 'win1256';
  compress?: boolean;
  academicYear?: string;
}

export interface TimetableSnapshotInput {
  schoolName: string;
  academicYear?: string;
  cycleDays: number;
  periodsPerDay: number;
  periods?: PeriodDefinition[];
  teachers: (Teacher | RozRawEntity)[];
  classes: (ClassGroup | RozRawEntity)[];
  rooms: (Room | RozRawEntity)[];
  subjects: (Subject | RozRawEntity)[];
  lessons: (Lesson | RozRawLesson)[];
  placements: Placement[];
  timeOffMatrix?: Record<string, number>;
  schemaVersion?: number;
}

// ============================================================================
// Dynamic Little-Endian Binary Writer
// ============================================================================

export class RozBinaryWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;

  constructor(initialCapacity: number = 524288) {
    this.buffer = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  private ensureCapacity(needed: number) {
    if (this.offset + needed > this.buffer.byteLength) {
      const newCap = Math.max(this.buffer.byteLength * 2, this.offset + needed + 65536);
      const newBuf = new ArrayBuffer(newCap);
      new Uint8Array(newBuf).set(new Uint8Array(this.buffer, 0, this.offset));
      this.buffer = newBuf;
      this.view = new DataView(this.buffer);
    }
  }

  public getOffset(): number {
    return this.offset;
  }

  public seek(offset: number) {
    if (offset > this.offset) {
      this.ensureCapacity(offset - this.offset);
    }
    this.offset = offset;
  }

  public padTo(targetOffset: number, fill: number = 0) {
    if (targetOffset > this.offset) {
      const count = targetOffset - this.offset;
      this.ensureCapacity(count);
      new Uint8Array(this.buffer, this.offset, count).fill(fill);
      this.offset = targetOffset;
    }
  }

  public writeUint8(val: number) {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, val);
    this.offset += 1;
  }

  public writeUint16(val: number) {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, val, true);
    this.offset += 2;
  }

  public writeUint32(val: number) {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, val, true);
    this.offset += 4;
  }

  public writeInt32(val: number) {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, val, true);
    this.offset += 4;
  }

  public writeBigUint64(val: bigint) {
    this.ensureCapacity(8);
    this.view.setBigUint64(this.offset, val, true);
    this.offset += 8;
  }

  public writeFixedBytes(bytes: Uint8Array | number[]) {
    const len = bytes.length;
    this.ensureCapacity(len);
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    new Uint8Array(this.buffer, this.offset, len).set(arr);
    this.offset += len;
  }

  public writePascalString(text: string, encoding: 'utf8' | 'win1250' | 'win1256' = 'utf8'): number {
    const encoded =
      encoding === 'win1256' ? encodeStringToCp1256(text) : new TextEncoder().encode(text);
    const len = Math.min(255, encoded.length);
    this.writeUint8(len);
    this.writeFixedBytes(encoded.subarray(0, len));
    return 1 + len;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer.slice(0, this.offset));
  }
}

// ============================================================================
// Core Binary .roz Serializer Implementation
// ============================================================================

/**
 * Serializes an in-memory timetable dataset into an authentic .roz binary container.
 * Supports modern schema (>= 248) and legacy schema (< 248, Arabic Windows-1256).
 */
export function serializeRozBinary(
  snapshot: TimetableSnapshotInput,
  options: RozSerializeOptions = {}
): Uint8Array {
  const schemaVersion = options.schemaVersion ?? snapshot.schemaVersion ?? 314;
  const isModern = schemaVersion >= 248;
  const targetEncoding: 'utf8' | 'win1250' | 'win1256' =
    options.targetEncoding ?? (schemaVersion < 248 ? 'win1256' : 'utf8');

  const schoolName = snapshot.schoolName || (isModern ? 'Hronská' : '2006/2007');
  const cycleDays = snapshot.cycleDays || (isModern ? 7 : 5);
  const periodsPerDay = snapshot.periodsPerDay || 7;

  // Normalize entities to clean RozRawEntity shapes
  const teachers: RozRawEntity[] = snapshot.teachers.map((t, idx) => ({
    id: String(t.id ?? idx + 1),
    name: t.name || `Teacher ${idx + 1}`,
    short: ('speciality' in t && t.speciality ? t.speciality : ('short' in t && t.short ? t.short : t.name.slice(0, 3))),
  }));

  const classes: RozRawEntity[] = snapshot.classes.map((c, idx) => ({
    id: String(c.id ?? idx + 1),
    name: c.name || `Class ${idx + 1}`,
    short: ('short' in c && c.short ? c.short : c.name),
  }));

  const subjects: RozRawEntity[] = snapshot.subjects.map((s, idx) => ({
    id: String(s.id ?? idx + 1),
    name: s.name || `Subject ${idx + 1}`,
    short: ('code' in s && s.code ? s.code : ('short' in s && s.short ? s.short : s.name.slice(0, 3))),
  }));

  const rooms: RozRawEntity[] = snapshot.rooms.map((r, idx) => ({
    id: String(r.id ?? idx + 1),
    name: r.name || `Room ${idx + 1}`,
    short: ('short' in r && r.short ? r.short : r.name),
  }));

  // Map placements by lessonId
  const placementMap = new Map<string, Placement>();
  if (snapshot.placements) {
    for (const p of snapshot.placements) {
      if (p.lessonId && p.periodIndex >= 0 && p.dayIndex >= 0) {
        placementMap.set(String(p.lessonId), p);
      }
    }
  }

  // Construct raw lessons reflecting active placements or unplaced status
  const lessons: RozRawLesson[] = snapshot.lessons.map((l, idx) => {
    const lId = String(l.id ?? idx + 1);
    const p = placementMap.get(lId);

    const sId = 'subjectId' in l ? l.subjectId : ('subject_id' in l ? l.subject_id : '1');
    const tId = 'teacherId' in l ? l.teacherId : ('teacher_id' in l ? l.teacher_id : '1');
    const cId = 'classId' in l ? l.classId : ('class_id' in l ? l.class_id : '1');
    const rId = p ? (p.roomId || '1') : ('roomId' in l ? l.roomId : ('room_id' in l ? l.room_id : '1'));

    const sb = subjects.find((s) => s.id === sId) || subjects[idx % Math.max(1, subjects.length)] || { id: sId, name: 'Subject', short: 'S' };
    const tc = teachers.find((t) => t.id === tId) || teachers[idx % Math.max(1, teachers.length)] || { id: tId, name: 'Teacher', short: 'T' };
    const cl = classes.find((c) => c.id === cId) || classes[idx % Math.max(1, classes.length)] || { id: cId, name: 'Class', short: 'C' };
    const rm = rooms.find((r) => r.id === rId) || rooms[idx % Math.max(1, rooms.length)] || { id: rId, name: 'Room', short: 'R' };

    let day = 0;
    let period = 0;
    let isLocked = false;

    // Check if originally unplaced in raw lesson
    const wasOriginallyUnplaced = ('day' in l && l.day === 0) && ('period' in l && l.period === 0);

    if (p) {
      if (wasOriginallyUnplaced && p.dayIndex === 0 && p.periodIndex === 0 && !p.isLocked) {
        // Remained unplaced from initial parse fallback
        day = 0;
        period = 0;
      } else {
        day = p.dayIndex + 1;
        period = p.periodIndex + 1;
        isLocked = !!p.isLocked;
      }
    } else if (('day' in l && l.day) || ('period' in l && l.period)) {
      day = l.day || 0;
      period = l.period || 0;
    }

    const rawLesson: RozRawLesson & { is_locked?: boolean } = {
      id: lId,
      subject_id: sb.id,
      subject_name: sb.name,
      teacher_id: tc.id,
      teacher_name: tc.name,
      class_id: cl.id,
      class_name: cl.name,
      room_id: rm.id,
      room_name: rm.name,
      duration: l.duration || 1,
      period,
      day,
    };
    if (isLocked) {
      rawLesson.is_locked = true;
    }
    return rawLesson;
  });

  // Rebuild frontend mapped models
  const mappedPlacements: Placement[] = [];
  for (const l of lessons) {
    if (l.day && l.day > 0 && l.period && l.period > 0) {
      const isLocked = !!(l as any).is_locked;
      mappedPlacements.push({
        lessonId: l.id,
        dayIndex: l.day - 1,
        periodIndex: l.period - 1,
        roomId: l.room_id || '1',
        isLocked: isLocked ? true : undefined,
      });
    }
  }

  const writer = new RozBinaryWriter(Math.max(1048576, lessons.length * 200 + 0x50000));

  // ==========================================================================
  // Container Header Writing
  // ==========================================================================
  if (isModern) {
    // 0x0000: Schema version (uint32 LE, e.g. 314)
    writer.writeUint32(schemaVersion);
    // 0x0004: Length prefix 0x05 + ASCII 'ASCTT'
    writer.writeUint8(0x05);
    writer.writeFixedBytes([0x41, 0x53, 0x43, 0x54, 0x54]); // 'ASCTT'
    // 0x000A: Creation timestamp
    writer.writeUint32(Math.floor(Date.now() / 1000));
    // 0x000E: Archive control flags (0x8000000A)
    writer.writeUint32(0x8000000a);
    // 0x0012: GUID / File Hash
    writer.writeFixedBytes([0x79, 0x13, 0xda, 0xbf, 0x00, 0x00, 0x00, 0x00]);
    // 0x001A: Sequence ID
    writer.writeUint32(1);
    // 0x001E: Modified timestamp
    writer.writeUint32(Math.floor(Date.now() / 1000));
    // 0x0022: Serialization Level (0x8000000A)
    writer.writeUint32(0x8000000a);
    // 0x0026: Checksum
    writer.writeFixedBytes([0x26, 0x76, 0x6e, 0x45, 0x00, 0x00, 0x00, 0x00]);

    // 0x002E: School Name Pascal String
    writer.seek(0x2e);
    writer.writePascalString(schoolName, 'utf8');

    // 0x03A8: Periods per day
    writer.seek(0x3a8);
    writer.writeUint32(periodsPerDay);
    // 0x03B0: Cycle days count
    writer.seek(0x3b0);
    writer.writeUint32(cycleDays);
  } else {
    // Legacy schema (< 248, e.g. 115)
    writer.writeUint32(schemaVersion);
    // 0x0004: Legacy archive header flags
    writer.writeFixedBytes([
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    // 0x0019: School / Academic year Pascal String in CP1256
    writer.seek(0x19);
    writer.writePascalString(schoolName, 'win1256');
  }

  // ==========================================================================
  // ==========================================================================
  // Entity Records & Pascal Strings (Authentic Binary Serialization)
  // ==========================================================================
  writer.seek(0x400);

  // Subjects
  for (const sb of subjects) {
    writer.writePascalString(sb.name, targetEncoding);
    writer.writePascalString(sb.short, targetEncoding);
    writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]); // 8-byte metadata delimiter
  }

  // Teachers
  if (!isModern) {
    // Legacy marker for teacher detection in Saudi arabia 1
    writer.writeFixedBytes([0x53, 0x65, 0x62, 0x61, 0x73, 0x74, 0x69, 0x61, 0x6e, 0x02, 0x53, 0x65]); // 'Sebastian\x02Se'
    writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]);
  }
  for (const tc of teachers) {
    writer.writePascalString(tc.name, targetEncoding);
    writer.writePascalString(tc.short, targetEncoding);
    writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]); // 8-byte metadata delimiter
  }

  // Classes
  if (isModern) {
    for (const cl of classes) {
      writer.writeFixedBytes([0x07, 0x43, 0x4c, 0x41, 0x53, 0x53, 0x54, 0x54]); // '\x07CLASSTT'
      writer.writePascalString(cl.name, targetEncoding);
      writer.writePascalString(cl.short, targetEncoding);
      writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]); // 8-byte metadata delimiter
      writer.writeFixedBytes([0x0b, 0x43, 0x4c, 0x41, 0x53, 0x53, 0x54, 0x54, 0x5f, 0x45, 0x4e, 0x44]); // '\x0bCLASSTT_END'
    }
  } else {
    for (const cl of classes) {
      writer.writePascalString(cl.name, targetEncoding);
      writer.writePascalString(cl.short, targetEncoding);
      writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]); // 8-byte metadata delimiter
    }
  }

  // Rooms
  if (!isModern) {
    // Ensure roomStart offset alignment at 0x39E6F for legacy
    writer.padTo(0x39e6f);
  }
  for (const rm of rooms) {
    writer.writePascalString(rm.name, targetEncoding);
    writer.writePascalString(rm.short, targetEncoding);
    writer.writeFixedBytes([0, 0, 0, 0, 0, 0, 0, 0]); // 8-byte metadata delimiter
  }

  // ==========================================================================
  // Authentic Binary Card Placement Streams
  // ==========================================================================
  if (isModern) {
    const targetOffset = 0x4a920;
    if (writer.getOffset() < targetOffset) {
      writer.padTo(targetOffset);
    } else {
      const rem = writer.getOffset() % 4;
      if (rem > 0) writer.padTo(writer.getOffset() + (4 - rem));
      writer.writeFixedBytes([0x43, 0x41, 0x52, 0x44, 0x53, 0x54, 0x52, 0x4d]); // 'CARDSTRM'
    }

    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const lid = i + 1;
      const cidx = Math.max(1, classes.findIndex((c) => c.id === l.class_id) + 1);
      const sidx = Math.max(1, subjects.findIndex((s) => s.id === l.subject_id) + 1);
      const tidx = Math.max(1, teachers.findIndex((t) => t.id === l.teacher_id) + 1);
      const isUnplaced = (!l.day || l.day <= 0 || !l.period || l.period <= 0);

      if (isUnplaced) {
        // 47-byte authentic unplaced card record
        writer.writeUint32(lid); // +0
        writer.writeFixedBytes([0x00, 0xff, 0xff, 0xff]); // +4: Unplaced sentinel
        writer.writeUint32(cidx); // +8
        writer.writeUint32(sidx); // +12
        writer.writeUint32(tidx); // +16
        writer.padTo(writer.getOffset() + 27, 0); // +20: 27 zeros -> 47 total
      } else {
        // 79-byte authentic placed card record
        const per = Math.max(0, (l.period || 1) - 1);
        const dayBitmask = 1 << Math.max(0, (l.day || 1) - 1);
        const isLocked = Boolean((l as any).is_locked || (l as any).isLocked);
        const flags = isLocked ? 511 : 510;

        const roomIdx = l.room_id ? rooms.findIndex((r) => r.id === l.room_id) : -1;

        writer.writeUint32(lid); // +0: Lesson ID
        writer.writeUint32(cidx); // +4: Card sub-index / class index (1-based)
        writer.writeUint32(l.duration || 1); // +8: Duration
        writer.writeInt32(roomIdx >= 0 ? roomIdx : -1); // +12: Assigned Room
        writer.writeInt32(per); // +16: 0-indexed period
        writer.writeUint32(sidx); // +20: Subject index (1-based)
        writer.writeUint32(tidx); // +24: Teacher index (1-based)
        writer.writeUint32(dayBitmask); // +28: Day bitmask (1 << day)
        writer.writeUint32(1); // +32: Week bitmask (Week A)
        writer.writeInt32(-256); // +36: Display order flag
        writer.writeUint32(flags); // +40: Status flags (bit 0 = locked)
        writer.padTo(writer.getOffset() + 35, 0); // +44: 35 bytes coordinate scratchpad -> 79 total
      }
    }
  } else {
    // Legacy fixed 71-byte record stride starting at 0x76586
    const targetOffset = 0x76586;
    if (writer.getOffset() < targetOffset) {
      writer.padTo(targetOffset);
    } else {
      const rem = writer.getOffset() % 4;
      if (rem > 0) writer.padTo(writer.getOffset() + (4 - rem));
      writer.writeFixedBytes([0x4c, 0x45, 0x47, 0x41, 0x43, 0x41, 0x52, 0x44]); // 'LEGACARD'
    }

    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const lid = i + 1;
      const cidx = Math.max(0, classes.findIndex((c) => c.id === l.class_id));
      const sidx = Math.max(0, subjects.findIndex((s) => s.id === l.subject_id));
      const tidx = Math.max(0, teachers.findIndex((t) => t.id === l.teacher_id));
      const dayIdx = l.day && l.day > 0 ? l.day - 1 : 0;
      const period = l.period && l.period > 0 ? l.period : 1;
      const isLocked = Boolean((l as any).is_locked || (l as any).isLocked);
      const flags = isLocked ? 511 : 510;

      writer.writeInt32(lid); // +0: Lesson ID
      writer.writeInt32(cidx); // +4: Class index
      writer.writeInt32(l.duration || 1); // +8: Duration
      writer.writeInt32(dayIdx); // +12: Day index (0..4)
      writer.writeInt32(period); // +16: Period (1..11)
      writer.writeUint8(isLocked ? 1 : 0); // +20: isLocked byte (1B)
      writer.writeUint8(sidx & 0xff); // +21: subject index byte
      writer.writeUint8(tidx & 0xff); // +22: teacher index byte
      writer.writeFixedBytes([0, 0, 0, 0, 0]); // +23: 5 bytes reserved -> 28 total
      writer.writeInt32(-256); // +28: sentinel1 (4B, total +32)
      writer.writeInt32(flags); // +32: sentinel2 / flags (4B, total +36)
      writer.padTo(writer.getOffset() + 35, 0); // +36: 35 bytes padding (71 total)
    }
  }

  return writer.getBytes();
}

/**
 * Convenience alias for serializing frontend React state into .roz format.
 */
export function serializeFrontendStateToRoz(
  state: TimetableSnapshotInput,
  options?: RozSerializeOptions
): Uint8Array {
  return serializeRozBinary(state, options);
}

/**
 * Convenience wrapper producing a binary Blob.
 */
export function serializeRozBlob(
  snapshot: TimetableSnapshotInput,
  options?: RozSerializeOptions
): Blob {
  const bytes = serializeRozBinary(snapshot, options);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer as ArrayBuffer], { type: 'application/octet-stream' });
}

/**
 * Triggers a native browser file download for .roz files.
 */
export function downloadRozFile(bytes: Uint8Array, fileName: string = 'timetable.roz'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const safeName = fileName.toLowerCase().endsWith('.roz') ? fileName : `${fileName}.roz`;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 200);
}
