import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/raqeemUtils";
import { Link2, Copy, Ban, RefreshCw, Send, MessageSquare, AlertTriangle, MailX, Check } from "lucide-react";

// ActionExtractPanel — «مستخلص التنفيذ للجهة»: the officer's side of ONE obligation's extract link.
//
// The panel keeps FOUR facts apart because they ARE four facts: sent · opened · acknowledged ·
// question. It never presents an acknowledgement as progress or approval, it shows the questions the
// receiving party asked with an answer box, and it states plainly that the link was NOT emailed (this
// build has no mail path to a non-registered address) so the secretariat hands it over.
//
// Nothing here is written from the browser: issuing, revoking and answering all call governed server
// commands, and every refusal is shown in the server's own words.

const FALLBACK_SECTIONS = ["obligation", "requirement", "progress", "evidence", "verdict", "origin", "questions"];

const STATE_TONE = {
  sent: "bg-state-neutral-surface text-state-neutral-ink",
  opened: "bg-state-progress-surface text-state-progress-ink",
  acknowledged: "bg-state-success-surface text-state-success-ink",
  revoked: "bg-state-danger-surface text-state-danger-ink",
  expired: "bg-state-danger-surface text-state-danger-ink",
  not_yet_valid: "bg-state-warning-surface text-state-warning-ink",
};

const stateLabel = (state, t) => ({
  sent: t("أُرسل", "Sent"),
  opened: t("فُتح", "Opened"),
  acknowledged: t("أُقرّ باستلامه", "Receipt acknowledged"),
  revoked: t("ملغى", "Revoked"),
  expired: t("منتهي", "Expired"),
}[state] || t("غير قابل للاستعمال", "Not usable"));

