// opentimetable/tests/helpers/print-export-engine.mjs
// Authoritative Reference Engine, Interface Contracts, and Verification Harness
// for OpenTimetable Print & Export Subsystem (R1, R2, R3, R4)

import fs from 'node:fs';
import path from 'node:path';

// ==============================================================================
// 1. PAPER SPECIFICATIONS & DIMENSIONS
// ==============================================================================

export const PAPER_DIMENSIONS = {
  A4: { widthMm: 210, heightMm: 297, widthPx: 794, heightPx: 1123 },      // at 96 DPI
  A3: { widthMm: 297, heightMm: 420, widthPx: 1123, heightPx: 1587 },     // at 96 DPI
  Letter: { widthMm: 215.9, heightMm: 279.4, widthPx: 816, heightPx: 1056 }, // 8.5 x 11 in
};

export const COLOR_THEMES = {
  color: {
    name: 'color',
    cellBg: 'bg-white',
    headerBg: 'bg-slate-100',
    cardBorder: 'border-slate-300',
    accentColor: '#3b82f6',
    printGrayscale: false,
  },
  ink_saver: {
    name: 'ink_saver',
    cellBg: 'bg-white',
    headerBg: 'bg-white',
    cardBorder: 'border-slate-200',
    accentColor: '#64748b',
    printGrayscale: true,
  },
  black_white: {
    name: 'black_white',
    cellBg: 'bg-white',
    headerBg: 'bg-white',
    cardBorder: 'border-black',
    accentColor: '#000000',
    printGrayscale: true,
  },
};

