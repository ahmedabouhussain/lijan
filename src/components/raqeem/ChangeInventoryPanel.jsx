import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/raqeemUtils";
import { ClipboardList, RefreshCw, AlertTriangle, ShieldAlert, Loader2, Check } from "lucide-react";

// ChangeInventoryPanel — «التغيير والإغلاق المُنظَّم»: the MANDATORY enumeration of a committee's open
// obligations before it is renamed, merged, split, reconstituted, suspended, closed or archived.
//
// The panel keeps the honesty rules the contract states: it shows what could NOT be read and treats it
// as unresolved (never as clear), it shows an obligation with no disposition as a BLOCKER, and it
// places and releases a LEGAL HOLD as state — with the reason — rather than as a note. Releasing a hold
// does not close the obligation, and the panel says so.

const CHANGE_KINDS = [
  { key: "rename", ar: "تغيير التسمية", en: "Rename" },
  { key: "merge", ar: "دمج", en: "Merge" },
  { key: "split", ar: "تقسيم", en: "Split" },
  { key: "reconstitute", ar: "إعادة تشكيل", en: "Reconstitute" },
  { key: "suspend", ar: "تعليق", en: "Suspend" },
  { key: "close", ar: "إغلاق", en: "Close" },
  { key: "archive", ar: "أرشفة", en: "Archive" },
];

const DISPOSITIONS = [
  { key: "assign_to_successor", ar: "يُسند إلى الخلف", en: "Assign to the successor" },
  { key: "return_to_institution", ar: "يُعاد إلى الجهة", en: "Return to the institution" },
  { key: "interim_custodian", ar: "حافظ مؤقت", en: "Interim custodian" },
  { key: "retain_with_seat", ar: "يبقى مع المقعد", en: "Retained with the seat" },
  { key: "revoke_not_transferred", ar: "يُلغى ولا يُنقل", en: "Revoked, not transferred" },
  { key: "expire", ar: "ينتهي", en: "Allowed to expire" },
  { key: "legal_hold", ar: "حجز قانوني", en: "Legal hold" },
];

const READINESS_TONE = {
  ready: "bg-state-success-surface text-state-success-ink border-state-success-ink/30",
  blocked: "bg-state-warning-surface text-state-warning-ink border-state-warning-ink/30",
  incomplete: "bg-state-danger-surface text-state-danger-ink border-state-danger-ink/30",
};

