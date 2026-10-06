import React, { useMemo, useState } from "react";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import PageHeader from "@/components/raqeem/PageHeader";
import EmptyState from "@/components/raqeem/EmptyState";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import { Button } from "@/components/ui/button";
import { UserCog, Plus } from "lucide-react";
import { APPOINTMENT_EVENTS, SELF_SERVICE_EVENTS, INSTITUTIONAL_EVENTS, REASON_CLASSES, label } from "@/lib/structureLabels";

// CommitteeAppointments — seats, appointments, vacancies and bounded acting capacity.
//
// The seat is not the person. A resignation is a personal act the holder records for THEMSELVES; every
// institutional act (appointment, removal, end of term, expiry) belongs to the office that holds
// committee.manage. An acting appointment states its powers and its expiry, and nothing succeeds an
// office automatically.
export default function CommitteeAppointments() {
  const { records: seats, loading, reload } = useCommitteeScopedData("CommitteeMembership");
  const { records: events, reload: reloadEvents } = useCommitteeScopedData("SeatAppointmentEvent");
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { canManageGovernance } = useCommitteeAdmin();
  const [dialog, setDialog] = useState(null);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const SEAT_OPTIONS = useMemo(
    () => (seats || []).map((s) => ({
      value: s.id,
      label_ar: `${s.full_name_ar || s.full_name} — ${s.role}${s.appointment_type === "acting" ? " (مؤقت)" : ""}`,
      label_en: `${s.full_name || s.full_name_ar} — ${s.role}${s.appointment_type === "acting" ? " (acting)" : ""}`,
    })),
    [seats]
  );

  const eventOptions = (keys) => keys.map((k) => ({ value: k, label_ar: APPOINTMENT_EVENTS[k].ar, label_en: APPOINTMENT_EVENTS[k].en }));

  const roleOptions = ["chair", "vice_chair", "secretary", "committee_administrator", "member", "alternate", "observer", "advisor"]
    .map((v) => ({ value: v, label_ar: v, label_en: v }));

  const eventsFor = (membershipId) => (events || [])
    .filter((e) => e.membership_id === membershipId || e.successor_membership_id === membershipId)
    .sort((a, b) => String(b.effective_at).localeCompare(String(a.effective_at)));

  const openSeats = (seats || []).filter((s) => s.status === "active");
  const endedSeats = (seats || []).filter((s) => s.status !== "active");

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserCog}
        title={t("التعيينات والاستمرارية", "Appointments & Continuity", lang)}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialog("self")}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t("استقالة / غياب", "Resign / Absence")}
            </Button>
            {canManageGovernance && (
              <Button size="sm" onClick={() => setDialog("institutional")}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                {t("قرار مؤسسي", "Institutional Act")}
              </Button>
            )}
          </div>
        }
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t(
          "المقعد لا الشخص: كل حدث مؤرَّخ بسلطته المختصة، والتكليف المؤقت محدود الصلاحيات ومنتهٍ بوقته — ولا منصب يرث صلاحيات غيره تلقائيًا.",
          "The seat is not the person: every event is dated and attributed, an acting appointment is bounded in scope and time, and no office inherits another's powers automatically.",
          lang
        )}
      </p>

      {dialog === "self" && (
        <CrudFormDialog
          open
          onClose={() => setDialog(null)}
          title={t("حدث يخصّ مقعدك", "An Event About Your Own Seat")}
          functionName="RecordAppointmentEvent"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={() => { reload(); reloadEvents(); }}
          submitLabel={t("تسجيل", "Record")}
          fields={[
            { name: "membership_id", label: t("المقعد", "Seat"), type: "select", required: true, options: SEAT_OPTIONS },
            { name: "event_type", label: t("الحدث", "Event"), type: "select", required: true, options: eventOptions(SELF_SERVICE_EVENTS) },
            { name: "effective_at", label: t("تاريخ النفاذ", "Effective At"), type: "date", required: true },
            { name: "reason_class", label: t("فئة السبب", "Reason Class"), type: "select", options: REASON_CLASSES.map((r) => ({ value: r.value, label_ar: r.ar, label_en: r.en })) },
            { name: "evidence_url", label: t("الدليل", "Evidence"), fullWidth: true, placeholder: "https://" },
            { name: "reason_note", label: t("البيان المؤسسي", "Institutional Note"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {dialog === "institutional" && canManageGovernance && (
        <CrudFormDialog
          open
          onClose={() => setDialog(null)}
          title={t("قرار مؤسسي على المقعد", "Institutional Act on a Seat")}
          functionName="RecordAppointmentEvent"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={() => { reload(); reloadEvents(); }}
          submitLabel={t("تسجيل القرار", "Record")}
          fields={[
            { name: "membership_id", label: t("المقعد المتأثر", "Affected Seat"), type: "select", required: true, options: SEAT_OPTIONS },
            { name: "event_type", label: t("الحدث", "Event"), type: "select", required: true, options: eventOptions(INSTITUTIONAL_EVENTS) },
            { name: "effective_at", label: t("تاريخ النفاذ", "Effective At"), type: "date", required: true },
            { name: "competent_authority", label: t("السلطة المختصة", "Competent Authority"), fullWidth: true },
            { name: "evidence_url", label: t("السند / الدليل", "Instrument / Evidence"), fullWidth: true, placeholder: "https://" },
            { name: "role", label: t("صفة التعيين (للتعيين والتكليف)", "Assignment Role (for appointments)"), type: "select", options: roleOptions },
            { name: "successor_user_id", label: t("معرّف الشخص الجديد (user id)", "Incoming Person (user id)"), fullWidth: true },
            { name: "successor_name", label: t("اسم الشخص الجديد", "Incoming Person Name") },
            { name: "acting_scope", label: t("صلاحيات التكليف المؤقت (مفصولة بفاصلة)", "Bounded Acting Scope (comma separated)"), fullWidth: true, placeholder: "vote.call, decision.issue" },
            { name: "acting_expires_at", label: t("انتهاء التكليف المؤقت", "Acting Expiry"), type: "date" },
            { name: "reason_class", label: t("فئة السبب", "Reason Class"), type: "select", options: REASON_CLASSES.map((r) => ({ value: r.value, label_ar: r.ar, label_en: r.en })) },
            { name: "reason_note", label: t("البيان", "Note"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...", lang)}</div>
      ) : (seats || []).length === 0 ? (
        <EmptyState icon={UserCog} title={t("لا توجد مقاعد", "No seats", lang)} description={t("لم تُسجَّل مقاعد لهذه اللجنة بعد.", "No seats recorded for this committee yet.", lang)} />
      ) : (
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="raqeem-section-title">{t("المقاعد القائمة", "Current Seats", lang)}</h3>
            {openSeats.map((s) => (
              <div key={s.id} className="raqeem-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{lang === "ar" ? (s.full_name_ar || s.full_name) : (s.full_name || s.full_name_ar)}</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span>{s.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {s.appointment_type === "acting" ? t("تكليف مؤقت", "Acting", lang) : t("تعيين دائم", "Permanent", lang)}
                    </span>
                    {s.represented_organization_id && (
                      <span className="text-xs px-2 py-0.5 rounded bg-state-info-surface text-state-info-ink">{t("يمثّل جهة", "Represents a body", lang)}</span>
                    )}
                  </div>
                </div>
                {s.appointment_type === "acting" && (
                  <p className="text-xs text-muted-foreground">
                    {t("الصلاحيات المحدودة", "Bounded scope", lang)}: {(s.acting_scope || []).join(" · ") || "—"}
                    {s.acting_expires_at ? ` — ${t("تنتهي", "expires", lang)}: ${String(s.acting_expires_at).slice(0, 10)}` : ""}
                  </p>
                )}
                {eventsFor(s.id).length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {eventsFor(s.id).slice(0, 3).map((e) => (
                      <li key={e.id}>
                        {label(APPOINTMENT_EVENTS, e.event_type, lang)} — {t("نفاذ", "effective", lang)} {String(e.effective_at).slice(0, 10)}
                        {e.creates_vacancy ? ` · ${t("شغور", "vacancy", lang)}: ${e.vacancy_status}` : ""}
                        {e.reason_class === "personal_private" ? null : (e.reason_note ? ` · ${e.reason_note}` : "")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="raqeem-section-title">{t("مقاعد منتهية — الشغور والمحفوظ تاريخيًا", "Ended Seats — Vacancy and Preserved History", lang)}</h3>
            {endedSeats.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("لا توجد مقاعد منتهية.", "No ended seats.", lang)}</p>
            ) : endedSeats.map((s) => {
              const last = eventsFor(s.id)[0];
              return (
                <div key={s.id} className="raqeem-card p-4 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{lang === "ar" ? (s.full_name_ar || s.full_name) : (s.full_name || s.full_name_ar)} · {s.role}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-state-neutral-surface text-state-neutral-ink">
                      {s.status === "resigned" ? t("استقالة", "Resigned", lang) : s.status === "removed" ? t("عزل", "Removed", lang) : t("منتهي", "Ended", lang)}
                    </span>
                  </div>
                  {last && (
                    <p className="text-xs text-muted-foreground">
                      {last.vacancy_status === "open"
                        ? t("الشغور قائم — يلزم تعيين أو تكليف معتمد", "Vacancy is open — an approved appointment or acting assignment is required", lang)
                        : last.vacancy_status === "resolved"
                          ? t("الشغور مُعالج بتعيين جديد بهوية مستقلة", "Vacancy resolved by a new assignment under a separate identity", lang)
                          : ""}
                      {Array.isArray(last.powers_stopped) && last.powers_stopped.length > 0 ? ` · ${t("الصلاحيات التي توقفت", "Powers stopped", lang)}: ${last.powers_stopped.join(", ")}` : ""}
                      {` · ${t("الالتزامات تبقى مع", "Obligations remain with", lang)}: ${last.obligations_remain_with}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("الأفعال التاريخية لهذا الشخص محفوظة بنسبتها إليه ولم تُنقل إلى الخلف.", "This person's historical acts stay attributed to them and were not transferred.", lang)}
                  </p>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}