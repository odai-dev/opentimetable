// opentimetable/tests/helpers/studio-engine.mjs
// Studio Web UI simulation, DnD mechanics, conflict detection, undo/redo stack, and multi-view models

export class DragAndDropManager {
  constructor(days = 5, periodsPerDay = 7) {
    this.days = days;
    this.periodsPerDay = periodsPerDay;
    this.placements = new Map(); // lessonId -> { dayIndex, periodIndex, roomId, teacherId, classId }
  }

  placeLesson(lesson, dayIndex, periodIndex, roomId) {
    if (dayIndex < 0 || dayIndex >= this.days || periodIndex < 0 || periodIndex >= this.periodsPerDay) {
      throw new Error(`Invalid slot index: day ${dayIndex}, period ${periodIndex}`);
    }
    this.placements.set(lesson.id, {
      lessonId: lesson.id,
      dayIndex,
      periodIndex,
      roomId,
      teacherId: lesson.teacherId,
      classId: lesson.classId,
    });
  }

  moveLesson(lessonId, newDayIndex, newPeriodIndex, newRoomId) {
    const existing = this.placements.get(lessonId);
    if (!existing) {
      throw new Error(`Cannot move unplaced lesson ${lessonId}`);
    }
    this.placements.set(lessonId, {
      ...existing,
      dayIndex: newDayIndex,
      periodIndex: newPeriodIndex,
      roomId: newRoomId || existing.roomId,
    });
  }

  removeLesson(lessonId) {
    return this.placements.delete(lessonId);
  }

  evaluateConflicts(proposedLesson, dayIndex, periodIndex, roomId) {
    const tStart = performance.now();
    const conflicts = [];

    for (const [id, p] of this.placements.entries()) {
      if (id === proposedLesson.id) continue;
      if (p.dayIndex === dayIndex && p.periodIndex === periodIndex) {
        if (p.teacherId === proposedLesson.teacherId) {
          conflicts.push({ type: 'TEACHER_CLASH', message: `Teacher ${p.teacherId} is already booked in this period` });
        }
        if (p.roomId === roomId) {
          conflicts.push({ type: 'ROOM_CLASH', message: `Room ${roomId} is already occupied in this period` });
        }
        if (p.classId === proposedLesson.classId) {
          conflicts.push({ type: 'CLASS_CLASH', message: `Class ${p.classId} already has a lesson in this period` });
        }
      }
    }

    const durationMs = performance.now() - tStart;
    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      durationMs,
    };
  }
}

export class UndoRedoStack {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.undoStack = [];
    this.redoStack = [];
  }

  push(state) {
    // Deep clone state snapshot
    const snapshot = JSON.parse(JSON.stringify(state));
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // Drop oldest action when exceeding 50 steps
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    const currentSnapshot = JSON.parse(JSON.stringify(currentState));
    this.redoStack.push(currentSnapshot);
    return this.undoStack.pop();
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    const currentSnapshot = JSON.parse(JSON.stringify(currentState));
    this.undoStack.push(currentSnapshot);
    return this.redoStack.pop();
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get historyLength() {
    return this.undoStack.length;
  }
}

export class MultiViewTransformer {
  static transformByClass(placements, lessons, classes, days = 5, periodsPerDay = 7) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const classViews = new Map();

    for (const c of classes) {
      const grid = Array.from({ length: days }, () => Array(periodsPerDay).fill(null));
      classViews.set(c.id, { class: c, grid });
    }

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (lesson && classViews.has(lesson.classId)) {
        classViews.get(lesson.classId).grid[p.dayIndex][p.periodIndex] = {
          lessonId: lesson.id,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          roomId: p.roomId,
        };
      }
    }

    return classViews;
  }

  static transformByTeacher(placements, lessons, teachers, days = 5, periodsPerDay = 7) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const teacherViews = new Map();

    for (const t of teachers) {
      const grid = Array.from({ length: days }, () => Array(periodsPerDay).fill(null));
      teacherViews.set(t.id, { teacher: t, grid });
    }

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (lesson && teacherViews.has(lesson.teacherId)) {
        teacherViews.get(lesson.teacherId).grid[p.dayIndex][p.periodIndex] = {
          lessonId: lesson.id,
          subjectId: lesson.subjectId,
          classId: lesson.classId,
          roomId: p.roomId,
        };
      }
    }

    return teacherViews;
  }

  static transformByRoom(placements, lessons, rooms, days = 5, periodsPerDay = 7) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const roomViews = new Map();

    for (const r of rooms) {
      const grid = Array.from({ length: days }, () => Array(periodsPerDay).fill(null));
      roomViews.set(r.id, { room: r, grid });
    }

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (roomViews.has(p.roomId)) {
        roomViews.get(p.roomId).grid[p.dayIndex][p.periodIndex] = {
          lessonId: p.lessonId,
          subjectId: lesson?.subjectId,
          teacherId: lesson?.teacherId,
          classId: lesson?.classId,
        };
      }
    }

    return roomViews;
  }

  static transformMasterWall(placements, lessons, classes, days = 5, periodsPerDay = 7) {
    const totalSlots = days * periodsPerDay;
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const wallGrid = [];

    for (const c of classes) {
      const row = { classId: c.id, className: c.name, slots: Array(totalSlots).fill(null) };
      wallGrid.push(row);
    }

    const rowMap = new Map(wallGrid.map(r => [r.classId, r]));

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (lesson && rowMap.has(lesson.classId)) {
        const slotIdx = p.dayIndex * periodsPerDay + p.periodIndex;
        rowMap.get(lesson.classId).slots[slotIdx] = {
          lessonId: lesson.id,
          teacherId: lesson.teacherId,
          roomId: p.roomId,
        };
      }
    }

    return wallGrid;
  }
}

export const BilingualDictionary = {
  en: {
    dir: 'ltr',
    appTitle: 'OpenTimetable Studio',
    viewClass: 'Class View',
    viewTeacher: 'Teacher View',
    viewRoom: 'Room View',
    viewWall: 'Master Wall Grid',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    period: 'Period',
    conflict: 'Conflict',
    undo: 'Undo',
    redo: 'Redo',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
    exportIcal: 'Export iCal',
    solve: 'Generate Timetable',
  },
  ar: {
    dir: 'rtl',
    appTitle: 'استوديو الجداول المدرسية المفتوحة',
    viewClass: 'عرض الفصول',
    viewTeacher: 'عرض الأساتذة',
    viewRoom: 'عرض القاعات',
    viewWall: 'شبكة الحائط العامة',
    days: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
    period: 'الحصة',
    conflict: 'تعارض',
    undo: 'تراجع',
    redo: 'إعادة',
    exportPdf: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
    exportIcal: 'تصدير تقويم iCal',
    solve: 'توليد الجدول',
  },
};