export default function ChangeInventoryPanel({ committeeId, canManage = false }) {
  const { t, lang } = useLanguage();
  const [kind, setKind] = useState("close");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [draft, setDraft] = useState({});

  const compile = async () => {
    setLoading(true);
    setOutcome(null);
    try {
      const res = await base44.functions.invoke("CompileChangeInventory", { committee_id: committeeId, change_kind: kind });
      const d = res?.data || {};
      if (d.error) { setOutcome({ kind: "refused", message: lang === "ar" ? d.error_ar || d.error : d.error, code: d.code }); setData(null); }
      else setData(d);
    } catch (e) {
      const d = e?.response?.data || {};
      setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّر تجميع التعداد.", "Could not compile the inventory."), code: d.code });
      setData(null);
    }
    setLoading(false);
  };

  const record = async (key, body, doneMessage) => {
    setBusy(key);
    setOutcome(null);
    try {
      const res = await base44.functions.invoke("RecordChangeDisposition", { committee_id: committeeId, change_kind: kind, change_reference: reference.trim() || undefined, ...body });
      const d = res?.data || {};
      if (d.error) setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error, code: d.code });
      else setOutcome({ kind: "ok", message: doneMessage });
      await compile();
    } catch (e) {
      const d = e?.response?.data || {};
      setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّر تسجيل المصير.", "The disposition could not be recorded."), code: d.code });
    }
    setBusy(null);
  };

  const rows = data?.rows || [];
  const readiness = data?.readiness;
  const keyOf = (r) => `${r.source_entity_type}:${r.source_entity_id}`;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0">
          <ClipboardList className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{t("التغيير والإغلاق المُنظَّم", "Governed change and closure")}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t(
                "لا يقع تغيير اللجنة فوق التزام غير محسوب: يُعدّ كل التزام مفتوح من سجلات اللجنة، ويُحسم مصير كل واحد منهما قبل التغيير.",
                "A committee change never lands over an unaccounted obligation: every open obligation is enumerated from the committee's own records, and each one carries a disposition before the change.",
              )}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-[11px]">{t("نوع التغيير", "Change kind")}</Label>
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value); setData(null); }}
              className="h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
              aria-label={t("نوع التغيير", "Change kind")}
            >
              {CHANGE_KINDS.map((c) => <option key={c.key} value={c.key}>{lang === "ar" ? c.ar : c.en}</option>)}
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={compile} disabled={loading} className="min-h-[36px]">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t("تجميع التعداد", "Compile the inventory")}
          </Button>
        </div>
      </div>

      {!canManage && (
        <p className="text-[11px] text-muted-foreground">
          {t("تجميع التعداد وحسم المصائر وحجز الالتزام من صلاحية الجهة المختصة بإدارة اللجنة.", "Enumerating, deciding dispositions and holding obligations belong to the authority competent to manage the committee.")}
        </p>
      )}

      {readiness && (
        <div className={`rounded-md border px-3 py-2 text-xs ${READINESS_TONE[readiness.verdict] || READINESS_TONE.incomplete}`}>
          <div className="font-semibold">
            {readiness.verdict === "ready" ? t("جاهز: التعداد مكتمل", "Ready: the inventory is complete")
              : readiness.verdict === "blocked" ? t("موقوف: التزامات بلا مصير", "Blocked: obligations without a disposition")
                : t("غير مكتمل: تعذّر قراءة مصدر", "Incomplete: a source could not be read")}
          </div>
          <p className="mt-0.5">{lang === "ar" ? readiness.ar : readiness.en}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>{t("الالتزامات", "Obligations")}: {data.counts.total}</span>
            <span>{t("محسوم", "Dispositioned")}: {data.counts.decided}</span>
            <span>{t("بلا مصير", "Undispositioned")}: {data.counts.undispositioned}</span>
            <span>{t("تحت حجز", "Under hold")}: {data.counts.held}</span>
            <span>{t("مصادر لم تُقرأ", "Sources not read")}: {data.counts.unread_sources}</span>
          </div>
        </div>
      )}

      {(data?.inventory_not_read || []).length > 0 && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface px-3 py-2 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-state-danger-ink">
            <AlertTriangle className="w-3.5 h-3.5" />{t("ما لم يُقرأ — لا يُقرأ صفرًا", "What was not read — never a zero")}
          </div>
          {(data.inventory_not_read || []).map((u) => (
            <p key={u.source} className="text-[11px] text-state-danger-ink">{u.source} — {u.reason}</p>
          ))}
        </div>
      )}

      {data && (
        <div>
          <Label className="text-[11px]">{t("سند التغيير (قرار أو طلب)", "Basis of the change (decision or request)")}</Label>
          <Input aria-label={t("سند التغيير", "Basis of the change")} value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1" />
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={keyOf(r)} className="rounded border border-border bg-card p-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-foreground">{r.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.decided ? "bg-state-success-surface text-state-success-ink" : "bg-state-warning-surface text-state-warning-ink"}`}>
                  {r.decided ? t("محسوم", "Dispositioned") : t("بلا مصير", "No disposition")}
                </span>
                {r.legal_hold && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-state-danger-surface text-state-danger-ink inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />{t("حجز قانوني", "Legal hold")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{r.source_entity_type}</span>
                {r.source_status && <span>· {r.source_status}</span>}
                {r.due_date && <span>· {t("المهلة", "Due")}: {formatDate(r.due_date)}</span>}
                {r.disposition && <span>· {t("المصير", "Disposition")}: {DISPOSITIONS.find((d) => d.key === r.disposition)?.[lang === "ar" ? "ar" : "en"] || r.disposition}</span>}
                {r.legal_hold_reason && <span>· {r.legal_hold_reason}</span>}
                {!r.disposition && <span>· {t("المقترح", "Proposed")}: {DISPOSITIONS.find((d) => d.key === r.proposed_disposition)?.[lang === "ar" ? "ar" : "en"] || r.proposed_disposition}</span>}
              </div>
              {canManage && (!r.legal_hold || r.decided) && (
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={draft[keyOf(r)]?.disposition || r.proposed_disposition}
                    onChange={(e) => setDraft({ ...draft, [keyOf(r)]: { ...(draft[keyOf(r)] || {}), disposition: e.target.value } })}
                    className="h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
                    aria-label={t("المصير", "Disposition")}
                  >
                    {DISPOSITIONS.map((d) => <option key={d.key} value={d.key}>{lang === "ar" ? d.ar : d.en}</option>)}
                  </select>
                  {(draft[keyOf(r)]?.disposition || r.proposed_disposition) === "legal_hold" && (
                    <Input
                      aria-label={t("سبب الحجز", "Reason for the hold")}
                      placeholder={t("سبب الحجز (إلزامي)", "Reason for the hold (required)")}
                      value={draft[keyOf(r)]?.holdReason || ""}
                      onChange={(e) => setDraft({ ...draft, [keyOf(r)]: { ...(draft[keyOf(r)] || {}), holdReason: e.target.value } })}
                      className="max-w-xs"
                    />
                  )}
                  <Button
                    size="sm"
                    className="min-h-[36px]"
                    disabled={busy === keyOf(r)}
                    onClick={() => record(keyOf(r), {
                      disposition_id: r.disposition_id || undefined,
                      obligation_type: r.obligation_type,
                      source_entity_type: r.source_entity_type,
                      source_entity_id: r.source_entity_id,
                      title: r.title, due_date: r.due_date, source_status: r.source_status,
                      disposition: draft[keyOf(r)]?.disposition || r.proposed_disposition,
                      legal_hold_reason: draft[keyOf(r)]?.holdReason,
                    }, t("سُجّل المصير.", "The disposition was recorded."))}
                  >
                    {busy === keyOf(r) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {t("تسجيل المصير", "Record the disposition")}
                  </Button>
                  {r.legal_hold && !r.hold_released_at && (
                    <div className="flex items-end gap-2">
                      <Input
                        aria-label={t("سبب رفع الحجز", "Reason for releasing the hold")}
                        placeholder={t("سبب رفع الحجز (إلزامي)", "Reason for release (required)")}
                        value={draft[keyOf(r)]?.releaseReason || ""}
                        onChange={(e) => setDraft({ ...draft, [keyOf(r)]: { ...(draft[keyOf(r)] || {}), releaseReason: e.target.value } })}
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[36px]"
                        disabled={busy === `release_${keyOf(r)}`}
                        onClick={() => record(`release_${keyOf(r)}`, { disposition_id: r.disposition_id, release_hold: true, hold_release_reason: draft[keyOf(r)]?.releaseReason }, t("رُفع الحجز — والالتزام لم يُغلق.", "The hold was released — and the obligation was not closed."))}
                      >
                        {t("رفع الحجز", "Release the hold")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data?.legal_hold_rules && (
        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
          {lang === "ar" ? data.legal_hold_rules.ar : data.legal_hold_rules.en}
        </p>
      )}

      {outcome && (
        <p className={`text-xs rounded px-3 py-2 ${outcome.kind === "ok" ? "bg-state-success-surface text-state-success-ink" : "bg-state-danger-surface text-state-danger-ink"}`}>
          {outcome.message}{outcome.code ? ` (${outcome.code})` : ""}
        </p>
      )}
    </div>
  );
}