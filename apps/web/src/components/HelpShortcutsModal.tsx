'use client';

import React from 'react';
import { translations } from '../lib/i18n';
import {
  HelpCircle,
  Command,
  Keyboard,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Lock,
  RotateCcw,
  MousePointer,
} from 'lucide-react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'L', label: isRtl ? 'تثبيت / فك قفل الحصة المحددة' : 'Lock / Unlock hovered or selected card', desc: isRtl ? 'يمنع المولد من تحريك الحصة نهائياً' : 'Fixes card as immutable anchor for solver' },
    { key: 'Ctrl + Z', label: isRtl ? 'تراجع عن آخر حركة أو توليد' : 'Undo last action or generation', desc: isRtl ? 'سجل تراجع حتى 50 خطوة سابقة' : '50-step immutable action history stack' },
    { key: 'Ctrl + Y', label: isRtl ? 'إعادة الإجراء المتراجع عنه' : 'Redo previously undone action', desc: isRtl ? 'استرجاع التعديلات الملغاة' : 'Replay modifications' },
    { key: 'Delete / ⌫', label: isRtl ? 'تفريغ الحصة وإعادتها للبنك السفلي' : 'Unplace card back to bottom deck', desc: isRtl ? 'حذف التسكين دون مسح الدرس' : 'Remove from slot without deleting entity' },
    { key: 'Ctrl + P', label: isRtl ? 'فتح نافذة معاينة الطباعة وتصدير PDF' : 'Open Print Preview & PDF export', desc: isRtl ? 'طباعة مباشرة أو ملفات PDF رسمية' : 'Printable timetables with custom layouts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[85vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'مركز المساعدة واختصارات لوحة المفاتيح' : 'Keyboard Shortcuts & Help Hub'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'دليل الاختصارات السريعة لرفع إنتاجية إعداد الجداول المدرسية'
                  : 'Fast keyboard controls and operational guide for timetable studio'}
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

        {/* Shortcuts List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="space-y-2">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-sky-50/50 hover:border-sky-200 transition"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{sc.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sc.desc}</p>
                </div>
                <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-mono text-xs font-bold text-slate-800 shadow-2xs shrink-0">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          {/* Quick Mouse & DnD Guide */}
          <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
            <h3 className="text-xs font-bold text-sky-950 mb-2 flex items-center gap-1.5">
              <MousePointer className="w-4 h-4 text-sky-600" />
              <span>{isRtl ? 'إرشادات السحب والإفلات التفاعلي:' : 'Interactive Drag & Drop Tips:'}</span>
            </h3>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li>
                {isRtl
                  ? 'اسحب أي بطاقة من الشريط السفلي وضعها في أي خلية شاغرة.'
                  : 'Drag any lesson card from the bottom deck and drop into any available grid cell.'}
              </li>
              <li>
                {isRtl
                  ? 'النقر على أي بطاقة يفتح لوحة "الجداول المرتبطة" بالأسفل لمعاينة جدول المدرس والقاعة بالتزامن.'
                  : 'Clicking any placed card reveals the Related Timetables dock to preview teacher and room schedules side-by-side.'}
              </li>
              <li>
                {isRtl
                  ? 'اضغط زر "تحسين" لتسكين الحصص المتبقية فقط دون المساس بالحصص المسكنة مسبقاً.'
                  : 'Use the "Improve" button to solve remaining unplaced lessons without altering valid assignments.'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs text-slate-500">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-bold transition"
          >
            {isRtl ? 'تم' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
