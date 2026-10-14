import React, { useEffect, useState } from "react";
import { BookOpen, RefreshCw, AlertTriangle, Loader2, Info, FileText, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";

import AIFeedbackPanel from "@/components/raqeem/AIFeedbackPanel";

// PackDraftPanel — تجميع مسودة حزمة الاجتماع من ملفات المصدر (استشاري بحت).
// يعرض أقسامًا موسومة آليًا، كل قسم بمصدره. لا يُنشئ حزمة: الأمين ينسّق ثم ينشر بأمر محكوم.

export default function PackDraftPanel({ meetingId, committeeId, sourceDocuments }) {
  const { t, lang } = useLanguage();
  const [outline, setOutline] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [docs, setDocs] = useState(Array.isArray(sourceDocuments) ? sourceDocuments : []);

  useEffect(() => {
    if (Array.isArray(sourceDocuments) || !committeeId) return;
    base44.entities.Document.filter({ committee_id: committeeId, status: { $in: ["draft", "published", "approved"] } }, { limit: 50 })
      .then((res) => setDocs(Array.isArray(res) ? res : (res?.items || [])))
      .catch(() => setDocs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committeeId]);

  const docIds = (docs || []).map((d) => d.id).filter(Boolean);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("GenerateMeetingPackDraft", {
        committee_id: committeeId, meeting_id: meetingId, outline, document_ids: docIds,
      });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); }
      else setData(d);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر توليد المسودة", "Could not generate the draft"));
      setData(null);
    }
    setLoading(false);
  };

  const copySection = (idx, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => { /* لا توليد تلقائي — يبدؤه الأمين */ }, []);

  return (
    <section className="raqeem-card p-4 sm:p-5 space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/15">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">{t("تجميع مسودة الحزمة", "Assemble a pack draft")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("مسودة استشارية من المستندات المرفوعة + مخطط. لا تُنشئ حزمة — الأمين ينسّق ثم ينشر.", "An advisory draft from uploaded documents + outline. It creates no pack — the secretary curates, then publishes.")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{t("المخطط (اختياري)", "Outline (optional)")}</label>
        <textarea
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("مثال: تمهيد · بند أول · قرارات مقترحة · مرفقات", "e.g. Intro · Item 1 · Proposed decisions · Attachments")}
        />
        <div className="text-[11px] text-muted-foreground">
          {t(`${docIds.length} مستند مصدر مرتبط`, `${docIds.length} source document(s) linked`)}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !committeeId || !meetingId}
        className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {t("توليد المسودة", "Generate draft")}
      </button>

      {error && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-state-danger-ink">{error}</div>
        </div>
      )}

      {data?.ai_generated && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-state-info-surface text-state-info-ink text-[11px] font-medium">
          <Info className="w-3 h-3" /> {t("مولَّد آليًا — استشاري بحت", "AI-generated — advisory only")}
        </div>
      )}

      {data && (
        <>
          {data.status === "not_evaluated" && (
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {lang === "ar" ? data.reason?.ar : data.reason?.en}
            </div>
          )}
          {data.status === "ok" && (
            <>
              {data.sections?.length > 0 ? (
                <ul className="space-y-2">
                  {data.sections.map((s, i) => (
                    <li key={i} className="rounded-md border border-border px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" /> {s.title}
                        </div>
                        <button onClick={() => copySection(i, s.body_ar)} className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                          {copied === i ? <><Check className="w-3 h-3" /> {t("نُسخ", "Copied")}</> : <><Copy className="w-3 h-3" /> {t("نسخ", "Copy")}</>}
                        </button>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{s.body_ar}</p>
                      <div className="text-[10px] text-muted-foreground mt-1.5 border-t border-border pt-1.5">
                        {t("المصدر", "Source")}: {s.source_ref}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("لا أقسام في المسودة.", "No sections in the draft.")}</p>
              )}
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                {lang === "ar" ? data.advisory_note?.ar : data.advisory_note?.en}
              </p>
              <AIFeedbackPanel
                ledgerId={data.ledger_id}
                confidenceScore={data.confidence_score}
                confidenceBasis={data.confidence_basis}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}