'use client';

import React, { useState } from 'react';
import {
  Sliders,
  X,
  Plus,
  Trash2,
  Pencil,
  Check,
  Calendar,
  Clock,
  Coffee,
  Users,
  Grid,
  Sparkles,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  AdvancedRelationRule,
  AdvancedRelationType,
  Subject,
  Teacher,
  ClassGroup,
} from '../lib/types';
import { translations } from '../lib/i18n';

interface AdvancedRelationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ar';
  rules: AdvancedRelationRule[];
  onSaveRules: (rules: AdvancedRelationRule[]) => void;
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
}

export const AdvancedRelationsModal: React.FC<AdvancedRelationsModalProps> = ({
  isOpen,
  onClose,
  lang,
  rules,
  onSaveRules,
  subjects,
  teachers,
  classes,
}) => {
  const [localRules, setLocalRules] = useState<AdvancedRelationRule[]>(rules);
  const [editingRule, setEditingRule] = useState<Partial<AdvancedRelationRule> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  if (!isOpen) return null;

  const t = translations[lang];
  const isRtl = t.dir === 'rtl';

  const ruleTypeDefinitions: Record<
    AdvancedRelationType,
    { label: string; labelAr: string; icon: any; color: string; defaultParam: number; unit: string; unitAr: string }
  > = {
    DISTRIBUTION_ACROSS_DAYS: {
      label: 'Lesson distribution across days',
      labelAr: 'توزيع الحصص بانتظام على أيام الأسبوع',
      icon: Calendar,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      defaultParam: 1,
      unit: 'per day',
      unitAr: 'باليوم',
    },
    MAX_CONSECUTIVE_PERIODS: {
      label: 'Max consecutive periods',
      labelAr: 'الحد الأقصى للحصص المتتالية دون راحة',
      icon: Clock,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      defaultParam: 2,
      unit: 'periods',
      unitAr: 'حصص',
    },
    MAX_DAILY_HOURS: {
      label: 'Max daily lectures',
      labelAr: 'الحد الأقصى للمحاضرات اليومية',
      icon: Grid,
      color: 'bg-sky-100 text-sky-800 border-sky-300',
      defaultParam: 5,
      unit: 'lectures',
      unitAr: 'محاضرات',
    },
    TEACHER_GAP_LIMITS: {
      label: 'Faculty gap / window limits',
      labelAr: 'الحد من أوقات الفراغ لأعضاء هيئة التدريس',
      icon: Sliders,
      color: 'bg-violet-100 text-violet-800 border-violet-300',
      defaultParam: 1,
      unit: 'gaps / week',
      unitAr: 'فراغات أسبوعياً',
    },
    SHARED_CLASSROOM: {
      label: 'Shared halls / simultaneous sections',
      labelAr: 'القاعات المشتركة والشعب المتزامنة',
      icon: Users,
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      defaultParam: 2,
      unit: 'sections',
      unitAr: 'شعب',
    },
    LUNCH_BREAK_PLACEMENT: {
      label: 'Lunch & prayer break placement',
      labelAr: 'تثبيت استراحة الصلاة والغداء',
      icon: Coffee,
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      defaultParam: 4,
      unit: 'after lecture',
      unitAr: 'بعد المحاضرة',
    },
  };

  const handleToggleRule = (id: string) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    setLocalRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOpenAdd = () => {
    const defaultType: AdvancedRelationType = 'DISTRIBUTION_ACROSS_DAYS';
    setEditingRule({
      id: `RULE_${Date.now()}`,
      name: 'Uniform Subject Distribution',
      nameAr: 'توزيع متجانس للمادة خلال الأسبوع',
      type: defaultType,
      enabled: true,
      parameterValue: ruleTypeDefinitions[defaultType].defaultParam,
      subjectId: subjects[0]?.id,
      teacherId: undefined,
      classId: undefined,
      description: 'Evenly distribute scheduled lessons across all cycle days.',
      descriptionAr: 'توزيع متوازن للحصص لتفادي تكدسها في أيام متتالية.',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: AdvancedRelationRule) => {
    setEditingRule({ ...rule });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.name?.trim()) {
      setFormError(isRtl ? 'يرجى كتابة اسم للقيد' : 'Rule name is required');
      return;
    }

    const completeRule: AdvancedRelationRule = {
      id: editingRule.id || `RULE_${Date.now()}`,
      name: editingRule.name.trim(),
      nameAr: editingRule.nameAr?.trim() || editingRule.name.trim(),
      type: editingRule.type || 'DISTRIBUTION_ACROSS_DAYS',
      enabled: editingRule.enabled !== undefined ? editingRule.enabled : true,
      subjectId: editingRule.subjectId || undefined,
      teacherId: editingRule.teacherId || undefined,
      classId: editingRule.classId || undefined,
      parameterValue: editingRule.parameterValue !== undefined ? Number(editingRule.parameterValue) : 1,
      description: editingRule.description?.trim(),
      descriptionAr: editingRule.descriptionAr?.trim(),
    };

    setLocalRules((prev) => {
      const exists = prev.some((r) => r.id === completeRule.id);
      if (exists) {
        return prev.map((r) => (r.id === completeRule.id ? completeRule : r));
      }
      return [...prev, completeRule];
    });

    setIsFormOpen(false);
    setEditingRule(null);
  };

  const handleSaveAndClose = () => {
    onSaveRules(localRules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white px-5 py-3.5 flex items-center justify-between border-b border-indigo-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-300" />
            <div>
              <h2 className="font-bold text-sm tracking-tight">
                {isRtl ? 'القيود والعلاقات المتقدمة بين الحصص' : 'Advanced Relations & Constraints'}
              </h2>
              <p className="text-[11px] text-indigo-200">
                {isRtl
                  ? 'ضبط قواعد التوزيع، أوقات الفراغ، الحد الأقصى للحصص المتتالية، والقاعات المشتركة'
                  : 'Configure card distribution rules, teacher gap limits, consecutive periods, and shared rooms'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إضافة قيد متقدم جديد' : 'Add New Relation Rule'}</span>
            </button>
            <span className="text-slate-500 text-[11px]">
              {localRules.filter((r) => r.enabled).length} {isRtl ? 'قيد مفعل من أصل' : 'active of'}{' '}
              {localRules.length}
            </span>
          </div>
        </div>

        {/* Rules List Body */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0 text-xs text-slate-800 space-y-3">
          {localRules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>{isRtl ? 'لا توجد قيود مضافة حالياً. انقر على "إضافة قيد متقدم جديد" للبدء.' : 'No advanced relations configured. Click "Add New Relation Rule" to create one.'}</p>
            </div>
          ) : (
            localRules.map((rule) => {
              const def = ruleTypeDefinitions[rule.type] || ruleTypeDefinitions.DISTRIBUTION_ACROSS_DAYS;
              const Icon = def.icon;
              const targetSubject = subjects.find((s) => s.id === rule.subjectId);
              const targetTeacher = teachers.find((t) => t.id === rule.teacherId);
              const targetClass = classes.find((c) => c.id === rule.classId);

              return (
                <div
                  key={rule.id}
                  className={`border rounded-xl p-3.5 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    rule.enabled
                      ? 'bg-white border-slate-300 shadow-xs hover:border-indigo-400'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg border shrink-0 ${def.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {isRtl ? rule.nameAr || rule.name : rule.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${def.color}`}>
                          {isRtl ? def.labelAr : def.label}
                        </span>
                        {rule.parameterValue !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                            {isRtl ? `${rule.parameterValue} ${def.unitAr}` : `${rule.parameterValue} ${def.unit}`}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 text-[11px]">
                        {isRtl ? rule.descriptionAr || rule.description : rule.description}
                      </p>

                      {/* Applied Scope Badges */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] text-slate-600">
                        <span className="font-medium text-slate-400">{isRtl ? 'النطاق:' : 'Scope:'}</span>
                        {targetSubject && (
                          <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                            {isRtl ? 'المادة:' : 'Subject:'} {isRtl ? targetSubject.nameAr || targetSubject.name : targetSubject.name}
                          </span>
                        )}
                        {targetTeacher && (
                          <span className="bg-violet-50 text-violet-800 px-2 py-0.5 rounded border border-violet-200">
                            {isRtl ? 'المعلم:' : 'Teacher:'} {isRtl ? targetTeacher.nameAr || targetTeacher.name : targetTeacher.name}
                          </span>
                        )}
                        {targetClass && (
                          <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                            {isRtl ? 'الفصل:' : 'Class:'} {isRtl ? targetClass.nameAr || targetClass.name : targetClass.name}
                          </span>
                        )}
                        {!targetSubject && !targetTeacher && !targetClass && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            {isRtl ? 'كافة المواد والمعلمين' : 'Whole School (All Entities)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Enabled Toggle */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition border ${
                        rule.enabled
                          ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {rule.enabled ? (isRtl ? 'مفعل' : 'Enabled') : isRtl ? 'معطل' : 'Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 rounded hover:bg-indigo-100 text-indigo-700 transition"
                      title={isRtl ? 'تعديل' : 'Edit'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded hover:bg-rose-100 text-rose-700 transition"
                      title={isRtl ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تطبيق وإغلاق' : 'Save & Apply'}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Rule Sub-Dialog */}
      {isFormOpen && editingRule && (
        <div className="fixed inset-0 z-60 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-indigo-800 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-xs">
                {editingRule.id && localRules.some((r) => r.id === editingRule.id)
                  ? isRtl
                    ? 'تعديل قيد متقدم'
                    : 'Edit Advanced Relation Rule'
                  : isRtl
                  ? 'إضافة قيد متقدم جديد'
                  : 'Add New Advanced Relation Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded hover:bg-indigo-700 text-indigo-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-4 flex flex-col gap-3 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-300 rounded p-2 text-rose-700 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Rule Type Selector */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  {isRtl ? 'نوع القيد / العلاقة' : 'Relation Rule Type'} *
                </label>
                <select
                  value={editingRule.type || 'DISTRIBUTION_ACROSS_DAYS'}
                  onChange={(e) => {
                    const newType = e.target.value as AdvancedRelationType;
                    const def = ruleTypeDefinitions[newType];
                    setEditingRule({
                      ...editingRule,
                      type: newType,
                      parameterValue: def.defaultParam,
                      name: def.label,
                      nameAr: def.labelAr,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(Object.keys(ruleTypeDefinitions) as AdvancedRelationType[]).map((typeKey) => (
                    <option key={typeKey} value={typeKey}>
                      {isRtl ? ruleTypeDefinitions[typeKey].labelAr : ruleTypeDefinitions[typeKey].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rule Name (English) */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  {isRtl ? 'عنوان القيد (إنجليزي)' : 'Rule Title (English)'} *
                </label>
                <input
                  type="text"
                  required
                  value={editingRule.name || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Rule Name (Arabic) */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  {isRtl ? 'عنوان القيد (عربي)' : 'Rule Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={editingRule.nameAr || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, nameAr: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Parameter Value */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  {isRtl ? 'القيمة / الحد الأقصى' : 'Constraint Parameter Value'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editingRule.parameterValue ?? 1}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, parameterValue: parseInt(e.target.value) || 1 })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Entity Scope Selectors */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المادة' : 'Subject'}</label>
                  <select
                    value={editingRule.subjectId || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, subjectId: e.target.value || undefined })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                  >
                    <option value="">{isRtl ? 'كافة المواد' : 'All Subjects'}</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'المعلم' : 'Teacher'}</label>
                  <select
                    value={editingRule.teacherId || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, teacherId: e.target.value || undefined })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                  >
                    <option value="">{isRtl ? 'كافة المعلمين' : 'All Teachers'}</option>
                    {teachers.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {isRtl ? tc.nameAr || tc.name : tc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">{isRtl ? 'الفصل' : 'Class'}</label>
                  <select
                    value={editingRule.classId || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, classId: e.target.value || undefined })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                  >
                    <option value="">{isRtl ? 'كافة الفصول' : 'All Classes'}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isRtl ? c.nameAr || c.name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Enabled checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ruleEnabledCheckbox"
                  checked={editingRule.enabled ?? true}
                  onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="ruleEnabledCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                  {isRtl ? 'تفعيل هذا القيد في عملية التوليد الحسابية' : 'Enable rule during solver optimization'}
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'حفظ القيد' : 'Save Rule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
