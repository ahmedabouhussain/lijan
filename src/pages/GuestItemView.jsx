import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldCheck, AlertTriangle, Loader2, CalendarDays, Building2, User } from "lucide-react";

// GuestItemView — the PUBLIC, item-scoped guest view reached by invitation link (/guest/:token).
//
// No account, no app role: the token is the capability and the server decides on every read. The
// page renders only what the getGuestItemView command returns, and it repeats the two limits the
// guest must understand: the scope is one item, and material already downloaded cannot be recalled.

export default function GuestItemView() {
  const { token } = useParams();
  const { lang, toggleLang } = useLanguage();
  const [state, setState] = useState({ loading: true, view: null, error: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetGuestItemView", { token });
        if (!alive) return;
        const d = res?.data || res;
        if (d?.error || !d?.view) setState({ loading: false, view: null, error: d?.error || "Unavailable" });
        else setState({ loading: false, view: d.view, error: null });
      } catch (e) {
        if (!alive) return;
        const d = e?.response?.data || {};
        setState({ loading: false, view: null, error: (lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || "Unavailable" });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const v = state.view;

  return (
    <div className="min-h-app bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          {lang === "ar" ? "دعوة ضيف — بند واحد" : "Guest invitation — one item"}
        </div>
        <button onClick={toggleLang} className="text-xs opacity-90 hover:opacity-100">
          {lang === "ar" ? "English" : "العربية"}
        </button>
      </header>

      <main className="flex-1 p-4 max-w-3xl w-full mx-auto">
        {state.loading ? (
          <div className="raqeem-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />{lang === "ar" ? "جارٍ التحقق من الدعوة…" : "Verifying the invitation…"}
          </div>
        ) : state.error ? (
          <div className="raqeem-card p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{lang === "ar" ? "الدعوة غير صالحة" : "This invitation is not valid"}</div>
                <p className="text-xs text-muted-foreground mt-1">{state.error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="raqeem-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{lang === "ar" ? v.organization?.name : v.organization?.name_en}</span>
                <span>·</span>
                <span>{lang === "ar" ? v.committee?.name : v.committee?.name_en}</span>
                {v.meeting?.date && (<><span>·</span><span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{String(v.meeting.date).slice(0, 10)}</span></>)}
              </div>
              <h1 className="mt-2 text-lg font-bold">
                {lang === "ar" ? v.item?.title : v.item?.title_en}
              </h1>
              {(lang === "ar" ? v.item?.objective : v.item?.objective_en) && (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{lang === "ar" ? v.item?.objective : v.item?.objective_en}</p>
              )}
              <dl className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">{lang === "ar" ? "القرار المطلوب" : "Required decision"}</dt><dd>{lang === "ar" ? v.item?.required_decision : v.item?.required_decision_en || "—"}</dd></div>
                <div><dt className="text-muted-foreground">{lang === "ar" ? "المقدم" : "Presenter"}</dt><dd className="inline-flex items-center gap-1"><User className="w-3 h-3" />{lang === "ar" ? v.item?.presenter : v.item?.presenter_en || "—"}</dd></div>
                <div><dt className="text-muted-foreground">{lang === "ar" ? "المدة المخصصة" : "Time allocation"}</dt><dd>{v.item?.time_allocation_minutes ? `${v.item.time_allocation_minutes} ${lang === "ar" ? "دقيقة" : "min"}` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">{lang === "ar" ? "الضيف" : "Guest"}</dt><dd>{lang === "ar" ? v.guest?.name : v.guest?.name_en}{v.guest?.organization ? ` — ${v.guest.organization}` : ""}</dd></div>
              </dl>
            </div>

            <div className="raqeem-card p-4">
              <div className="text-sm font-semibold">{lang === "ar" ? "المرفقات المسموح بها لهذه الدعوة" : "Attachments permitted to this invitation"}</div>
              {v.attachments?.length ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {v.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border pb-1 last:border-0">
                      <span>{lang === "ar" ? a.title : a.title_en}</span>
                      <span className="text-muted-foreground">{a.document_type} · v{a.version_number}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{lang === "ar" ? "لا مرفقات مسموح بها لهذه الدعوة." : "No attachments are permitted to this invitation."}</p>
              )}
              <p className="mt-2 text-[11px] text-state-warning-ink">{lang === "ar" ? v.file_delivery.reason_ar : v.file_delivery.reason_en}</p>
            </div>

            <div className="raqeem-card p-4 text-[11px] text-muted-foreground">
              <div><strong>{lang === "ar" ? "نطاق هذه الدعوة" : "Scope of this invitation"}:</strong> {lang === "ar" ? "بند واحد فقط" : "one agenda item only"}</div>
              <div className="mt-1"><strong>{lang === "ar" ? "صالحة حتى" : "Valid until"}:</strong> {v.scope?.expires_at ? String(v.scope.expires_at).slice(0, 16).replace("T", " ") : "—"}</div>
              <div className="mt-1">{lang === "ar" ? v.limits.ar : v.limits.en}</div>
            </div>

            <footer className="text-center text-[10px] text-muted-foreground py-2">
              {lang === "ar" ? "لِجان™ — منصة الحوكمة المؤسسية" : "LIJAN™ — institutional governance platform"}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}