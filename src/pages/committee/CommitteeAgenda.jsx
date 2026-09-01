import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const READINESS = {
  ready: { ar: "جاهز", en: "Ready", color: "bg-emerald-100 text-emerald-700" },
  needs_attention: { ar: "يحتاج اهتمام", en: "Needs Attention", color: "bg-amber-100 text-amber-700" },
  not_ready: { ar: "غير جاهز", en: "Not Ready", color: "bg-red-100 text-red-700" },
};

const STATUS = {
  pending: { ar: "معلق", en: "Pending", color: "bg-secondary text-muted-foreground" },
  in_discussion: { ar: "قيد المناقشة", en: "In Discussion", color: "bg-secondary text-muted-foreground" },
  decided: { ar: "تم القرار", en: "Decided", color: "bg-emerald-100 text-emerald-700" },
  deferred: { ar: "مؤجل", en: "Deferred", color: "bg-amber-100 text-amber-700" },
  withdrawn: { ar: "مسحب", en: "Withdrawn", color: "bg-red-100 text-red-700" },
};

export default function CommitteeAgenda() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("agenda");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ meeting_id: "", title: "", objective: "", presenter: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const committeeId = data?.committee?.id;
  const myRole = data?.my_role;
  const isOversight = data?.is_oversight;
  const canSubmit = !isOversight && ["chair", "vice_chair", "secretary", "member"].includes(myRole);
  const upcomingMeetings = data?.meetings?.upcoming || [];

  const fetchItems = async () => {
    if (!committeeId) return;
    const meetingIds = [...upcomingMeetings, ...(data?.meetings?.previous || [])].map((m) => m.id);
    if (meetingIds.length === 0) { setItems([]); setLoading(false); return; }
    try {
      const all = await base44.entities.AgendaItem.filter({ committee_id: committeeId });
      const filtered = (all || []).filter((a) => meetingIds.includes(a.meeting_id));
      filtered.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      setItems(filtered);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [committeeId]);

  const submit = async () => {
    if (!form.meeting_id || !form.title.trim()) { setError("Meeting and title are required"); return; }
    setSubmitting(true); setError("");
    try {
      await base44.functions.invoke("SubmitAgendaItem", { committee_id: committeeId, ...form });
      setShowCreate(false); setForm({ meeting_id: "", title: "", objective: "", presenter: "" });
      fetchItems();
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Failed"); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("جدول الأعمال", "Agenda", lang)}</h1>
        </div>
        {canSubmit && upcomingMeetings.length > 0 && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("بند جديد", "New Item")}
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("إضافة بند", "Add Agenda Item")}</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div><Label>{t("الاجتماع", "Meeting")}</Label>
            <select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={form.meeting_id} onChange={(e) => setForm(f => ({ ...f, meeting_id: e.target.value }))}>
              <option value="">— Select —</option>
              {upcomingMeetings.map((m) => <option key={m.id} value={m.id}>{m.title || m.title_ar} — {new Date(m.date).toLocaleDateString()}</option>)}
            </select>
          </div>
          <div><Label>{t("العنوان", "Title")}</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Review Q3 Budget" /></div>
          <div><Label>{t("الهدف", "Objective")}</Label><Textarea value={form.objective} onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} /></div>
          <div><Label>{t("المقدم", "Presenter")}</Label><Input value={form.presenter} onChange={(e) => setForm(f => ({ ...f, presenter: e.target.value }))} placeholder="Dr. Sara Al-Kuwari" /></div>
          <Button onClick={submit} disabled={submitting} className="w-full">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("إضافة", "Add")}</Button>
        </div>
      )}
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("لا توجد بنود", "No Agenda Items")} description={t("لم يتم إضافة بنود لجدول أعمال أي اجتماع.", "No agenda items added for any meeting.")} />
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const ri = READINESS[a.readiness] || READINESS.not_ready;
            const si = STATUS[a.status] || STATUS.pending;
            return (
              <div key={a.id} className="raqeem-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{a.sequence}</span>
                    <span className="text-sm font-medium">{a.title_ar || a.title}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <StatusBadge label={t(ri.ar, ri.en)} colorClass={ri.color} />
                    <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
                  </div>
                </div>
                {a.objective && <p className="text-xs text-muted-foreground">{a.objective}</p>}
                {a.presenter && <p className="text-xs text-muted-foreground mt-1">{t("المقدم", "Presenter")}: {a.presenter}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}