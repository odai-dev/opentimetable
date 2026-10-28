'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { translations } from '../lib/i18n';
import {
  Role,
  ViewMode,
  Language,
  RibbonTab,
  GenerationComplexity,
  BasicDataTab,
  Placement,
  Lesson,
  Conflict,
  Teacher,
  ClassGroup,
  Room,
  Subject,
  AvailabilityState,
  AdvancedRelationRule,
} from '../lib/types';
import {
  sampleTeachers,
  sampleClasses,
  sampleRooms,
  sampleSubjects,
  sampleLessons,
  initialPlacements,
} from '../lib/sample-data';
import { parseRozBinary } from '../lib/roz-parser';
import { RibbonToolbar } from '../components/RibbonToolbar';
import { ViewNavigator } from '../components/ViewNavigator';
import { TimetableGrid } from '../components/TimetableGrid';
import { BottomCardDeck } from '../components/BottomCardDeck';
import { GenerateModal } from '../components/GenerateModal';
import { TimeOffModal } from '../components/TimeOffModal';
import { BasicDataModal } from '../components/BasicDataModal';
import { TestTimetableModal } from '../components/TestTimetableModal';
import { AdvancedRelationsModal } from '../components/AdvancedRelationsModal';
import { useWasmSolver } from '../lib/useWasmSolver';
import { FolderOpen } from 'lucide-react';

const defaultAdvancedRules: AdvancedRelationRule[] = [
  {
    id: 'R_DISTRIB',
    name: 'Uniform Subject Distribution',
    nameAr: 'توزيع متجانس للمواد خلال الأسبوع',
    type: 'DISTRIBUTION_ACROSS_DAYS',
    enabled: true,
    parameterValue: 1,
    description: 'Evenly distribute subject lessons across cycle days',
    descriptionAr: 'توزيع الحصص بانتظام لتجنب التكدس في يوم واحد',
  },
  {
    id: 'R_CONSEC',
    name: 'Max 2 Consecutive Periods',
    nameAr: 'حد أقصى حصتين متتاليتين للمعلمين',
    type: 'MAX_CONSECUTIVE_PERIODS',
    enabled: true,
    parameterValue: 2,
    description: 'Avoid assigning more than 2 consecutive periods without break',
    descriptionAr: 'منع إسناد أكثر من حصتين متتاليتين دون فترة راحة',
  },
  {
    id: 'R_DAILY',
    name: 'Max 5 Daily Hours',
    nameAr: 'الحد الأقصى 5 حصص يومياً للفصول',
    type: 'MAX_DAILY_HOURS',
    enabled: true,
    parameterValue: 5,
    description: 'Ensure balanced daily study hours per student class',
    descriptionAr: 'ضمان توازن الحصص الدراسية اليومية لكل شعبة',
  },
  {
    id: 'R_GAPS',
    name: 'Limit Teacher Gap Windows',
    nameAr: 'الحد من أوقات الفراغ للمعلمين',
    type: 'TEACHER_GAP_LIMITS',
    enabled: true,
    parameterValue: 1,
    description: 'Minimize unproductive teacher window gaps between classes',
    descriptionAr: 'تقليص فترات الانتظار والفراغات بين الحصص للمعلمين',
  },
  {
    id: 'R_LUNCH',
    name: 'Lunch Break Enforced',
    nameAr: 'تثبيت استراحة الصلاة والغداء',
    type: 'LUNCH_BREAK_PLACEMENT',
    enabled: true,
    parameterValue: 4,
    description: 'Enforce school midday pause after Period 4',
    descriptionAr: 'تثبيت الاستراحة المدرسية الرسمية بعد الحصة الرابعة',
  },
];

