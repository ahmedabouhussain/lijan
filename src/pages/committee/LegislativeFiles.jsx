import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { ScrollText, Search, Loader2, Calendar, Building2 } from "lucide-react";
import PageHeader from "@/components/raqeem/PageHeader";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { CLASSIFICATION_LABELS } from "@/lib/legislativeFileLabels";

// LegislativeFiles — the committee's legislative matter list.
//
// One server-side page (filter + sort + limit), with a search that re-queries the server
// rather than narrowing a loaded list. Files are the through-line; this is their index.

const STAGE_FILTERS = [
  { value: "all", ar: "كل المراحل", en: "All Stages" },
  { value: "open", ar: "مفتوحة", en: "Open" },
  { value: "in_progress", ar: "قيد التقدم", en: "In Progress" },
  { value: "closed", ar: "مغلقة", en: "Closed" },
  { value: "not_delivered", ar: "لم تُسلَّم", en: "Not Delivered" },
];

const STAGE_LABELS_AR = {
  referral_received: "استلام الإحالة", completeness_check: "التحقق", assigned_to_committee: "الإسناد",
  study_underway: "الدراسة", documents_requested: "طلب الوثائق", on_agenda: "جدول الأعمال",
  under_discussion: "المناقشة", hearing_held: "جلسة استماع", amendments_recorded: "التعديلات",
  comparison_table_built: "جدول المقارنة", report_draft: "مسودة التقرير", report_review: "المراجعة",
  report_chair_review: "رئيس اللجنة", voting: "التصويت", report_approved: "معتمد",
  delivered: "سُلِّم", delivery_confirmed: "إثبات الاستلام", follow_up: "المتابعة", closed: "مغلق",
};
const STAGE_LABELS_EN = {
  referral_received: "Referral", completeness_check: "Check", assigned_to_committee: "Assign",
  study_underway: "Study", documents_requested: "Docs", on_agenda: "Agenda",
  under_discussion: "Discussion", hearing_held: "Hearing", amendments_recorded: "Amendments",
  comparison_table_built: "Comparison", report_draft: "Draft", report_review: "Review",
  report_chair_review: "Chair", voting: "Voting", report_approved: "Approved",
  delivered: "Delivered", delivery_confirmed: "Receipt", follow_up: "Follow-up", closed: "Closed",
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function LegislativeFiles() {
  const { orgRef, committeeRef } = useParams();
  const { data } = useCommittee();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const [searchParams] = useSearchParams();

  const committeeId = data?.committee?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const buildQuery = useCallback(() => {
    const q = { committee_id: committeeId };
    if (stageFilter === "open") q.status = "open";
    else if (stageFilter === "in_progress") q.status = "in_progress";
    else if (stageFilter === "closed") q.status = "closed";
    else if (stageFilter === "not_delivered") q.delivery_status = "not_delivered";
    if (search.trim()) {
      q.$or = [
        { reference_number: { $regex: search.trim(), $options: "i" } },
        { subject_title_ar: { $regex: search.trim(), $options: "i" } },
        { subject_title_en: { $regex: search.trim(), $options: "i" } },
      ];
    }
    return q;
  }, [committeeId, stageFilter, search]);

  const load = useCallback(async () => {
    if (!committeeId) return;
    setLoading(true);
    try {
      const [pageRes, countRes] = await Promise.all([
        base44.entities.LegislativeFile.filter(buildQuery(), { sort: "-created_date", limit: 50 }),
        base44.entities.LegislativeFile.count(buildQuery()),
      ]);
      setItems(pageRes?.items || []);
      setCount(typeof countRes === "number" ? countRes : 0);
    } catch {
      setItems([]);
      setCount(0);
    }
    setLoading(false);
  }, [committeeId, buildQuery]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        icon={ScrollText}
        title={t("الملفات التشريعية", "Legislative Files")}
        badge={<span className="text-sm text-muted-foreground">({count})</span>}
      />

      {/* Filters — each change re-queries the server */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground start-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("بحث برقم المرجع أو الموضوع...", "Search by reference or subject...")}
            className="w-full h-9 rounded-md border border-input bg-transparent ps-9 pe-3 text-sm"
            aria-label={t("بحث", "Search")}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStageFilter(f.value)}
              className={[
                "px-3 py-1.5 rounded-md text-xs whitespace-nowrap border transition-colors min-h-[36px]",
                stageFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground",
              ].join(" ")}
            >
              {t(f.ar, f.en)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="raqeem-card p-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("لا توجد ملفات", "No Legislative Files")}
          description={t(
            "لم تُفتح ملفات تشريعية لهذه اللجنة بعد، أو لا تطابق معايير البحث.",
            "No legislative files opened for this committee yet, or none match the filters."
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((file) => {
            const cls = CLASSIFICATION_LABELS[file.subject_classification] || CLASSIFICATION_LABELS.other;
            return (
              <Link
                key={file.id}
                to={`/o/${orgRef}/c/${committeeRef}/legislative-file/${file.id}`}
                className="raqeem-card-interactive p-4 space-y-2 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-primary">{file.reference_number}</span>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                      {isAr ? file.subject_title_ar : (file.subject_title_en || file.subject_title_ar)}
                    </h3>
                  </div>
                  <StatusBadge
                    label={t(STAGE_LABELS_AR[file.stage] || file.stage, STAGE_LABELS_EN[file.stage] || file.stage)}
                    colorClass="bg-primary/10 text-primary"
                    size="sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {isAr ? file.referring_body : (file.referring_body_en || file.referring_body)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(file.referral_received_at)}
                  </span>
                  <span>{t(cls.ar, cls.en)}</span>
                </div>
                {file.legal_deadline && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{t("المهلة القانونية:", "Legal deadline:")}</span>
                    <span className="text-foreground font-medium">{formatDate(file.legal_deadline)}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}