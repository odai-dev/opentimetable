'use client';

import React, { useState, useMemo } from 'react';
import {
  Teacher,
  ClassGroup,
  Room,
  Subject,
  Lesson,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  FileSpreadsheet,
  Upload,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Clipboard,
  Layers,
} from 'lucide-react';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  onImportTeachers?: (teachers: Teacher[]) => void;
  onImportClasses?: (classes: ClassGroup[]) => void;
  onImportRooms?: (rooms: Room[]) => void;
  onImportSubjects?: (subjects: Subject[]) => void;
  onImportLessons?: (lessons: Lesson[]) => void;
  existingTeachers?: Teacher[];
  existingClasses?: ClassGroup[];
  existingSubjects?: Subject[];
}

type ImportTarget = 'teachers' | 'classes' | 'rooms' | 'subjects' | 'lessons';

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  lang,
  onImportTeachers,
  onImportClasses,
  onImportRooms,
  onImportSubjects,
  onImportLessons,
  existingTeachers = [],
  existingClasses = [],
  existingSubjects = [],
}) => {
  const [importTarget, setImportTarget] = useState<ImportTarget>('teachers');
  const [rawText, setRawText] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(true);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  // Parse raw pasted lines (supports TSV from Excel/Google Sheets, CSV, or semicolons)
  const parsedData = useMemo(() => {
    if (!rawText.trim()) return [];
    const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
      if (line.includes(';')) return line.split(';').map((c) => c.trim());
      // basic CSV split
      return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    });
  }, [rawText]);

  const headers = useMemo(() => {
    if (parsedData.length === 0) return [];
    if (hasHeaders) return parsedData[0];
    return parsedData[0].map((_, i) => `${isRtl ? 'عمود' : 'Column'} ${i + 1}`);
  }, [parsedData, hasHeaders, isRtl]);

  const rows = useMemo(() => {
    if (parsedData.length === 0) return [];
    return hasHeaders ? parsedData.slice(1) : parsedData;
  }, [parsedData, hasHeaders]);

  // Target schema field options
  const targetFields = useMemo(() => {
    if (importTarget === 'teachers') {
      return [
        { key: 'name', label: isRtl ? 'اسم عضو هيئة التدريس (مطلوب)' : 'Faculty Name (Required)', required: true },
        { key: 'speciality', label: isRtl ? 'القسم / التخصص' : 'Department / Speciality' },
        { key: 'maxDailyHours', label: isRtl ? 'الحد الأقصى اليومي' : 'Max Daily Hours' },
      ];
    }
    if (importTarget === 'classes') {
      return [
        { key: 'name', label: isRtl ? 'اسم الدفعة / الشعبة (مطلوب)' : 'Group / Section Name (Required)', required: true },
        { key: 'grade', label: isRtl ? 'المستوى الأكاديمي' : 'Academic Level' },
      ];
    }
    if (importTarget === 'rooms') {
      return [
        { key: 'name', label: isRtl ? 'اسم القاعة / المعمل' : 'Hall / Lab Name (Required)', required: true },
        { key: 'capacity', label: isRtl ? 'السعة الاستيعابية' : 'Capacity' },
        { key: 'type', label: isRtl ? 'النوع (STANDARD/LAB/GYM)' : 'Type (STANDARD/LAB/GYM)' },
      ];
    }
    if (importTarget === 'subjects') {
      return [
        { key: 'name', label: isRtl ? 'اسم المساق' : 'Course Name (Required)', required: true },
        { key: 'code', label: isRtl ? 'رمز المساق' : 'Course Code' },
        { key: 'requiredRoomType', label: isRtl ? 'نوع القاعة المطلوبة' : 'Required Hall/Lab Type' },
      ];
    }
    // Lessons
    return [
      { key: 'className', label: isRtl ? 'اسم الفصل' : 'Class Name', required: true },
      { key: 'subjectName', label: isRtl ? 'اسم المادة' : 'Subject Name', required: true },
      { key: 'teacherName', label: isRtl ? 'اسم المعلم' : 'Teacher Name', required: true },
      { key: 'duration', label: isRtl ? 'عدد الحصص الأسبوعية' : 'Periods/Week' },
    ];
  }, [importTarget, isRtl]);

  // Auto-guess column mappings when headers change
  React.useEffect(() => {
    const mapping: Record<number, string> = {};
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (importTarget === 'teachers') {
        if (lower.includes('name') || lower.includes('اسم') || lower.includes('معلم')) mapping[idx] = 'name';
        else if (lower.includes('spec') || lower.includes('تخصص') || lower.includes('مادة')) mapping[idx] = 'speciality';
        else if (lower.includes('max') || lower.includes('نصاب') || lower.includes('ساعات')) mapping[idx] = 'maxDailyHours';
      } else if (importTarget === 'classes') {
        if (lower.includes('name') || lower.includes('اسم') || lower.includes('فصل') || lower.includes('شعبة')) mapping[idx] = 'name';
        else if (lower.includes('grade') || lower.includes('صف') || lower.includes('مرحلة')) mapping[idx] = 'grade';
      } else if (importTarget === 'rooms') {
        if (lower.includes('name') || lower.includes('اسم') || lower.includes('قاعة') || lower.includes('معمل')) mapping[idx] = 'name';
        else if (lower.includes('cap') || lower.includes('سعة') || lower.includes('استيعاب')) mapping[idx] = 'capacity';
        else if (lower.includes('type') || lower.includes('نوع')) mapping[idx] = 'type';
      } else if (importTarget === 'subjects') {
        if (lower.includes('name') || lower.includes('اسم') || lower.includes('مادة')) mapping[idx] = 'name';
        else if (lower.includes('code') || lower.includes('رمز')) mapping[idx] = 'code';
        else if (lower.includes('room') || lower.includes('قاعة') || lower.includes('معمل')) mapping[idx] = 'requiredRoomType';
      } else if (importTarget === 'lessons') {
        if (lower.includes('class') || lower.includes('فصل')) mapping[idx] = 'className';
        else if (lower.includes('sub') || lower.includes('مادة')) mapping[idx] = 'subjectName';
        else if (lower.includes('teach') || lower.includes('معلم') || lower.includes('أستاذ')) mapping[idx] = 'teacherName';
        else if (lower.includes('dur') || lower.includes('count') || lower.includes('حصص')) mapping[idx] = 'duration';
      }
    });
    setColumnMapping(mapping);
  }, [headers, importTarget]);

  // Handle final import
  const handleCommit = () => {
    if (rows.length === 0) return;

    if (importTarget === 'teachers' && onImportTeachers) {
      const teachersList: Teacher[] = rows.map((row, i) => {
        let name = `Faculty ${i + 1}`;
        let speciality = 'General';
        let maxDailyHours = 5;

        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          const val = row[Number(colIdx)] || '';
          if (field === 'name' && val) name = val;
          if (field === 'speciality' && val) speciality = val;
          if (field === 'maxDailyHours' && val) maxDailyHours = Number(val) || 5;
        });

        return {
          id: `t_${Date.now()}_${i}`,
          name,
          speciality,
          color: '#0284c7',
          unavailableSlots: [],
          maxDailyHours,
        };
      });
      onImportTeachers(teachersList);
    } else if (importTarget === 'classes' && onImportClasses) {
      const classesList: ClassGroup[] = rows.map((row, i) => {
        let name = `Section ${i + 1}`;
        let grade = 1;

        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          const val = row[Number(colIdx)] || '';
          if (field === 'name' && val) name = val;
          if (field === 'grade' && val) grade = Number(val) || 1;
        });

        return {
          id: `c_${Date.now()}_${i}`,
          name,
          grade,
        };
      });
      onImportClasses(classesList);
    } else if (importTarget === 'rooms' && onImportRooms) {
      const roomsList: Room[] = rows.map((row, i) => {
        let name = `Hall ${i + 1}`;
        let capacity = 30;
        let type: 'STANDARD' | 'LAB' | 'GYM' | 'AUDITORIUM' = 'STANDARD';

        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          const val = row[Number(colIdx)] || '';
          if (field === 'name' && val) name = val;
          if (field === 'capacity' && val) capacity = Number(val) || 30;
          if (field === 'type' && val) {
            const upper = val.toUpperCase();
            if (upper.includes('LAB') || upper.includes('معمل') || upper.includes('مختبر')) type = 'LAB';
            else if (upper.includes('GYM') || upper.includes('رياضة') || upper.includes('بدنية')) type = 'GYM';
          }
        });

        return {
          id: `r_${Date.now()}_${i}`,
          name,
          capacity,
          type,
        };
      });
      onImportRooms(roomsList);
    } else if (importTarget === 'subjects' && onImportSubjects) {
      const subjectsList: Subject[] = rows.map((row, i) => {
        let name = `Course ${i + 1}`;
        let code = name.slice(0, 3).toUpperCase();
        let requiredRoomType: string | undefined = undefined;

        Object.entries(columnMapping).forEach(([colIdx, field]) => {
          const val = row[Number(colIdx)] || '';
          if (field === 'name' && val) name = val;
          if (field === 'code' && val) code = val;
          if (field === 'requiredRoomType' && val) requiredRoomType = val;
        });

        return {
          id: `s_${Date.now()}_${i}`,
          name,
          code,
          color: '#10b981',
          requiredRoomType,
        };
      });
      onImportSubjects(subjectsList);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[88vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'استيراد البيانات من Excel و CSV' : 'Spreadsheet & Clipboard Importer'}
              </h2>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'لصق مباشر من إكسل أو ملف CSV مع مطابقة ذكية للأعمدة'
                  : 'Import faculty, sections, halls/labs, or courses from spreadsheets'}
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

        {/* Target Entity Selector */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            {isRtl ? 'اختر نوع البيانات المستوردة:' : 'Import Target Entity:'}
          </span>
          {(['teachers', 'classes', 'rooms', 'subjects'] as ImportTarget[]).map((target) => (
            <button
              key={target}
              onClick={() => {
                setImportTarget(target);
                setColumnMapping({});
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                importTarget === target
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {target === 'teachers'
                ? isRtl ? 'أعضاء هيئة التدريس' : 'Faculty'
                : target === 'classes'
                ? isRtl ? 'الدفعات والشعب' : 'Levels & Sections'
                : target === 'rooms'
                ? isRtl ? 'القاعات والمعامل' : 'Halls & Labs'
                : isRtl ? 'المساقات' : 'Courses'}
            </button>
          ))}
        </div>

        {/* Paste or Upload Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-emerald-600" />
                <span>
                  {isRtl
                    ? 'الصق البيانات هنا من Excel أو Google Sheets (أو CSV):'
                    : 'Paste table data from Excel, Google Sheets, or CSV:'}
                </span>
              </label>
              <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>{isRtl ? 'الصف الأول يحتوي على عناوين الأعمدة' : 'First row contains headers'}</span>
              </label>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                importTarget === 'teachers'
                  ? isRtl
                    ? "اسم عضو هيئة التدريس\tالقسم / التخصص\tالحد الأقصى\nد. أحمد خالد\tعلوم الحاسوب\t5\nم. سعد صالح\tهندسة البرمجيات\t4"
                    : "Faculty Name\tDepartment\tMax Hours\nDr. Ahmed Khalid\tComputer Science\t5\nEng. Saad Saleh\tSoftware Engineering\t4"
                  : isRtl
                  ? "اسم الدفعة / الشعبة\tالمستوى\nCyberSecurity-L2-G1\t2\nDentistry-L3\t3"
                  : "Section Name\tLevel\nCyberSecurity-L2-G1\t2\nDentistry-L3\t3"
              }
              rows={5}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:border-emerald-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Column Mapping Section */}
          {headers.length > 0 && (
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <h3 className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span>{isRtl ? 'مطابقة الأعمدة المكتشفة:' : 'Column Mapping:'}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {headers.map((header, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 block truncate">
                      {header}
                    </span>
                    <select
                      value={columnMapping[idx] || ''}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [idx]: e.target.value })
                      }
                      className="w-full mt-1 text-xs p-1 rounded border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">{isRtl ? '-- تجاهل هذا العمود --' : '-- Skip Column --'}</option>
                      {targetFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {rows.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">
                {isRtl
                  ? `معاينة الصفوف المستخرجة (${rows.length} صف):`
                  : `Preview extracted records (${rows.length} rows):`}
              </span>
              <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] border-b border-slate-200">
                      <th className="p-1.5 text-center w-8">#</th>
                      {headers.map((h, i) => (
                        <th key={i} className="p-1.5 text-start font-bold">
                          {columnMapping[i] ? `${h} -> [${columnMapping[i]}]` : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 8).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="p-1.5 text-center text-slate-400 font-mono text-[10px]">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1.5 text-slate-700 truncate max-w-[150px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {rows.length > 0
              ? isRtl
                ? `جاهز لاستيراد ${rows.length} سجل`
                : `Ready to import ${rows.length} records`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-slate-700 hover:bg-slate-200 font-semibold transition"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleCommit}
              disabled={rows.length === 0}
              className="px-5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>{isRtl ? 'تنفيذ الاستيراد الآن' : 'Commit Import'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
