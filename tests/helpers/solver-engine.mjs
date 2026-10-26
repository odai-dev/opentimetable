// opentimetable/tests/helpers/solver-engine.mjs
// Constraint satisfaction & optimization reference oracle utilizing 64-bit bitmasks

export class BitmaskGrid {
  constructor(days = 5, periodsPerDay = 7) {
    this.days = days;
    this.periodsPerDay = periodsPerDay;
    this.totalSlots = days * periodsPerDay;
    this.teacherMasks = new Map();
    this.roomMasks = new Map();
    this.classMasks = new Map();
  }

  getSlotIndex(dayIndex, periodIndex) {
    if (dayIndex < 0 || dayIndex >= this.days || periodIndex < 0 || periodIndex >= this.periodsPerDay) {
      throw new Error(`Slot out of bounds: day ${dayIndex}, period ${periodIndex}`);
    }
    return dayIndex * this.periodsPerDay + periodIndex;
  }

  getSlotMask(dayIndex, periodIndex) {
    const slot = this.getSlotIndex(dayIndex, periodIndex);
    return 1n << BigInt(slot);
  }

  canPlace(teacherId, roomId, classId, dayIndex, periodIndex) {
    const mask = this.getSlotMask(dayIndex, periodIndex);
    const tMask = this.teacherMasks.get(teacherId) || 0n;
    const rMask = this.roomMasks.get(roomId) || 0n;
    const cMask = this.classMasks.get(classId) || 0n;

    if ((tMask & mask) !== 0n) return false;
    if ((rMask & mask) !== 0n) return false;
    if ((cMask & mask) !== 0n) return false;
    return true;
  }

  setSlot(teacherId, roomId, classId, dayIndex, periodIndex) {
    const mask = this.getSlotMask(dayIndex, periodIndex);
    this.teacherMasks.set(teacherId, (this.teacherMasks.get(teacherId) || 0n) | mask);
    this.roomMasks.set(roomId, (this.roomMasks.get(roomId) || 0n) | mask);
    this.classMasks.set(classId, (this.classMasks.get(classId) || 0n) | mask);
  }

  clearSlot(teacherId, roomId, classId, dayIndex, periodIndex) {
    const mask = ~(this.getSlotMask(dayIndex, periodIndex));
    this.teacherMasks.set(teacherId, (this.teacherMasks.get(teacherId) || 0n) & mask);
    this.roomMasks.set(roomId, (this.roomMasks.get(roomId) || 0n) & mask);
    this.classMasks.set(classId, (this.classMasks.get(classId) || 0n) & mask);
  }

  hasTeacherClash(teacherId, dayIndex, periodIndex) {
    const mask = this.getSlotMask(dayIndex, periodIndex);
    return ((this.teacherMasks.get(teacherId) || 0n) & mask) !== 0n;
  }

  hasRoomClash(roomId, dayIndex, periodIndex) {
    const mask = this.getSlotMask(dayIndex, periodIndex);
    return ((this.roomMasks.get(roomId) || 0n) & mask) !== 0n;
  }

  hasClassClash(classId, dayIndex, periodIndex) {
    const mask = this.getSlotMask(dayIndex, periodIndex);
    return ((this.classMasks.get(classId) || 0n) & mask) !== 0n;
  }
}

export function evaluateHardConflicts(request, placements) {
  let conflicts = 0;
  const grid = new BitmaskGrid(request.config.days, request.config.periodsPerDay);
  const teacherUnavailable = new Map();
  for (const t of request.teachers) {
    let unavail = 0n;
    for (const slot of t.unavailableSlots || []) {
      if (slot >= 0 && slot < grid.totalSlots) {
        unavail |= (1n << BigInt(slot));
      }
    }
    teacherUnavailable.set(t.id, unavail);
  }

  const lessonMap = new Map(request.lessons.map(l => [l.id, l]));
  const roomMap = new Map(request.rooms.map(r => [r.id, r]));

  // Track consecutive periods per class and teacher per day
  const teacherDayPeriods = new Map();
  const classDayPeriods = new Map();

  for (const p of placements) {
    const lesson = lessonMap.get(p.lessonId);
    if (!lesson) {
      conflicts += 1;
      continue;
    }

    const slotMask = grid.getSlotMask(p.dayIndex, p.periodIndex);

    // 1. Teacher clash
    if (grid.hasTeacherClash(lesson.teacherId, p.dayIndex, p.periodIndex)) {
      conflicts += 1;
    }

    // 2. Room clash
    if (grid.hasRoomClash(p.roomId, p.dayIndex, p.periodIndex)) {
      conflicts += 1;
    }

    // 3. Class clash
    if (grid.hasClassClash(lesson.classId, p.dayIndex, p.periodIndex)) {
      conflicts += 1;
    }

    // 4. Unavailable slot
    const unavail = teacherUnavailable.get(lesson.teacherId) || 0n;
    if ((unavail & slotMask) !== 0n) {
      conflicts += 1;
    }

    // 5. Room capacity check (if room capacity specified and class has assumed standard size 30)
    const room = roomMap.get(p.roomId);
    if (room && typeof room.capacity === 'number' && room.capacity < 25) {
      // Room too small
      conflicts += 1;
    }

    grid.setSlot(lesson.teacherId, p.roomId, lesson.classId, p.dayIndex, p.periodIndex);

    // Track consecutive
    const tKey = `${lesson.teacherId}-${p.dayIndex}`;
    const cKey = `${lesson.classId}-${p.dayIndex}`;
    if (!teacherDayPeriods.has(tKey)) teacherDayPeriods.set(tKey, []);
    teacherDayPeriods.get(tKey).push(p.periodIndex);
    if (!classDayPeriods.has(cKey)) classDayPeriods.set(cKey, []);
    classDayPeriods.get(cKey).push(p.periodIndex);
  }

  // Check max consecutive periods
  const maxConsec = request.config.maxConsecutivePeriods || 4;
  for (const periods of [...teacherDayPeriods.values(), ...classDayPeriods.values()]) {
    periods.sort((a, b) => a - b);
    let consecutive = 1;
    for (let i = 1; i < periods.length; i++) {
      if (periods[i] === periods[i - 1] + 1) {
        consecutive++;
        if (consecutive > maxConsec) {
          conflicts += 1;
        }
      } else {
        consecutive = 1;
      }
    }
  }

  return conflicts;
}

