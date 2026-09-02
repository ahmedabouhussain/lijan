import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import RecurrenceConfig from "@/components/raqeem/RecurrenceConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";
import { Calendar, Plus, X, Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CommitteeMeetings() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("meetings");
  const { orgRef, committeeRef } = useParams();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", mode: "hybrid", provider: "none", location: "", recurrence_type: "none", recurrence_interval: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { meetings, committee, my_role, is_oversight } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const canCreate = !is_oversight && ["chair", "vice_chair", "secretary"].includes(my_role);

  const submit = async () => {
    if (!form.title.trim() || !form.date) { setError("Title and date are required"); return; }
    setSubmitting(true); setError("");
    try {
      const payload = { ...form, date: new Date(form.date).toISOString() };
      // Only send recurrence fields if a pattern is selected
      if (form.recurrence_type === "none") {
        delete payload.recurrence_type;
        delete payload.recurrence_interval;
      }
      const res = await base44.functions.invoke("CreateMeeting", { committee_id: committee.id, ...payload });
      setShowCreate(false);
      setForm({ title: "", date: "", mode: "hybrid", provider: "none", location: "", recurrence_type: "none", recurrence_interval: 1 });
      reload();
      if (res?.instances_created > 0) {
        setError("");
      }
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Failed"); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Calendar}
        title={getTitle("اجتماعات اللجنة", "Committee Meetings", lang)}
        subtitle={getDescription("جدول اجتماعات اللجنة وتاريخها", "Committee meeting schedule and history", lang)}
        actions={canCreate && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("اجتماع جديد", "New Meeting")}
          </Button>
        )}
      />

      {showCreate && (
        <div className="raqeem-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("إنشاء اجتماع", "Create Meeting")}</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>{t("العنوان", "Title")}</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Quarterly Review" /></div>
            <div><Label>{t("التاريخ والوقت", "Date & Time")}</Label><Input type="datetime-local" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>{t("الوضع", "Mode")}</Label><select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={form.mode} onChange={(e) => setForm(f => ({ ...f, mode: e.target.value }))}><option value="physical">Physical</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></div>
            <div><Label>{t("المزود", "Provider")}</Label><select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={form.provider} onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}><option value="none">None</option><option value="teams">Teams</option><option value="zoom">Zoom</option><option value="external_link">External Link</option></select></div>
          </div>
          <RecurrenceConfig
            value={{
              recurrence_type: form.recurrence_type,
              recurrence_interval: form.recurrence_interval,
              recurrence_count: form.recurrence_count,
              recurrence_until: form.recurrence_until,
              recurrence_days_of_week: form.recurrence_days_of_week,
              recurrence_month_day: form.recurrence_month_day,
            }}
            onChange={(patch) => setForm(f => ({ ...f, ...patch }))}
          />
          <Button onClick={submit} disabled={submitting} className="w-full">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("إنشاء", "Create")}</Button>
        </div>
      )}

      {/* Upcoming */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3">{t("القادمة", "Upcoming")} ({meetings.upcoming.length})</h3>
        {meetings.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات قادمة", "No upcoming meetings")}</p>
        ) : (
          <div className="space-y-2">
            {meetings.upcoming.map((m) => (
              <Link key={m.id} to={`${base}/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div className="flex items-center gap-2">
                  {(m.is_series_master || m.series_id) && (
                    <Repeat className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div>
                  </div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Previous */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3">{t("السابقة", "Previous")} ({meetings.previous.length})</h3>
        {meetings.previous.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات سابقة", "No previous meetings")}</p>
        ) : (
          <div className="space-y-2">
            {meetings.previous.map((m) => (
              <Link key={m.id} to={`${base}/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div className="flex items-center gap-2">
                  {(m.is_series_master || m.series_id) && (
                    <Repeat className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                  </div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}