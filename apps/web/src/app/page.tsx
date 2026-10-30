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

type ScheduleCycleKind = 'saudi' | 'seven_day' | 'standard';

const MAX_HISTORY = 50;

export default function TimetableStudioPage() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('main');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [history, setHistory] = useState<Placement[][]>([]);
  const [redoStack, setRedoStack] = useState<Placement[][]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Dynamic entities state initialized with clean empty defaults (no 5-teacher mock data)
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [schoolName, setSchoolName] = useState<string>('Saudi Arabia 1');
  const [currentFileName, setCurrentFileName] = useState<string>('Saudi Arabia 1.roz');
  const [schemaVersion, setSchemaVersion] = useState<number>(115);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Dynamic cycle days & multi-period grid scaling state
  const [scheduleCycleKind, setScheduleCycleKind] = useState<ScheduleCycleKind>('saudi');
  const [cycleDays, setCycleDays] = useState<number>(5);
  const [periodsPerDay, setPeriodsPerDay] = useState<number>(12);
  const [currentSampleId, setCurrentSampleId] = useState<'saudi' | 'demo1' | 'blank'>('saudi');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState<boolean>(true);

  // Time-Off Matrix state: `${entityId}-${dayIndex}-${periodIndex}` -> AvailabilityState (1=Avail, 0=Blocked, 2=Disfavored)
  const [timeOffMatrix, setTimeOffMatrix] = useState<Record<string, AvailabilityState>>({});

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
  const isRtlRef = useRef(isRtl);
  isRtlRef.current = isRtl;

  // Memoize dynamic days, periods, and bellSchedule:
  // - Saudi Arabia 1: 5 days (Saturday–Wednesday) and 12 periods (1 to 12) with bells from 08:00 to 19:00.
  // - Demo1: 7 days (Monday–Sunday) and 7 periods.
  // - Blank/Standard: standard 5 days and 7 periods.
  // - Dynamically translate day names and period labels on lang change ('ar' vs 'en').
  const dynamicDays = useMemo(() => {
    if (scheduleCycleKind === 'saudi') {
      return isRtl
        ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']
        : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
    }
    if (scheduleCycleKind === 'seven_day' || cycleDays === 7) {
      return isRtl
        ? ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }
    if (cycleDays === 6) {
      return isRtl
        ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
        : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    }
    return isRtl
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [scheduleCycleKind, cycleDays, isRtl]);

  const dynamicPeriods = useMemo(() => {
    return Array.from({ length: periodsPerDay }, (_, i) =>
      isRtl ? `الحصة ${i + 1}` : `Period ${i + 1}`
    );
  }, [periodsPerDay, isRtl]);

  const dynamicBells = useMemo(() => {
    if (periodsPerDay === 12) {
      return [
        '08:00 - 08:45',
        '08:55 - 09:40',
        '09:50 - 10:35',
        '10:55 - 11:40',
        '11:50 - 12:35',
        '12:45 - 13:30',
        '13:40 - 14:25',
        '14:35 - 15:20',
        '15:30 - 16:15',
        '16:25 - 17:10',
        '17:20 - 18:05',
        '18:15 - 19:00',
      ];
    }
    if (periodsPerDay === 7) {
      return [
        '08:00 - 08:45',
        '08:55 - 09:40',
        '09:50 - 10:35',
        '10:55 - 11:40',
        '11:50 - 12:35',
        '12:45 - 13:30',
        '13:40 - 14:25',
      ];
    }
    return Array.from({ length: periodsPerDay }, (_, i) => {
      const startH = 8 + Math.floor((i * 55) / 60);
      const startM = (i * 55) % 60;
      const endH = 8 + Math.floor(((i * 55) + 45) / 60);
      const endM = ((i * 55) + 45) % 60;
      const s = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
      const e = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      return `${s} - ${e}`;
    });
  }, [periodsPerDay]);

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

        let kind: ScheduleCycleKind = 'standard';
        let detectedDays = parsed.cycle_days || 5;
        let detectedPeriods = parsed.periods_per_day || 7;

        if (
          fileName.toLowerCase().includes('saudi') ||
          fileName.toLowerCase().includes('arab') ||
          parsed.school_name.includes('2006/2007')
        ) {
          kind = 'saudi';
          detectedDays = 5;
          detectedPeriods = 12;
          setCurrentSampleId('saudi');
        } else if (
          fileName.toLowerCase().includes('demo1') ||
          parsed.cycle_days === 7
        ) {
          kind = 'seven_day';
          detectedDays = 7;
          detectedPeriods = 7;
          setCurrentSampleId('demo1');
        } else {
          kind = 'standard';
          detectedDays = parsed.cycle_days || 5;
          detectedPeriods = parsed.periods_per_day || 7;
        }

        setScheduleCycleKind(kind);
        setCycleDays(detectedDays);
        setPeriodsPerDay(detectedPeriods);

        // Sync parsed teacher unavailable slots into TimeOffMatrix using dynamic period count
        const newTimeOffMatrix: Record<string, AvailabilityState> = {};
        for (const tc of parsed.mapped.teachers) {
          if (tc.unavailableSlots) {
            for (const slot of tc.unavailableSlots) {
              const d = Math.floor(slot / detectedPeriods);
              const p = slot % detectedPeriods;
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
        } else {
          setSelectedEntityId('');
        }
      } catch (err) {
        console.error('Failed to parse .roz file:', err);
        alert(isRtlRef.current ? `فشل في قراءة ملف .roz: ${err}` : `Failed to parse .roz file: ${err}`);
      }
    },
    []
  );

  const loadRozFile = useCallback(
    async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        loadRozBuffer(arrayBuffer, file.name);
      } catch (err) {
        console.error('Failed reading file:', err);
        alert(isRtlRef.current ? `خطأ أثناء قراءة الملف: ${err}` : `Error reading file: ${err}`);
      }
    },
    [loadRozBuffer]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadRozFile(file);
    }
    e.target.value = '';
  };

  // One-Click Real-School Sample Switcher
  const loadNamedSample = useCallback(
    async (sample: 'saudi' | 'demo1' | 'blank') => {
      if (sample === 'saudi') {
        setCurrentSampleId('saudi');
        try {
          let res = await fetch('/demos/Saudi_Arabia_1.roz');
          let fname = 'Saudi Arabia 1.roz';
          if (!res.ok) {
            res = await fetch('/demos/Demo1.roz');
            fname = 'Demo1.roz';
          }
          if (res.ok) {
            const buf = await res.arrayBuffer();
            loadRozBuffer(buf, fname);
          }
        } catch (err) {
          console.error('Failed loading Saudi Arabia 1 sample:', err);
        }
      } else if (sample === 'demo1') {
        setCurrentSampleId('demo1');
        try {
          const res = await fetch('/demos/Demo1.roz');
          if (res.ok) {
            const buf = await res.arrayBuffer();
            loadRozBuffer(buf, 'Demo1.roz');
          }
        } catch (err) {
          console.error('Failed loading Demo1 sample:', err);
        }
      } else if (sample === 'blank') {
        setCurrentSampleId('blank');
        setTeachers([]);
        setClasses([]);
        setRooms([]);
        setSubjects([]);
        setLessons([]);
        setPlacements([]);
        setHistory([]);
        setRedoStack([]);
        setTimeOffMatrix({});
        setSchoolName(isRtlRef.current ? 'مدرسة جديدة' : 'New School');
        setCurrentFileName('untitled.roz');
        setSchemaVersion(314);
        setSelectedEntityId('');
        setScheduleCycleKind('standard');
        setCycleDays(5);
        setPeriodsPerDay(7);
      }
    },
    [loadRozBuffer]
  );

  // Pre-load Saudi Arabia 1 demo school on initial mount so npm run dev boots with full-scale school data
  useEffect(() => {
    let isMounted = true;
    const initBoot = async () => {
      try {
        let res = await fetch('/demos/Saudi_Arabia_1.roz');
        let fname = 'Saudi Arabia 1.roz';
        if (!res.ok) {
          res = await fetch('/demos/Demo1.roz');
          fname = 'Demo1.roz';
        }
        if (res.ok && isMounted) {
          const buf = await res.arrayBuffer();
          loadRozBuffer(buf, fname);
        }
      } catch (err) {
        console.warn('Initial demo pre-load error:', err);
      }
    };
    initBoot();
    return () => {
      isMounted = false;
    };
  }, [loadRozBuffer]);

  // Auto-save timetable state to localStorage on modifications
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lessons.length === 0 && teachers.length === 0) return;
    try {
      const stateToSave = {
        teachers,
        classes,
        rooms,
        subjects,
        lessons,
        placements,
        timeOffMatrix,
        schoolName,
        currentFileName,
        schemaVersion,
        scheduleCycleKind,
        cycleDays,
        periodsPerDay,
        timestamp: Date.now(),
      };
      localStorage.setItem('opentimetable_autosave_state', JSON.stringify(stateToSave));
    } catch {
      // Ignore quota errors silently
    }
  }, [
    teachers,
    classes,
    rooms,
    subjects,
    lessons,
    placements,
    timeOffMatrix,
    schoolName,
    currentFileName,
    schemaVersion,
    scheduleCycleKind,
    cycleDays,
    periodsPerDay,
  ]);

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

    // 1. Direct pairwise clashes using slot-indexed bucket map: Map<number, Placement[]>
    const slotBuckets = new Map<number, Placement[]>();
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const slotIndex = p.dayIndex * periodsPerDay + p.periodIndex;
      const bucket = slotBuckets.get(slotIndex);
      if (bucket) {
        bucket.push(p);
      } else {
        slotBuckets.set(slotIndex, [p]);
      }
    }

    for (const slotPlacements of slotBuckets.values()) {
      const bucketLen = slotPlacements.length;
      if (bucketLen <= 1) continue;

      for (let i = 0; i < bucketLen; i++) {
        for (let j = i + 1; j < bucketLen; j++) {
          const p1 = slotPlacements[i];
          const p2 = slotPlacements[j];
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
        p.dayIndex * periodsPerDay + p.periodIndex
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
  }, [placements, lessonMap, teacherMap, roomMap, classMap, timeOffMatrix, periodsPerDay]);

  // Undo / Redo operations (capped at MAX_HISTORY = 50 snapshots)
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isReadOnly) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => {
      const nextRedo = [...r, placements];
      return nextRedo.length > MAX_HISTORY
        ? nextRedo.slice(nextRedo.length - MAX_HISTORY)
        : nextRedo;
    });
    setPlacements(prev);
    setHistory((h) => h.slice(0, -1));
  }, [history, placements, isReadOnly]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isReadOnly) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => {
      const nextHistory = [...h, placements];
      return nextHistory.length > MAX_HISTORY
        ? nextHistory.slice(nextHistory.length - MAX_HISTORY)
        : nextHistory;
    });
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

  // Record history helper (capped at MAX_HISTORY = 50 snapshots)
  const recordHistory = useCallback(() => {
    setHistory((prev) => {
      const nextHistory = [...prev, placements];
      return nextHistory.length > MAX_HISTORY
        ? nextHistory.slice(nextHistory.length - MAX_HISTORY)
        : nextHistory;
    });
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
      for (let d = 0; d < cycleDays && !placed; d++) {
        for (let p = 0; p < periodsPerDay && !placed; p++) {
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
        for (let d = 0; d < cycleDays && !placed; d++) {
          for (let p = 0; p < periodsPerDay && !placed; p++) {
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
      for (let d = 0; d < cycleDays && !placed; d++) {
        for (let p = 0; p < periodsPerDay && !placed; p++) {
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

  // Clear all placements (returns all cards to bottom deck) with user confirmation
  const handleClearPlacements = () => {
    if (isReadOnly) return;
    if (
      placements.length > 0 &&
      typeof window !== 'undefined' &&
      !window.confirm(
        isRtl
          ? 'هل أنت متأكد من تفريغ كافة الحصص المسكنة في الجدول؟'
          : 'Are you sure you want to clear all placed lessons in the timetable?'
      )
    ) {
      return;
    }
    recordHistory();
    setPlacements([]);
  };

  // Create clean new timetable with confirmation if data exists
  const handleNewFile = () => {
    if (isReadOnly) return;
    if (
      (lessons.length > 0 || placements.length > 0) &&
      typeof window !== 'undefined' &&
      !window.confirm(
        isRtl
          ? 'هل أنت متأكد من إنشاء جدول جديد؟ سيتم مسح البيانات الحالية.'
          : 'Are you sure you want to create a new timetable? Current data will be cleared.'
      )
    ) {
      return;
    }
    loadNamedSample('blank');
  };

  // Manual save to localStorage with user feedback
  const handleSaveFile = () => {
    try {
      const stateToSave = {
        teachers,
        classes,
        rooms,
        subjects,
        lessons,
        placements,
        timeOffMatrix,
        schoolName,
        currentFileName,
        schemaVersion,
        scheduleCycleKind,
        cycleDays,
        periodsPerDay,
        timestamp: Date.now(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('opentimetable_saved_state', JSON.stringify(stateToSave));
      }
      alert(
        isRtl
          ? 'تم حفظ بيانات الجدول بنجاح في المتصفح محلياً (Local Storage)'
          : 'Timetable data successfully saved to local browser storage!'
      );
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
      alert(isRtl ? 'تعذر حفظ البيانات محلياً' : 'Failed to save timetable locally');
    }
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
    } catch (err: any) {
      console.error('WASM Solver execution encountered error:', err);
      alert(
        isRtl
          ? `حدث خطأ أثناء معالجة وتوليد الجدول: ${err?.message || err}`
          : `WASM Solver execution encountered error: ${err?.message || err}`
      );
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
    const remainingRooms = rooms.filter((r) => r.id !== id);
    const fallbackRoomId = remainingRooms[0]?.id || '';
    setRooms(remainingRooms);
    setLessons((prev) => prev.map((l) => (l.roomId === id ? { ...l, roomId: undefined } : l)));
    setPlacements((prev) =>
      prev.map((p) => (p.roomId === id ? { ...p, roomId: fallbackRoomId } : p))
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

  // Export iCal with full RFC 5545 compliance (DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION)
  const handleExportIcal = () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    // Reference base date (Monday of current week)
    const baseDate = new Date();
    const currentDay = baseDate.getDay();
    const diffToMonday = currentDay === 0 ? 1 : 1 - currentDay;
    baseDate.setDate(baseDate.getDate() + diffToMonday);

    let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenTimetable//Enterprise Studio//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      const sub = subjectMap.get(lesson.subjectId);
      const subName = (isRtl ? sub?.nameAr || sub?.name : sub?.name) || lesson.subjectId;
      const tc = teacherMap.get(lesson.teacherId);
      const tcName = (isRtl ? tc?.nameAr || tc?.name : tc?.name) || 'Faculty';
      const cls = classMap.get(lesson.classId);
      const clsName = (isRtl ? cls?.nameAr || cls?.name : cls?.name) || 'Class';
      const rm = roomMap.get(p.roomId);
      const rmName = (isRtl ? rm?.nameAr || rm?.name : rm?.name) || p.roomId;

      const eventDate = new Date(baseDate);
      eventDate.setDate(baseDate.getDate() + p.dayIndex);
      const yearStr = eventDate.getFullYear();
      const monthStr = pad(eventDate.getMonth() + 1);
      const dayStr = pad(eventDate.getDate());

      const bell = dynamicBells[p.periodIndex] || '';
      let startH = 8, startM = 0, endH = 8, endM = 45;
      if (bell.includes('-')) {
        const parts = bell.split('-');
        const sParts = parts[0].trim().split(':');
        const eParts = parts[1].trim().split(':');
        if (sParts.length === 2) {
          startH = parseInt(sParts[0], 10) || 8;
          startM = parseInt(sParts[1], 10) || 0;
        }
        if (eParts.length === 2) {
          endH = parseInt(eParts[0], 10) || 8;
          endM = parseInt(eParts[1], 10) || 45;
        }
      } else {
        startH = 8 + p.periodIndex;
        endH = 8 + p.periodIndex;
        endM = 45;
      }

      const dtstart = `${yearStr}${monthStr}${dayStr}T${pad(startH)}${pad(startM)}00`;
      const dtend = `${yearStr}${monthStr}${dayStr}T${pad(endH)}${pad(endM)}00`;

      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org\r\n`;
      ical += `DTSTAMP:${dtstamp}\r\n`;
      ical += `DTSTART:${dtstart}\r\n`;
      ical += `DTEND:${dtend}\r\n`;
      ical += `SUMMARY:${subName} (${clsName})\r\n`;
      ical += `DESCRIPTION:${isRtl ? 'المعلم' : 'Teacher'}: ${tcName}\\n${isRtl ? 'الشعبة' : 'Class'}: ${clsName}\r\n`;
      ical += `LOCATION:${rmName}\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'END:VEVENT\r\n';
    }

    ical += 'END:VCALENDAR\r\n';
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentimetable-${selectedEntityId || 'all'}.ics`;
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
        onLoadSample={loadNamedSample}
        currentSampleId={currentSampleId}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        schoolName={schoolName}
        currentFileName={currentFileName}
        onSaveFile={handleSaveFile}
        onNewFile={handleNewFile}
      />

      {/* Dismissible Bilingual Welcome & Sample Switcher Banner */}
      {showWelcomeBanner && (
        <div className="bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-900 text-white px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-700/50 shadow-xs text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-100">
                {isRtl
                  ? 'برنامج الجداول المدرسية OpenTimetable'
                  : 'OpenTimetable Studio'}
              </span>
              <span className="text-indigo-400">|</span>
              <span className="text-slate-300 text-[11px]">
                {isRtl
                  ? 'تم تحميل مدرسة نموذجية حقيقية (82 معلماً، 12 حصة من السبت للأربعاء)'
                  : 'Full real-school dataset active (82 teachers, 12 periods Saturday–Wednesday)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-indigo-200 font-semibold hidden md:inline">
              {isRtl ? 'تبديل النموذج:' : 'Sample:'}
            </span>
            <button
              onClick={() => loadNamedSample('saudi')}
              className={`px-2 py-0.5 rounded font-semibold text-[10px] transition border flex items-center gap-1 ${
                currentSampleId === 'saudi'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title={isRtl ? 'تحميل جدول السعودية 1' : 'Load Saudi Arabia 1'}
            >
              <span>🇸🇦</span>
              <span>{isRtl ? 'السعودية 1 (12 حصة)' : 'Saudi Arabia 1 (12p)'}</span>
            </button>
            <button
              onClick={() => loadNamedSample('demo1')}
              className={`px-2 py-0.5 rounded font-semibold text-[10px] transition border flex items-center gap-1 ${
                currentSampleId === 'demo1'
                  ? 'bg-sky-600 text-white border-sky-400 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title={isRtl ? 'تحميل جدول Demo 1' : 'Load Demo 1'}
            >
              <span>🌍</span>
              <span>{isRtl ? 'عرض 1 (7 أيام)' : 'Demo 1 (7d)'}</span>
            </button>
            <button
              onClick={() => loadNamedSample('blank')}
              className={`px-2 py-0.5 rounded font-semibold text-[10px] transition border flex items-center gap-1 ${
                currentSampleId === 'blank'
                  ? 'bg-slate-700 text-white border-slate-500 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
              }`}
              title={isRtl ? 'جدول جديد فارغ' : 'Empty New Timetable'}
            >
              <span>📄</span>
              <span>{isRtl ? 'فارغ' : 'Blank'}</span>
            </button>
            <button
              onClick={() => setShowWelcomeBanner(false)}
              className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white transition ml-1"
              title={isRtl ? 'إخفاء الإشعار' : 'Dismiss banner'}
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
        setViewMode={setViewMode}
        selectedEntityId={selectedEntityId}
        setSelectedEntityId={setSelectedEntityId}
        placements={placements}
        lessons={lessons}
        subjects={subjects}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        conflicts={conflicts}
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
        onPlaceLesson={handlePlaceLesson}
        onRemovePlacement={handleRemovePlacement}
        onMovePlacement={handleMovePlacement}
        zoomLevel={zoomLevel}
        isReadOnly={isReadOnly}
        customDays={dynamicDays}
        customPeriods={dynamicPeriods}
        bellSchedule={dynamicBells}
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
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
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
        solveStatus={solveStats?.status}
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
        customDays={dynamicDays}
        customPeriods={dynamicPeriods}
        bellSchedule={dynamicBells}
        daysCount={cycleDays}
        periodsCount={periodsPerDay}
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
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
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
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
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
