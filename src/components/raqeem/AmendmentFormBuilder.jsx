import React, { useState } from "react";
import { Plus, Trash2, UserPlus, UserMinus, RefreshCw, FileText, Scale, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";

const MEMBER_ROLES = [
  { value: "chair", label: "رئيس" },
  { value: "vice_chair", label: "نائب الرئيس" },
  { value: "secretary", label: "أمين سر" },
  { value: "member", label: "عضو" },
  { value: "alternate", label: "بديل" },
  { value: "observer", label: "مراقب" },
  { value: "advisor", label: "مستشار" },
];

const AMENDMENT_FIELD_CONFIG = {
  add_member: {
    icon: UserPlus,
    title: "إضافة عضو",
    fields: ["members"],
  },
  end_member: {
    icon: UserMinus,
    title: "إنهاء عضوية",
    fields: ["members_end"],
  },
  change_role: {
    icon: RefreshCw,
    title: "تغيير دور",
    fields: ["role_changes"],
  },
  reconstitute: {
    icon: Users,
    title: "إعادة تشكيل",
    fields: ["members", "quorum", "voting_rule"],
  },
  rename: {
    icon: FileText,
    title: "إعادة تسمية",
    fields: ["names"],
  },
  amend_mandate: {
    icon: Scale,
    title: "تعديل الصلاحية",
    fields: ["mandate"],
  },
  change_quorum: {
    icon: Users,
    title: "تغيير النصاب",
    fields: ["quorum"],
  },
  change_voting_rule: {
    icon: Scale,
    title: "تغيير قاعدة التصويت",
    fields: ["voting_rule"],
  },
  extend_committee: {
    icon: Clock,
    title: "تمديد اللجنة",
    fields: ["term"],
  },
  renew_committee: {
    icon: Clock,
    title: "تجديد اللجنة",
    fields: ["term"],
  },
  other: {
    icon: FileText,
    title: "أخرى",
    fields: ["description"],
  },
};

export default function AmendmentFormBuilder({ type, value, onChange }) {
  const config = AMENDMENT_FIELD_CONFIG[type] || AMENDMENT_FIELD_CONFIG.other;
  const Icon = config.icon;
  const data = value || {};

  const update = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
        {config.title}
      </div>

      {/* Member additions */}
      {config.fields.includes("members") && (
        <MemberListEditor
          label="الأعضاء الجدد"
          members={data.members || []}
          onChange={(members) => update("members", members)}
        />
      )}

      {/* Member removals */}
      {config.fields.includes("members_end") && (
        <div className="space-y-2">
          <Label className="text-xs">أعضاء لإنهاء عضويتهم</Label>
          <Textarea
            rows={2}
            value={data.members_to_end || ""}
            onChange={(e) => update("members_to_end", e.target.value)}
            placeholder="أسماء الأعضاء المطلوب إنهاء عضويتهم — اسم لكل سطر"
          />
        </div>
      )}

      {/* Role changes */}
      {config.fields.includes("role_changes") && (
        <div className="space-y-2">
          <Label className="text-xs">تغييرات الأدوار</Label>
          {(data.role_changes || []).map((rc, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1 h-8 text-xs"
                placeholder="اسم العضو"
                value={rc.member_name || ""}
                onChange={(e) => {
                  const arr = [...(data.role_changes || [])];
                  arr[i] = { ...arr[i], member_name: e.target.value };
                  update("role_changes", arr);
                }}
              />
              <select
                className="h-8 text-xs rounded-md border border-input bg-transparent px-2"
                value={rc.new_role || ""}
                onChange={(e) => {
                  const arr = [...(data.role_changes || [])];
                  arr[i] = { ...arr[i], new_role: e.target.value };
                  update("role_changes", arr);
                }}
              >
                <option value="">— الدور —</option>
                {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  const arr = (data.role_changes || []).filter((_, j) => j !== i);
                  update("role_changes", arr);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => update("role_changes", [...(data.role_changes || []), {}])}
            className="h-7 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة تغيير دور
          </Button>
        </div>
      )}

      {/* Names (rename) */}
      {config.fields.includes("names") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">الاسم الجديد بالعربية</Label>
            <Input value={data.new_name_ar || ""} onChange={(e) => update("new_name_ar", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">الاسم الجديد بالإنجليزية</Label>
            <Input dir="ltr" value={data.new_name_en || ""} onChange={(e) => update("new_name_en", e.target.value)} />
          </div>
        </div>
      )}

      {/* Mandate */}
      {config.fields.includes("mandate") && (
        <div className="space-y-2">
          <Label className="text-xs">الصلاحية / الاختصاص الجديد</Label>
          <Textarea
            rows={3}
            value={data.new_mandate || ""}
            onChange={(e) => update("new_mandate", e.target.value)}
            placeholder="نص الصلاحية المعدّلة"
          />
        </div>
      )}

      {/* Quorum */}
      {config.fields.includes("quorum") && (
        <div className="space-y-1.5">
          <Label className="text-xs">النصاب الجديد (عدد الأعضاء)</Label>
          <Input
            type="number"
            min="1"
            value={data.new_quorum || ""}
            onChange={(e) => update("new_quorum", parseInt(e.target.value) || 3)}
          />
        </div>
      )}

      {/* Voting rule */}
      {config.fields.includes("voting_rule") && (
        <div className="space-y-1.5">
          <Label className="text-xs">قاعدة التصويت الجديدة</Label>
          <select
            value={data.new_voting_rule || ""}
            onChange={(e) => update("new_voting_rule", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">— اختر —</option>
            <option value="simple_majority">أغلبية بسيطة</option>
            <option value="two_thirds">ثلثان</option>
            <option value="unanimous">إجماع</option>
            <option value="chair_decides">يقرر الرئيس</option>
          </select>
        </div>
      )}

      {/* Term */}
      {config.fields.includes("term") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <LocalizedDatePicker
            label="تاريخ بداية المدة"
            value={data.new_term_start || ""}
            onChange={(v) => update("new_term_start", v)}
          />
          <LocalizedDatePicker
            label="تاريخ نهاية المدة"
            value={data.new_term_end || ""}
            onChange={(v) => update("new_term_end", v)}
          />
        </div>
      )}
    </div>
  );
}

function MemberListEditor({ label, members, onChange }) {
  const add = () => onChange([...members, { full_name: "", full_name_ar: "", role: "member", institution_name: "" }]);
  const remove = (i) => onChange(members.filter((_, j) => j !== i));
  const updateMember = (i, key, val) => {
    const arr = [...members];
    arr[i] = { ...arr[i], [key]: val };
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {members.map((m, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 rounded-md bg-secondary/30">
          <Input
            className="h-8 text-xs"
            placeholder="الاسم الكامل"
            value={m.full_name_ar || m.full_name || ""}
            onChange={(e) => updateMember(i, "full_name_ar", e.target.value)}
          />
          <Input
            className="h-8 text-xs"
            placeholder="الجهة الممثلة"
            value={m.institution_name || ""}
            onChange={(e) => updateMember(i, "institution_name", e.target.value)}
          />
          <select
            className="h-8 text-xs rounded-md border border-input bg-transparent px-2"
            value={m.role || "member"}
            onChange={(e) => updateMember(i, "role", e.target.value)}
          >
            {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs">
        <Plus className="w-3.5 h-3.5" /> إضافة عضو
      </Button>
    </div>
  );
}