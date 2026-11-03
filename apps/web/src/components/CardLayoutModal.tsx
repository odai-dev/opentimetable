'use client';

import React, { useState } from 'react';
import { CardLayoutConfig } from '../lib/types';
import { translations } from '../lib/i18n';
import {
  Palette,
  Type,
  LayoutTemplate,
  Lock,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface CardLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  config: CardLayoutConfig;
  onSaveConfig: (config: CardLayoutConfig) => void;
}

export const CardLayoutModal: React.FC<CardLayoutModalProps> = ({
  isOpen,
  onClose,
  lang,
  config: initialConfig,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<CardLayoutConfig>(initialConfig);
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[88vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'تخصيص شكل وتصميم بطاقة المحاضرة' : 'Timetable Card Layout & Designer'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'التحكم في الحقول المعروضة، أسلوب التلوين، والخطوط العربية'
                  : 'Customize 3-line card fields, color rules, and typography'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Live Card Preview Box */}
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {isRtl ? 'معاينة حية لشكل بطاقة المحاضرة في الجدول:' : 'Live Timetable Card Preview:'}
            </span>

            {/* Mock Card Preview */}
            <div
              className={`w-40 rounded-lg p-2.5 shadow-md border border-sky-300 bg-sky-50 transition-all ${
                config.density === 'compact' ? 'py-1.5' : config.density === 'spacious' ? 'py-3.5' : 'py-2.5'
              }`}
              style={{
                fontFamily: config.fontFamily,
                borderLeft: '4px solid #0284c7',
              }}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-sky-950 truncate">
                  {config.line1 === 'subject_name' ? (isRtl ? 'الرياضيات' : 'Mathematics') : 'MATH'}
                </span>
                {config.showLockBadge && (
                  <span className="text-[10px] text-amber-500 font-bold" title="Pinned">
                    🔒
                  </span>
                )}
              </div>

              {config.line2 !== 'none' && (
                <span className="text-[10px] text-slate-700 block truncate font-medium mt-0.5">
                  {config.line2 === 'teacher_name'
                    ? isRtl ? 'أ. أحمد خالد' : 'Mr. Ahmed'
                    : isRtl ? 'معمل 102' : 'Lab 102'}
                </span>
              )}

              {config.line3 !== 'none' && (
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-sky-200/50">
                  <span className="truncate">
                    {config.line3 === 'room_name'
                      ? isRtl ? 'معمل 102' : 'Lab 102'
                      : isRtl ? 'شعبة 1 (المستوى 2)' : 'Section A (Level 2)'}
                  </span>
                  <span className="text-[8px] font-mono text-sky-600 bg-sky-100 px-1 rounded">
                    45m
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field Line Selectors */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <LayoutTemplate className="w-4 h-4 text-sky-600" />
                <span>{isRtl ? 'توزيع الأسطر الثلاثة داخل البطاقة:' : 'Card Line Fields:'}</span>
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'السطر الأول (العنوان الرئيسي):' : 'Line 1 (Primary Header):'}
                </label>
                <select
                  value={config.line1}
                  onChange={(e) => setConfig({ ...config, line1: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                >
                  <option value="subject_name">{isRtl ? 'اسم المادة الكامل' : 'Full Subject Name'}</option>
                  <option value="subject_code">{isRtl ? 'رمز المادة المختصر' : 'Subject Short Code'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'السطر الثاني:' : 'Line 2:'}
                </label>
                <select
                  value={config.line2}
                  onChange={(e) => setConfig({ ...config, line2: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                >
                  <option value="teacher_name">{isRtl ? 'اسم عضو هيئة التدريس' : 'Faculty Name'}</option>
                  <option value="room_name">{isRtl ? 'اسم القاعة' : 'Room Name'}</option>
                  <option value="none">{isRtl ? '-- إخفاء هذا السطر --' : '-- Hide Line --'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'السطر الثالث:' : 'Line 3:'}
                </label>
                <select
                  value={config.line3}
                  onChange={(e) => setConfig({ ...config, line3: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                >
                  <option value="room_name">{isRtl ? 'اسم القاعة' : 'Room Name'}</option>
                  <option value="class_name">{isRtl ? 'اسم الدفعة / الشعبة' : 'Level / Section Name'}</option>
                  <option value="none">{isRtl ? '-- إخفاء هذا السطر --' : '-- Hide Line --'}</option>
                </select>
              </div>
            </div>

            {/* Styling & Typography */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-emerald-600" />
                <span>{isRtl ? 'أسلوب التلوين والخطوط:' : 'Color Theme & Fonts:'}</span>
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'تلوين البطاقات حسب:' : 'Card Coloring By:'}
                </label>
                <select
                  value={config.colorBy}
                  onChange={(e) => setConfig({ ...config, colorBy: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                >
                  <option value="subject">{isRtl ? 'لون المساق الأكاديمي (موصى به)' : 'Course Color (Recommended)'}</option>
                  <option value="teacher">{isRtl ? 'لون عضو هيئة التدريس' : 'Faculty Color'}</option>
                  <option value="class">{isRtl ? 'لون الدفعة / الشعبة' : 'Section Color'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'نوع الخط العربي الرسمي:' : 'Arabic Font Family:'}
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => setConfig({ ...config, fontFamily: e.target.value as any })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-medium text-slate-800"
                >
                  <option value="Tajawal">Tajawal (تجوال - خط هندسي أنيق)</option>
                  <option value="Cairo">Cairo (القاهرة - عريض وواضح)</option>
                  <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic (تقني حديث)</option>
                  <option value="sans-serif">System Sans-Serif (خط النظام)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {isRtl ? 'كثافة البطاقة (Density):' : 'Card Density:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'normal', 'spacious'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setConfig({ ...config, density: d })}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition ${
                        config.density === d
                          ? 'bg-sky-50 border-sky-500 text-sky-800'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {d === 'compact'
                        ? isRtl ? 'مضغوط' : 'Compact'
                        : d === 'normal'
                        ? isRtl ? 'عادي' : 'Normal'
                        : isRtl ? 'مريح' : 'Spacious'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={config.showLockBadge}
                    onChange={(e) => setConfig({ ...config, showLockBadge: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>{isRtl ? 'إظهار شارة القفل 🔒 للمحاضرات المثبتة' : 'Show 🔒 lock badge on pinned lectures'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-slate-700 hover:bg-slate-200 font-semibold transition"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => {
              onSaveConfig(config);
              onClose();
            }}
            className="px-5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>{isRtl ? 'حفظ وتطبيق التصميم' : 'Save & Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
