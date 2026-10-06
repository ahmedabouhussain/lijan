import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldCheck, AlertTriangle, Loader2, Building2, Send, Check, EyeOff, Clock } from "lucide-react";

// ActionExtractView — the PUBLIC, obligation-scoped execution extract reached by link (/extract/:token).
//
// No account and no app role: the token is the whole capability, and the server decides on every read.
// The page repeats what the receiving party must understand rather than assume: this is ONE obligation,
// the boundary of what it does not include, and the fact that acknowledging receipt is NOT approval,
// NOT completion and NOT a change to the deadline.

const FIELD_LABELS = {
  obligation: { ar: "الالتزام", en: "The obligation" },
  requirement: { ar: "المطلوب المحدد", en: "The specific requirement" },
  progress: { ar: "حالة الإنجاز", en: "Progress" },
  evidence: { ar: "الدليل الذي قدّمته", en: "The evidence you submitted" },
  verdict: { ar: "حكم التحقق", en: "The verification verdict" },
  origin: { ar: "مصدر الالتزام", en: "Where it comes from" },
};

const VERDICT_LABELS = {
  not_submitted: { ar: "لم يُقدَّم دليل", en: "No evidence submitted" },
  submitted: { ar: "بانتظار تحقق مستقل", en: "Awaiting independent verification" },
  returned: { ar: "أُعيد للتعديل", en: "Returned for correction" },
  accepted: { ar: "دليل مقبول", en: "Evidence accepted" },
};