export function evaluateSoftPenalty(request, placements) {
  // Soft penalty calculates teacher gaps/windows across days
  const lessonMap = new Map(request.lessons.map(l => [l.id, l]));
  const teacherDaySchedules = new Map();

  for (const p of placements) {
    const lesson = lessonMap.get(p.lessonId);
    if (!lesson) continue;
    const key = `${lesson.teacherId}-${p.dayIndex}`;
    if (!teacherDaySchedules.has(key)) teacherDaySchedules.set(key, []);
    teacherDaySchedules.get(key).push(p.periodIndex);
  }

  let totalPenalty = 0;
  for (const periods of teacherDaySchedules.values()) {
    if (periods.length <= 1) continue;
    periods.sort((a, b) => a - b);
    const minPeriod = periods[0];
    const maxPeriod = periods[periods.length - 1];
    const span = maxPeriod - minPeriod + 1;
    const gaps = span - periods.length;
    totalPenalty += (gaps * 10); // each gap penalty 10 points
  }

  return totalPenalty;
}

export function solveTimetable(request) {
  const startTime = performance.now();
  const { days, periodsPerDay } = request.config;
  const grid = new BitmaskGrid(days, periodsPerDay);

  const teacherUnavailable = new Map();
  for (const t of request.teachers) {
    let unavail = 0n;
    for (const slot of t.unavailableSlots || []) {
      if (slot >= 0 && slot < grid.totalSlots) {
        unavail |= (1n << BigInt(slot));
      }
    }
    teacherUnavailable.set(t.id, unavail);
  }

  const roomIds = request.rooms.map(r => r.id);
  const placements = [];
  const unplaced = [];

  // Sort lessons using MRV heuristic (Most Constrained First)
  const sortedLessons = [...request.lessons].sort((a, b) => {
    const tA = request.teachers.find(t => t.id === a.teacherId);
    const tB = request.teachers.find(t => t.id === b.teacherId);
    const unavailA = tA?.unavailableSlots?.length || 0;
    const unavailB = tB?.unavailableSlots?.length || 0;
    return unavailB - unavailA;
  });

  const teacherDayPeriods = new Map();
  const classDayPeriods = new Map();
  const maxConsec = request.config.maxConsecutivePeriods || 4;

  function wouldExceedConsecutive(existingPeriods, newPeriod, maxAllowed) {
    if (!existingPeriods || existingPeriods.length === 0) return false;
    const sorted = [...existingPeriods, newPeriod].sort((a, b) => a - b);
    let consec = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        consec++;
        if (consec > maxAllowed) return true;
      } else {
        consec = 1;
      }
    }
    return false;
  }

  for (let lessonIdx = 0; lessonIdx < sortedLessons.length; lessonIdx++) {
    const lesson = sortedLessons[lessonIdx];
    let bestSlot = null;
    const candidateRooms = lesson.roomId ? [lesson.roomId, ...roomIds.filter(r => r !== lesson.roomId)] : roomIds;

    // First pass: try with strict maxConsecutivePeriods
    for (let dayOffset = 0; dayOffset < days && !bestSlot; dayOffset++) {
      const d = (lessonIdx + dayOffset) % days;
      const tKey = `${lesson.teacherId}-${d}`;
      const cKey = `${lesson.classId}-${d}`;
      const existingT = teacherDayPeriods.get(tKey) || [];
      const existingC = classDayPeriods.get(cKey) || [];

      for (let p = 0; p < periodsPerDay && !bestSlot; p++) {
        const slotMask = grid.getSlotMask(d, p);
        const unavail = teacherUnavailable.get(lesson.teacherId) || 0n;
        if ((unavail & slotMask) !== 0n) continue;

        if (wouldExceedConsecutive(existingT, p, maxConsec) || wouldExceedConsecutive(existingC, p, maxConsec)) {
          continue;
        }

        for (const roomId of candidateRooms) {
          if (grid.canPlace(lesson.teacherId, roomId, lesson.classId, d, p)) {
            bestSlot = { dayIndex: d, periodIndex: p, roomId };
            break;
          }
        }
      }
    }

    // Fallback pass: if tight, place in any feasible slot without clash
    if (!bestSlot) {
      for (let dayOffset = 0; dayOffset < days && !bestSlot; dayOffset++) {
        const d = (lessonIdx + dayOffset) % days;
        for (let p = 0; p < periodsPerDay && !bestSlot; p++) {
          const slotMask = grid.getSlotMask(d, p);
          const unavail = teacherUnavailable.get(lesson.teacherId) || 0n;
          if ((unavail & slotMask) !== 0n) continue;

          for (const roomId of candidateRooms) {
            if (grid.canPlace(lesson.teacherId, roomId, lesson.classId, d, p)) {
              bestSlot = { dayIndex: d, periodIndex: p, roomId };
              break;
            }
          }
        }
      }
    }

    if (bestSlot) {
      grid.setSlot(lesson.teacherId, bestSlot.roomId, lesson.classId, bestSlot.dayIndex, bestSlot.periodIndex);
      placements.push({
        lessonId: lesson.id,
        dayIndex: bestSlot.dayIndex,
        periodIndex: bestSlot.periodIndex,
        roomId: bestSlot.roomId,
      });
      const tKey = `${lesson.teacherId}-${bestSlot.dayIndex}`;
      const cKey = `${lesson.classId}-${bestSlot.dayIndex}`;
      if (!teacherDayPeriods.has(tKey)) teacherDayPeriods.set(tKey, []);
      teacherDayPeriods.get(tKey).push(bestSlot.periodIndex);
      if (!classDayPeriods.has(cKey)) classDayPeriods.set(cKey, []);
      classDayPeriods.get(cKey).push(bestSlot.periodIndex);
    } else {
      unplaced.push(lesson);
    }
  }

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const hardConflicts = unplaced.length > 0 ? unplaced.length : evaluateHardConflicts(request, placements);
  const softPenalty = evaluateSoftPenalty(request, placements);

  let status = 'OPTIMAL';
  if (unplaced.length > 0) {
    status = 'INFEASIBLE';
  } else if (softPenalty > 0) {
    status = 'FEASIBLE';
  }

  return {
    status,
    hardConflicts,
    softPenalty,
    solveDurationMs: durationMs,
    placements,
  };
}