export default function ActionExtractPanel({ action, onChanged }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [copied, setCopied] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", recipient_organization: "", purpose: "", days: "14", sections: FALLBACK_SECTIONS });
  const [answers, setAnswers] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("ListActionExtracts", { action_id: action.id });
      const d = res?.data || {};
      if (d.error) { setError(lang === "ar" ? d.error_ar || d.error : d.error); setData(null); }
      else { setData(d); setError(null); }
    } catch (e) {
      const d = e?.response?.data || {};
      setError((lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّر تحميل روابط المستخلص", "Could not load the extract links"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [action.id]);

  const run = async (key, fn, doneMessage) => {
    setBusy(key);
    setOutcome(null);
    try {
      const res = await fn();
      const d = res?.data || {};
      if (d.error) setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error, code: d.code || null });
      else setOutcome({ kind: "ok", message: doneMessage, detail: d });
      await load();
      onChanged?.();
    } catch (e) {
      const d = e?.response?.data || {};
      setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّر تنفيذ الإجراء.", "The act could not be performed."), code: d.code || null });
    }
    setBusy(null);
  };

  const share = () => run("share", () => base44.functions.invoke("ShareActionExtract", {
    action_id: action.id,
    recipient_name: form.recipient_name.trim(),
    recipient_organization: form.recipient_organization.trim() || undefined,
    purpose: form.purpose.trim() || undefined,
    expires_in_days: Number(form.days),
    sections: form.sections,
  }), t("أُصدر رابط المستخلص.", "The extract link was issued."));

  const copy = async (path) => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(path);
    } catch {
      setCopied(null);
      setOutcome({ kind: "ok", message: url });
    }
  };

  const grants = data?.grants || [];
  const questions = data?.questions || [];
  const vocabulary = data?.section_vocabulary || FALLBACK_SECTIONS.map((key) => ({ key, ar: key, en: key }));
  const alwaysIncluded = data?.always_included_sections || ["obligation", "questions"];

  const toggleSection = (key) => {
    if (alwaysIncluded.includes(key)) return;
    setForm((f) => ({ ...f, sections: f.sections.includes(key) ? f.sections.filter((s) => s !== key) : [...f.sections, key] }));
  };

  return (
    <div className="mt-2 rounded-md border border-border bg-secondary/25 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Link2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          {t("مستخلص التنفيذ للجهة", "Execution extract for the receiving party")}
          {grants.length > 0 && <span className="text-[11px] text-muted-foreground">({grants.length})</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={load} className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <RefreshCw className={loading ? "w-3 h-3 animate-spin" : "w-3 h-3"} />{t("تحديث", "Refresh")}
          </button>
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="min-h-[32px]">
            <Send className="w-3 h-3" />{t("إصدار رابط للجهة", "Issue a link")}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t(
          "الرابط يفتح التزامًا واحدًا فقط، ومحدود بالوقت وقابل للإلغاء. الإقرار ثبوت استلام لا اعتماد، وفتح الرابط أضعف منه.",
          "The link opens one obligation only, is time-bounded and revocable. An acknowledgement is a receipt, not an approval, and opening the link is weaker still.",
        )}
      </p>

      {data?.notice && (
        <p className="text-[11px] text-state-info-ink bg-state-info-surface rounded px-2 py-1">{lang === "ar" ? data.notice.ar : data.notice.en}</p>
      )}

      {/* A read that failed is named, never shown as "no links". */}
      {(data?.unread_sources || []).length > 0 && (
        <div className="rounded border border-state-warning-ink/30 bg-state-warning-surface px-2 py-1 text-[11px] text-state-warning-ink space-y-0.5">
          {(data.unread_sources || []).map((u) => (
            <div key={u.source} className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{u.source} — {u.reason}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {/* The four facts of every issued link. */}
      {grants.map((g) => (
        <div key={g.id} className="rounded border border-border bg-card p-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{lang === "ar" ? g.recipient.name : g.recipient.name_en || g.recipient.name}</span>
            {g.recipient.organization && <span className="text-[11px] text-muted-foreground">— {g.recipient.organization}</span>}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATE_TONE[g.state] || STATE_TONE.sent}`}>
              {stateLabel(g.state, t)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{t("أُرسل", "Sent")}: {g.facts.sent_at ? formatDate(g.facts.sent_at) : "—"}</span>
            <span>{t("فُتح", "Opened")}: {g.facts.opened_at ? formatDate(g.facts.opened_at) : "—"}</span>
            <span>{t("أُقرّ", "Acknowledged")}: {g.facts.acknowledged_at ? `${formatDate(g.facts.acknowledged_at)}${g.facts.acknowledged_by_name ? ` — ${g.facts.acknowledged_by_name}` : ""}` : "—"}</span>
            <span>{t("قراءات", "Views")}: {g.facts.views}</span>
            <span>{t("أسئلة مفتوحة", "Open questions")}: {g.facts.questions_open}</span>
            <span>{t("صالحة حتى", "Valid until")}: {g.validity.expires_at ? formatDate(g.validity.expires_at) : "—"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {g.link_path && (
              <Button size="sm" variant="outline" className="min-h-[30px]" onClick={() => copy(g.link_path)}>
                {copied === g.link_path ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === g.link_path ? t("نُسخ", "Copied") : t("نسخ الرابط", "Copy link")}
              </Button>
            )}
            {g.revocable && (
              <Button
                size="sm"
                variant="ghost"
                className="min-h-[30px] text-destructive"
                disabled={busy === `revoke_${g.id}`}
                onClick={() => run(`revoke_${g.id}`, () => base44.functions.invoke("ShareActionExtract", { revoke_grant_id: g.id, revoke_reason: "أُلغي من لوحة اللجنة" }), t("أُلغي الرابط.", "The link was revoked."))}
              >
                <Ban className="w-3 h-3" />{t("إلغاء الرابط", "Revoke")}
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <MailX className="w-3 h-3" />
            {t("لم يُرسل بالبريد: يُسلَّم من الأمانة، وتُسجَّل كل قراءة في التدقيق.", "Not emailed: the secretariat hands it over, and every read is recorded in the audit trail.")}
          </p>
        </div>
      ))}

      {/* Issuing a link. */}
      {open && (
        <div className="rounded border border-border bg-card p-2 space-y-2">
          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{t("الجهة المستلمة (إلزامي)", "Receiving party (required)")}</Label>
              <Input aria-label={t("الجهة المستلمة", "Receiving party")} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("الجهة / الإدارة", "Organization / department")}</Label>
              <Input aria-label={t("الجهة", "Organization")} value={form.recipient_organization} onChange={(e) => setForm({ ...form, recipient_organization: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("الصلاحية (أيام)", "Validity (days)")}</Label>
              <select
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
                className="w-full h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
                aria-label={t("الصلاحية بالأيام", "Validity in days")}
              >
                {["7", "14", "30", "60"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("الغرض من المشاركة", "Purpose of sharing")}</Label>
            <Input aria-label={t("الغرض", "Purpose")} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{t("الأقسام المسموح بها", "Permitted sections")}</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {vocabulary.map((s) => {
                const locked = alwaysIncluded.includes(s.key);
                const active = form.sections.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSection(s.key)}
                    disabled={locked}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"} ${locked ? "opacity-70 cursor-default" : ""}`}
                  >
                    {lang === "ar" ? s.ar : s.en}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={busy === "share" || form.recipient_name.trim().length < 2} onClick={share} className="min-h-[32px]">
              <Send className="w-3 h-3" />{t("إصدار الرابط", "Issue the link")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("إلغاء", "Cancel")}</Button>
          </div>
        </div>
      )}

      {/* Questions the receiving party asked, with the answer box. */}
      {questions.length > 0 && (
        <div className="rounded border border-border bg-card p-2 space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MessageSquare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            {t("أسئلة الجهة المنفّذة", "Questions from the executing party")}
          </span>
          {questions.map((q) => (
            <div key={q.id} className="border-t border-border pt-2 first:border-0 first:pt-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="text-foreground">{q.raised_by_name}</span>
                {q.category_label && <span>· {lang === "ar" ? q.category_label.ar : q.category_label.en}</span>}
                <span>· {q.raised_at ? formatDate(q.raised_at) : "—"}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${q.status === "raised" ? "bg-state-warning-surface text-state-warning-ink" : "bg-state-success-surface text-state-success-ink"}`}>
                  {q.status === "raised" ? t("بانتظار الردّ", "Awaiting answer") : t("مُجاب", "Answered")}
                </span>
              </div>
              <p className="text-xs text-foreground">{q.question}</p>
              {q.status === "raised" ? (
                <div className="flex items-end gap-2">
                  <Input
                    aria-label={t("الردّ", "Answer")}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={t("نصّ الردّ", "Answer text")}
                  />
                  <Button
                    size="sm"
                    disabled={busy === `answer_${q.id}` || (answers[q.id] || "").trim().length < 2}
                    onClick={() => run(`answer_${q.id}`, () => base44.functions.invoke("AnswerActionClarification", { clarification_id: q.id, answer: (answers[q.id] || "").trim() }), t("أُرسل الردّ.", "The answer was recorded."))}
                    className="min-h-[32px]"
                  >
                    <Send className="w-3 h-3" />{t("الردّ", "Answer")}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground rounded bg-secondary/50 px-2 py-1">
                  {q.answer}{q.answered_by_capacity ? ` — ${q.answered_by_capacity}` : ""}
                </p>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            {t("الردّ يغيّر حالة السؤال فقط: لا يمسّ الالتزام ولا مهله ولا دليله.", "Answering changes the question's state only: it touches neither the obligation nor its deadline nor its evidence.")}
          </p>
        </div>
      )}

      {outcome && (
        <p className={`text-[11px] rounded px-2 py-1 ${outcome.kind === "ok" ? "bg-state-success-surface text-state-success-ink" : "bg-state-danger-surface text-state-danger-ink"}`}>
          {outcome.message}{outcome.code ? ` (${outcome.code})` : ""}
          {outcome.detail?.link_path && (
            <button onClick={() => copy(outcome.detail.link_path)} className="ms-2 underline">
              {t("انسخ الرابط المسلَّم", "Copy the issued link")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}