export default function ActionExtractView() {
  const { token } = useParams();
  const { lang, toggleLang } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("scope");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const load = async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("GetActionExtractView", { token });
      const d = res?.data || res;
      if (d?.error || !d?.view) setState({ loading: false, data: null, error: (lang === "ar" ? d?.error_ar : d?.error) || d?.error || "Unavailable" });
      else setState({ loading: false, data: d, error: null });
    } catch (e) {
      const d = e?.response?.data || {};
      setState({ loading: false, data: null, error: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || "Unavailable" });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const act = async (key, body, doneMessage) => {
    setBusy(key);
    setOutcome(null);
    try {
      const res = await base44.functions.invoke("RespondToActionExtract", { token, ...body });
      const d = res?.data || {};
      if (d.error) setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error, code: d.code });
      else { setOutcome({ kind: "ok", message: doneMessage }); setQuestion(""); setNote(""); }
      await load();
    } catch (e) {
      const d = e?.response?.data || {};
      setOutcome({ kind: "refused", message: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || "Unavailable", code: d.code });
    }
    setBusy(null);
  };

  const v = state.data?.view;
  const access = state.data?.access || {};
  const questions = state.data?.questions || [];
  const ex = v?.extract || {};

  return (
    <div className="min-h-app bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          {lang === "ar" ? "مستخلص تنفيذ — التزام واحد" : "Execution extract — one obligation"}
        </div>
        <button onClick={toggleLang} className="text-xs opacity-90 hover:opacity-100">
          {lang === "ar" ? "English" : "العربية"}
        </button>
      </header>

      <main className="flex-1 p-4 max-w-3xl w-full mx-auto">
        {state.loading ? (
          <div className="raqeem-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />{lang === "ar" ? "جارٍ التحقق من الرابط…" : "Verifying the link…"}
          </div>
        ) : state.error ? (
          <div className="raqeem-card p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{lang === "ar" ? "هذا الرابط غير صالح" : "This link is not valid"}</div>
                <p className="text-xs text-muted-foreground mt-1">{state.error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* The obligation itself. */}
            {ex.obligation && (
              <div className="raqeem-card p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {ex.origin?.organization && (
                    <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{lang === "ar" ? ex.origin.organization.name : ex.origin.organization.name_en || ex.origin.organization.name}</span>
                  )}
                  {ex.origin?.committee && (<><span>·</span><span>{lang === "ar" ? ex.origin.committee.name : ex.origin.committee.name_en || ex.origin.committee.name}</span></>)}
                  {ex.origin?.decision?.number && (<><span>·</span><span>{lang === "ar" ? "قرار" : "Decision"} {ex.origin.decision.number}</span></>)}
                </div>
                <h1 className="mt-2 text-lg font-bold">{lang === "ar" ? ex.obligation.title : ex.obligation.title_en || ex.obligation.title}</h1>
                <dl className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-muted-foreground">{lang === "ar" ? "المسؤول" : "Owner"}</dt><dd>{lang === "ar" ? ex.obligation.owner_name : ex.obligation.owner_name_en || ex.obligation.owner_name || "—"}</dd></div>
                  <div><dt className="text-muted-foreground">{lang === "ar" ? "المهلة" : "Deadline"}</dt><dd>{ex.obligation.deadline || "—"}</dd></div>
                  {ex.obligation.responsible_department && (
                    <div><dt className="text-muted-foreground">{lang === "ar" ? "الإدارة المسؤولة" : "Responsible department"}</dt><dd>{lang === "ar" ? ex.obligation.responsible_department : ex.obligation.responsible_department_en || ex.obligation.responsible_department}</dd></div>
                  )}
                  <div><dt className="text-muted-foreground">{lang === "ar" ? "الحالة" : "State"}</dt><dd>{ex.obligation.status}</dd></div>
                </dl>
              </div>
            )}

            {ex.requirement && (ex.requirement.required_evidence || ex.requirement.required_evidence_en) && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "المطلوب المحدد" : "The specific requirement"}</div>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {lang === "ar" ? ex.requirement.required_evidence : ex.requirement.required_evidence_en || ex.requirement.required_evidence}
                </p>
              </div>
            )}

            {ex.progress && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "حالة الإنجاز" : "Progress"}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${ex.progress.progress_percent || 0}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{ex.progress.progress_percent || 0}%</span>
                </div>
                {ex.progress.blocker && <p className="mt-2 text-xs text-state-warning-ink">{ex.progress.blocker}</p>}
              </div>
            )}

            {ex.evidence && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "الدليل الذي قدّمته" : "The evidence you submitted"}</div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div>{lang === "ar" ? "رقعة الدليل" : "Revision"}: {ex.evidence.revision}</div>
                  {ex.evidence.submitted_at && <div>{lang === "ar" ? "تاريخ التقديم" : "Submitted"}: {String(ex.evidence.submitted_at).slice(0, 10)}</div>}
                  {ex.evidence.reference && (
                    <a href={ex.evidence.reference} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{ex.evidence.reference}</a>
                  )}
                </div>
              </div>
            )}

            {ex.verdict && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "حكم التحقق" : "The verification verdict"}</div>
                <div className="mt-2 text-xs space-y-1">
                  <div className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {lang === "ar" ? (VERDICT_LABELS[ex.verdict.state]?.ar || ex.verdict.state) : (VERDICT_LABELS[ex.verdict.state]?.en || ex.verdict.state)}
                  </div>
                  {ex.verdict.return_reason && (
                    <p className="text-state-warning-ink bg-state-warning-surface rounded px-2 py-1">
                      {lang === "ar" ? "سبب الإعادة:" : "Reason for return:"} {ex.verdict.return_reason}
                    </p>
                  )}
                  {ex.verdict.accepted_at && <div className="text-muted-foreground">{lang === "ar" ? "تاريخ القبول" : "Accepted"}: {String(ex.verdict.accepted_at).slice(0, 10)}</div>}
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ar"
                      ? "يصل الحكم وسببه، ولا تصل هوية من حكم: التحقق عمل مستقل عن الجهة المنفّذة."
                      : "The verdict and its basis reach you; the identity of the judge does not: verification is independent of the executing party."}
                  </p>
                </div>
              </div>
            )}

            {/* Acknowledgement: a receipt, and nothing more. */}
            <div className="raqeem-card p-4">
              <div className="text-sm font-semibold">{lang === "ar" ? "الإقرار بالاستلام" : "Acknowledgement of receipt"}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">{lang === "ar" ? state.data.semantics.ar : state.data.semantics.en}</p>
              {access.acknowledged ? (
                <p className="mt-2 text-xs text-state-success-ink bg-state-success-surface rounded px-2 py-1">
                  {lang === "ar" ? "سُجّل الإقرار" : "Receipt recorded"}
                  {access.acknowledged_at ? ` — ${String(access.acknowledged_at).slice(0, 16).replace("T", " ")}` : ""}
                  {access.acknowledged_by_name ? ` — ${access.acknowledged_by_name}` : ""}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === "ar" ? "الاسم والصفة" : "Name and capacity"}
                    className="w-full h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
                    aria-label={lang === "ar" ? "الاسم والصفة" : "Name and capacity"}
                  />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={lang === "ar" ? "ملاحظة (اختياري)" : "Note (optional)"}
                    className="w-full h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
                    aria-label={lang === "ar" ? "ملاحظة" : "Note"}
                  />
                  <button
                    onClick={() => act("ack", { act: "acknowledge", name: name.trim(), note: note.trim() || undefined }, lang === "ar" ? "سُجّل الإقرار بالاستلام." : "Receipt recorded.")}
                    disabled={busy === "ack" || name.trim().length < 2}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium disabled:opacity-50"
                  >
                    {busy === "ack" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {lang === "ar" ? "أُقرّ بالاستلام" : "Acknowledge receipt"}
                  </button>
                </div>
              )}
            </div>

            {/* Questions and answers. */}
            {state.data.question_categories && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "طلب توضيح" : "Ask for a clarification"}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? "السؤال لا يغيّر حالة الالتزام ولا مهلته: يُوجَّه إلى اللجنة ويُجاب عليه في هذا الرابط."
                    : "A question changes neither the obligation nor its deadline: it goes to the committee and the answer appears on this link."}
                </p>
                <div className="mt-2 space-y-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-2 rounded-md text-sm border border-border bg-card text-foreground"
                    aria-label={lang === "ar" ? "تصنيف السؤال" : "Question category"}
                  >
                    {state.data.question_categories.map((c) => (
                      <option key={c.key} value={c.key}>{lang === "ar" ? c.ar : c.en}</option>
                    ))}
                  </select>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    placeholder={lang === "ar" ? "نصّ السؤال" : "Your question"}
                    className="w-full px-2 py-1.5 rounded-md text-sm border border-border bg-card text-foreground"
                    aria-label={lang === "ar" ? "نصّ السؤال" : "Question text"}
                  />
                  <button
                    onClick={() => act("ask", { act: "ask", category, question: question.trim(), name: name.trim() || undefined }, lang === "ar" ? "أُرسل السؤال إلى اللجنة." : "The question was sent to the committee.")}
                    disabled={busy === "ask" || question.trim().length < 3}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium disabled:opacity-50"
                  >
                    {busy === "ask" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {lang === "ar" ? "إرسال السؤال" : "Send the question"}
                  </button>
                </div>
              </div>
            )}

            {questions.length > 0 && (
              <div className="raqeem-card p-4">
                <div className="text-sm font-semibold">{lang === "ar" ? "التوضيحات المتبادلة" : "Questions and answers"}</div>
                <ul className="mt-2 space-y-2">
                  {questions.map((q) => (
                    <li key={q.id} className="border-t border-border pt-2 first:border-0 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{q.category_label ? (lang === "ar" ? q.category_label.ar : q.category_label.en) : q.category}</span>
                        <span>· {q.raised_at ? String(q.raised_at).slice(0, 10) : "—"}</span>
                        <span className={`px-1.5 py-0.5 rounded ${q.status === "raised" ? "bg-state-warning-surface text-state-warning-ink" : "bg-state-success-surface text-state-success-ink"}`}>
                          {q.status === "raised" ? (lang === "ar" ? "بانتظار الردّ" : "Awaiting answer") : (lang === "ar" ? "مُجاب" : "Answered")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs">{q.question}</p>
                      {q.answer && <p className="mt-1 text-xs text-muted-foreground rounded bg-secondary/50 px-2 py-1">{q.answer}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* The boundary, stated rather than implied. */}
            {v?.excluded_by_contract && (
              <div className="raqeem-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <EyeOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  {lang === "ar" ? "ما لا يشمله هذا المستخلص" : "What this extract does not include"}
                </div>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc ps-4">
                  {v.excluded_by_contract.map((x) => <li key={x.key}>{lang === "ar" ? x.ar : x.en}</li>)}
                </ul>
              </div>
            )}

            <div className="raqeem-card p-4 text-[11px] text-muted-foreground space-y-1">
              <div><strong>{lang === "ar" ? "نطاق هذا الرابط" : "Scope of this link"}:</strong> {lang === "ar" ? "التزام واحد فقط" : "one obligation only"}</div>
              <div className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <strong>{lang === "ar" ? "صالحة حتى" : "Valid until"}:</strong> {v?.scope?.expires_at ? String(v.scope.expires_at).slice(0, 16).replace("T", " ") : "—"}
              </div>
              {state.data.limits && <div>{lang === "ar" ? state.data.limits.ar : state.data.limits.en}</div>}
            </div>

            {outcome && (
              <p className={`text-xs rounded px-3 py-2 ${outcome.kind === "ok" ? "bg-state-success-surface text-state-success-ink" : "bg-state-danger-surface text-state-danger-ink"}`}>
                {outcome.message}{outcome.code ? ` (${outcome.code})` : ""}
              </p>
            )}

            <footer className="text-center text-[10px] text-muted-foreground py-2">
              {lang === "ar" ? "لِجان™ — منصة الحوكمة المؤسسية" : "LIJAN™ — institutional governance platform"}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}