export default function TimetableStudioPage() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('main');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('C1');
  const [placements, setPlacements] = useState<Placement[]>(initialPlacements);
  const [history, setHistory] = useState<Placement[][]>([]);
  const [redoStack, setRedoStack] = useState<Placement[][]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Dynamic entities state initialized with sample data
  const [teachers, setTeachers] = useState<Teacher[]>(sampleTeachers);
  const [classes, setClasses] = useState<ClassGroup[]>(sampleClasses);
  const [rooms, setRooms] = useState<Room[]>(sampleRooms);
  const [subjects, setSubjects] = useState<Subject[]>(sampleSubjects);
  const [lessons, setLessons] = useState<Lesson[]>(sampleLessons);
  const [schoolName, setSchoolName] = useState<string>('Saudi Arabia 1');
  const [currentFileName, setCurrentFileName] = useState<string>('Saudi Arabia 1.roz');
  const [schemaVersion, setSchemaVersion] = useState<number>(314);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Time-Off Matrix state: `${entityId}-${dayIndex}-${periodIndex}` -> AvailabilityState (1=Avail, 0=Blocked, 2=Disfavored)
  const [timeOffMatrix, setTimeOffMatrix] = useState<Record<string, AvailabilityState>>({
    'T2-0-0': 0, // Prof. Layla unavailable Monday period 1
  });

  // Advanced Relations Constraints state
  const [advancedRules, setAdvancedRules] = useState<AdvancedRelationRule[]>(defaultAdvancedRules);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Background WASM Solver Hook
  const {
    isReady: isWasmReady,
    isSolving,
    progress: solverProgress,
    solveStats,
    solve: runWasmSolve,
    cancel: cancelWasmSolve,
  } = useWasmSolver();

  // Dialog states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isBasicDataModalOpen, setIsBasicDataModalOpen] = useState(false);
  const [basicDataInitialTab, setBasicDataInitialTab] = useState<BasicDataTab>('school');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isAdvancedRelationsModalOpen, setIsAdvancedRelationsModalOpen] = useState(false);

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Desktop timetable authoring mode (always full scheduling capability)
  const isReadOnly = false;
  const canRunSolver = true;

  // Load .roz file buffer and populate dynamic state
  const loadRozBuffer = useCallback(
    (buffer: ArrayBuffer | Uint8Array, fileName: string) => {
      try {
        const parsed = parseRozBinary(buffer, fileName);
        setTeachers(parsed.mapped.teachers);
        setClasses(parsed.mapped.classes);
        setRooms(parsed.mapped.rooms);
        setSubjects(parsed.mapped.subjects);
        setLessons(parsed.mapped.lessons);
        setPlacements(parsed.mapped.placements);
        setHistory([]);
        setRedoStack([]);
        setSchoolName(parsed.school_name);
        setCurrentFileName(fileName);
        setSchemaVersion(parsed.schema_version);

        // Sync parsed teacher unavailable slots into TimeOffMatrix
        const newTimeOffMatrix: Record<string, AvailabilityState> = {};
        for (const tc of parsed.mapped.teachers) {
          if (tc.unavailableSlots) {
            for (const slot of tc.unavailableSlots) {
              const d = Math.floor(slot / 7);
              const p = slot % 7;
              newTimeOffMatrix[`${tc.id}-${d}-${p}`] = 0;
            }
          }
        }
        setTimeOffMatrix(newTimeOffMatrix);

        if (parsed.mapped.classes.length > 0) {
          setSelectedEntityId(parsed.mapped.classes[0].id);
          setViewMode('class');
        } else if (parsed.mapped.teachers.length > 0) {
          setSelectedEntityId(parsed.mapped.teachers[0].id);
          setViewMode('teacher');
        }
      } catch (err) {
        console.error('Failed to parse .roz file:', err);
        alert(isRtl ? `فشل في قراءة ملف .roz: ${err}` : `Failed to parse .roz file: ${err}`);
      }
    },
    [isRtl]
  );

  const loadRozFile = useCallback(
    async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        loadRozBuffer(arrayBuffer, file.name);
      } catch (err) {
        console.error('Failed reading file:', err);
        alert(isRtl ? `خطأ أثناء قراءة الملف: ${err}` : `Error reading file: ${err}`);
      }
    },
    [loadRozBuffer, isRtl]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadRozFile(file);
    }
    e.target.value = '';
  };

  // Window Drag & Drop ingestion handlers
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDragOver(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setIsDragOver(false);
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.roz')) {
          await loadRozFile(file);
        }
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [loadRozFile]);

  // Fast dynamic entity lookup maps
  const teacherMap = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const roomMap = useMemo(() => new Map(rooms.map((item) => [item.id, item])), [rooms]);
  const subjectMap = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects]);
  const lessonMap = useMemo(() => new Map(lessons.map((item) => [item.id, item])), [lessons]);

  // Compute live conflicts (Teacher clashes, Room clashes, Class clashes, and Time-Off Unavailable Slots)
  const conflicts = useMemo(() => {
    const list: Conflict[] = [];

    // 1. Direct pairwise clashes: Teacher, Room, Class
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (p1.dayIndex === p2.dayIndex && p1.periodIndex === p2.periodIndex) {
          const l1 = lessonMap.get(p1.lessonId);
          const l2 = lessonMap.get(p2.lessonId);
          if (!l1 || !l2) continue;

          if (l1.teacherId === l2.teacherId) {
            list.push({
              type: 'TEACHER_CLASH',
              lessonId: l1.id,
              message: `Teacher conflict: ${teacherMap.get(l1.teacherId)?.name || l1.teacherId} assigned twice at Day ${p1.dayIndex + 1}, Period ${p1.periodIndex + 1}`,
              messageAr: `تعارض معلم: ${teacherMap.get(l1.teacherId)?.nameAr || l1.teacherId} مسند لحصتين في نفس الوقت`,
            });
          }
          if (p1.roomId === p2.roomId) {
            list.push({
              type: 'ROOM_CLASH',
              lessonId: l1.id,
              message: `Room clash: ${roomMap.get(p1.roomId)?.name || p1.roomId} occupied by two classes`,
              messageAr: `تعارض قاعة: ${roomMap.get(p1.roomId)?.nameAr || p1.roomId} محجوزة لفصلين معاً`,
            });
          }
          if (l1.classId === l2.classId) {
            list.push({
              type: 'CLASS_CLASH',
              lessonId: l1.id,
              message: `Class conflict: ${classMap.get(l1.classId)?.name || l1.classId} has two simultaneous lessons`,
              messageAr: `تعارض فصل: ${classMap.get(l1.classId)?.nameAr || l1.classId} لديه مادتان في نفس الحصة`,
            });
          }
        }
      }
    }

    // 2. Time-Off availability constraints (UNAVAILABLE_SLOT)
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      // Check Teacher Time-Off
      const teacherKey = `${lesson.teacherId}-${p.dayIndex}-${p.periodIndex}`;
      const teacher = teacherMap.get(lesson.teacherId);
      const isTeacherBlockedInMatrix = timeOffMatrix[teacherKey] === 0;
      const isTeacherUnavailableInTeacherModel = teacher?.unavailableSlots?.includes(
        p.dayIndex * 7 + p.periodIndex
      );

      if (isTeacherBlockedInMatrix || isTeacherUnavailableInTeacherModel) {
        list.push({
          type: 'UNAVAILABLE_SLOT',
          lessonId: lesson.id,
          message: `Time-Off conflict: Teacher ${teacher?.name || lesson.teacherId} is blocked at Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
          messageAr: `تعارض وقت تفرغ: المعلم ${teacher?.nameAr || teacher?.name || lesson.teacherId} غير متاح في اليوم ${p.dayIndex + 1}، الحصة ${p.periodIndex + 1}`,
        });
      }

      // Check Class Time-Off
      const classKey = `${lesson.classId}-${p.dayIndex}-${p.periodIndex}`;
      if (timeOffMatrix[classKey] === 0) {
        const cls = classMap.get(lesson.classId);
        list.push({
          type: 'UNAVAILABLE_SLOT',
          lessonId: lesson.id,
          message: `Time-Off conflict: Class ${cls?.name || lesson.classId} is blocked at Day ${p.dayIndex + 1}, Period ${p.periodIndex + 1}`,
          messageAr: `تعارض وقت تفرغ: الفصل ${cls?.nameAr || cls?.name || lesson.classId} مغلق في اليوم ${p.dayIndex + 1}، الحصة ${p.periodIndex + 1}`,
        });
      }
    }

    return list;
  }, [placements, lessonMap, teacherMap, roomMap, classMap, timeOffMatrix]);

  // Undo / Redo operations
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isReadOnly) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, placements]);
    setPlacements(prev);
    setHistory((h) => h.slice(0, -1));
  }, [history, placements, isReadOnly]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isReadOnly) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, placements]);
    setPlacements(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack, placements, isReadOnly]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+G, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (canRunSolver && !isReadOnly) setIsGenerateModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, canRunSolver, isReadOnly]);

  // Record history helper
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev, placements]);
    setRedoStack([]);
  }, [placements]);

  // Place a lesson (from deck into specific or first free slot)
  const handlePlaceLesson = (
    lessonId: string,
    dayIndex?: number,
    periodIndex?: number,
    roomId?: string
  ) => {
    if (isReadOnly) return;
    recordHistory();

    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;

    const assignedRoom = roomId || lesson.roomId || rooms[0]?.id || 'R1';

    if (dayIndex !== undefined && periodIndex !== undefined) {
      // Place directly in target slot (removing existing placement for this lesson if present)
      const filtered = placements.filter((p) => p.lessonId !== lessonId);
      setPlacements([
        ...filtered,
        {
          lessonId,
          dayIndex,
          periodIndex,
          roomId: assignedRoom,
        },
      ]);
    } else {
      // Find first available conflict-free slot for this class/teacher
      let placed = false;
      for (let d = 0; d < 5 && !placed; d++) {
        for (let p = 0; p < 7 && !placed; p++) {
          const occupied = placements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId ||
              plc.roomId === assignedRoom
            );
          });

          if (!occupied) {
            setPlacements((prev) => [
              ...prev.filter((item) => item.lessonId !== lessonId),
              {
                lessonId,
                dayIndex: d,
                periodIndex: p,
                roomId: assignedRoom,
              },
            ]);
            placed = true;
          }
        }
      }

      // If no conflict-free slot found, place in first empty period for this class
      if (!placed) {
        for (let d = 0; d < 5 && !placed; d++) {
          for (let p = 0; p < 7 && !placed; p++) {
            const classOccupied = placements.some((plc) => {
              if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
              const existingLesson = lessonMap.get(plc.lessonId);
              return existingLesson?.classId === lesson.classId;
            });
            if (!classOccupied) {
              setPlacements((prev) => [
                ...prev.filter((item) => item.lessonId !== lessonId),
                {
                  lessonId,
                  dayIndex: d,
                  periodIndex: p,
                  roomId: assignedRoom,
                },
              ]);
              placed = true;
            }
          }
        }
      }
    }
  };

  // Remove a placement (unplaces card back to bottom deck)
  const handleRemovePlacement = (lessonId: string) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) => prev.filter((p) => p.lessonId !== lessonId));
  };

  // Move placed card to new slot
  const handleMovePlacement = (lessonId: string, targetDay: number, targetPeriod: number) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) =>
      prev.map((p) =>
        p.lessonId === lessonId
          ? { ...p, dayIndex: targetDay, periodIndex: targetPeriod }
          : p
      )
    );
  };

  // Auto-place all unplaced lessons
  const handleAutoPlaceAll = () => {
    if (isReadOnly) return;
    recordHistory();

    const currentPlacedIds = new Set(placements.map((p) => p.lessonId));
    const unplaced = lessons.filter((l) => !currentPlacedIds.has(l.id));
    const newPlacements = [...placements];

    for (const lesson of unplaced) {
      let placed = false;
      for (let d = 0; d < 5 && !placed; d++) {
        for (let p = 0; p < 7 && !placed; p++) {
          const slotTaken = newPlacements.some((plc) => {
            if (plc.dayIndex !== d || plc.periodIndex !== p) return false;
            const existingLesson = lessonMap.get(plc.lessonId);
            return (
              existingLesson?.classId === lesson.classId ||
              existingLesson?.teacherId === lesson.teacherId
            );
          });

          if (!slotTaken) {
            newPlacements.push({
              lessonId: lesson.id,
              dayIndex: d,
              periodIndex: p,
              roomId: lesson.roomId || rooms[0]?.id || 'R1',
            });
            placed = true;
          }
        }
      }
    }

    setPlacements(newPlacements);
  };

  // Clear all placements (returns all cards to bottom deck)
  const handleClearPlacements = () => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements([]);
  };

  // Clear placements for a single row entity
  const handleClearEntityPlacements = (entityId: string) => {
    if (isReadOnly) return;
    recordHistory();
    setPlacements((prev) =>
      prev.filter((p) => {
        const lesson = lessonMap.get(p.lessonId);
        return (
          lesson?.classId !== entityId &&
          lesson?.teacherId !== entityId &&
          p.roomId !== entityId
        );
      })
    );
  };

  // Run Background Web Worker WASM Solver
  const handleRunGenerate = async (
    complexity: GenerationComplexity,
    options: { minimizeGaps: boolean; strictRooms: boolean; distributeSubjects: boolean }
  ) => {
    if (isReadOnly) return;
    recordHistory();

    try {
      const solvedPlacements = await runWasmSolve({
        lessons: lessons,
        teachers: teachers,
        classes: classes,
        rooms: rooms,
        subjects: subjects,
        complexity,
        options,
      });

      setPlacements(solvedPlacements);
      setIsGenerateModalOpen(false);
    } catch (err) {
      console.error('WASM Solver execution encountered error:', err);
    }
  };

  // ==========================================
  // Dynamic CRUD State Updater Handlers
  // ==========================================

  // Subjects CRUD
  const handleAddSubject = (subject: Subject) => {
    setSubjects((prev) => [...prev, subject]);
  };
  const handleEditSubject = (subject: Subject) => {
    setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
  };
  const handleDeleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    const toDelete = new Set(lessons.filter((l) => l.subjectId === id).map((l) => l.id));
    setLessons((prev) => prev.filter((l) => l.subjectId !== id));
    setPlacements((prev) => prev.filter((p) => !toDelete.has(p.lessonId)));
  };

  // Classes CRUD
  const handleAddClass = (classGroup: ClassGroup) => {
    setClasses((prev) => [...prev, classGroup]);
  };
  const handleEditClass = (classGroup: ClassGroup) => {
    setClasses((prev) => prev.map((c) => (c.id === classGroup.id ? classGroup : c)));
  };
  const handleDeleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    const toDelete = new Set(lessons.filter((l) => l.classId === id).map((l) => l.id));
    setLessons((prev) => prev.filter((l) => l.classId !== id));
    setPlacements((prev) => prev.filter((p) => !toDelete.has(p.lessonId)));
    if (selectedEntityId === id) {
      const remaining = classes.filter((c) => c.id !== id);
      if (remaining.length > 0) setSelectedEntityId(remaining[0].id);
    }
  };

  // Rooms CRUD
  const handleAddRoom = (room: Room) => {
    setRooms((prev) => [...prev, room]);
  };
  const handleEditRoom = (room: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === room.id ? room : r)));
  };
  const handleDeleteRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setLessons((prev) => prev.map((l) => (l.roomId === id ? { ...l, roomId: undefined } : l)));
    setPlacements((prev) =>
      prev.map((p) => (p.roomId === id ? { ...p, roomId: rooms[0]?.id || '' } : p))
    );
  };

  // Teachers CRUD
  const handleAddTeacher = (teacher: Teacher) => {
    setTeachers((prev) => [...prev, teacher]);
  };
  const handleEditTeacher = (teacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
  };
  const handleDeleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    const toDelete = new Set(lessons.filter((l) => l.teacherId === id).map((l) => l.id));
    setLessons((prev) => prev.filter((l) => l.teacherId !== id));
    setPlacements((prev) => prev.filter((p) => !toDelete.has(p.lessonId)));
    if (selectedEntityId === id) {
      const remaining = teachers.filter((t) => t.id !== id);
      if (remaining.length > 0) setSelectedEntityId(remaining[0].id);
    }
  };

  // Lessons CRUD
  const handleAddLesson = (lesson: Lesson) => {
    setLessons((prev) => [...prev, lesson]);
  };
  const handleEditLesson = (lesson: Lesson) => {
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? lesson : l)));
  };
  const handleDeleteLesson = (id: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== id));
    setPlacements((prev) => prev.filter((p) => p.lessonId !== id));
  };

  // Time-Off Save Callback
  const handleSaveTimeOff = (entityId: string, updatedMatrix: Record<string, AvailabilityState>) => {
    setTimeOffMatrix(updatedMatrix);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = isRtl
      ? ['اليوم', 'الحصة', 'الفصل', 'الأستاذ', 'القاعة', 'المادة']
      : ['Day', 'Period', 'Class', 'Teacher', 'Room', 'Subject'];

    const rows = placements.map((p) => {
      const lesson = lessonMap.get(p.lessonId);
      const dayName = t.days[p.dayIndex] || `Day ${p.dayIndex + 1}`;
      const periodName = t.periods[p.periodIndex] || `Period ${p.periodIndex + 1}`;
      const className =
        (isRtl
          ? classMap.get(lesson?.classId || '')?.nameAr
          : classMap.get(lesson?.classId || '')?.name) || 'N/A';
      const teacherName =
        (isRtl
          ? teacherMap.get(lesson?.teacherId || '')?.nameAr
          : teacherMap.get(lesson?.teacherId || '')?.name) || 'N/A';
      const roomName =
        (isRtl ? roomMap.get(p.roomId)?.nameAr : roomMap.get(p.roomId)?.name) || p.roomId;
      const subName =
        (isRtl
          ? subjectMap.get(lesson?.subjectId || '')?.nameAr
          : subjectMap.get(lesson?.subjectId || '')?.name) || 'N/A';
      return `"${dayName}","${periodName}","${className}","${teacherName}","${roomName}","${subName}"`;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId}-${lang}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export iCal
  const handleExportIcal = () => {
    let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenTimetable//Enterprise//EN\r\n';
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      ical += `BEGIN:VEVENT\r\nUID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org\r\nSUMMARY:Lesson ${lesson?.subjectId || ''}\r\nLOCATION:${p.roomId}\r\nEND:VEVENT\r\n`;
    }
    ical += 'END:VCALENDAR\r\n';
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPreview = () => {
    window.print();
  };

  const handleOpenBasicData = (tab: BasicDataTab) => {
    setBasicDataInitialTab(tab);
    setIsBasicDataModalOpen(true);
  };

  const unplacedCount = lessons.length - placements.length;

  return (
    <div dir={t.dir} className="h-screen w-screen flex flex-col overflow-hidden bg-slate-200">
      {/* Hidden File Input for .roz Browsing */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".roz"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-sky-900/60 backdrop-blur-xs flex items-center justify-center p-6 select-none pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-dashed border-sky-500 flex flex-col items-center gap-3 text-center">
            <FolderOpen className="w-16 h-16 text-sky-600 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800">
              {isRtl ? 'أفلت ملف .roz هنا للتحميل المباشر' : 'Drop .roz file here to load timetable'}
            </h2>
          </div>
        </div>
      )}

      {/* 1. Desktop Ribbon Toolbar */}
      <RibbonToolbar
        lang={lang}
        setLang={setLang}
        activeTab={activeRibbonTab}
        setActiveTab={setActiveRibbonTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        canRunSolver={canRunSolver}
        isReadOnly={isReadOnly}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenGenerate={() => setIsGenerateModalOpen(true)}
        onOpenTimeOff={() => setIsTimeOffModalOpen(true)}
        onOpenBasicData={handleOpenBasicData}
        onOpenTest={() => setIsTestModalOpen(true)}
        onOpenAdvancedRelations={() => setIsAdvancedRelationsModalOpen(true)}
        onAutoPlaceAll={handleAutoPlaceAll}
        onClearPlacements={handleClearPlacements}
        onExportCsv={handleExportCsv}
        onExportIcal={handleExportIcal}
        onExportPdf={handlePrintPreview}
        onImportRoz={() => fileInputRef.current?.click()}
        onPrintPreview={handlePrintPreview}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
      />

      {/* 2. Sub-Toolbar: View Navigator & Metrics Bar */}
      <ViewNavigator
        lang={lang}
        viewMode={viewMode}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        classes={classes}
        teachers={teachers}
        rooms={rooms}
        conflicts={conflicts}
        totalLessons={lessons.length}
        placedLessonsCount={placements.length}
        unplacedCount={unplacedCount}
        solveDurationMs={solveStats?.durationMs}
      />

      {/* 3. Main Workspace: Timetable Matrix Grid Canvas */}
      <TimetableGrid
        lang={lang}
        viewMode={viewMode}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        placements={placements}
        lessons={lessons}
        subjects={subjects}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        conflicts={conflicts}
        onPlaceLesson={handlePlaceLesson}
        onRemovePlacement={handleRemovePlacement}
        onMovePlacement={handleMovePlacement}
        zoomLevel={zoomLevel}
        isReadOnly={isReadOnly}
      />

      {/* 4. Signature Bottom Lesson Card Deck ("بنك البطاقات") */}
      <BottomCardDeck
        lang={lang}
        lessons={lessons}
        placements={placements}
        subjects={subjects}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        selectedEntityId={selectedEntityId}
        onPlaceLesson={handlePlaceLesson}
        onRemovePlacement={handleRemovePlacement}
        onAutoPlaceAll={handleAutoPlaceAll}
        onClearEntityPlacements={handleClearEntityPlacements}
        isReadOnly={isReadOnly}
      />

      {/* 5. Authentic Desktop Status Bar */}
      <div className="bg-slate-300 border-t border-slate-400/80 px-3 py-1 flex items-center justify-between text-[11px] text-slate-700 select-none shrink-0 font-sans">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
            <span>{isRtl ? 'جاهز' : 'Ready'}</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            {isRtl
              ? `المدرسة: ${schoolName} (${currentFileName})`
              : `School: ${schoolName} (${currentFileName})`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-600 hidden md:inline">
            {isRtl ? 'محرك التسكين: مدمج (Rust WASM)' : 'Engine: Client WASM'}
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-600 font-mono text-[10px]">
            {isRtl ? `الإصدار: v${schemaVersion}` : `Version: v${schemaVersion}`}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold text-slate-700">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Modals */}
      <GenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        lang={lang}
        isSolving={isSolving}
        progress={solverProgress}
        onRunGenerate={handleRunGenerate}
        solveDurationMs={solveStats?.durationMs}
        unplacedCount={unplacedCount}
        conflictsCount={conflicts.length}
      />

      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        lang={lang}
        teachers={teachers}
        classes={classes}
        initialMatrix={timeOffMatrix}
        onSaveTimeOff={handleSaveTimeOff}
      />

      <BasicDataModal
        isOpen={isBasicDataModalOpen}
        onClose={() => setIsBasicDataModalOpen(false)}
        lang={lang}
        initialTab={basicDataInitialTab}
        subjects={subjects}
        classes={classes}
        rooms={rooms}
        teachers={teachers}
        lessons={lessons}
        onAddSubject={handleAddSubject}
        onEditSubject={handleEditSubject}
        onDeleteSubject={handleDeleteSubject}
        onAddClass={handleAddClass}
        onEditClass={handleEditClass}
        onDeleteClass={handleDeleteClass}
        onAddRoom={handleAddRoom}
        onEditRoom={handleEditRoom}
        onDeleteRoom={handleDeleteRoom}
        onAddTeacher={handleAddTeacher}
        onEditTeacher={handleEditTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onAddLesson={handleAddLesson}
        onEditLesson={handleEditLesson}
        onDeleteLesson={handleDeleteLesson}
      />

      <TestTimetableModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        lang={lang}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        lessons={lessons}
        placements={placements}
        conflicts={conflicts}
      />

      <AdvancedRelationsModal
        isOpen={isAdvancedRelationsModalOpen}
        onClose={() => setIsAdvancedRelationsModalOpen(false)}
        lang={lang}
        rules={advancedRules}
        onSaveRules={(newRules) => setAdvancedRules(newRules)}
        subjects={subjects}
        teachers={teachers}
        classes={classes}
      />
    </div>
  );
}
