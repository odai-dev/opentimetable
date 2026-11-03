'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Placement,
  Lesson,
  Subject,
  Teacher,
  ClassGroup,
  Room,
  ViewMode,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  Printer,
  X,
  FileText,
  Users,
  GraduationCap,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Check,
  Settings,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  IndividualTimetableSheet,
  ColorMode,
} from './IndividualTimetableSheet';

export type PrintDocumentMode = 'batch_classes' | 'batch_teachers' | 'selected_entity' | 'master_wall';
export type PaperSize = 'A4' | 'A3' | 'Letter';
export type PageOrientation = 'landscape' | 'portrait';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  viewMode: ViewMode;
  selectedEntityId: string;
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  lessons: Lesson[];
  placements: Placement[];
  teacherMap: Map<string, Teacher>;
  classMap: Map<string, ClassGroup>;
  roomMap: Map<string, Room>;
  subjectMap: Map<string, Subject>;
  lessonMap: Map<string, Lesson>;
  cycleDays: number;
  periodsPerDay: number;
  customDays?: string[];
  customPeriods?: string[];
  bellSchedule?: string[];
  schoolName: string;
  academicYear: string;
  onTriggerExportCsv?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  lang,
  viewMode,
  selectedEntityId,
  teachers,
  classes,
  rooms,
  subjects,
  lessons,
  placements,
  teacherMap,
  classMap,
  roomMap,
  subjectMap,
  lessonMap,
  cycleDays,
  periodsPerDay,
  customDays,
  customPeriods,
  bellSchedule,
  schoolName,
  academicYear,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Config states
  const [documentMode, setDocumentMode] = useState<PrintDocumentMode>(() => {
    if (viewMode === 'wall') return 'master_wall';
    if (viewMode === 'teacher') return 'batch_teachers';
    return 'batch_classes';
  });

  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('landscape');
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [preparedBy, setPreparedBy] = useState<string>(
    isRtl ? 'الشؤون الأكاديمية / إعداد' : 'Academic Affairs / Prepared By'
  );
  const [approvedBy, setApprovedBy] = useState<string>(
    isRtl ? 'اعتماد عميد الكلية' : 'Approved by Dean'
  );

  // Synchronize initial document mode when modal opens
  useEffect(() => {
    if (isOpen) {
      if (viewMode === 'wall') setDocumentMode('master_wall');
      else if (viewMode === 'teacher') setDocumentMode('batch_teachers');
      else setDocumentMode('batch_classes');
      setCurrentPage(1);
    }
  }, [isOpen, viewMode]);

  // Dynamic day & period definitions with fallbacks
  const daysList = useMemo(() => {
    if (customDays && customDays.length > 0) return customDays;
    if (cycleDays === 6) {
      return isRtl
        ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
        : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    }
    return isRtl
      ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [customDays, cycleDays, isRtl]);

  const periodsList = useMemo(() => {
    if (customPeriods && customPeriods.length > 0) return customPeriods;
    return Array.from({ length: periodsPerDay }, (_, i) => `${i + 1}`);
  }, [customPeriods, periodsPerDay]);

  interface PageEntityItem {
    type: 'class' | 'teacher' | 'room';
    id: string;
    name: string;
    subtitle?: string;
  }

  // Compute pagination entities
  const pageEntities: PageEntityItem[] = useMemo(() => {
    switch (documentMode) {
      case 'batch_classes':
        return classes.map((c) => ({
          type: 'class' as const,
          id: c.id,
          name: isRtl ? c.nameAr || c.name : c.name,
          subtitle: c.grade ? (isRtl ? `المستوى ${c.grade}` : `Level ${c.grade}`) : undefined,
        }));
      case 'batch_teachers':
        return teachers.map((tc) => ({
          type: 'teacher' as const,
          id: tc.id,
          name: isRtl ? tc.nameAr || tc.name : tc.name,
          subtitle: tc.speciality,
        }));
      case 'selected_entity': {
        const teacher = teacherMap.get(selectedEntityId);
        if (teacher) {
          return [{
            type: 'teacher' as const,
            id: teacher.id,
            name: isRtl ? teacher.nameAr || teacher.name : teacher.name,
            subtitle: teacher.speciality,
          }];
        }
        const cls = classMap.get(selectedEntityId);
        if (cls) {
          return [{
            type: 'class' as const,
            id: cls.id,
            name: isRtl ? cls.nameAr || cls.name : cls.name,
            subtitle: cls.grade ? (isRtl ? `المستوى ${cls.grade}` : `Level ${cls.grade}`) : undefined,
          }];
        }
        const rm = roomMap.get(selectedEntityId);
        if (rm) {
          return [{
            type: 'room' as const,
            id: rm.id,
            name: isRtl ? rm.nameAr || rm.name : rm.name,
            subtitle: isRtl ? `السعة: ${rm.capacity}` : `Cap: ${rm.capacity}`,
          }];
        }
        return classes.slice(0, 1).map((c) => ({
          type: 'class' as const,
          id: c.id,
          name: isRtl ? c.nameAr || c.name : c.name,
          subtitle: undefined,
        }));
      }
      case 'master_wall':
      default:
        return [{
          type: 'class' as const,
          id: 'master_wall',
          name: isRtl ? 'الجدول العام للجامعة / الكلية' : 'Master University Timetable',
          subtitle: undefined,
        }];
    }
  }, [documentMode, classes, teachers, selectedEntityId, teacherMap, classMap, roomMap, isRtl]);

  const totalPages = Math.max(1, pageEntities.length);

  // Clamped active entity for preview
  const activeEntity = pageEntities[Math.min(currentPage - 1, totalPages - 1)] || pageEntities[0];

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handlePrint = () => {
    // Add print orientation class to root document before firing
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-print-orientation', orientation);
      document.documentElement.setAttribute('data-print-color', colorMode);
    }
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="w-[96vw] h-[94vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* 1. Modal Top Bar */}
        <div className="px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-md">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>{isRtl ? 'استوديو الطباعة والمعاينة الاحترافي' : 'Print & Preview Studio'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  {paperSize} • {orientation === 'landscape' ? (isRtl ? 'أفقي' : 'Landscape') : (isRtl ? 'عمودي' : 'Portrait')}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {schoolName} • {academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isRtl ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title={isRtl ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Studio Workspace: Sidebar + Preview Stage */}
        <div className="flex-1 flex overflow-hidden">
          {/* A. Left Control Sidebar */}
          <div className="w-80 bg-slate-850 border-r border-slate-800 p-4 overflow-y-auto space-y-5 shrink-0 text-xs text-slate-300">
            {/* Document Mode */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {isRtl ? 'نمط ونطاق المستند:' : 'Document Layout & Mode:'}
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: 'batch_classes' as const,
                    labelEn: 'Individual Schedules (All Groups)',
                    labelAr: 'جداول فردية (دفعة - جميع الشعب)',
                    icon: GraduationCap,
                    count: classes.length,
                  },
                  {
                    id: 'batch_teachers' as const,
                    labelEn: 'Individual Schedules (All Faculty)',
                    labelAr: 'جداول فردية (دفعة - جميع أعضاء التدريس)',
                    icon: Users,
                    count: teachers.length,
                  },
                  {
                    id: 'selected_entity' as const,
                    labelEn: 'Selected Entity Only',
                    labelAr: 'الكيان الأكاديمي الحالي فقط',
                    icon: FileText,
                    count: 1,
                  },
                  {
                    id: 'master_wall' as const,
                    labelEn: 'Master University Timetable',
                    labelAr: 'الجدول العام للجامعة / الكلية',
                    icon: LayoutGrid,
                    count: 1,
                  },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = documentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setDocumentMode(mode.id);
                        setCurrentPage(1);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-start transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-sky-950/70 border-sky-500 text-sky-200 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                        <span className="font-semibold text-xs truncate">
                          {isRtl ? mode.labelAr : mode.labelEn}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                        {mode.count} {isRtl ? 'صفحة' : 'pg'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page Setup */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {isRtl ? 'إعدادات الورق:' : 'Page & Paper Setup:'}
              </label>

              <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                {/* Paper Size */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'حجم الورق' : 'Paper Size'}:</span>
                  <div className="flex items-center gap-1">
                    {(['A4', 'A3', 'Letter'] as PaperSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setPaperSize(sz)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                          paperSize === sz
                            ? 'bg-sky-600 border-sky-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'الاتجاه' : 'Orientation'}:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                        orientation === 'landscape'
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRtl ? 'أفقي' : 'Landscape'}
                    </button>
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                        orientation === 'portrait'
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isRtl ? 'عمودي' : 'Portrait'}
                    </button>
                  </div>
                </div>

                {/* Color Mode */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'نمط الألوان' : 'Color Scheme'}:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setColorMode('color')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                        colorMode === 'color'
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={isRtl ? 'ألوان كاملة' : 'Full Color'}
                    >
                      {isRtl ? 'ألوان' : 'Color'}
                    </button>
                    <button
                      onClick={() => setColorMode('ink_saver')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                        colorMode === 'ink_saver'
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={isRtl ? 'توفير حبر الطابعة (15% تظليل)' : 'Ink-Saver (15% opacity)'}
                    >
                      {isRtl ? 'موفر' : 'Saver'}
                    </button>
                    <button
                      onClick={() => setColorMode('black_white')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                        colorMode === 'black_white'
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={isRtl ? 'أبيض وأسود عالي التباين لماكينات التصوير' : 'Pure Black & White'}
                    >
                      {isRtl ? 'B&W' : 'B&W'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Header & Signatures */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {isRtl ? 'الترويسة والتوقيعات الرسمية:' : 'Header & Signatures:'}
              </label>

              <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">
                    {isRtl ? 'جهة الإعداد:' : 'Prepared By:'}
                  </span>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">
                    {isRtl ? 'جهة الاعتماد:' : 'Approved By:'}
                  </span>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-slate-400">{isRtl ? 'إظهار التوقيعات' : 'Show Signatures'}:</span>
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* B. Center/Right Preview Stage */}
          <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
            {/* Top Preview Toolbar */}
            <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              {/* Stepper Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {isRtl
                    ? `صفحة ${currentPage} من ${totalPages}`
                    : `Page ${currentPage} of ${totalPages}`}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Active Entity Badge */}
              <div className="text-xs font-semibold text-slate-300 truncate max-w-[280px]">
                {documentMode === 'master_wall' ? (
                  <span>{isRtl ? 'الجدول العام للجامعة / الكلية' : 'Master University Timetable'}</span>
                ) : (
                  <span>
                    {activeEntity?.name} {activeEntity?.subtitle ? `(${activeEntity.subtitle})` : ''}
                  </span>
                )}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title={isRtl ? 'تصغير' : 'Zoom Out'}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-mono font-bold text-slate-400 w-12 text-center">
                  {zoom}%
                </span>

                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title={isRtl ? 'تكبير' : 'Zoom In'}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setZoom(100)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white transition"
                  title={isRtl ? 'إعادة التعيين إلى 100%' : 'Reset Zoom'}
                >
                  100%
                </button>
              </div>
            </div>

            {/* Scrollable Sheet Canvas Stage */}
            <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-950/90">
              <div
                className="transition-transform duration-150 origin-top shadow-2xl"
                style={{
                  transform: `scale(${zoom / 100})`,
                }}
              >
                {/* Paper Canvas Container (Responsive A4/A3 aspect ratio) */}
                <div
                  className={`bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-300 relative transition-all overflow-hidden ${
                    orientation === 'landscape'
                      ? 'w-[1050px] min-h-[742px]'
                      : 'w-[742px] min-h-[1050px]'
                  }`}
                >
                  {documentMode === 'master_wall' ? (
                    /* Master Wall Timetable Mockup */
                    <div className="p-6">
                      <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-center justify-between">
                        <div>
                          <h1 className="text-xl font-bold text-slate-900">{schoolName}</h1>
                          <p className="text-xs text-slate-600">{academicYear}</p>
                        </div>
                        <div className="text-center">
                          <h2 className="text-base font-bold text-slate-800">
                            {isRtl ? 'الجدول العام للجامعة / الكلية' : 'Master University Timetable'}
                          </h2>
                          <p className="text-xs text-slate-500">
                            {isRtl ? 'المصفوفة الأكاديمية الشاملة' : 'Complete Academic Matrix'}
                          </p>
                        </div>
                        <div className="text-end text-xs text-slate-500">
                          <div>{new Date().toLocaleDateString()}</div>
                          <div className="font-semibold text-slate-700">OpenTimetable Studio</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-400 rounded">
                        <table className="w-full border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                              <th className="p-1 border-r border-slate-300 text-start w-28">
                                {isRtl ? 'الفصل / الشعبة' : 'Class / Section'}
                              </th>
                              {daysList.map((day) => (
                                <th
                                  key={day}
                                  colSpan={periodsList.length}
                                  className="p-1 border-r border-slate-300 text-center"
                                >
                                  {day}
                                </th>
                              ))}
                            </tr>
                            <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-[9px] text-slate-600">
                              <th className="p-1 border-r border-slate-300">#</th>
                              {daysList.map((_) =>
                                periodsList.map((p, pIdx) => (
                                  <th key={pIdx} className="p-0.5 border-r border-slate-200 text-center">
                                    {pIdx + 1}
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {classes.slice(0, 14).map((c) => (
                              <tr key={c.id} className="border-b border-slate-300">
                                <td className="p-1 border-r border-slate-300 font-bold bg-slate-50 truncate">
                                  {isRtl ? c.nameAr || c.name : c.name}
                                </td>
                                {daysList.map((_, dIdx) =>
                                  periodsList.map((_, pIdx) => {
                                    const match = placements.find((p) => {
                                      const l = lessonMap.get(p.lessonId);
                                      return (
                                        l &&
                                        (l.classId === c.id || l.classIds?.includes(c.id)) &&
                                        p.dayIndex === dIdx &&
                                        p.periodIndex === pIdx
                                      );
                                    });
                                    const lesson = match ? lessonMap.get(match.lessonId) : null;
                                    const sub = lesson ? subjectMap.get(lesson.subjectId) : null;
                                    const tc = lesson ? teacherMap.get(lesson.teacherId) : null;
                                    return (
                                      <td
                                        key={`${dIdx}-${pIdx}`}
                                        className="p-0.5 border-r border-slate-200 text-center text-[8px] truncate"
                                        style={{
                                          backgroundColor: sub ? sub.color + '20' : undefined,
                                        }}
                                      >
                                        {sub ? (
                                          <div className="leading-tight">
                                            <span className="font-bold block truncate">
                                              {sub.code || sub.name.slice(0, 3)}
                                            </span>
                                            <span className="text-[7px] text-slate-600 block truncate">
                                              {tc?.name ? tc.name.split(' ')[0] : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Dedicated Individual Timetable Sheet Component */
                    activeEntity && (
                      <IndividualTimetableSheet
                        lang={lang}
                        entityType={activeEntity.type}
                        entityId={activeEntity.id}
                        entityName={activeEntity.name}
                        entitySubtitle={activeEntity.subtitle}
                        schoolName={schoolName}
                        academicYear={academicYear}
                        daysList={daysList}
                        periodsList={periodsList}
                        bellSchedule={bellSchedule}
                        placements={placements}
                        lessons={lessons}
                        subjects={subjects}
                        teachers={teachers}
                        classes={classes}
                        rooms={rooms}
                        teacherMap={teacherMap}
                        classMap={classMap}
                        roomMap={roomMap}
                        subjectMap={subjectMap}
                        lessonMap={lessonMap}
                        colorMode={colorMode}
                        showSignatures={showSignatures}
                        preparedBy={preparedBy}
                        approvedBy={approvedBy}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hidden Print-Only Render Tree for Multi-Page Batch Printing */}
      <div id="print-batch-container" className="hidden print:block">
        {documentMode === 'batch_classes' &&
          classes.map((c) => (
            <div key={c.id} className="print-page-break">
              <IndividualTimetableSheet
                lang={lang}
                entityType="class"
                entityId={c.id}
                entityName={isRtl ? c.nameAr || c.name : c.name}
                entitySubtitle={c.grade ? (isRtl ? `المستوى ${c.grade}` : `Level ${c.grade}`) : undefined}
                schoolName={schoolName}
                academicYear={academicYear}
                daysList={daysList}
                periodsList={periodsList}
                bellSchedule={bellSchedule}
                placements={placements}
                lessons={lessons}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
                rooms={rooms}
                teacherMap={teacherMap}
                classMap={classMap}
                roomMap={roomMap}
                subjectMap={subjectMap}
                lessonMap={lessonMap}
                colorMode={colorMode}
                showSignatures={showSignatures}
                preparedBy={preparedBy}
                approvedBy={approvedBy}
                isPrintOnly={true}
              />
            </div>
          ))}

        {documentMode === 'batch_teachers' &&
          teachers.map((tc) => (
            <div key={tc.id} className="print-page-break">
              <IndividualTimetableSheet
                lang={lang}
                entityType="teacher"
                entityId={tc.id}
                entityName={isRtl ? tc.nameAr || tc.name : tc.name}
                entitySubtitle={tc.speciality}
                schoolName={schoolName}
                academicYear={academicYear}
                daysList={daysList}
                periodsList={periodsList}
                bellSchedule={bellSchedule}
                placements={placements}
                lessons={lessons}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
                rooms={rooms}
                teacherMap={teacherMap}
                classMap={classMap}
                roomMap={roomMap}
                subjectMap={subjectMap}
                lessonMap={lessonMap}
                colorMode={colorMode}
                showSignatures={showSignatures}
                preparedBy={preparedBy}
                approvedBy={approvedBy}
                isPrintOnly={true}
              />
            </div>
          ))}

        {documentMode === 'selected_entity' && activeEntity && (
          <div className="print-page-break">
            <IndividualTimetableSheet
              lang={lang}
              entityType={activeEntity.type}
              entityId={activeEntity.id}
              entityName={activeEntity.name}
              entitySubtitle={activeEntity.subtitle}
              schoolName={schoolName}
              academicYear={academicYear}
              daysList={daysList}
              periodsList={periodsList}
              bellSchedule={bellSchedule}
              placements={placements}
              lessons={lessons}
              subjects={subjects}
              teachers={teachers}
              classes={classes}
              rooms={rooms}
              teacherMap={teacherMap}
              classMap={classMap}
              roomMap={roomMap}
              subjectMap={subjectMap}
              lessonMap={lessonMap}
              colorMode={colorMode}
              showSignatures={showSignatures}
              preparedBy={preparedBy}
              approvedBy={approvedBy}
              isPrintOnly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
