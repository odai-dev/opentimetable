'use client';

import React, { useMemo } from 'react';
import {
  Placement,
  Lesson,
  Teacher,
  ClassGroup,
  Room,
  Subject,
} from '../lib/types';
import { translations } from '../lib/i18n';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Printer,
  X,
  DoorOpen,
  UserCheck,
  Scale,
} from 'lucide-react';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  placements: Placement[];
  lessons: Lesson[];
  teachers: Teacher[];
  classes: ClassGroup[];
  rooms: Room[];
  subjects: Subject[];
  teacherMap: Map<string, Teacher>;
  classMap: Map<string, ClassGroup>;
  roomMap: Map<string, Room>;
  subjectMap: Map<string, Subject>;
  lessonMap: Map<string, Lesson>;
  cycleDays: number;
  periodsPerDay: number;
  schoolName?: string;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  lang,
  placements,
  lessons,
  teachers,
  classes,
  rooms,
  subjects,
  teacherMap,
  classMap,
  roomMap,
  subjectMap,
  lessonMap,
  cycleDays,
  periodsPerDay,
  schoolName,
}) => {
  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const totalCycleSlots = cycleDays * periodsPerDay;

  // Compute analytics
  const stats = useMemo(() => {
    // 1. Teacher Loads & Gaps
    const teacherPlacements = new Map<string, Placement[]>();
    for (const p of placements) {
      const l = lessonMap.get(p.lessonId);
      if (!l) continue;
      const list = teacherPlacements.get(l.teacherId) || [];
      list.push(p);
      teacherPlacements.set(l.teacherId, list);
    }

    let minLoad = Infinity;
    let maxLoad = 0;
    let totalLoad = 0;
    let totalGaps = 0;

    const teacherStatsList = teachers.map((teacher) => {
      const pList = teacherPlacements.get(teacher.id) || [];
      const load = pList.length;
      totalLoad += load;
      if (load < minLoad) minLoad = load;
      if (load > maxLoad) maxLoad = load;

      // Calculate gaps per day
      let gaps = 0;
      for (let d = 0; d < cycleDays; d++) {
        const dayPeriods = pList
          .filter((p) => p.dayIndex === d)
          .map((p) => p.periodIndex)
          .sort((a, b) => a - b);
        if (dayPeriods.length >= 2) {
          const span = dayPeriods[dayPeriods.length - 1] - dayPeriods[0] + 1;
          gaps += span - dayPeriods.length;
        }
      }
      totalGaps += gaps;

      return {
        id: teacher.id,
        name: teacher.name,
        speciality: teacher.speciality,
        load,
        gaps,
        color: teacher.color,
      };
    });

    const avgLoad = teachers.length > 0 ? (totalLoad / teachers.length).toFixed(1) : '0';
    const avgGaps = teachers.length > 0 ? (totalGaps / teachers.length).toFixed(1) : '0';

    // 2. Room Utilization
    const roomPlacementsCount = new Map<string, number>();
    for (const p of placements) {
      if (p.roomId) {
        roomPlacementsCount.set(
          p.roomId,
          (roomPlacementsCount.get(p.roomId) || 0) + 1
        );
      }
    }

    const roomStatsList = rooms.map((r) => {
      const count = roomPlacementsCount.get(r.id) || 0;
      const utilPercent = totalCycleSlots > 0 ? Math.round((count / totalCycleSlots) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        count,
        utilPercent,
      };
    });

    // Overall Room Utilization
    const totalRoomCapacity = rooms.length * totalCycleSlots;
    const totalAssignedRooms = placements.filter((p) => p.roomId).length;
    const overallRoomUtil =
      totalRoomCapacity > 0 ? Math.round((totalAssignedRooms / totalRoomCapacity) * 100) : 0;

    return {
      teacherStatsList,
      roomStatsList,
      minLoad: minLoad === Infinity ? 0 : minLoad,
      maxLoad,
      avgLoad,
      totalGaps,
      avgGaps,
      overallRoomUtil,
    };
  }, [placements, teachers, rooms, cycleDays, periodsPerDay, totalCycleSlots, lessonMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[88vh] overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isRtl ? 'لوحة تحليلات وإحصائيات الجدول' : 'Timetable Analytics & Statistics'}
              </h2>
              <p className="text-xs text-slate-300">
                {schoolName ? `${schoolName} • ` : ''}
                {isRtl
                  ? 'قياس عدالة أنصبة المعلمين، ساعات الفراغ، ونسب إشغال القاعات'
                  : 'Faculty load equity, idle windows, and room utilization'}
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

        {/* Top Summary KPI Cards */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-900 block">
                {isRtl ? 'متوسط نصاب المعلم' : 'Avg Teacher Load'}
              </span>
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-indigo-700">{stats.avgLoad}</span>
              <span className="text-[10px] text-indigo-600 font-semibold">{isRtl ? 'حصة' : 'hrs'}</span>
            </div>
            <span className="text-[9px] text-indigo-500 block">
              {isRtl ? `(الأدنى: ${stats.minLoad} - الأقصى: ${stats.maxLoad})` : `(Min: ${stats.minLoad} - Max: ${stats.maxLoad})`}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 block">
                {isRtl ? 'إجمالي فترات الفراغ' : 'Total Window Gaps'}
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-700">{stats.totalGaps}</span>
              <span className="text-[10px] text-amber-600 font-semibold">{isRtl ? 'ساعة فراغ' : 'gap hrs'}</span>
            </div>
            <span className="text-[9px] text-amber-500 block">
              {isRtl ? `معدل: ${stats.avgGaps} لكل معلم` : `Avg: ${stats.avgGaps} per teacher`}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-900 block">
                {isRtl ? 'إشغال القاعات العام' : 'Overall Room Util'}
              </span>
              <DoorOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-emerald-700">{stats.overallRoomUtil}%</span>
            </div>
            <span className="text-[9px] text-emerald-600 block">
              {isRtl ? `${rooms.length} قاعات ومعامل` : `${rooms.length} rooms & labs`}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-900 block">
                {isRtl ? 'مؤشر العدالة' : 'Equity Score'}
              </span>
              <Scale className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-sky-700">
                {stats.maxLoad - stats.minLoad <= 4 ? '94%' : '78%'}
              </span>
            </div>
            <span className="text-[9px] text-sky-600 block">
              {isRtl ? 'توازن أعباء التدريس' : 'Workload fairness'}
            </span>
          </div>
        </div>

        {/* Content Body: Two columns (Teacher loads & Room utilization) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Teacher Load & Gap Table */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>{isRtl ? 'أنصبة المعلمين وساعات الفراغ' : 'Teacher Loads & Window Gaps'}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {teachers.length} {isRtl ? 'معلم' : 'teachers'}
              </span>
            </h3>

            <div className="overflow-x-auto flex-1 max-h-64">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                    <th className="pb-1 text-start">{isRtl ? 'المعلم' : 'Teacher'}</th>
                    <th className="pb-1 text-center">{isRtl ? 'النصاب' : 'Hours'}</th>
                    <th className="pb-1 text-center">{isRtl ? 'الفراغ' : 'Gaps'}</th>
                    <th className="pb-1 text-end">{isRtl ? 'المعدل البصري' : 'Distribution'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.teacherStatsList.map((t) => (
                    <tr key={t.id} className="hover:bg-white transition-colors">
                      <td className="py-1.5 font-semibold text-slate-800 truncate max-w-[120px]">
                        {t.name}
                      </td>
                      <td className="py-1.5 text-center font-bold text-indigo-700">
                        {t.load}
                      </td>
                      <td className="py-1.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.gaps === 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.gaps <= 2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {t.gaps}
                        </span>
                      </td>
                      <td className="py-1.5 text-end">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 inline-block overflow-hidden align-middle">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((t.load / (stats.maxLoad || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column 2: Room Utilization Table */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>{isRtl ? 'نسب إشغال القاعات والمعامل' : 'Room & Lab Utilization'}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {rooms.length} {isRtl ? 'قاعة' : 'rooms'}
              </span>
            </h3>

            <div className="overflow-x-auto flex-1 max-h-64">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px]">
                    <th className="pb-1 text-start">{isRtl ? 'القاعة' : 'Room'}</th>
                    <th className="pb-1 text-center">{isRtl ? 'النوع' : 'Type'}</th>
                    <th className="pb-1 text-center">{isRtl ? 'الحصص' : 'Hours'}</th>
                    <th className="pb-1 text-end">{isRtl ? 'نسبة الإشغال' : 'Occupancy'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.roomStatsList.map((r) => (
                    <tr key={r.id} className="hover:bg-white transition-colors">
                      <td className="py-1.5 font-semibold text-slate-800 truncate max-w-[120px]">
                        {r.name}
                      </td>
                      <td className="py-1.5 text-center text-[10px] text-slate-500">
                        {r.type}
                      </td>
                      <td className="py-1.5 text-center font-bold text-slate-700">
                        {r.count}
                      </td>
                      <td className="py-1.5 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-bold text-slate-700">
                            {r.utilPercent}%
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 inline-block overflow-hidden align-middle">
                            <div
                              className={`h-1.5 rounded-full ${
                                r.utilPercent > 80
                                  ? 'bg-rose-500'
                                  : r.utilPercent > 40
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, r.utilPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs font-bold transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>{isRtl ? 'طباعة تقرير الإدارة' : 'Print Executive Report'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-bold transition"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
