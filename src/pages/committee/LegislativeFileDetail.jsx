import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, ArrowLeft, ScrollText, Calendar, Building2, User, Clock,
  FileText, Gavel, CheckCircle2, ChevronLeft, Loader2, AlertTriangle,
} from "lucide-react";
import BrandLogo from "@/components/raqeem/BrandLogo";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import LegislativeReportPanel from "@/components/raqeem/LegislativeReportPanel";
import {
  CLASSIFICATION_LABELS, DELIVERY_STATUS_LABELS, REPORT_STAGE_LABELS, INTEGRATION_POSTURE_LABELS,
} from "@/lib/legislativeFileLabels";

// LegislativeFileDetail — the unified page for one legislative matter.
//
// This is the through-line: from referral → committee → meetings → amendments → comparison →
// report → voting → approval → delivery → follow-up → closure, in ONE connected page. The user
// moves along the file's journey without losing context. No fabricated history, no aggregate
// votes presented as individual evidence.

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function LegislativeFileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const { data: committeeData } = useCommittee();
  const committeeRef = committeeData?.committee?.slug
    ? `${committeeData.committee.slug}--${committeeData.committee.public_id || committeeData.committee.id}`
    : committeeData?.committee?.id;

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetLegislativeFile", { file_id: id });
      setBundle(res.data || res);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to load");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleTransition = async (targetStage) => {
    setTransitioning(true);
    try {
      await base44.functions.invoke("TransitionLegislativeFile", {
        file_id: id,
        target_stage: targetStage,
        note: transitionNote || undefined,
      });
      setTransitionNote("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Transition failed");
    }
    setTransitioning(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !bundle?.file) {
    return (
      <div className="space-y-3">
        <BackLink committeeRef={committeeRef} isAr={isAr} t={t} />
        <EmptyState
          icon={AlertTriangle}
          title={t("تعذّر تحميل الملف", "Could not load the file")}
          description={error || t("الملف غير متاح أو لا تملك صلاحية قراءته.", "The file is unavailable or you lack read access.")}
        />
      </div>
    );
  }

  const { file, committee, profile, hearings, meetings, report_document, follow_up_action, stage_context } = bundle;
  const cls = CLASSIFICATION_LABELS[file.subject_classification] || CLASSIFICATION_LABELS.other;
  const delivery = DELIVERY_STATUS_LABELS[file.delivery_status] || DELIVERY_STATUS_LABELS.not_delivered;
  const reportStage = REPORT_STAGE_LABELS[file.report_stage] || REPORT_STAGE_LABELS.not_started;
  const posture = profile ? INTEGRATION_POSTURE_LABELS[profile.integration_posture] : null;

  return (
    <div className="space-y-4 pb-10" dir={isAr ? "rtl" : "ltr"}>
      <BackLink committeeRef={committeeRef} isAr={isAr} t={t} />

      {/* Referral card — the entry point of the through-line */}
      <header className="raqeem-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{t("ملف تشريعي", "Legislative File")}</span>
              <span className="text-sm font-mono font-bold text-foreground">{file.reference_number}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              {isAr ? file.subject_title_ar : (file.subject_title_en || file.subject_title_ar)}
            </h1>
            {file.subject_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {isAr ? file.subject_summary : (file.subject_summary_en || file.subject_summary)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge label={t(cls.ar, cls.en)} colorClass="bg-secondary text-foreground" />
            <StatusBadge
              label={t(stage_context.stage_ar, stage_context.stage_en)}
              colorClass="bg-primary/10 text-primary"
            />
          </div>
        </div>

        {/* Referral metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          <Meta icon={Building2} label={t("الجهة المحيلة", "Referring Body")}
            value={isAr ? file.referring_body : (file.referring_body_en || file.referring_body)} />
          <Meta icon={Calendar} label={t("تاريخ الاستلام", "Received")}
            value={formatDate(file.referral_received_at)} />
          <Meta icon={Clock} label={t("المهلة القانونية", "Legal Deadline")}
            value={formatDate(file.legal_deadline)} />
          <Meta icon={User} label={t("المسؤول الحالي", "Current Owner")}
            value={file.current_owner_name || "—"} />
        </div>

        {committee && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{t("اللجنة المختصة:", "Assigned Committee:")}</span>
            <span>{isAr ? committee.name_ar : (committee.name_en || committee.name_ar)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{t("الاختصاص:", "Mandate:")}</span>
            <span className="line-clamp-1">{isAr ? committee.mandate : (committee.mandate || "—")}</span>
          </div>
        )}

        {profile && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-foreground/60">{t("وضع التكامل:", "Integration Posture:")}</span>
            <StatusBadge label={t(posture.ar, posture.en)} colorClass="bg-secondary/60 text-muted-foreground" size="sm" />
            {profile.vocabulary_active && (
              <span className="text-foreground/40">· {t("المفردات التشريعية مفعّلة", "Legislative vocabulary active")}</span>
            )}
          </div>
        )}
      </header>

      {/* Journey timeline — the through-line */}
      <Timeline file={file} stageContext={stage_context} isAr={isAr} t={t} />

      {/* Two-column: comparison table + report editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparisonTable file={file} isAr={isAr} t={t} />
        <LegislativeReportPanel file={file} onUpdated={load} />
      </div>

      {/* Related meetings + hearings */}
      <RelatedMeetings meetings={meetings} isAr={isAr} t={t} committeeRef={committeeRef} />
      <Hearings hearings={hearings} isAr={isAr} t={t} />

      {/* Delivery + follow-up */}
      <DeliveryCard file={file} delivery={delivery} followUpAction={follow_up_action} isAr={isAr} t={t} />

      {/* Stage transition (governed) */}
      {stage_context.next_stage && file.status !== "closed" && (
        <TransitionCard
          stageContext={stage_context}
          note={transitionNote}
          setNote={setTransitionNote}
          onTransition={handleTransition}
          transitioning={transitioning}
          isAr={isAr}
          t={t}
        />
      )}

      {file.status === "closed" && (
        <div className="raqeem-card p-4 flex items-center gap-3 bg-state-success-surface/40">
          <CheckCircle2 className="w-5 h-5 text-state-success-ink" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{t("الملف مغلق", "File Closed")}</p>
            <p className="text-xs text-muted-foreground">
              {t("حُفظ كامل الأثر المؤسسي — لا يُحذف ولا يُعاد كتابته.", "The full institutional history is preserved — never deleted, never rewritten.")}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-2">
        <BrandLogo className="h-7 w-24 opacity-60" />
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function BackLink({ committeeRef, isAr, t }) {
  return (
    <Link
      to={committeeRef ? `/o/${committeeRef.split("--")[0]}/c/${committeeRef}/records` : "/"}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
    >
      {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
      {t("عودة إلى السجلات", "Back to Records")}
    </Link>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function Timeline({ file, stageContext, isAr, t }) {
  const stages = [
    "referral_received", "completeness_check", "assigned_to_committee", "study_underway",
    "on_agenda", "under_discussion", "hearing_held", "amendments_recorded", "comparison_table_built",
    "report_draft", "report_review", "report_chair_review", "voting", "report_approved",
    "delivered", "delivery_confirmed", "follow_up", "closed",
  ];
  const currentIndex = stages.indexOf(file.stage);
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("رحلة الملف", "File Journey")}</h2>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {stages.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const future = i > currentIndex;
          return (
            <div key={s} className="flex items-center shrink-0">
              <div
                className={[
                  "flex flex-col items-center gap-1 px-2 py-1.5 rounded-md min-w-[88px]",
                  active ? "bg-primary/10" : "",
                ].join(" ")}
                title={t(stageLabelAr(s), stageLabelEn(s))}
              >
                <span
                  className={[
                    "w-2.5 h-2.5 rounded-full",
                    done ? "bg-state-success-ink" : active ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-[10px] leading-tight text-center",
                    active ? "font-semibold text-primary" : future ? "text-muted-foreground/50" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {t(stageLabelAr(s), stageLabelEn(s))}
                </span>
              </div>
              {i < stages.length - 1 && <div className="w-3 h-px bg-border" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {t("المرحلة الحالية:", "Current stage:")}{" "}
        <span className="font-medium text-foreground">{t(stageContext.stage_ar, stageContext.stage_en)}</span>
        {stageContext.next_stage && (
          <>
            {" · "}
            {t("التالي:", "Next:")}{" "}
            <span className="text-foreground/70">{t(stageContext.next_stage_ar, stageContext.next_stage_en)}</span>
          </>
        )}
      </p>
    </div>
  );
}

function stageLabelAr(s) {
  return {
    referral_received: "استلام الإحالة", completeness_check: "التحقق", assigned_to_committee: "الإسناد",
    study_underway: "الدراسة", on_agenda: "جدول الأعمال", under_discussion: "المناقشة",
    hearing_held: "جلسة استماع", amendments_recorded: "التعديلات", comparison_table_built: "جدول المقارنة",
    report_draft: "مسودة التقرير", report_review: "المراجعة", report_chair_review: "رئيس اللجنة",
    voting: "التصويت", report_approved: "الاعتماد", delivered: "التسليم",
    delivery_confirmed: "إثبات الاستلام", follow_up: "المتابعة", closed: "الإغلاق",
  }[s] || s;
}
function stageLabelEn(s) {
  return {
    referral_received: "Referral", completeness_check: "Check", assigned_to_committee: "Assign",
    study_underway: "Study", on_agenda: "Agenda", under_discussion: "Discussion",
    hearing_held: "Hearing", amendments_recorded: "Amendments", comparison_table_built: "Comparison",
    report_draft: "Draft", report_review: "Review", report_chair_review: "Chair",
    voting: "Voting", report_approved: "Approved", delivered: "Delivery",
    delivery_confirmed: "Receipt", follow_up: "Follow-up", closed: "Closed",
  }[s] || s;
}

function ComparisonTable({ file, isAr, t }) {
  const rows = file.comparison_table || [];
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("جدول المقارنة", "Comparison Table")}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {t("لم يُبنَ جدول المقارنة بعد.", "No comparison table built yet.")}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-start font-medium px-2 py-1.5">{t("المادة", "Article")}</th>
                <th className="text-start font-medium px-2 py-1.5">{t("النص المحال", "Referred")}</th>
                <th className="text-start font-medium px-2 py-1.5">{t("النص المقترح", "Proposed")}</th>
                <th className="text-start font-medium px-2 py-1.5">{t("ملاحظات اللجنة", "Committee Note")}</th>
                <th className="text-start font-medium px-2 py-1.5">{t("الصياغة النهائية", "Final")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="px-2 py-1.5 font-mono font-semibold text-primary whitespace-nowrap">{r.article_no || i + 1}</td>
                  <td className="px-2 py-1.5 text-muted-foreground leading-relaxed">{r.referred_text || "—"}</td>
                  <td className="px-2 py-1.5 text-foreground leading-relaxed">{r.proposed_text || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground leading-relaxed">{r.committee_note || "—"}</td>
                  <td className="px-2 py-1.5 text-foreground font-medium leading-relaxed">{r.final_wording || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportCard({ file, reportDocument, reportStage, isAr, t }) {
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("تقرير اللجنة", "Committee Report")}</h2>
      <div className="flex items-center justify-between">
        <StatusBadge label={t(reportStage.ar, reportStage.en)} colorClass="bg-secondary text-foreground" />
        {reportDocument && (
          <Link to="#" className="text-xs text-primary hover:underline flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {isAr ? (reportDocument.title_ar || reportDocument.title) : (reportDocument.title_en || reportDocument.title)}
          </Link>
        )}
      </div>
      {!reportDocument && (
        <p className="text-xs text-muted-foreground mt-2">
          {t("لم يُنشأ تقرير اللجنة بعد.", "No committee report created yet.")}
        </p>
      )}
      {file.legal_opinions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">{t("الآراء القانونية", "Legal Opinions")}</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ps-4 rtl:ps-0 rtl:pe-4">
            {file.legal_opinions.map((op, i) => <li key={i}>{op}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function RelatedMeetings({ meetings, isAr, t, committeeRef }) {
  if (!meetings?.length) return null;
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("الاجتماعات المرتبطة", "Related Meetings")}</h2>
      <div className="space-y-1.5">
        {meetings.map((m) => (
          <Link
            key={m.id}
            to={committeeRef ? `/o/${committeeRef.split("--")[0]}/c/${committeeRef}/meetings/${m.id}` : "#"}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-secondary/40"
          >
            <span className="text-sm text-foreground">{isAr ? (m.title_ar || m.title) : (m.title_en || m.title)}</span>
            <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Hearings({ hearings, isAr, t }) {
  if (!hearings?.length) return null;
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("جلسات الاستماع", "Hearing Sessions")}</h2>
      <div className="space-y-2">
        {hearings.map((h) => (
          <div key={h.id} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {isAr ? h.title_ar : (h.title_en || h.title_ar)}
              </span>
              <StatusBadge label={t(h.status === "held" ? "عُقدت" : "مجدولة", h.status === "held" ? "Held" : "Scheduled")}
                colorClass="bg-secondary text-muted-foreground" size="sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Gavel className="w-3 h-3 inline me-1" />
              {isAr ? h.summoned_party_name : (h.summoned_party_name_en || h.summoned_party_name)}
              {h.summoned_organization && ` · ${h.summoned_organization}`}
            </p>
            {h.committee_findings && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{h.committee_findings}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryCard({ file, delivery, followUpAction, isAr, t }) {
  return (
    <div className="raqeem-card p-5">
      <h2 className="raqeem-section-title mb-3">{t("التسليم والمتابعة", "Delivery & Follow-up")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Meta icon={CheckCircle2} label={t("حالة التسليم", "Delivery Status")} value={t(delivery.ar, delivery.en)} />
        <Meta icon={Calendar} label={t("تاريخ التسليم", "Delivered At")} value={formatDate(file.delivered_at)} />
        <Meta icon={FileText} label={t("إثبات التسليم", "Delivery Proof")}
          value={file.delivery_proof_reference || "—"} />
      </div>
      {file.delivery_confirmed_at && (
        <p className="text-xs text-state-success-ink mt-3 pt-3 border-t border-border">
          {t("تأكيد الاستلام:", "Receipt confirmed:")} {formatDate(file.delivery_confirmed_at)}
          {file.delivery_confirmed_by_name && ` · ${file.delivery_confirmed_by_name}`}
        </p>
      )}
      {followUpAction && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">{t("الإجراء التالي", "Follow-up Action")}</p>
          <p className="text-sm text-foreground">{followUpAction.title_ar || followUpAction.title}</p>
        </div>
      )}
    </div>
  );
}

function TransitionCard({ stageContext, note, setNote, onTransition, transitioning, isAr, t }) {
  return (
    <div className="raqeem-card p-5 border-state-progress-surface">
      <h2 className="raqeem-section-title mb-2">{t("الإجراء التالي", "Next Step")}</h2>
      <p className="text-sm text-muted-foreground mb-3">
        {t("الانتقال إلى:", "Advance to:")}{" "}
        <span className="font-medium text-foreground">
          {t(stageContext.next_stage_ar, stageContext.next_stage_en)}
        </span>
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("ملاحظة الانتقال (اختياري)...", "Transition note (optional)...")}
        className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent min-h-[60px] mb-2"
      />
      <button
        onClick={() => onTransition(stageContext.next_stage)}
        disabled={transitioning}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
      >
        {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4 rotate-180" />}
        {t("تقديم المرحلة", "Advance Stage")}
      </button>
    </div>
  );
}