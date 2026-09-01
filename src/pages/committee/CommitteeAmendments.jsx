import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { base44 } from "@/api/base44Client";
import { GitBranch, Loader2, Plus, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";

const AMENDMENT_TYPES = [
  { value: "add_member", label: "إضافة عضو" },
  { value: "end_member", label: "إنهاء عضوية" },
  { value: "change_role", label: "تغيير دور" },
  { value: "reconstitute", label: "إعادة تشكيل" },
  { value: "rename", label: "إعادة تسمية" },
  { value: "amend_mandate", label: "تعديل الصلاحية" },
  { value: "change_quorum", label: "تغيير النصاب" },
  { value: "change_voting_rule", label: "تغيير قاعدة التصويت" },
  { value: "extend_committee", label: "تمديد اللجنة" },
  { value: "renew_committee", label: "تجديد اللجنة" },
  { value: "other", label: "أخرى" },
];

const STATUS_COLORS = {
  draft: "bg-secondary text-secondary-foreground",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  effective: "bg-green-100 text-green-700",
  rejected: "bg-destructive/15 text-destructive",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-secondary text-muted-foreground",
  superseded: "bg-secondary text-muted-foreground",
};

export default function CommitteeAmendments() {
  const { data, reload } = useCommittee();
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    amendment_type: "add_member",
    description: "",
    source_instrument_ref: "",
    effective_date: "",
    after_state: "",
  });

  const load = async () => {
    if (!data?.committee) return;
    setLoading(true);
    try {
      const res = await base44.entities.CommitteeAmendment.filter({
        committee_id: data.committee.id,
      }, "-created_date", 50);
      setAmendments(res || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [data?.committee?.id]);

  const propose = async () => {
    if (!form.description) { setMsg("الوصف مطلوب"); return; }
    setBusy("propose");
    setMsg("");
    try {
      let afterState = {};
      if (form.after_state) {
        try { afterState = JSON.parse(form.after_state); } catch { afterState = { note: form.after_state }; }
      }
      const res = await base44.functions.invoke("ProposeCommitteeAmendment", {
        committee_id: data.committee.id,
        amendment_type: form.amendment_type,
        description: form.description,
        source_instrument_ref: form.source_instrument_ref,
        effective_date: form.effective_date,
        after_state: afterState,
      });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else {
        setMsg(`تم إنشاء مقترح التعديل. الأثر: ${d.impact_summary}`);
        setShowForm(false);
        setForm({ amendment_type: "add_member", description: "", source_instrument_ref: "", effective_date: "", after_state: "" });
        load();
      }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  const approve = async (id) => {
    if (!confirm("تأكيد اعتماد هذا التعديل ونفاذه؟")) return;
    setBusy(`approve-${id}`);
    setMsg("");
    try {
      const res = await base44.functions.invoke("ApproveCommitteeAmendment", { amendment_id: id });
      const d = res.data || res;
      if (d.error) { setMsg(d.error); }
      else { setMsg(`تم اعتماد التعديل — نسخة تشكيل #${d.formation_version}`); load(); reload(); }
    } catch (e) { setMsg(e?.message || "خطأ"); }
    setBusy("");
  };

  const reject = async (id) => {
    if (!confirm("رفض هذا التعديل؟")) return;
    setBusy(`reject-${id}`);
    try {
      await base44.entities.CommitteeAmendment.update(id, { status: "rejected" });
      load();
    } catch (e) {}
    setBusy("");
  };

  if (!data) return null;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">التعديلات المحوَّكة · Governed Amendments</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4" /> اقتراح تعديل
        </Button>
      </div>

      {msg && <div className="p-3 rounded-md bg-secondary text-sm">{msg}</div>}

      {showForm && (
        <div className="raqeem-card p-4 space-y-3">
          <Label className="text-sm font-semibold">اقتراح تعديل محوَّك</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نوع التعديل</Label>
              <select
                value={form.amendment_type}
                onChange={(e) => setForm((f) => ({ ...f, amendment_type: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {AMENDMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">تاريخ النفاذ (اختياري — للمستقبلي)</Label>
              <Input type="date" value={form.effective_date} onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">الوصف / السبب</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label className="text-xs">مرجع السند الرسمي</Label>
            <Input value={form.source_instrument_ref} onChange={(e) => setForm((f) => ({ ...f, source_instrument_ref: e.target.value }))} placeholder="رقم القرار / المرسوم" />
          </div>
          <div>
            <Label className="text-xs">الحالة المستهدفة (JSON أو نص)</Label>
            <Textarea
              value={form.after_state}
              onChange={(e) => setForm((f) => ({ ...f, after_state: e.target.value }))}
              rows={3}
              placeholder='{"name_ar":"...","members":[{"full_name":"...","role":"member"}]}'
              dir="ltr"
            />
          </div>
          <Button size="sm" disabled={busy === "propose"} onClick={propose} className="inline-flex items-center gap-2">
            {busy === "propose" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إنشاء مقترح + تحليل الأثر
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : amendments.length === 0 ? (
        <div className="raqeem-card p-6 text-center text-sm text-muted-foreground">
          لا توجد تعديلات. كل تغيير رسمي يمر عبر سير عمل محوَّك: اقتراح → تحليل أثر → اعتماد → نفاذ.
        </div>
      ) : (
        <div className="space-y-2">
          {amendments.map((a) => (
            <div key={a.id} className="raqeem-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {AMENDMENT_TYPES.find((t) => t.value === a.amendment_type)?.label || a.amendment_type}
                  </div>
                  {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                  {a.source_instrument_ref && <div className="text-xs text-muted-foreground">السند: {a.source_instrument_ref}</div>}
                  {a.effective_date && <div className="text-xs text-muted-foreground">نفاذ: {a.effective_date}</div>}
                </div>
                <StatusBadge label={a.status} colorClass={STATUS_COLORS[a.status] || "bg-secondary"} />
              </div>
              {a.impact_summary && (
                <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{a.impact_summary}</span>
                </div>
              )}
              {a.proposed_by_name && (
                <div className="text-xs text-muted-foreground">اقترح: {a.proposed_by_name}</div>
              )}
              {(a.status === "draft" || a.status === "pending_approval" || a.status === "returned") && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm" variant="outline"
                    disabled={busy === `approve-${a.id}`}
                    onClick={() => approve(a.id)}
                    className="inline-flex items-center gap-1.5 h-7 text-xs"
                  >
                    {busy === `approve-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    اعتماد ونفاذ
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    disabled={busy === `reject-${a.id}`}
                    onClick={() => reject(a.id)}
                    className="inline-flex items-center gap-1.5 h-7 text-xs text-destructive"
                  >
                    {busy === `reject-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}