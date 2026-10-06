import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { formatDate } from "@/lib/raqeemUtils";
import { History, Loader2, AlertTriangle, Check, CircleSlash } from "lucide-react";

// AuditChainPanel — G-5 on screen: the audit trail of ONE record as a CHAIN (submit → independent
// verdict → closure; or draft → frozen round → ballots → certification → issuance → execution).
//
// It shows the two facts a reader must not confuse: an ABSENT required step is a named GAP (never
// inferred), and an event recorded before its predecessor is reported OUT OF ORDER (rows are never
// re-sorted to make a story read well). The panel also carries the contract's caution that a trail
// shows what was recorded and proves nothing about what did not happen.

const STEP_TONE = {
  recorded: "bg-state-success-surface text-state-success-ink",
  absent: "bg-state-neutral-surface text-state-neutral-ink",
};

export default function AuditChainPanel({ committeeId, entityType, entityId, chain, title }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const chainKey = chain || (entityType === "Action" ? "evidence" : "decision");

  const load = async () => {
    if (!committeeId || !entityId) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetRecordAuditTrail", { committee_id: committeeId, chain: chainKey, subject_id: entityId });
      const d = res?.data || {};
      if (d.error) { setError((lang === "ar" ? d.error_ar : d.error) || d.error); setData(null); }
      else setData(d);
    } catch (e) {
      const d = e?.response?.data || {};
      setError((lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّرت قراءة الأثر.", "The trail could not be read."));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, committeeId, entityId, chainKey]);

  const steps = data?.steps || [];

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <History className="w-3.5 h-3.5" />
        {t("أثر التدقيق للسجل", "The record's audit trail")}
        {data && data.gaps?.length > 0 && <span className="text-state-warning-ink">· {data.gaps.length} {t("خطوة غائبة", "absent step(s)")}</span>}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-border p-3 space-y-2">
          {loading && (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />{t("يُقرأ الأثر…", "Reading the trail…")}
            </p>
          )}
          {error && <p className="text-[11px] text-state-danger-ink bg-state-danger-surface rounded px-2 py-1">{error}</p>}

          {data && !loading && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-medium text-foreground">{lang === "ar" ? data.chain_label?.ar : data.chain_label?.en}</span>
                <span className={`px-1.5 py-0.5 rounded ${data.completeness === "complete" ? "bg-state-success-surface text-state-success-ink" : "bg-state-warning-surface text-state-warning-ink"}`}>
                  {data.completeness === "complete" ? t("مكتمل", "Complete") : data.completeness === "incomplete" ? t("غير مكتمل: تعذّرت قراءة مصدر", "Incomplete: a source could not be read") : t("ناقص", "Open")}
                </span>
                <span className="text-muted-foreground">{t("الأحداث المسجَّلة", "Recorded events")}: {data.event_count}</span>
                <span className="text-muted-foreground font-mono">{data.contract_version}</span>
              </div>

              {data.subject && (
                <p className="text-[11px] text-muted-foreground">
                  {title || data.subject.title} · {data.subject.type} · {data.subject.status}
                </p>
              )}

              <div className="space-y-1">
                {steps.map((s) => (
                  <div key={s.key} className="flex items-start gap-2 text-[11px]">
                    <span className={`mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${STEP_TONE[s.state] || STEP_TONE.absent}`}>
                      {s.state === "recorded" ? <Check className="w-3 h-3" /> : <CircleSlash className="w-3 h-3" />}
                      {s.state === "recorded" ? s.count : t("غائب", "Absent")}
                    </span>
                    <div className="min-w-0">
                      <span className="text-foreground">{lang === "ar" ? s.ar : s.en}</span>
                      {s.required && s.state === "absent" && <span className="text-state-warning-ink"> · {t("غائبة والخطوة إلزامية", "absent and required")}</span>}
                      {s.order === "out_of_order" && <span className="text-state-warning-ink"> · {t("مسجَّلة قبل سابقتها", "recorded before its predecessor")}</span>}
                      {s.records?.length > 0 && (
                        <div className="text-muted-foreground">
                          {s.records.map((r, i) => (
                            <div key={`${s.key}-${i}`} className="truncate">
                              {r.at ? `${formatDate(r.at)} · ` : ""}{r.actor || "—"}{r.capacity ? ` · ${r.capacity}` : ""}
                              {r.correlation_id ? <span className="font-mono"> · {r.correlation_id}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {data.gaps?.length > 0 && (
                <div className="rounded px-2 py-1.5 bg-state-warning-surface text-state-warning-ink text-[11px] space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />{t("خطوات إلزامية غائبة", "Required steps absent")}
                  </span>
                  {data.gaps.map((g) => (
                    <p key={g.key}>{lang === "ar" ? g.ar : g.en} — {lang === "ar" ? g.why_ar : g.why_en}</p>
                  ))}
                </div>
              )}

              {data.inventory_not_read?.length > 0 && (
                <div className="rounded px-2 py-1.5 bg-state-danger-surface text-state-danger-ink text-[11px] space-y-0.5">
                  {data.inventory_not_read.map((u) => <p key={u.source}>{u.source} — {u.reason}</p>)}
                </div>
              )}

              {data.meaning_note && (
                <p className="text-[11px] text-muted-foreground">{lang === "ar" ? data.meaning_note.ar : data.meaning_note.en}</p>
              )}
              {data.refusal_note && (
                <p className="text-[11px] text-muted-foreground">{lang === "ar" ? data.refusal_note.ar : data.refusal_note.en}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}