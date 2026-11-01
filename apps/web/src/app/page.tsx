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
  CardLayoutConfig,
  Student,
  CourseGroup,
  AdvisorDiagnostic,
} from '../lib/types';
import { parseRozBinary } from '../lib/roz-parser';
import { isSplitExempt, extractSlotsFromTimeOffMatrix } from '../lib/domain';
import { downloadAscttXml } from '../lib/export-xml';
import { RibbonToolbar } from '../components/RibbonToolbar';
import { ViewNavigator } from '../components/ViewNavigator';
import { TimetableGrid } from '../components/TimetableGrid';
import { BottomCardDeck } from '../components/BottomCardDeck';
import { GenerateModal } from '../components/GenerateModal';
import { TimeOffModal } from '../components/TimeOffModal';
import { BasicDataModal } from '../components/BasicDataModal';
import { TestTimetableModal } from '../components/TestTimetableModal';
import { AdvancedRelationsModal } from '../components/AdvancedRelationsModal';
import { StartupWelcomeModal } from '../components/StartupWelcomeModal';
import { RelatedTimetablesDrawer } from '../components/RelatedTimetablesDrawer';
import { VerificationModal } from '../components/VerificationModal';
import { AdvisorModal } from '../components/AdvisorModal';
import { StatisticsModal } from '../components/StatisticsModal';
import { SpreadsheetImportModal } from '../components/SpreadsheetImportModal';
import { CardLayoutModal } from '../components/CardLayoutModal';
import { CompareTimetablesModal } from '../components/CompareTimetablesModal';
import { ConstraintsLedgerModal } from '../components/ConstraintsLedgerModal';
import { SetupWizardModal } from '../components/SetupWizardModal';
import { HelpShortcutsModal } from '../components/HelpShortcutsModal';
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
  const [schoolName, setSchoolName] = useState<string>('My School');
  const [currentFileName, setCurrentFileName] = useState<string>('untitled.roz');
  const [schemaVersion, setSchemaVersion] = useState<number>(314);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Dynamic cycle days & multi-period grid scaling state
  const [scheduleCycleKind, setScheduleCycleKind] = useState<ScheduleCycleKind>('standard');
  const [cycleDays, setCycleDays] = useState<number>(5);
  const [periodsPerDay, setPeriodsPerDay] = useState<number>(7);
  const [currentSampleId, setCurrentSampleId] = useState<'saudi' | 'demo1' | 'blank'>('blank');
  const [isStartupModalOpen, setIsStartupModalOpen] = useState<boolean>(false);

  // Time-Off Matrix state: `${entityId}-${dayIndex}-${periodIndex}` -> AvailabilityState (1=Avail, 0=Blocked, 2=Disfavored)
  const [timeOffMatrix, setTimeOffMatrix] = useState<Record<string, AvailabilityState>>({});

  // Advanced Relations Constraints state
  const [advancedRules, setAdvancedRules] = useState<AdvancedRelationRule[]>(defaultAdvancedRules);
  const [academicYear, setAcademicYear] = useState<string>('2025 - 2026');
  const [customBellSchedule, setCustomBellSchedule] = useState<string[] | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isHydratedRef = useRef<boolean>(false);

  // Background WASM Solver Hook
  const {
    isReady: isWasmReady,
    isSolving,
    progress: solverProgress,
    solveStats,
    solve: runWasmSolve,
    allocateRooms: runWasmAllocateRooms,
    cancel: cancelWasmSolve,
  } = useWasmSolver();

  // Dialog & Tool states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isBasicDataModalOpen, setIsBasicDataModalOpen] = useState(false);
  const [basicDataInitialTab, setBasicDataInitialTab] = useState<BasicDataTab>('school');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isAdvancedRelationsModalOpen, setIsAdvancedRelationsModalOpen] = useState(false);

  // New High-Value Features Modal States
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isRelatedDrawerOpen, setIsRelatedDrawerOpen] = useState(false);
  const [isCardLayoutOpen, setIsCardLayoutOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConstraintsLedgerOpen, setIsConstraintsLedgerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Selected placement for synchronized inspection and lock controls
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);

  // Baseline placements for Revision Comparison
  const [baselinePlacements, setBaselinePlacements] = useState<Placement[]>([]);

  // Students & Seminars Academic Tracks State
  const [students, setStudents] = useState<Student[]>([]);
  const [seminars, setSeminars] = useState<CourseGroup[]>([]);

  // Card Layout Configuration
  const [cardLayout, setCardLayout] = useState<CardLayoutConfig>({
    line1: 'subject_name',
    line2: 'teacher_name',
    line3: 'room_name',
    colorBy: 'subject',
    fontFamily: 'Tajawal',
    density: 'normal',
    showLockBadge: true,
  });

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
    if (customBellSchedule && customBellSchedule.length === periodsPerDay) {
      return customBellSchedule;
    }
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
  }, [periodsPerDay, customBellSchedule]);

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
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.json')) {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed && (Array.isArray(parsed.teachers) || Array.isArray(parsed.classes))) {
            setTeachers(parsed.teachers || []);
            setClasses(parsed.classes || []);
            setRooms(parsed.rooms || []);
            setSubjects(parsed.subjects || []);
            setLessons(parsed.lessons || []);
            setPlacements(parsed.placements || []);
            if (parsed.timeOffMatrix) setTimeOffMatrix(parsed.timeOffMatrix);
            if (parsed.schoolName) setSchoolName(parsed.schoolName);
            if (parsed.academicYear) setAcademicYear(parsed.academicYear);
            if (typeof parsed.cycleDays === 'number') setCycleDays(parsed.cycleDays);
            if (typeof parsed.periodsPerDay === 'number') setPeriodsPerDay(parsed.periodsPerDay);
            if (Array.isArray(parsed.bellSchedule)) setCustomBellSchedule(parsed.bellSchedule);
            setCurrentFileName(file.name);
            setHistory([]);
            setRedoStack([]);

            if (parsed.classes && parsed.classes.length > 0) {
              setSelectedEntityId(parsed.classes[0].id);
              setViewMode('class');
            } else if (parsed.teachers && parsed.teachers.length > 0) {
              setSelectedEntityId(parsed.teachers[0].id);
              setViewMode('teacher');
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('opentimetable_saved_state', JSON.stringify(parsed));
              localStorage.setItem('opentimetable_autosave_state', JSON.stringify(parsed));
            }
            return;
          }
          throw new Error('File does not match OpenTimetable project schema');
        } catch (jsonErr) {
          console.error('Failed to parse project JSON:', jsonErr);
          alert(isRtlRef.current ? `فشل في قراءة ملف المشروع JSON: ${jsonErr}` : `Failed to parse project JSON: ${jsonErr}`);
          return;
        }
      }

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

  // Pre-load saved timetable or fallback to Saudi Arabia 1 demo school on initial mount
  useEffect(() => {
    let isMounted = true;
    const initBoot = async () => {
      // 1. Check saved state and autosave state in localStorage
      if (typeof window !== 'undefined') {
        try {
          const rawSaved = localStorage.getItem('opentimetable_saved_state');
          const rawAutosave = localStorage.getItem('opentimetable_autosave_state');

          let savedState: any = null;
          let autosaveState: any = null;

          if (rawSaved) {
            try {
              savedState = JSON.parse(rawSaved);
            } catch {}
          }
          if (rawAutosave) {
            try {
              autosaveState = JSON.parse(rawAutosave);
            } catch {}
          }

          let targetState: any = null;
          if (savedState && autosaveState) {
            targetState =
              (autosaveState.timestamp || 0) >= (savedState.timestamp || 0)
                ? autosaveState
                : savedState;
          } else {
            targetState = savedState || autosaveState;
          }

          if (
            targetState &&
            ((Array.isArray(targetState.teachers) && targetState.teachers.length > 0) ||
              (Array.isArray(targetState.lessons) && targetState.lessons.length > 0) ||
              (Array.isArray(targetState.classes) && targetState.classes.length > 0) ||
              (targetState.schoolName && targetState.schoolName !== 'Saudi Arabia 1'))
          ) {
            if (isMounted) {
              if (Array.isArray(targetState.teachers)) setTeachers(targetState.teachers);
              if (Array.isArray(targetState.classes)) setClasses(targetState.classes);
              if (Array.isArray(targetState.rooms)) setRooms(targetState.rooms);
              if (Array.isArray(targetState.subjects)) setSubjects(targetState.subjects);
              if (Array.isArray(targetState.lessons)) setLessons(targetState.lessons);
              if (Array.isArray(targetState.placements)) setPlacements(targetState.placements);
              if (targetState.timeOffMatrix) setTimeOffMatrix(targetState.timeOffMatrix);
              if (targetState.schoolName) setSchoolName(targetState.schoolName);
              if (targetState.academicYear) setAcademicYear(targetState.academicYear);
              if (Array.isArray(targetState.bellSchedule)) setCustomBellSchedule(targetState.bellSchedule);
              if (targetState.currentFileName) setCurrentFileName(targetState.currentFileName);
              if (targetState.schemaVersion) setSchemaVersion(targetState.schemaVersion);
              if (targetState.scheduleCycleKind) setScheduleCycleKind(targetState.scheduleCycleKind);
              if (typeof targetState.cycleDays === 'number') setCycleDays(targetState.cycleDays);
              if (typeof targetState.periodsPerDay === 'number') setPeriodsPerDay(targetState.periodsPerDay);
              if (targetState.currentSampleId) setCurrentSampleId(targetState.currentSampleId);
              if (targetState.selectedEntityId) setSelectedEntityId(targetState.selectedEntityId);
              if (targetState.viewMode) setViewMode(targetState.viewMode);

              isHydratedRef.current = true;
              return;
            }
          }
        } catch (err) {
          console.warn('Error restoring state from localStorage:', err);
        }
      }

      if (isMounted) {
        isHydratedRef.current = true;
        const skipStartup =
          typeof window !== 'undefined' &&
          localStorage.getItem('opentimetable_skip_startup_dialog') === 'true';
        if (!skipStartup) {
          setIsStartupModalOpen(true);
        }
      }
    };
    initBoot();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-save timetable state to localStorage on modifications
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isHydratedRef.current) return;
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
        academicYear,
        currentFileName,
        schemaVersion,
        scheduleCycleKind,
        cycleDays,
        periodsPerDay,
        bellSchedule: dynamicBells,
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
    academicYear,
    currentFileName,
    schemaVersion,
    scheduleCycleKind,
    cycleDays,
    periodsPerDay,
    dynamicBells,
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
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.roz') || lowerName.endsWith('.json')) {
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

          // 1. Teacher Clash (check all assigned teachers including co-teachers)
          const t1Ids = [l1.teacherId, ...(l1.teacherIds || []), ...(l1.coTeacherIds || [])].filter(Boolean);
          const t2Ids = [l2.teacherId, ...(l2.teacherIds || []), ...(l2.coTeacherIds || [])].filter(Boolean);
          const commonTeacherId = t1Ids.find((id) => t2Ids.includes(id));

          if (commonTeacherId) {
            const tObj = teacherMap.get(commonTeacherId);
            const teacherName = tObj?.name || commonTeacherId;
            const teacherNameAr = tObj?.nameAr || teacherName;
            list.push({
              type: 'TEACHER_CLASH',
              lessonId: l1.id,
              message: `Teacher conflict: ${teacherName} assigned twice at Day ${p1.dayIndex + 1}, Period ${p1.periodIndex + 1}`,
              messageAr: `تعارض معلم: ${teacherNameAr} مسند لحصتين في نفس الوقت`,
            });
            list.push({
              type: 'TEACHER_CLASH',
              lessonId: l2.id,
              message: `Teacher conflict: ${teacherName} assigned twice at Day ${p2.dayIndex + 1}, Period ${p2.periodIndex + 1}`,
              messageAr: `تعارض معلم: ${teacherNameAr} مسند لحصتين في نفس الوقت`,
            });
          }

          // 2. Room Clash (only when both placements have a valid non-empty room assigned)
          const r1 = p1.roomId?.trim();
          const r2 = p2.roomId?.trim();
          if (r1 && r2 && r1 === r2) {
            const rObj = roomMap.get(r1);
            const roomName = rObj?.name || r1;
            const roomNameAr = rObj?.nameAr || roomName;
            list.push({
              type: 'ROOM_CLASH',
              lessonId: l1.id,
              message: `Room clash: ${roomName} occupied by two classes`,
              messageAr: `تعارض قاعة: ${roomNameAr} محجوزة لفصلين معاً`,
            });
            list.push({
              type: 'ROOM_CLASH',
              lessonId: l2.id,
              message: `Room clash: ${roomName} occupied by two classes`,
              messageAr: `تعارض قاعة: ${roomNameAr} محجوزة لفصلين معاً`,
            });
          }

          // 3. Class Clash (check all assigned classes including joint classes, exempting split groups)
          const c1Ids = [l1.classId, ...(l1.classIds || []), ...(l1.jointClassIds || [])].filter(Boolean);
          const c2Ids = [l2.classId, ...(l2.classIds || []), ...(l2.jointClassIds || [])].filter(Boolean);
          const commonClassId = c1Ids.find((id) => c2Ids.includes(id));

          if (commonClassId && !isSplitExempt(l1, l2)) {
            const cObj = classMap.get(commonClassId);
            const className = cObj?.name || commonClassId;
            const classNameAr = cObj?.nameAr || className;
            list.push({
              type: 'CLASS_CLASH',
              lessonId: l1.id,
              message: `Class conflict: ${className} has two simultaneous lessons`,
              messageAr: `تعارض فصل: ${classNameAr} لديه مادتان في نفس الحصة`,
            });
            list.push({
              type: 'CLASS_CLASH',
              lessonId: l2.id,
              message: `Class conflict: ${className} has two simultaneous lessons`,
              messageAr: `تعارض فصل: ${classNameAr} لديه مادتان في نفس الحصة`,
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

  // Startup Welcome Dialog Handlers
  const handleCreateNewFromStartup = () => {
    setIsStartupModalOpen(false);
    loadNamedSample('blank');
    setBasicDataInitialTab('school');
    setIsBasicDataModalOpen(true);
  };

  const handleOpenFileFromStartup = () => {
    setIsStartupModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleLoadSampleFromStartup = (sample: 'saudi' | 'demo1') => {
    setIsStartupModalOpen(false);
    loadNamedSample(sample);
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
        academicYear,
        currentFileName,
        schemaVersion,
        scheduleCycleKind,
        cycleDays,
        periodsPerDay,
        bellSchedule: dynamicBells,
        timestamp: Date.now(),
      };
      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(stateToSave);
        localStorage.setItem('opentimetable_saved_state', serialized);
        localStorage.setItem('opentimetable_autosave_state', serialized);
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

  // Save As: Persist to localStorage and download formatted project JSON
  const handleSaveAs = () => {
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
        academicYear,
        currentFileName,
        schemaVersion,
        scheduleCycleKind,
        cycleDays,
        periodsPerDay,
        bellSchedule: dynamicBells,
        timestamp: Date.now(),
      };
      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(stateToSave, null, 2);
        localStorage.setItem('opentimetable_saved_state', JSON.stringify(stateToSave));
        localStorage.setItem('opentimetable_autosave_state', JSON.stringify(stateToSave));

        const blob = new Blob([serialized], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (schoolName || 'timetable').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
        a.href = url;
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to execute Save As:', err);
      alert(isRtl ? 'تعذر تصدير وحفظ ملف المشروع' : 'Failed to export project file');
    }
  };

  // Export aSc Timetables 2012 XML Format
  const handleExportXml = () => {
    try {
      downloadAscttXml({
        schoolName: schoolName || 'OpenTimetable School',
        academicYear: academicYear || '2025/2026',
        cycleDays,
        periodsPerDay,
        bellSchedule: dynamicBells,
        daysList: dynamicDays,
        teachers,
        classes,
        rooms,
        subjects,
        lessons,
        placements,
      });
    } catch (err) {
      console.error('Failed to export XML:', err);
      alert(isRtl ? 'تعذر تصدير ملف XML' : 'Failed to export XML file');
    }
  };

  // Handle School tab configuration updates from BasicDataModal
  const handleUpdateSchool = (data: {
    schoolName: string;
    academicYear: string;
    cycleDays: number;
    periodsPerDay: number;
    bellSchedule?: string[];
  }) => {
    recordHistory();
    if (data.schoolName) setSchoolName(data.schoolName);
    if (data.academicYear) setAcademicYear(data.academicYear);
    if (typeof data.cycleDays === 'number') setCycleDays(data.cycleDays);
    if (typeof data.periodsPerDay === 'number') setPeriodsPerDay(data.periodsPerDay);
    if (data.bellSchedule) setCustomBellSchedule(data.bellSchedule);
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
      // Extract teacher & class timeOff constraints using extractSlotsFromTimeOffMatrix
      const enrichedTeachers = teachers.map((tc) => {
        const slots = extractSlotsFromTimeOffMatrix(
          tc.id,
          timeOffMatrix,
          periodsPerDay,
          tc.unavailableSlots
        );
        return {
          ...tc,
          unavailableSlots: slots.unavailableSlots,
          undesirableSlots: slots.undesirableSlots,
        };
      });

      const enrichedClasses = classes.map((c) => {
        const slots = extractSlotsFromTimeOffMatrix(
          c.id,
          timeOffMatrix,
          periodsPerDay,
          []
        );
        return {
          ...c,
          unavailableSlots: slots.unavailableSlots,
        };
      });

      // Map advancedRules into solver configuration weights and limits
      const maxConsecutiveRule = advancedRules.find(
        (r) => r.type === 'MAX_CONSECUTIVE_PERIODS' && r.enabled
      );
      const gapLimitsRule = advancedRules.find(
        (r) => r.type === 'TEACHER_GAP_LIMITS' && r.enabled
      );
      const distribRule = advancedRules.find(
        (r) => r.type === 'DISTRIBUTION_ACROSS_DAYS' && r.enabled
      );

      const solvedPlacements = await runWasmSolve({
        lessons: lessons,
        teachers: enrichedTeachers,
        classes: enrichedClasses,
        rooms: rooms,
        subjects: subjects,
        complexity,
        options,
        config: {
          days: cycleDays,
          periodsPerDay: periodsPerDay,
          maxConsecutivePeriods: maxConsecutiveRule?.parameterValue ?? 2,
          gapWeight: gapLimitsRule ? 30 : 10,
          distributionWeight: distribRule ? 25 : 10,
        },
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

  // ==========================================
  // Placement Pinning & Locking Handlers (R1)
  // ==========================================
  const handleToggleLockPlacement = useCallback((lessonId: string) => {
    setPlacements((prev) =>
      prev.map((p) =>
        p.lessonId === lessonId ? { ...p, isLocked: !p.isLocked } : p
      )
    );
  }, []);

  const handleLockAllPlacements = useCallback(() => {
    setPlacements((prev) => prev.map((p) => ({ ...p, isLocked: true })));
  }, []);

  const handleUnlockAllPlacements = useCallback(() => {
    setPlacements((prev) => prev.map((p) => ({ ...p, isLocked: false })));
  }, []);

  // ==========================================
  // Local Search Improvement Solve Mode (R1)
  // ==========================================
  const handleImproveTimetable = async () => {
    if (isReadOnly) return;
    recordHistory();

    try {
      const enrichedTeachers = teachers.map((tc) => {
        const slots = extractSlotsFromTimeOffMatrix(
          tc.id,
          timeOffMatrix,
          periodsPerDay,
          tc.unavailableSlots
        );
        return {
          ...tc,
          unavailableSlots: slots.unavailableSlots,
          undesirableSlots: slots.undesirableSlots,
        };
      });

      const enrichedClasses = classes.map((c) => {
        const slots = extractSlotsFromTimeOffMatrix(
          c.id,
          timeOffMatrix,
          periodsPerDay,
          []
        );
        return {
          ...c,
          unavailableSlots: slots.unavailableSlots,
        };
      });

      const maxConsecutiveRule = advancedRules.find(
        (r) => r.type === 'MAX_CONSECUTIVE_PERIODS' && r.enabled
      );
      const gapLimitsRule = advancedRules.find(
        (r) => r.type === 'TEACHER_GAP_LIMITS' && r.enabled
      );
      const distribRule = advancedRules.find(
        (r) => r.type === 'DISTRIBUTION_ACROSS_DAYS' && r.enabled
      );

      const solvedPlacements = await runWasmSolve({
        lessons,
        teachers: enrichedTeachers,
        classes: enrichedClasses,
        rooms,
        subjects,
        placements, // Pinned placements are preserved as immutable anchors
        complexity: 'normal',
        options: {
          minimizeGaps: true,
          strictRooms: false,
          distributeSubjects: true,
        },
        solveMode: 'IMPROVE',
        config: {
          days: cycleDays,
          periodsPerDay: periodsPerDay,
          maxConsecutivePeriods: maxConsecutiveRule?.parameterValue ?? 2,
          gapWeight: gapLimitsRule ? 30 : 10,
          distributionWeight: distribRule ? 25 : 10,
          solveMode: 'IMPROVE',
        },
      });

      setPlacements(solvedPlacements);
    } catch (err: any) {
      console.error('Improve solve failed:', err);
      alert(
        isRtl
          ? `تعذر تحسين الجدول: ${err?.message || err}`
          : `Failed to improve timetable: ${err?.message || err}`
      );
    }
  };

  // ==========================================
  // Automated Classroom Allocation (R1)
  // ==========================================
  const handleAssignClassrooms = async () => {
    if (isReadOnly || placements.length === 0) {
      alert(isRtl ? 'لا توجد حصص مسكنة لتوزيع القاعات عليها' : 'No placed lessons to assign classrooms for');
      return;
    }
    recordHistory();
    try {
      const allocated = await runWasmAllocateRooms({
        placements,
        lessons,
        rooms,
        classes,
        days: cycleDays,
        periodsPerDay,
      });
      setPlacements(allocated);
    } catch (err: any) {
      console.error('Classroom allocation failed:', err);
      alert(
        isRtl
          ? `تعذر توزيع القاعات: ${err?.message || err}`
          : `Classroom allocation failed: ${err?.message || err}`
      );
    }
  };

  // ==========================================
  // Advisor 1-Click Fix Handler (R2)
  // ==========================================
  const handleApplyAdvisorFix = (diagnostic: AdvisorDiagnostic) => {
    recordHistory();
    if (diagnostic.actionPayload) {
      const payload = diagnostic.actionPayload;
      if (payload.type === 'UNBLOCK_TIMEOFF' && payload.teacherId && payload.slots) {
        setTimeOffMatrix((prev) => {
          const next = { ...prev };
          for (const slot of payload.slots!) {
            const d = Math.floor(slot / periodsPerDay);
            const p = slot % periodsPerDay;
            delete next[`${payload.teacherId}-${d}-${p}`];
          }
          return next;
        });
      } else if (payload.type === 'FALLBACK_ROOM') {
        const newRoomId = `R_AUTO_${rooms.length + 1}`;
        const newRoom: Room = {
          id: newRoomId,
          name: isRtl ? `قاعة عامة ${rooms.length + 1}` : `General Room ${rooms.length + 1}`,
          nameAr: `قاعة عامة ${rooms.length + 1}`,
          capacity: 40,
          type: 'STANDARD',
        };
        setRooms((prev) => [...prev, newRoom]);
      }
    }
  };

  // ==========================================
  // Spreadsheet / Clipboard Importer Handlers (R4)
  // ==========================================
  const handleImportTeachers = (imported: Partial<Teacher>[]) => {
    recordHistory();
    const newTeachers: Teacher[] = imported.map((item, idx) => ({
      id: item.id || `T_IMP_${Date.now()}_${idx}`,
      name: item.name || `Teacher ${idx + 1}`,
      nameAr: item.nameAr || item.name || `معلم ${idx + 1}`,
      speciality: item.speciality || 'General',
      color: item.color || '#8b5cf6',
      unavailableSlots: item.unavailableSlots || [],
    }));
    setTeachers((prev) => [...prev, ...newTeachers]);
  };

  const handleImportClasses = (imported: Partial<ClassGroup>[]) => {
    recordHistory();
    const newClasses: ClassGroup[] = imported.map((item, idx) => ({
      id: item.id || `C_IMP_${Date.now()}_${idx}`,
      name: item.name || `Class ${idx + 1}`,
      nameAr: item.nameAr || item.name || `شعبة ${idx + 1}`,
      grade: item.grade || 1,
    }));
    setClasses((prev) => [...prev, ...newClasses]);
  };

  const handleImportRooms = (imported: Partial<Room>[]) => {
    recordHistory();
    const newRooms: Room[] = imported.map((item, idx) => ({
      id: item.id || `R_IMP_${Date.now()}_${idx}`,
      name: item.name || `Room ${idx + 1}`,
      nameAr: item.nameAr || item.name || `قاعة ${idx + 1}`,
      capacity: item.capacity || 35,
      type: (item as any).type || 'STANDARD',
    }));
    setRooms((prev) => [...prev, ...newRooms]);
  };

  const handleImportSubjects = (imported: Partial<Subject>[]) => {
    recordHistory();
    const newSubjects: Subject[] = imported.map((item, idx) => ({
      id: item.id || `S_IMP_${Date.now()}_${idx}`,
      name: item.name || `Subject ${idx + 1}`,
      nameAr: item.nameAr || item.name || `مادة ${idx + 1}`,
      code: item.code || (item.name ? item.name.slice(0, 4) : `S${idx + 1}`),
      color: item.color || '#10b981',
    }));
    setSubjects((prev) => [...prev, ...newSubjects]);
  };

  // ==========================================
  // Students & Seminars / Batch Operations Handlers (R4 & R5)
  // ==========================================
  const handleAddStudent = (student: Student) => {
    setStudents((prev) => [...prev, student]);
  };
  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };
  const handleAddSeminar = (seminar: CourseGroup) => {
    setSeminars((prev) => [...prev, seminar]);
  };
  const handleDeleteSeminar = (id: string) => {
    setSeminars((prev) => prev.filter((s) => s.id !== id));
  };
  const handleBatchUpdateTeachersMaxHours = (ids: string[], hours: number) => {
    setTeachers((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, maxHoursPerWeek: hours } : t))
    );
  };
  const handleBatchDeleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    setTeachers((prev) => prev.filter((t) => !idSet.has(t.id)));
  };

  // ==========================================
  // Step-by-Step Setup Wizard Completion Handler (R6)
  // ==========================================
  const handleSetupWizardComplete = (wizardData: {
    schoolName: string;
    academicYear: string;
    cycleDays: number;
    periodsPerDay: number;
    teachers: Teacher[];
    classes: ClassGroup[];
    rooms: Room[];
    subjects: Subject[];
    lessons: Lesson[];
  }) => {
    recordHistory();
    setSchoolName(wizardData.schoolName);
    setAcademicYear(wizardData.academicYear);
    setCycleDays(wizardData.cycleDays);
    setPeriodsPerDay(wizardData.periodsPerDay);
    setTeachers(wizardData.teachers);
    setClasses(wizardData.classes);
    setRooms(wizardData.rooms);
    setSubjects(wizardData.subjects);
    setLessons(wizardData.lessons);
    setPlacements([]);
    setBaselinePlacements([]);
    setSelectedPlacement(null);
    if (wizardData.classes.length > 0) {
      setSelectedEntityId(wizardData.classes[0].id);
      setViewMode('class');
    }
    setIsWizardOpen(false);
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
      {/* Hidden File Input for .roz and .json Browsing */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".roz,.json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-sky-900/60 backdrop-blur-xs flex items-center justify-center p-6 select-none pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-dashed border-sky-500 flex flex-col items-center gap-3 text-center">
            <FolderOpen className="w-16 h-16 text-sky-600 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-800">
              {isRtl ? 'أفلت ملف .roz أو .json هنا للتحميل المباشر' : 'Drop .roz or .json file here to load timetable'}
            </h2>
          </div>
        </div>
      )}

      {/* 1. Desktop Ribbon Toolbar */}
      <div className="print:hidden">
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
          onExportXml={handleExportXml}
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
          onSaveAs={handleSaveAs}
          onNewFile={handleNewFile}
          onOpenStartupModal={() => setIsStartupModalOpen(true)}
          onOpenVerification={() => setIsVerificationOpen(true)}
          onOpenAdvisor={() => setIsAdvisorOpen(true)}
          onOpenStatistics={() => setIsStatisticsOpen(true)}
          onOpenRelatedTimetables={() => setIsRelatedDrawerOpen((prev) => !prev)}
          isRelatedTimetablesOpen={isRelatedDrawerOpen}
          onOpenCardLayout={() => setIsCardLayoutOpen(true)}
          onOpenCompare={() => setIsCompareOpen(true)}
          onOpenSpreadsheetImport={() => setIsImportOpen(true)}
          onOpenConstraintsLedger={() => setIsConstraintsLedgerOpen(true)}
          onOpenSetupWizard={() => setIsWizardOpen(true)}
          onOpenHelpShortcuts={() => setIsShortcutsOpen(true)}
          onImproveTimetable={handleImproveTimetable}
          onAssignClassrooms={handleAssignClassrooms}
          onLockAllPlacements={handleLockAllPlacements}
          onUnlockAllPlacements={handleUnlockAllPlacements}
        />
      </div>

      {/* 2. Sub-Toolbar: View Navigator & Metrics Bar */}
      <div className="print:hidden">
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
      </div>

      {/* Dedicated Print Only Header */}
      <div className="hidden print:flex flex-col py-3 px-4 mb-2 bg-white border-b-2 border-slate-800 text-slate-900 select-text">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold">{schoolName || 'OpenTimetable School'}</h1>
            <p className="text-xs text-slate-600">{academicYear || '2025/2026'}</p>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">
              {viewMode === 'class' && (classMap.get(selectedEntityId)?.name || 'Class Schedule')}
              {viewMode === 'teacher' && (teacherMap.get(selectedEntityId)?.name || 'Teacher Schedule')}
              {viewMode === 'room' && (roomMap.get(selectedEntityId)?.name || 'Room Schedule')}
              {viewMode === 'wall' && (isRtl ? 'الجدول العام للمدرسة' : 'Master School Timetable')}
            </h2>
            <p className="text-xs text-slate-500">
              {isRtl ? 'جدول الحصص الأسبوعي' : 'Weekly Timetable'}
            </p>
          </div>
          <div className="text-end text-xs text-slate-500">
            <div>{new Date().toLocaleDateString()}</div>
            <div className="font-semibold text-slate-700">OpenTimetable Studio</div>
          </div>
        </div>
      </div>

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
        cardLayout={cardLayout}
        onToggleLockPlacement={handleToggleLockPlacement}
        selectedPlacement={selectedPlacement}
        onSelectPlacement={(p) => setSelectedPlacement(p)}
      />

      {/* 4. Signature Bottom Lesson Card Deck ("بنك البطاقات") */}
      <div className="print:hidden">
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
      </div>

      {/* 5. Authentic Desktop Status Bar */}
      <div className="print:hidden bg-slate-300 border-t border-slate-400/80 px-3 py-1 flex items-center justify-between text-[11px] text-slate-700 select-none shrink-0 font-sans">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
            <span>{isRtl ? 'جاهز' : 'Ready'}</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            {isRtl
              ? `المدرسة: ${schoolName || 'مشروع جديد'} (${currentFileName || 'غير محفوظ'})`
              : `School: ${schoolName || 'New Project'} (${currentFileName || 'Unsaved'})`}
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
        schoolName={schoolName}
        academicYear={academicYear}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        bellSchedule={dynamicBells}
        onUpdateSchool={handleUpdateSchool}
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
        students={students}
        seminars={seminars}
        onAddStudent={handleAddStudent}
        onDeleteStudent={handleDeleteStudent}
        onAddSeminar={handleAddSeminar}
        onDeleteSeminar={handleDeleteSeminar}
        onBatchUpdateTeachersMaxHours={handleBatchUpdateTeachersMaxHours}
        onBatchDeleteTeachers={handleBatchDeleteTeachers}
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
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
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

      {/* Startup Welcome & Project Creator Dialog */}
      <StartupWelcomeModal
        isOpen={isStartupModalOpen}
        onClose={() => setIsStartupModalOpen(false)}
        lang={lang}
        onCreateNew={handleCreateNewFromStartup}
        onOpenFile={handleOpenFileFromStartup}
        onLoadSample={handleLoadSampleFromStartup}
      />

      {/* Synchronized Related Timetables Multi-Pane Dock (R3) */}
      <RelatedTimetablesDrawer
        isOpen={isRelatedDrawerOpen}
        onClose={() => setIsRelatedDrawerOpen(false)}
        lang={lang}
        selectedPlacement={selectedPlacement}
        selectedLesson={selectedPlacement ? (lessonMap.get(selectedPlacement.lessonId) || null) : null}
        placements={placements}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        customDays={dynamicDays}
        customPeriods={dynamicPeriods}
        onSelectSlot={(dayIndex: number, periodIndex: number) => {
          // If clicked a slot in related timetable, highlight or inspect
        }}
      />

      {/* Comprehensive Constraint Verification Ledger (R2) */}
      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        lang={lang}
        placements={placements}
        lessons={lessons}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        timeOffMatrix={timeOffMatrix}
        advancedRules={advancedRules}
        onNavigateToCard={(lessonId: string) => {
          const target = placements.find((p) => p.lessonId === lessonId);
          if (target) {
            setSelectedPlacement(target);
            const lesson = lessonMap.get(lessonId);
            if (lesson && lesson.classId) {
              setSelectedEntityId(lesson.classId);
              setViewMode('class');
            }
          }
          setIsVerificationOpen(false);
        }}
      />

      {/* Diagnostic Constraint Advisor (R2) */}
      <AdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        lang={lang}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        lessons={lessons}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        timeOffMatrix={timeOffMatrix}
        onApplyFix={handleApplyAdvisorFix}
      />

      {/* Schedule Statistics & Teacher Equity Dashboard (R2) */}
      <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
        lang={lang}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        lessons={lessons}
        placements={placements}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
      />

      {/* Spreadsheet / Clipboard Data Importer (R4) */}
      <SpreadsheetImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        lang={lang}
        onImportTeachers={handleImportTeachers}
        onImportClasses={handleImportClasses}
        onImportRooms={handleImportRooms}
        onImportSubjects={handleImportSubjects}
      />

      {/* Card Layout & Typography Customization Designer (R3) */}
      <CardLayoutModal
        isOpen={isCardLayoutOpen}
        onClose={() => setIsCardLayoutOpen(false)}
        lang={lang}
        config={cardLayout}
        onSaveConfig={(newConfig) => setCardLayout(newConfig)}
      />

      {/* Revision Comparison Visual Diff Modal (R3) */}
      <CompareTimetablesModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        lang={lang}
        currentPlacements={placements}
        baselinePlacements={baselinePlacements.length > 0 ? baselinePlacements : placements}
        lessons={lessons}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        teacherMap={teacherMap}
        classMap={classMap}
        roomMap={roomMap}
        subjectMap={subjectMap}
        lessonMap={lessonMap}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
        customDays={dynamicDays}
        customPeriods={dynamicPeriods}
      />

      {/* Central Inputted Constraints Ledger (R4) */}
      <ConstraintsLedgerModal
        isOpen={isConstraintsLedgerOpen}
        onClose={() => setIsConstraintsLedgerOpen(false)}
        lang={lang}
        teachers={teachers}
        classes={classes}
        rooms={rooms}
        subjects={subjects}
        lessons={lessons}
        placements={placements}
        timeOffMatrix={timeOffMatrix}
        advancedRules={advancedRules}
        cycleDays={cycleDays}
        periodsPerDay={periodsPerDay}
      />

      {/* Step-by-Step Guided Setup Wizard (R6) */}
      <SetupWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        lang={lang}
        onComplete={handleSetupWizardComplete}
      />

      {/* Keyboard Shortcuts & Help Hub (R6) */}
      <HelpShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
      />
    </div>
  );
}
