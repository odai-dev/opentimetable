// opentimetable/tests/helpers/contracts.mjs
// Authoritative interface contracts and schemas derived from PROJECT.md

export function validateTimetableRequest(req) {
  if (!req || typeof req !== 'object') {
    return { valid: false, error: 'Request must be an object' };
  }
  if (!req.config || typeof req.config !== 'object') {
    return { valid: false, error: 'Missing or invalid config object' };
  }
  const { days, periodsPerDay, maxConsecutivePeriods } = req.config;
  if (typeof days !== 'number' || days <= 0 || !Number.isInteger(days)) {
    return { valid: false, error: 'config.days must be a positive integer' };
  }
  if (typeof periodsPerDay !== 'number' || periodsPerDay <= 0 || !Number.isInteger(periodsPerDay)) {
    return { valid: false, error: 'config.periodsPerDay must be a positive integer' };
  }
  if (typeof maxConsecutivePeriods !== 'number' || maxConsecutivePeriods <= 0) {
    return { valid: false, error: 'config.maxConsecutivePeriods must be a positive number' };
  }
  if (req.config.timeoutMs !== undefined && (typeof req.config.timeoutMs !== 'number' || req.config.timeoutMs < 0)) {
    return { valid: false, error: 'config.timeoutMs must be a non-negative number' };
  }

  const arrayFields = ['teachers', 'classes', 'rooms', 'subjects', 'lessons'];
  for (const field of arrayFields) {
    if (!Array.isArray(req[field])) {
      return { valid: false, error: `Missing or invalid array: ${field}` };
    }
  }

  // Validate teachers
  for (const t of req.teachers) {
    if (!t.id || typeof t.id !== 'string' || !t.name) {
      return { valid: false, error: 'Teacher must have valid id and name' };
    }
    if (!Array.isArray(t.unavailableSlots)) {
      return { valid: false, error: `Teacher ${t.id} unavailableSlots must be an array` };
    }
  }

  // Validate classes
  for (const c of req.classes) {
    if (!c.id || typeof c.id !== 'string' || !c.name) {
      return { valid: false, error: 'Class must have valid id and name' };
    }
  }

  // Validate rooms
  for (const r of req.rooms) {
    if (!r.id || typeof r.id !== 'string' || !r.name) {
      return { valid: false, error: 'Room must have valid id and name' };
    }
    if (r.capacity !== undefined && (typeof r.capacity !== 'number' || r.capacity < 0)) {
      return { valid: false, error: `Room ${r.id} capacity must be a positive number` };
    }
  }

  // Validate subjects
  for (const s of req.subjects) {
    if (!s.id || typeof s.id !== 'string' || !s.name) {
      return { valid: false, error: 'Subject must have valid id and name' };
    }
  }

  // Validate lessons
  for (const l of req.lessons) {
    if (!l.id || !l.subjectId || !l.teacherId || !l.classId) {
      return { valid: false, error: 'Lesson must have id, subjectId, teacherId, and classId' };
    }
    if (typeof l.duration !== 'number' || l.duration <= 0) {
      return { valid: false, error: `Lesson ${l.id} duration must be positive` };
    }
  }

  return { valid: true };
}

export function validateTimetableResponse(res) {
  if (!res || typeof res !== 'object') {
    return { valid: false, error: 'Response must be an object' };
  }
  const allowedStatuses = ['OPTIMAL', 'FEASIBLE', 'TIMEOUT', 'INFEASIBLE'];
  if (!allowedStatuses.includes(res.status)) {
    return { valid: false, error: `status must be one of: ${allowedStatuses.join(', ')}` };
  }
  if (typeof res.hardConflicts !== 'number' || res.hardConflicts < 0) {
    return { valid: false, error: 'hardConflicts must be non-negative integer' };
  }
  if (typeof res.softPenalty !== 'number' || res.softPenalty < 0) {
    return { valid: false, error: 'softPenalty must be non-negative number' };
  }
  if (typeof res.solveDurationMs !== 'number' || res.solveDurationMs < 0) {
    return { valid: false, error: 'solveDurationMs must be non-negative number' };
  }
  if (!Array.isArray(res.placements)) {
    return { valid: false, error: 'placements must be an array' };
  }

  for (const p of res.placements) {
    if (!p.lessonId || typeof p.dayIndex !== 'number' || typeof p.periodIndex !== 'number' || !p.roomId) {
      return { valid: false, error: 'Each placement must have lessonId, dayIndex, periodIndex, roomId' };
    }
    if (p.dayIndex < 0 || p.periodIndex < 0) {
      return { valid: false, error: 'dayIndex and periodIndex must be non-negative' };
    }
  }

  if ((res.status === 'OPTIMAL' || res.status === 'FEASIBLE') && res.hardConflicts !== 0) {
    return { valid: false, error: 'Feasible and Optimal schedules must have 0 hard conflicts' };
  }

  return { valid: true };
}

export function validateSisAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    return { valid: false, error: 'Adapter must be an object' };
  }
  if (typeof adapter.name !== 'string' || !adapter.name.trim()) {
    return { valid: false, error: 'Adapter must provide a non-empty name' };
  }
  const requiredMethods = ['importTeachers', 'importClasses', 'importRooms', 'importCurriculum', 'exportTimetable'];
  for (const method of requiredMethods) {
    if (typeof adapter[method] !== 'function') {
      return { valid: false, error: `Missing required method: ${method}` };
    }
  }
  return { valid: true };
}