export function generateSyntheticSchedule(lessonCount = 500, teacherCount = 50, roomCount = 25, classCount = 20) {
  const days = 5;
  const periodsPerDay = 7;
  const totalSlots = days * periodsPerDay; // 35 slots per resource

  const teachers = Array.from({ length: teacherCount }, (_, i) => ({
    id: `teacher_${i + 1}`,
    name: `Teacher ${i + 1}`,
    unavailableSlots: [Math.floor(Math.random() * totalSlots)],
    maxDailyHours: 6,
  }));

  const classes = Array.from({ length: classCount }, (_, i) => ({
    id: `class_${i + 1}`,
    name: `Class ${Math.floor(i / 2) + 9}-${(i % 2) + 1}`,
  }));

  const rooms = Array.from({ length: roomCount }, (_, i) => ({
    id: `room_${i + 1}`,
    name: `Room ${101 + i}`,
    capacity: 35,
    roomType: i < 5 ? 'LAB' : 'STANDARD',
  }));

  const subjects = [
    { id: 'sub_math', name: 'Mathematics' },
    { id: 'sub_phys', name: 'Physics', requiredRoomType: 'LAB' },
    { id: 'sub_chem', name: 'Chemistry', requiredRoomType: 'LAB' },
    { id: 'sub_eng', name: 'English Literature' },
    { id: 'sub_hist', name: 'History' },
    { id: 'sub_bio', name: 'Biology' },
    { id: 'sub_comp', name: 'Computer Science', requiredRoomType: 'LAB' },
    { id: 'sub_art', name: 'Fine Arts' },
  ];

  const lessons = [];
  for (let i = 0; i < lessonCount; i++) {
    const classId = classes[i % classCount].id;
    const teacherId = teachers[i % teacherCount].id;
    const subject = subjects[i % subjects.length];
    const roomId = rooms[i % roomCount].id;

    lessons.push({
      id: `lesson_${i + 1}`,
      subjectId: subject.id,
      teacherId,
      classId,
      roomId,
      duration: 1,
    });
  }

  return {
    config: {
      days,
      periodsPerDay,
      maxConsecutivePeriods: 4,
      timeoutMs: 2000,
    },
    teachers,
    classes,
    rooms,
    subjects,
    lessons,
  };
}