export const BILINGUAL_PRINT_DICTIONARY = {
  en: {
    dir: 'ltr',
    printStudio: 'Print & Preview Studio',
    documentMode: 'Document Mode',
    batchClasses: 'Individual Schedules (Batch - All Classes)',
    batchTeachers: 'Individual Schedules (Batch - All Teachers)',
    selectedEntity: 'Selected Entity Only',
    masterWall: 'Master Wall Timetable',
    paperSize: 'Paper Size',
    orientation: 'Orientation',
    landscape: 'Landscape',
    portrait: 'Portrait',
    colorMode: 'Color Mode',
    fullColor: 'Full Color',
    inkSaver: 'Light Ink-Saver',
    blackWhite: 'Black & White',
    pageOf: (current, total) => `Page ${current} of ${total}`,
    zoom: 'Zoom',
    fitToPage: 'Fit to Page',
    printSavePdf: 'Print / Save as PDF',
    close: 'Close',
    schoolName: 'School Name',
    academicYear: 'Academic Year',
    preparedBy: 'Prepared By',
    approvedBy: 'Approved by Principal',
    teacher: 'Teacher',
    class: 'Class',
    room: 'Room',
    subject: 'Subject',
    period: 'Period',
    day: 'Day',
    weeklyQuota: 'Weekly Teaching Quota',
    hours: 'hours',
    homeroomTeacher: 'Homeroom Teacher',
    specialty: 'Specialty',
    signature: 'Signature',
    date: 'Date',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  ar: {
    dir: 'rtl',
    printStudio: 'استوديو الطباعة والمعاينة',
    documentMode: 'نمط المستند',
    batchClasses: 'جداول فردية (دفعة - جميع الفصول)',
    batchTeachers: 'جداول فردية (دفعة - جميع المعلمين)',
    selectedEntity: 'الكيان المحدد فقط',
    masterWall: 'جدول الحائط العام للمدرسة',
    paperSize: 'حجم الورق',
    orientation: 'الاتجاه',
    landscape: 'أفقي',
    portrait: 'عمودي',
    colorMode: 'نمط الألوان',
    fullColor: 'ألوان كاملة',
    inkSaver: 'موفر للحبر',
    blackWhite: 'أبيض وأسود عالي التباين',
    pageOf: (current, total) => `صفحة ${current} من ${total}`,
    zoom: 'تكبير/تصغير',
    fitToPage: 'ملاءمة الصفحة',
    printSavePdf: 'طباعة / حفظ كـ PDF',
    close: 'إغلاق',
    schoolName: 'اسم المدرسة',
    academicYear: 'العام الدراسي',
    preparedBy: 'إعداد',
    approvedBy: 'اعتماد مدير المدرسة',
    teacher: 'المعلم',
    class: 'الفصل',
    room: 'القاعة',
    subject: 'المادة',
    period: 'الحصة',
    day: 'اليوم',
    weeklyQuota: 'ساعات النصاب الأسبوعي',
    hours: 'حصة / ساعة',
    homeroomTeacher: 'رائد الفصل',
    specialty: 'التخصص',
    signature: 'التوقيع',
    date: 'التاريخ',
    days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  },
};

// ==============================================================================
// 2. PRINT PREVIEW CONTROLLER & STATE SIMULATION (R1)
// ==============================================================================

export class PrintPreviewController {
  constructor(initialConfig = {}) {
    this.isOpen = initialConfig.isOpen ?? false;
    this.documentMode = initialConfig.documentMode || 'batch_classes'; // 'batch_classes' | 'batch_teachers' | 'selected_entity' | 'master_wall'
    this.paperSize = initialConfig.paperSize || 'A4';                 // 'A4' | 'A3' | 'Letter'
    this.orientation = initialConfig.orientation || 'landscape';       // 'landscape' | 'portrait'
    this.colorMode = initialConfig.colorMode || 'color';              // 'color' | 'ink_saver' | 'black_white'
    this.zoom = initialConfig.zoom || 100;                            // 50% to 200%
    this.currentPage = 1;
    this.schoolName = initialConfig.schoolName || 'OpenTimetable Academy';
    this.academicYear = initialConfig.academicYear || '2026/2027';
    this.preparedBy = initialConfig.preparedBy || 'Timetable Coordinator';
    this.approvedBy = initialConfig.approvedBy || 'School Principal';
    this.showSignatures = initialConfig.showSignatures ?? true;
    this.lang = initialConfig.lang || 'en';
    this.selectedEntityId = initialConfig.selectedEntityId || '';
  }

  setDocumentMode(mode, classes = [], teachers = []) {
    const validModes = ['batch_classes', 'batch_teachers', 'selected_entity', 'master_wall'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid document mode: ${mode}`);
    }
    this.documentMode = mode;
    this.currentPage = 1;
    return this.computeTotalPages(classes, teachers);
  }

  computeTotalPages(classes = [], teachers = []) {
    switch (this.documentMode) {
      case 'batch_classes':
        return Math.max(1, Array.isArray(classes) ? classes.length : 1);
      case 'batch_teachers':
        return Math.max(1, Array.isArray(teachers) ? teachers.length : 1);
      case 'selected_entity':
        return 1;
      case 'master_wall':
        return 1;
      default:
        return 1;
    }
  }

  goToPage(pageNum, totalPages = 1) {
    if (typeof pageNum !== 'number' || isNaN(pageNum)) return this.currentPage;
    const clamped = Math.max(1, Math.min(Math.round(pageNum), Math.max(1, totalPages)));
    this.currentPage = clamped;
    return this.currentPage;
  }

  nextPage(totalPages = 1) {
    return this.goToPage(this.currentPage + 1, totalPages);
  }

  prevPage(totalPages = 1) {
    return this.goToPage(this.currentPage - 1, totalPages);
  }

  setZoom(zoomPercent) {
    if (typeof zoomPercent !== 'number' || isNaN(zoomPercent)) return this.zoom;
    // Zoom clamped strictly between 50% and 200%
    this.zoom = Math.max(50, Math.min(200, Math.round(zoomPercent)));
    return this.zoom;
  }

  zoomIn(step = 10) {
    return this.setZoom(this.zoom + step);
  }

  zoomOut(step = 10) {
    return this.setZoom(this.zoom - step);
  }

  fitToWidth(containerWidthPx) {
    if (!containerWidthPx || containerWidthPx <= 0) return this.zoom;
    const dims = this.getPaperDimensions();
    const targetWidth = dims.widthPx;
    // Calculate ratio with 32px padding allowance
    const ratio = (containerWidthPx - 32) / targetWidth;
    return this.setZoom(Math.round(ratio * 100));
  }

  getPaperDimensions() {
    const base = PAPER_DIMENSIONS[this.paperSize] || PAPER_DIMENSIONS.A4;
    if (this.orientation === 'landscape') {
      const widthMm = Math.max(base.widthMm, base.heightMm);
      const heightMm = Math.min(base.widthMm, base.heightMm);
      const widthPx = Math.max(base.widthPx, base.heightPx);
      const heightPx = Math.min(base.widthPx, base.heightPx);
      return { widthMm, heightMm, widthPx, heightPx, aspectRatio: widthMm / heightMm };
    } else {
      const widthMm = Math.min(base.widthMm, base.heightMm);
      const heightMm = Math.max(base.widthMm, base.heightMm);
      const widthPx = Math.min(base.widthPx, base.heightPx);
      const heightPx = Math.max(base.widthPx, base.heightPx);
      return { widthMm, heightMm, widthPx, heightPx, aspectRatio: widthMm / heightMm };
    }
  }

  getActiveEntityForPage(classes = [], teachers = []) {
    if (this.documentMode === 'batch_classes') {
      return classes[this.currentPage - 1] || null;
    }
    if (this.documentMode === 'batch_teachers') {
      return teachers[this.currentPage - 1] || null;
    }
    if (this.documentMode === 'selected_entity') {
      const teacher = teachers.find(t => t.id === this.selectedEntityId);
      if (teacher) return { type: 'teacher', ...teacher };
      const cls = classes.find(c => c.id === this.selectedEntityId);
      if (cls) return { type: 'class', ...cls };
      return null;
    }
    return null; // master_wall
  }
}

// ==============================================================================
// 3. INDIVIDUAL TIMETABLE SHEET RENDERER & QUOTA CALCULATOR (R2)
// ==============================================================================

export class IndividualSheetRenderer {
  static calculateTeacherQuota(teacherId, lessons = [], placements = []) {
    if (!teacherId || !Array.isArray(lessons)) return 0;
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    
    // Sum durations of all placements assigned to this teacher
    let totalPeriods = 0;
    const countedPlacements = new Set();

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      const tId = lesson?.teacherId || lesson?.teacher_id;
      if (lesson && tId === teacherId) {
        // Each placement slot represents 1 scheduled period
        totalPeriods += (lesson.duration || 1);
        countedPlacements.add(p.lessonId);
      }
    }
    return totalPeriods;
  }

  static buildSheetHeader({
    entityType,
    entity,
    quotaHours = 0,
    homeroomTeacherName = '',
    schoolName = '',
    academicYear = '',
    lang = 'en',
  }) {
    const isRtl = lang === 'ar';
    const dict = BILINGUAL_PRINT_DICTIONARY[isRtl ? 'ar' : 'en'];

    const entityName = isRtl ? (entity?.nameAr || entity?.name || 'N/A') : (entity?.name || 'N/A');
    const subtitle = entityType === 'teacher'
      ? `${dict.specialty}: ${entity?.specialty || entity?.shortName || (isRtl ? 'تعليم عام' : 'General Education')}`
      : `${dict.homeroomTeacher}: ${homeroomTeacherName || (isRtl ? 'غير محدد' : 'Not Assigned')}`;

    const quotaText = entityType === 'teacher'
      ? `${dict.weeklyQuota}: ${quotaHours} ${dict.hours}`
      : `${dict.class}: ${entityName}`;

    return {
      entityType,
      entityName,
      subtitle,
      quotaText,
      schoolName: schoolName || dict.schoolName,
      academicYear: academicYear || '2026/2027',
      dir: dict.dir,
      lang,
    };
  }

  static buildSheetGrid({
    entityType,
    entityId,
    daysList = [],
    periodsList = [],
    bellSchedule = [],
    placements = [],
    lessons = [],
    subjects = [],
    teachers = [],
    classes = [],
    rooms = [],
    lang = 'en',
  }) {
    const isRtl = lang === 'ar';
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const classMap = new Map(classes.map(c => [c.id, c]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const numDays = daysList.length;
    const numPeriods = periodsList.length;

    // Initialize 2D grid: grid[periodIndex][dayIndex] = cellData or null
    const grid = Array.from({ length: numPeriods }, (_, pIdx) =>
      Array.from({ length: numDays }, (_, dIdx) => ({
        dayIndex: dIdx,
        periodIndex: pIdx,
        bellTime: bellSchedule[pIdx] || '',
        placements: [],
      }))
    );

    // Map placements to grid
    for (const p of placements) {
      if (p.dayIndex < 0 || p.dayIndex >= numDays || p.periodIndex < 0 || p.periodIndex >= numPeriods) {
        continue;
      }
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      const tId = lesson.teacherId || lesson.teacher_id;
      const cId = lesson.classId || lesson.class_id;
      const sId = lesson.subjectId || lesson.subject_id;
      const rId = p.roomId || p.room_id || lesson.roomId || lesson.room_id;

      const isMatch = entityType === 'teacher'
        ? tId === entityId
        : cId === entityId;

      if (isMatch) {
        const sub = subjectMap.get(sId);
        const subName = (isRtl ? (sub?.nameAr || sub?.name) : sub?.name) || lesson.subject_name || sId;
        const subColor = sub?.color || '#3b82f6';

        const tc = teacherMap.get(tId);
        const tcName = (isRtl ? (tc?.nameAr || tc?.name) : tc?.name) || lesson.teacher_name || 'Teacher';

        const cls = classMap.get(cId);
        const clsName = (isRtl ? (cls?.nameAr || cls?.name) : cls?.name) || lesson.class_name || 'Class';

        const rm = roomMap.get(rId);
        const rmName = (isRtl ? (rm?.nameAr || rm?.name) : rm?.name) || lesson.room_name || rId;

        grid[p.periodIndex][p.dayIndex].placements.push({
          placementId: `${p.lessonId}-${p.dayIndex}-${p.periodIndex}`,
          lessonId: p.lessonId,
          subjectName: subName,
          subjectColor: subColor,
          teacherName: tcName,
          className: clsName,
          roomName: rmName,
          partnerName: entityType === 'teacher' ? clsName : tcName,
          groupTag: lesson.groupName || (lesson.isSplitGroup ? 'Group' : ''),
          isSplit: Boolean(lesson.isSplitGroup),
        });
      }
    }

    return grid;
  }

  static buildSignatureBlock({ preparedBy, approvedBy, lang = 'en', showSignatures = true }) {
    if (!showSignatures) return null;
    const isRtl = lang === 'ar';
    const dict = BILINGUAL_PRINT_DICTIONARY[isRtl ? 'ar' : 'en'];

    return {
      showSignatures: true,
      preparedByTitle: dict.preparedBy,
      preparedByName: preparedBy || (isRtl ? 'لجنة الجداول' : 'Timetable Committee'),
      approvedByTitle: dict.approvedBy,
      approvedByName: approvedBy || (isRtl ? 'مدير المدرسة' : 'Principal'),
      signaturePlaceholder: dict.signature,
      datePlaceholder: dict.date,
      dir: dict.dir,
    };
  }
}

// ==============================================================================
// 4. HIGH-FIDELITY PRINT STYLESHEET VALIDATOR (R3)
// ==============================================================================

export class PrintStylesheetValidator {
  static parseCssFile(cssFilePath) {
    if (!fs.existsSync(cssFilePath)) {
      throw new Error(`CSS file not found at ${cssFilePath}`);
    }
    const content = fs.readFileSync(cssFilePath, 'utf8');
    return this.analyzeRules(content);
  }

  static analyzeRules(cssText) {
    const hasMediaPrint = /@media\s+print\s*\{([\s\S]*)\}/.test(cssText);
    const mediaPrintMatch = cssText.match(/@media\s+print\s*\{([\s\S]*)\}\s*$/m) ||
                            cssText.match(/@media\s+print\s*\{([\s\S]*)/);
    const printBlock = mediaPrintMatch ? mediaPrintMatch[1] : '';

    return {
      hasMediaPrint,
      hidesChrome: /display:\s*none\s*!important/.test(printBlock) &&
                   (/\.print:hidden/.test(printBlock) || /\.print\\:hidden/.test(printBlock) || /display:\s*none/.test(printBlock)),
      hasPageBreakAlways: /page-break-after:\s*always/.test(printBlock) || /break-after:\s*page/.test(printBlock),
      hasPageBreakInsideAvoid: /page-break-inside:\s*avoid/.test(printBlock) || /break-inside:\s*avoid/.test(printBlock),
      hasRepeatingTableHeaders: /table-header-group/.test(printBlock) || /thead/.test(printBlock),
      hasTableScaling: /table\s*\{[\s\S]*?width:\s*100%/.test(printBlock) || /overflow:\s*visible/.test(printBlock),
      hasPageDirective: /@page\s*\{/.test(cssText),
    };
  }
}

// ==============================================================================
// 5. FORMATTED MATRIX CSV EXPORT ENGINE (R4)
// ==============================================================================

export class MatrixCsvEngine {
  static generateMatrixCsv({
    placements = [],
    lessons = [],
    subjects = [],
    teachers = [],
    classes = [],
    rooms = [],
    cycleDays = 5,
    periodsPerDay = 7,
    daysList = [],
    periodsList = [],
    bellSchedule = [],
    entityType = 'class', // 'class' | 'teacher'
    isRtl = false,
    schoolName = 'OpenTimetable School',
    academicYear = '2026/2027',
  }) {
    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const classMap = new Map(classes.map(c => [c.id, c]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const days = daysList.length > 0
      ? daysList
      : (isRtl
          ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

    const periods = periodsList.length > 0
      ? periodsList
      : Array.from({ length: periodsPerDay }, (_, i) => (isRtl ? `الحصة ${i + 1}` : `Period ${i + 1}`));

    const entities = entityType === 'class' ? classes : teachers;
    const entityHeader = entityType === 'class'
      ? (isRtl ? 'الفصل' : 'Class')
      : (isRtl ? 'المعلم' : 'Teacher');

    // RFC 4180 Escaping Function
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Row 1: Header Row 1 (Entity header + Days spanning periods)
    // For each day, repeat the day name across its periods
    const row1 = [escapeCsv(entityHeader)];
    for (let d = 0; d < cycleDays; d++) {
      const dayName = days[d] || `Day ${d + 1}`;
      for (let p = 0; p < periodsPerDay; p++) {
        row1.push(escapeCsv(dayName));
      }
    }

    // Row 2: Header Row 2 (Entity subtitle + Periods / Bell Times)
    const row2 = [escapeCsv(isRtl ? 'الحصة / الوقت' : 'Period / Time')];
    for (let d = 0; d < cycleDays; d++) {
      for (let p = 0; p < periodsPerDay; p++) {
        const periodLabel = periods[p] || `P${p + 1}`;
        const bell = bellSchedule[p] ? ` (${bellSchedule[p]})` : '';
        row2.push(escapeCsv(`${periodLabel}${bell}`));
      }
    }

    // Index placements by entityId -> `${dayIndex}-${periodIndex}` -> placement
    const placementIndex = new Map();
    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;
      const tId = lesson.teacherId || lesson.teacher_id;
      const cId = lesson.classId || lesson.class_id;
      const keyEntity = entityType === 'class' ? cId : tId;
      const slotKey = `${keyEntity}_${p.dayIndex}_${p.periodIndex}`;
      placementIndex.set(slotKey, { p, lesson });
    }

    // Data rows for each entity
    const dataRows = [];
    for (const ent of entities) {
      const entName = isRtl ? (ent.nameAr || ent.name) : ent.name;
      const row = [escapeCsv(entName)];

      for (let d = 0; d < cycleDays; d++) {
        for (let p = 0; p < periodsPerDay; p++) {
          const slotKey = `${ent.id}_${d}_${p}`;
          const match = placementIndex.get(slotKey);
          if (match) {
            const { p: placement, lesson } = match;
            const tId = lesson.teacherId || lesson.teacher_id;
            const cId = lesson.classId || lesson.class_id;
            const sId = lesson.subjectId || lesson.subject_id;
            const rId = placement.roomId || placement.room_id || lesson.roomId || lesson.room_id;

            const sub = subjectMap.get(sId);
            const subName = isRtl
              ? (sub?.nameAr || sub?.name || lesson.subject_name || sId)
              : (sub?.name || lesson.subject_name || sId);

            const partner = entityType === 'class'
              ? teacherMap.get(tId)
              : classMap.get(cId);
            const defaultPartner = entityType === 'class' ? lesson.teacher_name : lesson.class_name;
            const partnerName = isRtl
              ? (partner?.nameAr || partner?.name || defaultPartner || 'N/A')
              : (partner?.name || defaultPartner || 'N/A');

            const rm = roomMap.get(rId);
            const rmName = isRtl
              ? (rm?.nameAr || rm?.name || lesson.room_name || rId)
              : (rm?.name || lesson.room_name || rId);

            row.push(escapeCsv(`${subName} - ${partnerName} [${rmName}]`));
          } else {
            row.push(''); // Free period / empty slot
          }
        }
      }
      dataRows.push(row.join(','));
    }

    // Construct CSV with UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [row1.join(','), row2.join(','), ...dataRows].join('\r\n');
    return csvContent;
  }

  static parseMatrixCsv(csvString) {
    if (typeof csvString !== 'string') {
      throw new Error('CSV input must be a string');
    }
    const hasBom = csvString.startsWith('\uFEFF');
    const cleanStr = hasBom ? csvString.slice(1) : csvString;

    // RFC 4180 parser respecting quotes
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < cleanStr.length; i++) {
      const char = cleanStr[i];
      const nextChar = cleanStr[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\r' && nextChar === '\n') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
          i++; // Skip \n
        } else if (char === '\n' || char === '\r') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return {
      hasBom,
      rows,
      headerRow1: rows[0] || [],
      headerRow2: rows[1] || [],
      dataRows: rows.slice(2),
    };
  }
}

// ==============================================================================
// 6. ENHANCED RFC 5545 RECURRING ICALENDAR EXPORT ENGINE (R4)
// ==============================================================================

export class RecurringIcalEngine {
  static generateRecurringIcal({
    placements = [],
    lessons = [],
    subjects = [],
    teachers = [],
    classes = [],
    rooms = [],
    bellSchedule = [],
    selectedEntityId = '',
    entityType = 'all', // 'teacher' | 'class' | 'all'
    isRtl = false,
    termStartDate = '2026-09-01', // Reference semester start (e.g. Tuesday)
    termWeeksCount = 16,
  }) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const lessonMap = new Map(lessons.map(l => [l.id, l]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const classMap = new Map(classes.map(c => [c.id, c]));
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    // Base date: Find Monday of base week
    const baseDate = new Date(termStartDate);
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
    baseDate.setDate(baseDate.getDate() + diffToMonday);

    let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenTimetable//Enterprise Studio//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';

    for (const p of placements) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      const tId = lesson.teacherId || lesson.teacher_id;
      const cId = lesson.classId || lesson.class_id;
      const sId = lesson.subjectId || lesson.subject_id;
      const rId = p.roomId || p.room_id || lesson.roomId || lesson.room_id;

      // Filter by selected entity if specified
      if (selectedEntityId && selectedEntityId !== 'all') {
        const matchesTeacher = tId === selectedEntityId;
        const matchesClass = cId === selectedEntityId;
        if (!matchesTeacher && !matchesClass) {
          continue;
        }
      }

      const sub = subjectMap.get(sId);
      const subName = (isRtl ? (sub?.nameAr || sub?.name) : sub?.name) || lesson.subject_name || sId;
      const tc = teacherMap.get(tId);
      const tcName = (isRtl ? (tc?.nameAr || tc?.name) : tc?.name) || lesson.teacher_name || 'Faculty';
      const cls = classMap.get(cId);
      const clsName = (isRtl ? (cls?.nameAr || cls?.name) : cls?.name) || lesson.class_name || 'Class';
      const rm = roomMap.get(rId);
      const rmName = (isRtl ? (rm?.nameAr || rm?.name) : rm?.name) || lesson.room_name || rId;

      const eventDate = new Date(baseDate);
      eventDate.setDate(baseDate.getDate() + p.dayIndex);
      const yearStr = eventDate.getFullYear();
      const monthStr = pad(eventDate.getMonth() + 1);
      const dayStr = pad(eventDate.getDate());

      // Parse bell schedule or fall back to standard periods (08:00 + period)
      let startH = 8 + p.periodIndex;
      let startM = 0;
      let endH = 8 + p.periodIndex;
      let endM = 45;

      const bell = bellSchedule[p.periodIndex] || '';
      if (bell.includes('-')) {
        const parts = bell.split('-');
        const sParts = parts[0].trim().split(':');
        const eParts = parts[1].trim().split(':');
        if (sParts.length === 2) {
          const parsedSH = parseInt(sParts[0], 10);
          const parsedSM = parseInt(sParts[1], 10);
          startH = Number.isNaN(parsedSH) ? 8 : parsedSH;
          startM = Number.isNaN(parsedSM) ? 0 : parsedSM;
        }
        if (eParts.length === 2) {
          const parsedEH = parseInt(eParts[0], 10);
          const parsedEM = parseInt(eParts[1], 10);
          endH = Number.isNaN(parsedEH) ? 8 : parsedEH;
          endM = Number.isNaN(parsedEM) ? 45 : parsedEM;
        }
      }

      const dtstart = `${yearStr}${monthStr}${dayStr}T${pad(startH)}${pad(startM)}00`;
      const dtend = `${yearStr}${monthStr}${dayStr}T${pad(endH)}${pad(endM)}00`;

      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:${p.lessonId}-${p.dayIndex}-${p.periodIndex}@opentimetable.org\r\n`;
      ical += `DTSTAMP:${dtstamp}\r\n`;
      ical += `DTSTART:${dtstart}\r\n`;
      ical += `DTEND:${dtend}\r\n`;
      ical += `RRULE:FREQ=WEEKLY;COUNT=${termWeeksCount}\r\n`; // Weekly recurrence rule across school term
      ical += `SUMMARY:${subName} (${clsName})\r\n`;
      ical += `DESCRIPTION:${isRtl ? 'المعلم' : 'Teacher'}: ${tcName}\\n${isRtl ? 'الشعبة' : 'Class'}: ${clsName}\r\n`;
      ical += `LOCATION:${rmName}\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'END:VEVENT\r\n';
    }

    ical += 'END:VCALENDAR\r\n';
    return ical;
  }

  static validateIcalString(icalStr) {
    if (typeof icalStr !== 'string') return { valid: false, error: 'iCal must be a string' };
    const hasBegin = icalStr.includes('BEGIN:VCALENDAR');
    const hasEnd = icalStr.includes('END:VCALENDAR');
    const hasVersion = icalStr.includes('VERSION:2.0');
    const hasProdid = icalStr.includes('PRODID:');

    if (!hasBegin || !hasEnd || !hasVersion || !hasProdid) {
      return { valid: false, error: 'Missing standard VCALENDAR envelope headers' };
    }

    const eventMatches = icalStr.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const rruleMatches = icalStr.match(/RRULE:FREQ=WEEKLY/g) || [];

    for (const evt of eventMatches) {
      if (!evt.includes('UID:')) return { valid: false, error: 'Event missing UID' };
      if (!evt.includes('DTSTAMP:')) return { valid: false, error: 'Event missing DTSTAMP' };
      if (!evt.includes('DTSTART:')) return { valid: false, error: 'Event missing DTSTART' };
      if (!evt.includes('DTEND:')) return { valid: false, error: 'Event missing DTEND' };
      if (!evt.includes('SUMMARY:')) return { valid: false, error: 'Event missing SUMMARY' };
    }

    return {
      valid: true,
      eventCount: eventMatches.length,
      rruleCount: rruleMatches.length,
    };
  }
}

// ==============================================================================
// 7. CONTRACT & PROPS VALIDATOR (PROJECT.md)
// ==============================================================================

export class ContractValidator {
  static validatePrintPreviewModalProps(props) {
    if (!props || typeof props !== 'object') {
      return { valid: false, error: 'Props must be an object' };
    }
    const requiredBooleans = ['isOpen'];
    const requiredFunctions = ['onClose'];
    const requiredStrings = ['lang', 'viewMode', 'selectedEntityId', 'schoolName', 'academicYear'];
    const requiredArrays = ['teachers', 'classes', 'rooms', 'subjects', 'lessons', 'placements'];
    const requiredNumbers = ['cycleDays', 'periodsPerDay'];
    const requiredMaps = ['teacherMap', 'classMap', 'roomMap', 'subjectMap', 'lessonMap'];

    for (const k of requiredBooleans) {
      if (typeof props[k] !== 'boolean') return { valid: false, error: `Missing or invalid boolean: ${k}` };
    }
    for (const k of requiredFunctions) {
      if (typeof props[k] !== 'function') return { valid: false, error: `Missing or invalid function: ${k}` };
    }
    for (const k of requiredStrings) {
      if (typeof props[k] !== 'string') return { valid: false, error: `Missing or invalid string: ${k}` };
    }
    for (const k of requiredArrays) {
      if (!Array.isArray(props[k])) return { valid: false, error: `Missing or invalid array: ${k}` };
    }
    for (const k of requiredNumbers) {
      if (typeof props[k] !== 'number') return { valid: false, error: `Missing or invalid number: ${k}` };
    }
    for (const k of requiredMaps) {
      if (!(props[k] instanceof Map)) return { valid: false, error: `Missing or invalid Map: ${k}` };
    }

    return { valid: true };
  }

  static validateIndividualTimetableSheetProps(props) {
    if (!props || typeof props !== 'object') {
      return { valid: false, error: 'Props must be an object' };
    }
    const requiredStrings = ['lang', 'entityType', 'entityId', 'entityName', 'schoolName', 'academicYear', 'colorMode'];
    const requiredArrays = ['daysList', 'periodsList', 'placements', 'lessons', 'subjects', 'teachers', 'classes', 'rooms'];
    const requiredMaps = ['teacherMap', 'classMap', 'roomMap', 'subjectMap', 'lessonMap'];

    for (const k of requiredStrings) {
      if (typeof props[k] !== 'string') return { valid: false, error: `Missing or invalid string: ${k}` };
    }
    for (const k of requiredArrays) {
      if (!Array.isArray(props[k])) return { valid: false, error: `Missing or invalid array: ${k}` };
    }
    for (const k of requiredMaps) {
      if (!(props[k] instanceof Map)) return { valid: false, error: `Missing or invalid Map: ${k}` };
    }

    return { valid: true };
  }
}
