'use client';

import React, { useState } from 'react';
import {
  FilePlus,
  FolderOpen,
  Sparkles,
  School,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { translations } from '../lib/i18n';

interface StartupWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  onCreateNew: () => void;
  onOpenFile: () => void;
  onLoadSample: (sample: 'saudi' | 'demo1') => void;
}

export const StartupWelcomeModal: React.FC<StartupWelcomeModalProps> = ({
  isOpen,
  onClose,
  lang,
  onCreateNew,
  onOpenFile,
  onLoadSample,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [showSampleOptions, setShowSampleOptions] = useState<boolean>(false);

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';
  const NextArrow = isRtl ? ChevronLeft : ChevronRight;

  const handleClose = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('opentimetable_skip_startup_dialog', 'true');
    }
    onClose();
  };

  const handleCreateNew = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('opentimetable_skip_startup_dialog', 'true');
    }
    onCreateNew();
  };

  const handleOpenFile = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('opentimetable_skip_startup_dialog', 'true');
    }
    onOpenFile();
  };

  const handleSelectSample = (sample: 'saudi' | 'demo1') => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('opentimetable_skip_startup_dialog', 'true');
    }
    onLoadSample(sample);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div
        dir={t.dir}
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-sky-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400 shadow-inner">
              <School className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isRtl ? 'مرحباً بك في OpenTimetable Studio' : 'Welcome to OpenTimetable Studio'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'برنامج إعداد وتوليد الجداول المدرسية الاحترافية'
                  : 'Professional High-Performance School Timetable Software'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Cards */}
        <div className="p-6 flex flex-col gap-3.5 bg-slate-50/70">
          {/* 1. Create New Timetable */}
          <button
            onClick={handleCreateNew}
            className="group flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:shadow-md transition text-start"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition">
                <FilePlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-sky-600 transition">
                  {isRtl ? 'إنشاء جدول مدرسي جديد' : 'Create New Timetable'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl
                    ? 'بدء مشروع جديد وضبط أيام الدوام والحصص والمواد والمعلمين'
                    : 'Start a blank project and configure your school days, bells, and subjects'}
                </p>
              </div>
            </div>
            <NextArrow className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition shrink-0" />
          </button>

          {/* 2. Open Existing File */}
          <button
            onClick={handleOpenFile}
            className="group flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md transition text-start"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-amber-600 transition">
                  {isRtl ? 'فتح جدول موجود من جهازك' : 'Open Existing Timetable'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl
                    ? 'استيراد ملف (.roz) من برنامج aSc أو ملف مشروع (.json)'
                    : 'Open an aSc Timetables (.roz) file or project (.json)'}
                </p>
              </div>
            </div>
            <NextArrow className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition shrink-0" />
          </button>

          {/* 3. Explore Sample Datasets */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden transition">
            <button
              onClick={() => setShowSampleOptions(!showSampleOptions)}
              className="w-full flex items-center justify-between p-4 text-start hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {isRtl ? 'استكشاف مدرسة نموذجية (تجربة)' : 'Explore Sample School (Demo)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl
                      ? 'تحميل جدول حقيقي مسبق التجهيز لتجربة البرنامج ومحرك التوليد'
                      : 'Load a real ready-made timetable to test the studio and solver'}
                  </p>
                </div>
              </div>
              <NextArrow
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  showSampleOptions ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showSampleOptions && (
              <div className="p-3 pt-0 flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => handleSelectSample('saudi')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs text-slate-700 transition"
                >
                  <span className="font-bold flex items-center gap-2">
                    <span>🇸🇦</span>
                    <span>{isRtl ? 'مدرسة ثانوية نموذجية (82 معلماً، 12 حصة)' : 'Full Secondary School (82 Teachers, 12 Periods)'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Saudi Arabia 1</span>
                </button>
                <button
                  onClick={() => handleSelectSample('demo1')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 text-xs text-slate-700 transition"
                >
                  <span className="font-bold flex items-center gap-2">
                    <span>🌍</span>
                    <span>{isRtl ? 'مدرسة نموذجية كاملة (7 أيام، 45 معلماً)' : '7-Day Cycle School (45 Teachers, 7 Periods)'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Demo 1</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <span>{isRtl ? 'عدم إظهار هذه النافذة عند بدء التشغيل' : "Don't show this on startup"}</span>
          </label>

          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            {isRtl ? 'تخطي والبدء فارغاً' : 'Start Blank'}
          </button>
        </div>
      </div>
    </div>
  );
};
