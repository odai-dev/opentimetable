'use client';

import React from 'react';
import {
  School,
  BookOpen,
  Users,
  DoorOpen,
  UserCheck,
  Layers,
  Sparkles,
  CheckCircle2,
  Calendar,
  Eye,
  FilePlus,
  FolderOpen,
  Save,
  Printer,
  FileDown,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  RotateCw,
  Trash2,
  Wand2,
  Sliders,
  ZoomIn,
  ZoomOut,
  HelpCircle,
} from 'lucide-react';
import { RibbonTab, Role, ViewMode, BasicDataTab } from '../lib/types';
import { translations } from '../lib/i18n';

interface RibbonToolbarProps {
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
  activeTab: RibbonTab;
  setActiveTab: (tab: RibbonTab) => void;
  role?: Role;
  setRole?: (role: Role) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  canRunSolver: boolean;
  isReadOnly: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenGenerate: () => void;
  onOpenTimeOff: () => void;
  onOpenBasicData: (tab: BasicDataTab) => void;
  onOpenTest: () => void;
  onAutoPlaceAll: () => void;
  onClearPlacements: () => void;
  onExportCsv: () => void;
  onExportXml?: () => void;
  onExportIcal: () => void;
  onExportPdf: () => void;
  onImportRoz: () => void;
  onPrintPreview: () => void;
  onOpenAdvancedRelations?: () => void;
  onLoadSample?: (sample: 'saudi' | 'demo1' | 'blank') => void;
  currentSampleId?: 'saudi' | 'demo1' | 'blank';
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  schoolName?: string;
  currentFileName?: string;
  onSaveFile?: () => void;
  onSaveAs?: () => void;
  onNewFile?: () => void;
  onOpenStartupModal?: () => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  lang,
  setLang,
  activeTab,
  setActiveTab,
  role,
  setRole,
  viewMode,
  setViewMode,
  canRunSolver,
  isReadOnly,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenGenerate,
  onOpenTimeOff,
  onOpenBasicData,
  onOpenTest,
  onAutoPlaceAll,
  onClearPlacements,
  onExportCsv,
  onExportXml,
  onExportIcal,
  onExportPdf,
  onImportRoz,
  onPrintPreview,
  onOpenAdvancedRelations,
  onLoadSample,
  currentSampleId,
  zoomLevel,
  setZoomLevel,
  schoolName,
  currentFileName,
  onSaveFile,
  onSaveAs,
  onNewFile,
  onOpenStartupModal,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  return (
    <div className="w-full bg-slate-200 border-b border-slate-300 select-none shadow-sm flex flex-col">
      {/* 1. Window Frame & Quick Access Bar */}
      <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-700">
        {/* Quick Access Icons & Title */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow">
            📅
          </div>
          <span className="font-bold tracking-tight text-slate-100 hidden sm:inline">
            {currentFileName ? `OpenTimetable 2026 - [${currentFileName}]` : t.windowSubtitle}
          </span>

          <div className="h-4 w-[1px] bg-slate-600 mx-1 hidden sm:block" />

          {/* Quick Access Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={onNewFile || (() => alert(isRtl ? 'مشروع جديد' : 'New Project'))}
              title={t.ribbon.tools.newFile}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onImportRoz}
              title={t.ribbon.tools.openRoz}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSaveFile || (() => alert(isRtl ? 'تم حفظ التغييرات محلياً' : 'Changes saved locally'))}
              title={t.ribbon.tools.saveFile}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-slate-600 mx-0.5" />
            <button
              onClick={onUndo}
              disabled={!canUndo || isReadOnly}
              title={t.ribbon.tools.undo}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo || isReadOnly}
              title={t.ribbon.tools.redo}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onPrintPreview}
              title={t.ribbon.tools.printPreview}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white transition"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Corner: Bilingual Language Switcher, Help & Native Window Controls */}
        <div className="flex items-center gap-2">

          {/* Bilingual Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="px-2.5 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs transition border border-sky-500/50 shadow-xs"
          >
            {lang === 'en' ? '🇸🇦 العربية (RTL)' : '🇺🇸 English (LTR)'}
          </button>

          {/* About / Help */}
          <button
            onClick={() =>
              alert(
                isRtl
                  ? 'برنامج الجداول المدرسية المفتوحة (OpenTimetable 2026)\nنظام متكامل مفتوح المصدر لإعداد وتوليد الجداول المدرسية والجامعية.\nمتوافق مع ملفات .roz ويعمل بكفاءة عالية بدون الحاجة لأي خوادم خارجية.'
                  : 'OpenTimetable 2026 Studio\nStandalone open-source school and university timetable system.\nCompatible with .roz files with high-performance desktop parity.'
              )
            }
            title={isRtl ? 'حول البرنامج' : 'About OpenTimetable'}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Window Controls (Min, Max, Close) */}
          <div className="flex items-center ml-1 border-l border-slate-700 pl-1.5 gap-0.5">
            <div
              className="w-5 h-4 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white rounded-xs text-[10px] cursor-pointer"
              title={isRtl ? 'تصغير' : 'Minimize'}
            >
              ─
            </div>
            <div
              className="w-5 h-4 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white rounded-xs text-[10px] cursor-pointer"
              title={isRtl ? 'تكبير' : 'Maximize'}
            >
              □
            </div>
            <div
              className="w-5 h-4 flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white rounded-xs text-[10px] cursor-pointer"
              title={isRtl ? 'إغلاق' : 'Close'}
            >
              ✕
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ribbon Tabs Navigation */}
      <div className="bg-slate-200 px-2 pt-1 flex items-end gap-0.5 border-b border-slate-300">
        {(['file', 'main', 'timetable', 'specification', 'view'] as RibbonTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-t-md transition-all relative ${
                isActive
                  ? 'bg-gradient-to-b from-white to-slate-50 text-sky-800 border-t-2 border-t-sky-600 border-x border-slate-300 shadow-sm z-10'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {t.ribbon.tabs[tab]}
            </button>
          );
        })}
      </div>

      {/* 3. Ribbon Command Band (Desktop Large-Icon Toolset) */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-300 px-3 py-2 flex items-stretch gap-1 overflow-x-auto min-h-[92px]">
        {/* TAB: MAIN (الرئيسية) */}
        {activeTab === 'main' && (
          <>
            {/* Group: Basic Data (البيانات الأساسية) */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenBasicData('school')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-sky-50 active:bg-sky-100 border border-transparent hover:border-sky-200 text-slate-700 hover:text-sky-800 transition w-14"
                >
                  <School className="w-7 h-7 text-sky-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.school}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('subjects')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-emerald-50 active:bg-emerald-100 border border-transparent hover:border-emerald-200 text-slate-700 hover:text-emerald-800 transition w-14"
                >
                  <BookOpen className="w-7 h-7 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.subjects}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('classes')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-indigo-50 active:bg-indigo-100 border border-transparent hover:border-indigo-200 text-slate-700 hover:text-indigo-800 transition w-14"
                >
                  <Users className="w-7 h-7 text-indigo-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.classes}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('rooms')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-amber-50 active:bg-amber-100 border border-transparent hover:border-amber-200 text-slate-700 hover:text-amber-800 transition w-14"
                >
                  <DoorOpen className="w-7 h-7 text-amber-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.rooms}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('teachers')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-violet-50 active:bg-violet-100 border border-transparent hover:border-violet-200 text-slate-700 hover:text-violet-800 transition w-14"
                >
                  <UserCheck className="w-7 h-7 text-violet-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.teachers}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('lessons')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-rose-50 active:bg-rose-100 border border-transparent hover:border-rose-200 text-slate-700 hover:text-rose-800 transition w-14"
                >
                  <Layers className="w-7 h-7 text-rose-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.lessons}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.basicData}
              </span>
            </div>

            {/* Group: Timetable Operations (عمليات الجدول) */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenTest}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 active:bg-slate-200 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <CheckCircle2 className="w-7 h-7 text-teal-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.test}
                  </span>
                </button>

                {/* Primary Generate Button (Iconic large highlight) */}
                <button
                  onClick={onOpenGenerate}
                  disabled={!canRunSolver || isReadOnly}
                  className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-gradient-to-b from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-95 text-white shadow transition w-20 border border-sky-400 disabled:opacity-50"
                >
                  <Sparkles className="w-7 h-7 text-amber-200 mb-1 animate-pulse" />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {t.ribbon.tools.generate}
                  </span>
                </button>

                <button
                  onClick={onOpenTimeOff}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 active:bg-slate-200 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <Calendar className="w-7 h-7 text-orange-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.timeoff}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.timetableOps}
              </span>
            </div>

            {/* Group: Views (طرق العرض) */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1">
                {(['class', 'teacher', 'room', 'wall'] as ViewMode[]).map((mode) => {
                  const isModeActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-md border text-slate-700 transition w-14 ${
                        isModeActive
                          ? 'bg-sky-100/80 border-sky-300 text-sky-900 font-bold shadow-xs'
                          : 'hover:bg-slate-100 border-transparent'
                      }`}
                    >
                      <Eye className={`w-6 h-6 mb-1 ${isModeActive ? 'text-sky-700' : 'text-slate-500'}`} />
                      <span className="text-[10px] text-center leading-tight">
                        {t.views[mode]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.views}
              </span>
            </div>

            {/* Group: Quick Actions */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onAutoPlaceAll}
                  disabled={isReadOnly}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-slate-700 hover:text-emerald-800 transition w-14 disabled:opacity-40"
                >
                  <Wand2 className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.autoPlaceAll}
                  </span>
                </button>

                <button
                  onClick={onClearPlacements}
                  disabled={isReadOnly}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-700 hover:text-rose-800 transition w-14 disabled:opacity-40"
                >
                  <Trash2 className="w-6 h-6 text-rose-500 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.clearPlacements}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.quickControls}
              </span>
            </div>
          </>
        )}

        {/* TAB: FILE (ملف) */}
        {activeTab === 'file' && (
          <div className="flex items-stretch gap-2">
            {/* 1. File & Project Operations */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onNewFile || (() => alert(isRtl ? 'مشروع جديد' : 'New Project'))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <FilePlus className="w-7 h-7 text-sky-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.newFile}
                  </span>
                </button>

                <button
                  onClick={onImportRoz}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <FolderOpen className="w-7 h-7 text-amber-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.openRoz}
                  </span>
                </button>

                <button
                  onClick={onSaveFile || (() => alert(isRtl ? 'تم الحفظ' : 'Saved'))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <Save className="w-7 h-7 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.saveFile}
                  </span>
                </button>

                <button
                  onClick={onSaveAs || (() => alert(isRtl ? 'حفظ باسم' : 'Save As'))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                  title={isRtl ? 'حفظ باسم (تنزيل ملف المشروع)' : 'Save As (Download project file)'}
                >
                  <FileDown className="w-7 h-7 text-teal-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {isRtl ? 'حفظ باسم' : 'Save As'}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.fileExport}
              </span>
            </div>

            {/* 2. Print & Export Group */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onPrintPreview}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <Printer className="w-7 h-7 text-slate-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.printPreview}
                  </span>
                </button>

                <button
                  onClick={onExportPdf}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-700 transition w-14"
                >
                  <FileDown className="w-7 h-7 text-rose-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.exportPdf}
                  </span>
                </button>

                <button
                  onClick={onExportCsv}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-slate-700 transition w-14"
                >
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.exportExcel}
                  </span>
                </button>

                <button
                  onClick={onExportXml || (() => alert(isRtl ? 'تصدير XML غير متاح' : 'Export XML not available'))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-slate-700 transition w-14"
                  title={isRtl ? 'تصدير بتنسيق aSc Timetables XML (2012)' : 'Export as aSc Timetables XML (2012)'}
                >
                  <FileCode className="w-7 h-7 text-indigo-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.exportXml}
                  </span>
                </button>

                <button
                  onClick={onExportIcal}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-sky-50 border border-transparent hover:border-sky-200 text-slate-700 transition w-14"
                >
                  <Calendar className="w-7 h-7 text-sky-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.exportIcal}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {isRtl ? 'التصدير والطباعة' : 'Export & Print'}
              </span>
            </div>

            {/* 3. Templates & Samples (Discreet secondary option) */}
            {onOpenStartupModal && (
              <div className="ribbon-group flex flex-col justify-between px-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onOpenStartupModal}
                    className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-slate-700 transition w-16"
                    title={isRtl ? 'استعراض النماذج الجاهزة أو شاشة البداية' : 'Explore sample timetables or startup screen'}
                  >
                    <Sparkles className="w-7 h-7 text-indigo-600 mb-1" />
                    <span className="text-[10px] font-semibold text-center leading-tight">
                      {isRtl ? 'نماذج جاهزة' : 'Samples'}
                    </span>
                  </button>
                </div>
                <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                  {isRtl ? 'قوالب ونماذج' : 'Templates'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB: TIMETABLE (جدول الحصص) */}
        {activeTab === 'timetable' && (
          <div className="flex items-stretch gap-2">
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenGenerate}
                  className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow transition w-20"
                >
                  <Sparkles className="w-7 h-7 text-amber-200 mb-1" />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {t.ribbon.tools.generate}
                  </span>
                </button>

                <button
                  onClick={onOpenTest}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <CheckCircle2 className="w-7 h-7 text-teal-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.test}
                  </span>
                </button>

                <button
                  onClick={onOpenTimeOff}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <Calendar className="w-7 h-7 text-orange-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.timeoff}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.timetableOps}
              </span>
            </div>

            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onAutoPlaceAll}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-slate-700 transition w-14"
                >
                  <Wand2 className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.autoPlaceAll}
                  </span>
                </button>

                <button
                  onClick={onClearPlacements}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-700 transition w-14"
                >
                  <Trash2 className="w-6 h-6 text-rose-500 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.clearPlacements}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.quickControls}
              </span>
            </div>
          </div>
        )}

        {/* TAB: SPECIFICATION (مواصفات) */}
        {activeTab === 'specification' && (
          <div className="flex items-stretch gap-2">
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenBasicData('subjects')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-16"
                >
                  <BookOpen className="w-7 h-7 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {isRtl ? 'شروط المواد' : 'Subject Rules'}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('teachers')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-16"
                >
                  <Sliders className="w-7 h-7 text-violet-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {isRtl ? 'أنصبة المعلمين' : 'Teacher Gaps'}
                  </span>
                </button>

                <button
                  onClick={() => onOpenBasicData('rooms')}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-16"
                >
                  <DoorOpen className="w-7 h-7 text-amber-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {isRtl ? 'سعة القاعات' : 'Room Limits'}
                  </span>
                </button>

                {onOpenAdvancedRelations && (
                  <button
                    onClick={onOpenAdvancedRelations}
                    className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-slate-700 hover:text-indigo-800 transition w-16"
                  >
                    <Sparkles className="w-7 h-7 text-indigo-600 mb-1" />
                    <span className="text-[10px] font-semibold text-center leading-tight">
                      {isRtl ? 'قيود متقدمة' : 'Relations'}
                    </span>
                  </button>
                )}
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.solverParams}
              </span>
            </div>
          </div>
        )}

        {/* TAB: VIEW (عرض) */}
        {activeTab === 'view' && (
          <div className="flex items-stretch gap-2">
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1">
                {(['class', 'teacher', 'room', 'wall'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-md border text-slate-700 transition w-14 ${
                      viewMode === mode
                        ? 'bg-sky-100 border-sky-300 text-sky-900 font-bold'
                        : 'hover:bg-slate-100 border-transparent'
                    }`}
                  >
                    <Eye className="w-6 h-6 mb-1 text-sky-700" />
                    <span className="text-[10px] text-center leading-tight">
                      {t.views[mode]}
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {t.ribbon.groups.views}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="ribbon-group flex flex-col justify-between px-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 1.3))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <ZoomIn className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.zoomIn}
                  </span>
                </button>

                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.8))}
                  className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-300 text-slate-700 transition w-14"
                >
                  <ZoomOut className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">
                    {t.ribbon.tools.zoomOut}
                  </span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-400 text-center tracking-wider pt-0.5 border-t border-slate-100">
                {isRtl ? 'التقريب' : 'Zoom'} ({Math.round(zoomLevel * 100)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
