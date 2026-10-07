import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Users, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ParticipationMatrixPanel — سطح المادة ب (المشاركة والضيوف والحضور) على لجنة واحدة.
//
// It renders the governed read as it comes: the declared taxonomy (nine participant kinds · sixteen
// independent rights · the four separated acts), the committee's actual participants and item-scoped
// guests with their presence state, and EVERY withheld right with its code and sentence. Nothing is
// summarised away, and the one thing the contract does not yet do is stated on the surface itself.
export default function ParticipationMatrixPanel({ committeeId, meetingId = null }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openKind, setOpenKind] = useState(null);

  const load = async () => {
    if (!committeeId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("GetParticipationMatrix", { committee_id: committeeId, meeting_id: meetingId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); } else { setData(d); setError(null); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر تحميل مصفوفة المشاركة", "Could not load the participation matrix"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [committeeId, meetingId]);

  if (loading) {
    return (
      <div className="raqeem-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t("جارٍ بناء مصفوفة المشاركة…", "Assembling the participation matrix…")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="raqeem-card p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t("تعذّر بناء مصفوفة المشاركة", "The participation matrix could not be assembled")}</div>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />{t("إعادة المحاولة", "Try again")}
          </button>
        </div>
      </div>
    );
  }

  const matrix = data?.matrix;
  const rights = matrix?.rights || {};
  const rightKeys = Object.keys(rights);
  const kinds = matrix?.kinds || {};
  const people = [...(data?.participants || []), ...((data?.guests || []).map((g) => ({ ...g, role: "invited_guest" })))];
  const integrity = matrix?.integrity;
  const unread = data?.unread_sources || [];

  return (
    <section className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"} aria-label={t("المشاركة والحضور", "Participation and attendance")}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/12">
          <Users className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold">{t("المشاركة والحضور — من يملك أي حقّ ولماذا", "Participation — who holds which right, and why")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              `الدعوة لا تنشئ عضوية ولا تصويتًا ولا نصابًا؛ ${rightKeys.length} حقًّا تُمنح كلٌّ على حدة لأي مشارك، ولا حق محتجب بلا سبب مُعلن.`,
              `An invitation creates no membership, no vote and no quorum; the ${rightKeys.length} rights are granted one by one, and no withheld right is withheld silently.`
            )}
          </p>
          {integrity && (
            <p className={cn("text-[11px] mt-1", integrity.ok ? "text-state-success-ink" : "text-state-warning-ink")}>
              <ShieldCheck className="w-3 h-3 inline-block align-[-2px] me-1" aria-hidden="true" />
              {t(`فحص العقد الذاتي: ${integrity.kinds} أنواع · ${integrity.rights} حقًّا · ${integrity.refusals} رفضًا معلنًا${integrity.ok ? " — لا نقص" : ` — ملاحظات: ${integrity.findings.join(" · ")}`}`,
                `Contract self-check: ${integrity.kinds} kinds · ${integrity.rights} rights · ${integrity.refusals} declared refusals${integrity.ok ? " — no gap" : ` — findings: ${integrity.findings.join(" · ")}`}`)}
            </p>
          )}
        </div>
      </div>

      {unread.length > 0 && (
        <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2 text-[11px] text-state-warning-ink">
          {t("مصادر لم تُقرأ — المصفوفة ناقصة وتقول ذلك:", "Sources that could not be read — the matrix is incomplete and says so:")} {unread.join(" · ")}
        </div>
      )}

      {/* The participants as records actually stand, with the withheld rights named. */}
      {people.length === 0 ? (
        <div className="raqeem-card p-4 text-xs text-muted-foreground">
          {t("لا مقاعد ولا ضيوف على هذه اللجنة بعد.", "No seats and no guests on this committee yet.")}
        </div>
      ) : (
        <ul className="space-y-2">
          {people.map((p, i) => (
            <li key={p.seat_id || p.grant_id || i} className="raqeem-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {(lang === "ar" ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)) || t("بلا اسم مسجَّل", "No recorded name")}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-state-neutral-surface text-state-neutral-ink">
                  {lang === "ar" ? (p.kind_label_ar || p.kind) : (p.kind_label_en || p.kind)}
                </span>
                {p.presence_state && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-state-info-surface text-state-info-ink">
                    {lang === "ar" ? matrix?.presence_states?.[p.presence_state]?.ar : matrix?.presence_states?.[p.presence_state]?.en}
                  </span>
                )}
                {p.scope && (
                  <span className="text-[10px] text-muted-foreground">{t("النطاق", "Scope")}: {p.scope}</span>
                )}
                {p.expires_at && (
                  <span className={cn("text-[10px]", p.window_closed ? "text-state-danger-ink" : "text-muted-foreground")}>
                    {t("ينتهي", "Expires")}: {String(p.expires_at).slice(0, 10)}{p.window_closed ? t(" (منتهٍ — الرابط لا يعمل)", " (closed — the link does not work)") : ""}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {rightKeys.filter((r) => p.rights?.[r]).map((r) => (
                  <span key={r} className="px-1.5 py-0.5 rounded text-[10px] bg-state-success-surface text-state-success-ink">
                    {lang === "ar" ? rights[r]?.ar : rights[r]?.en}
                  </span>
                ))}
              </div>
              {p.withheld?.length > 0 && (
                <div className="mt-1.5 border-t border-border pt-1.5 space-y-0.5">
                  {p.withheld.map((w, wi) => (
                    <p key={`${w.right}-${wi}`} className="text-[11px] text-state-danger-ink">
                      {t("مُحتجب", "Withheld")}: {lang === "ar" ? rights[w.right]?.ar : rights[w.right]?.en} — {lang === "ar" ? w.ar : w.en} <span className="opacity-70">({w.code})</span>
                    </p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The declared taxonomy itself is readable — a policy a reader can check, not a hidden table. */}
      <details className="raqeem-card p-3">
        <summary className="text-xs font-medium cursor-pointer">{t("المصفوفة المعلنة: تسعة أنواع مشارك", "The declared matrix: nine participant kinds")}</summary>
        <div className="mt-2 space-y-1.5">
          {Object.entries(kinds).map(([key, spec]) => (
            <div key={key} className="rounded-md border border-border p-2">
              <button onClick={() => setOpenKind(openKind === key ? null : key)} className="w-full text-start">
                <span className="text-xs font-semibold">{lang === "ar" ? spec.ar : spec.en}</span>
                <span className="text-[10px] text-muted-foreground ms-2">{spec.rights.length} {t("حقًّا", "rights")}</span>
              </button>
              {openKind === key && (
                <div className="mt-1.5 space-y-1">
                  <p className="text-[11px] text-muted-foreground">{lang === "ar" ? spec.note_ar : spec.note_en}</p>
                  <p className="text-[11px]"><span className="text-muted-foreground">{t("مصدر السلطة", "Source authority")}:</span> {spec.source_authority}</p>
                  <p className="text-[11px]"><span className="text-muted-foreground">{t("التصويت", "Vote")}:</span> {spec.vote} · <span className="text-muted-foreground">{t("النصاب", "Quorum")}:</span> {spec.quorum}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      {/* The four separated acts, and what this contract does not yet do. */}
      <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1">
        {(matrix?.separations || []).map((s) => (
          <p key={s.key} className="text-[11px] text-muted-foreground">• {lang === "ar" ? s.ar : s.en}</p>
        ))}
        <p className="text-[11px] text-muted-foreground border-t border-border pt-1.5">
          {lang === "ar" ? data?.declared_limits?.recorded_configuration_ar : data?.declared_limits?.recorded_configuration_en}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {lang === "ar" ? data?.declared_limits?.quorum_ar : data?.declared_limits?.quorum_en}
        </p>
      </div>
    </section>
  );
}