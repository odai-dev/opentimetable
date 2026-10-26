// opentimetable/tests/helpers/roz-parser.mjs
// Reference parser and binary structure validator for legacy .roz files

import fs from 'node:fs';

export class RozBinaryParser {
  static validateMagicHeader(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
      return { valid: false, error: 'Buffer too small for .roz header' };
    }
    // Expected header: at offset 4, length prefix 5 followed by "ASCTT"
    const len = buffer.readUInt8(4);
    if (len !== 5) {
      return { valid: false, error: `Invalid magic length at offset 4: ${len} (expected 5)` };
    }
    const magic = buffer.toString('ascii', 5, 10);
    if (magic !== 'ASCTT') {
      return { valid: false, error: `Invalid magic string: '${magic}' (expected 'ASCTT')` };
    }
    return { valid: true, magic };
  }

  static readPascalString(buffer, offset) {
    if (offset >= buffer.length) return { value: '', bytesRead: 0 };
    const length = buffer.readUInt8(offset);
    if (offset + 1 + length > buffer.length) {
      throw new Error(`Pascal string length ${length} extends beyond buffer bounds`);
    }
    const value = buffer.toString('utf8', offset + 1, offset + 1 + length);
    return { value, bytesRead: 1 + length };
  }

  static parseRozFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    const headerCheck = this.validateMagicHeader(buffer);
    if (!headerCheck.valid) {
      throw new Error(headerCheck.error);
    }

    // Extract printable strings to detect entities
    const extractedStrings = [];
    let currentChars = [];
    for (let i = 16; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte >= 32 && byte <= 126) {
        currentChars.push(String.fromCharCode(byte));
      } else {
        if (currentChars.length >= 3) {
          extractedStrings.push(currentChars.join(''));
        }
        currentChars = [];
      }
    }
    if (currentChars.length >= 3) {
      extractedStrings.push(currentChars.join(''));
    }

    // Partition into teachers, subjects, classes, rooms heuristic
    const subjects = extractedStrings.filter(s =>
      /math|phys|chem|eng|hist|bio|geog|sport|art|music|lang/i.test(s)
    );
    const classes = extractedStrings.filter(s =>
      /\b(\d[A-Z]|[A-Z]\d|\d-\d|grade|class|1A|2B|3C|4D)\b/i.test(s)
    );
    const teachers = extractedStrings.filter(s =>
      /mr\.|ms\.|mrs\.|prof\.|dr\.|teacher/i.test(s) || (s.length > 5 && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(s))
    );
    const rooms = extractedStrings.filter(s =>
      /room|lab|hall|gym|salle|auditorium/i.test(s) || /^[A-Z]?\d{2,3}$/.test(s)
    );

    return {
      filePath,
      fileSizeBytes: buffer.length,
      magic: 'ASCTT',
      summary: {
        totalStringsExtracted: extractedStrings.length,
        subjectsCount: subjects.length,
        classesCount: classes.length,
        teachersCount: teachers.length,
        roomsCount: rooms.length,
      },
      sampleEntities: {
        subjects: subjects.slice(0, 10),
        classes: classes.slice(0, 10),
        teachers: teachers.slice(0, 10),
        rooms: rooms.slice(0, 10),
      },
    };
  }
}
