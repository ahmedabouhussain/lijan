import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { UserCog, Loader2, Plus, X, RefreshCw, Save, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };

const ROLES = [
  { value: "chair", label: "رئيس" },
  { value: "vice_chair", label: "نائب رئيس" },
  { value: "secretary", label: "أمين" },
  { value: "member", label: "عضو" },
  { value: "alternate", label: "بديل" },
  { value: "observer", label: "مراقب" },
  { value: "advisor", label: "مستشار" },
];

export default function CommitteeFormation() {
  const { data, reload } = useCommittee();
  const { t } = useLanguage();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Rename
  const [rename, setRename] = useState({ name_ar: "", name_en: "" });
  // Mandate
  const [mandateForm, setMandateForm] = useState({ mandate: "", scope: "" });
  // Add member
  const [newMember, setNewMember] = useState({ full_name: "", role: "member", institution_name: "", email: "" });
  // Reform
  const [reformList, setReformList] = useState([]);
  const [reformMember, setReformMember] = useState({ full_name: "", role: "member", institution_name: "" });

  if (!data) return null;
  const { committee, members } = data;
  const ordered = [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99));

  const call = async (action, payload, label) => {
    setBusy(action);
    setErr("");
    setMsg("");
    try {
      const res = await base44.functions.invoke("UpdateCommitteeFormation", { committee_id: committee.id, action, ...payload });
      const d = res.data || res;
      if (d.error) {
        setErr(d.error);
      } else {
        setMsg(`${label} — تم. ${d.notified ? `تم إشعار ${d.notified} عضو.` : ""}`);
        reload();
      }
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "تعذّر التنفيذ");
    }
    setBusy("");
  };

  const addReformMember = () => {
    if (!reformMember.full_name.trim()) return;
    setReformList((l) => [...l, { ...reformMember, protocol_order: 99 }]);
    setReformMember({ full_name: "", role: "member", institution_name: "" });
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <UserCog className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">تحديثات التشكيل · Formation Updates</h1>
      </div>

      {msg && <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">{msg}</div>}
      {err && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{err}</div>}

      {/* Rename */}
      <div className="raqeem-card p-4 space-y-3">
        <Label className="text-sm font-semibold">إعادة تسمية اللجنة · Rename</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder={committee.name_ar}
            value={rename.name_ar}
            onChange={(e) => setRename((r) => ({ ...r, name_ar: e.target.value }))}
          />
          <Input
            placeholder={committee.name_en}
            value={rename.name_en}
            onChange={(e) => setRename((r) => ({ ...r, name_en: e.target.value }))}
            dir="ltr"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy === "rename" || (!rename.name_ar && !rename.name_en)}
          onClick={() => call("rename", rename, "إعادة التسمية")}
          className="inline-flex items-center gap-2"
        >
          {busy === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التسمية
        </Button>
      </div>

      {/* Mandate / Scope */}
      <div className="raqeem-card p-4 space-y-3">
        <Label className="text-sm font-semibold">الصلاحية والاختصاصات · Mandate & Scope</Label>
        <Textarea
          placeholder={committee.mandate || "نص الصلاحية"}
          value={mandateForm.mandate}
          onChange={(e) => setMandateForm((f) => ({ ...f, mandate: e.target.value }))}
          rows={3}
        />
        <Textarea
          placeholder={committee.scope || "النطاق والمسؤوليات"}
          value={mandateForm.scope}
          onChange={(e) => setMandateForm((f) => ({ ...f, scope: e.target.value }))}
          rows={3}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy === "update_mandate" || (!mandateForm.mandate && !mandateForm.scope)}
          onClick={() => call("update_mandate", mandateForm, "تحديث الاختصاصات")}
          className="inline-flex items-center gap-2"
        >
          {busy === "update_mandate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ الاختصاصات
        </Button>
      </div>

      {/* Add member */}
      <div className="raqeem-card p-4 space-y-3">
        <Label className="text-sm font-semibold">إضافة عضو · Add Member</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            placeholder="الاسم الكامل"
            value={newMember.full_name}
            onChange={(e) => setNewMember((m) => ({ ...m, full_name: e.target.value }))}
          />
          <Input
            placeholder="البريد الإلكتروني (للإشعار)"
            value={newMember.email}
            onChange={(e) => setNewMember((m) => ({ ...m, email: e.target.value }))}
            dir="ltr"
          />
          <Input
            placeholder="الجهة الممثَّلة"
            value={newMember.institution_name}
            onChange={(e) => setNewMember((m) => ({ ...m, institution_name: e.target.value }))}
          />
          <select
            value={newMember.role}
            onChange={(e) => setNewMember((m) => ({ ...m, role: e.target.value }))}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy === "add_member" || !newMember.full_name.trim()}
          onClick={() => {
            call("add_member", { member: newMember }, "إضافة عضو");
            setNewMember({ full_name: "", role: "member", institution_name: "", email: "" });
          }}
          className="inline-flex items-center gap-2"
        >
          {busy === "add_member" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إضافة وإشعار
        </Button>
      </div>

      {/* Current members */}
      <div className="raqeem-card divide-y divide-border">
        <div className="p-3 pb-2">
          <Label className="text-sm font-semibold">الأعضاء الحاليون · Current Members ({ordered.length})</Label>
        </div>
        {ordered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">لا يوجد أعضاء</div>
        ) : (
          ordered.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{m.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.institution_name || "—"} {m.user_email ? `· ${m.user_email}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
                <button
                  disabled={busy === "remove_member"}
                  onClick={() => call("remove_member", { membership_id: m.id }, "إزالة عضو")}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  {busy === "remove_member" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reform */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">إعادة التشكيل · Reform Roster</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          سيتم إنهاء جميع الأعضاء الحاليين واستبدالهم بقائمة جديدة. يتطلب تأكيدًا.
        </p>
        {reformList.length > 0 && (
          <div className="space-y-1.5">
            {reformList.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-secondary/30 text-sm">
                <span>{m.full_name} · {ROLES.find((r) => r.value === m.role)?.label}</span>
                <button
                  onClick={() => setReformList((l) => l.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder="اسم العضو"
              value={reformMember.full_name}
              onChange={(e) => setReformMember((m) => ({ ...m, full_name: e.target.value }))}
              className="text-sm"
            />
          </div>
          <select
            value={reformMember.role}
            onChange={(e) => setReformMember((m) => ({ ...m, role: e.target.value }))}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={addReformMember}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {reformList.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            disabled={busy === "reform"}
            onClick={() => {
              if (!confirm("تأكيد إعادة التشكيل؟ سيتم استبدال جميع الأعضاء الحاليين.")) return;
              call("reform", { members: reformList }, "إعادة التشكيل");
              setReformList([]);
            }}
            className="inline-flex items-center gap-2"
          >
            {busy === "reform" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تأكيد إعادة التشكيل ({reformList.length} أعضاء)
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-md bg-secondary/30">
        <Mail className="w-3.5 h-3.5" />
        يتم إشعار جميع الأعضاء الذين لديهم بريد إلكتروني فورًا بعد كل تحديث.
      </div>
    </div>
  );
}