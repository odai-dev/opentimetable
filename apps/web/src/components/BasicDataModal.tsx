'use client';

import React, { useState } from 'react';
import {
  School,
  BookOpen,
  Users,
  DoorOpen,
  UserCheck,
  Layers,
  X,
  Check,
  Plus,
} from 'lucide-react';
import { BasicDataTab, Subject, ClassGroup, Room, Teacher, Lesson } from '../lib/types';
import { translations } from '../lib/i18n';

interface BasicDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  initialTab?: BasicDataTab;
  subjects: Subject[];
  classes: ClassGroup[];
  rooms: Room[];
  teachers: Teacher[];
  lessons: Lesson[];
}

export const BasicDataModal: React.FC<BasicDataModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialTab = 'school',
  subjects,
  classes,
  rooms,
  teachers,
  lessons,
}) => {
  const [activeTab, setActiveTab] = useState<BasicDataTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-sm">{t.basicDataModal.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="bg-slate-100 px-3 pt-2 flex items-center gap-1 border-b border-slate-300 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('school')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'school'
                ? 'bg-white text-sky-700 border-t-2 border-t-sky-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.school}</span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'subjects'
                ? 'bg-white text-emerald-700 border-t-2 border-t-emerald-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.subjects}</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'bg-white text-indigo-700 border-t-2 border-t-indigo-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.classes}</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'rooms'
                ? 'bg-white text-amber-700 border-t-2 border-t-amber-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.rooms}</span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-white text-violet-700 border-t-2 border-t-violet-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.teachers}</span>
          </button>

          <button
            onClick={() => setActiveTab('lessons')}
            className={`px-3 py-1.5 font-bold rounded-t transition flex items-center gap-1.5 ${
              activeTab === 'lessons'
                ? 'bg-white text-rose-700 border-t-2 border-t-rose-600 border-x border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.basicDataModal.tabs.lessons}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* 1. School Tab */}
          {activeTab === 'school' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'اسم المؤسسة التعليمية' : 'Institution Name'}
                  </label>
                  <input
                    type="text"
                    defaultValue={isRtl ? 'ثانوية الريادة النموذجية' : 'Al-Riyada Model High School'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isRtl ? 'العام الدراسي' : 'Academic Year'}
                  </label>
                  <input
                    type="text"
                    defaultValue="2025 - 2026"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'أيام الأسبوع' : 'Days/Week'}</span>
                  <span className="font-bold text-sm text-slate-800">5 {isRtl ? 'أيام' : 'Days'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'الحصص باليوم' : 'Periods/Day'}</span>
                  <span className="font-bold text-sm text-slate-800">7 {isRtl ? 'حصص' : 'Periods'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'إجمالي الحصص' : 'Weekly Capacity'}</span>
                  <span className="font-bold text-sm text-slate-800">35 {isRtl ? 'حصة' : 'Slots'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">{isRtl ? 'اللون' : 'Color'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'الرمز' : 'Code'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم المادة' : 'Subject Name'}</th>
                    <th className="p-2">{isRtl ? 'القاعة المطلوبة' : 'Required Room'}</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center">
                        <div
                          className="w-5 h-5 rounded-full mx-auto shadow-xs border border-slate-300"
                          style={{ backgroundColor: sub.color }}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold">{sub.code}</td>
                      <td className="p-2 border-r border-slate-200 font-medium">
                        {isRtl ? sub.nameAr || sub.name : sub.name}
                      </td>
                      <td className="p-2 text-slate-500 font-mono">
                        {sub.requiredRoomType || 'STANDARD'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Classes Tab */}
          {activeTab === 'classes' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-20 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم الفصل / الشعبة' : 'Class Name'}</th>
                    <th className="p-2">{isRtl ? 'المستوى' : 'Grade'}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">{c.id}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {isRtl ? c.nameAr || c.name : c.name}
                      </td>
                      <td className="p-2 text-slate-600 font-medium">Grade {c.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Rooms Tab */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-24 text-center">Room ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم القاعة' : 'Room Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'النوع' : 'Type'}</th>
                    <th className="p-2 text-center">{isRtl ? 'السعة' : 'Capacity'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{r.id}</td>
                      <td className="p-2 border-r border-slate-200 font-semibold">{isRtl ? r.nameAr || r.name : r.name}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[11px]">{r.type}</td>
                      <td className="p-2 text-center font-bold text-sky-800">{r.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'اسم المعلم' : 'Teacher Name'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'التخصص' : 'Speciality'}</th>
                    <th className="p-2 text-center">{isRtl ? 'الأنصبة' : 'Workload'}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((tc) => (
                    <tr key={tc.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{tc.id}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {isRtl ? tc.nameAr || tc.name : tc.name}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{tc.speciality}</td>
                      <td className="p-2 text-center font-bold text-emerald-700">
                        {lessons.filter((l) => l.teacherId === tc.id).length} {isRtl ? 'حصص' : 'hrs'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Lessons Tab */}
          {activeTab === 'lessons' && (
            <div className="flex flex-col gap-3">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-start font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200 w-16 text-center">ID</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المادة' : 'Subject'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'المعلم' : 'Teacher'}</th>
                    <th className="p-2 border-r border-slate-200">{isRtl ? 'الفصل' : 'Class'}</th>
                    <th className="p-2 text-center">{isRtl ? 'القاعة' : 'Room'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{l.id}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-800">{l.subjectId}</td>
                      <td className="p-2 border-r border-slate-200">{l.teacherId}</td>
                      <td className="p-2 border-r border-slate-200 font-semibold">{l.classId}</td>
                      <td className="p-2 text-center font-mono text-slate-600">{l.roomId || 'Auto'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-sm"
          >
            {t.basicDataModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
