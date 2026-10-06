import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Users, RefreshCw, ShieldQuestion } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";

// RoundEffectPanel — material D on the surface: what a membership change does to THIS round, shown to
// the secretary and the chair before they act. It reports the four facts the brief asks for (the
// frozen seats, the change with BOTH its effective and recorded instants, what the institution's own
// instrument says, and what is affected), and when the instrument is silent it shows the unresolved
// choice and the authorized choices that settle it — instead of assuming a rule.
const T = {
  title: { ar: "أثر تغيّر العضوية على الدورة", en: "Effect of a membership change on this round" },
  loading: { ar: "جارٍ فحص تاريخ التعيينات…", en: "Checking the appointment history…" },
  failed: { ar: "تعذّرت قراءة أثر تغيّر العضوية؛ لا يُعرض صفر.", en: "The effect of the membership change could not be read; no zero is shown." },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  none: { ar: "لا تغيير يقع داخل هذه الدورة.", en: "No change falls inside this round." },
  frozen: { ar: "الدورة تُكمَل بهيئة يوم التجميد.", en: "The round completes with its frozen electorate." },
  retested: { ar: "أُعيد قياس المشاركة في لحظة الإغلاق.", en: "Participation was re-measured at the closing instant." },
  nextRound: { ar: "التغيير يسري على الدورة التالية، ولا يُستأنف الجمود السابق.", en: "The change applies from the next round; an earlier frozen snapshot is never reused." },
  unresolved: { ar: "النظام الداخلي لا ينصّ على الأثر — الخيار مطلوب", en: "The instrument is silent — the choice is required" },
  policy: { ar: "السياسة المسجَّلة", en: "Recorded policy" },
  effective: { ar: "نفاذًا", en: "effective" },
  recorded: { ar: "تسجيلًا", en: "recorded" },
  retro: { ar: "سُجّل بعد النفاذ", en: "recorded after it took effect" },
  affected: { ar: "المتأثر", en: "Affected" },
  choices: { ar: "الخيارات المعتمدة", en: "Authorized choices" },
  noBallotMove: { ar: "الصوت المسجَّل قبل النفاذ لا يُنقل إلى الخلف ولا يُمحى.", en: "A ballot cast before the change is neither reassigned to the successor nor erased." },
};

const CHOICE_LABEL = {
  pause_process: { ar: "إيقاف الإجراء", en: "Pause the process" },
  replace_prospectively: { ar: "استبدال لاحق", en: "Replace prospectively" },
  re_establish_quorum: { ar: "إعادة تحقيق المشاركة", en: "Re-establish participation" },
  close_reopen_round: { ar: "إغلاق وفتح دورة", en: "Close and reopen a round" },
  reconstitute_meeting: { ar: "إعادة تشكيل الاجتماع", en: "Reconstitute the meeting" },
  seek_ratification: { ar: "طلب التصديق", en: "Seek ratification" },
};
const FACT_LABEL = {
  attendance: { ar: "الحضور", en: "Attendance" },
  eligible_seats: { ar: "المقاعد المؤهلة", en: "Eligible seats" },
  quorum: { ar: "النصاب", en: "Quorum" },
  pending_votes: { ar: "الأصوات المعلّقة", en: "Pending votes" },
  signatures: { ar: "التواقيع", en: "Signatures" },
  next_steps: { ar: "الخطوات التالية", en: "Next steps" },
};

export default function RoundEffectPanel({ decision }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async () => {
    if (!decision?.id) return;
    setState({ loading: true, error: null, data: null });
    try {
      const res = await base44.functions.invoke("GetDecisionEffectState", { decision_id: decision.id });
      const data = res?.data || {};
      if (data.error) setState({ loading: false, error: data.message?.[lang] || data.error, data: null });
      else setState({ loading: false, error: null, data });
    } catch (e) {
      const data = e?.response?.data || {};
      setState({ loading: false, error: data.message?.[lang] || data.error || e?.message || t(T.failed.ar, T.failed.en), data: null });
    }
  }, [decision?.id, lang]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return (
      <div className="p-3 rounded-md border border-border bg-secondary/30 flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t(T.loading.ar, T.loading.en)}
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="p-3 rounded-md border border-destructive/30 bg-state-danger-surface flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
        <div className="text-xs text-state-danger-ink space-y-1">
          <p>{state.error}</p>
          <button onClick={load} className="underline">{t(T.retry.ar, T.retry.en)}</button>
        </div>
      </div>
    );
  }
  const d = state.data;
  if (!d) return null;

  const changes = d.changes || [];
  const unresolved = d.action === "unresolved_policy";
  const tone = unresolved ? "border-state-warning-ink/30 bg-state-warning-surface" : "border-border bg-secondary/30";

  return (
    <div className={`rounded-md border p-3 space-y-2 ${tone}`}>
      <div className="flex items-center gap-2">
        {unresolved ? <ShieldQuestion className="w-4 h-4 text-state-warning-ink shrink-0" /> : <Users className="w-4 h-4 text-muted-foreground shrink-0" />}
        <p className="text-xs font-medium text-foreground">{t(T.title.ar, T.title.en)}</p>
        <StatusBadge
          label={unresolved ? t(T.unresolved.ar, T.unresolved.en)
            : d.action === "participation_not_met_after_change" ? t("المشاركة دون المطلوب بعد التغيير", "Participation below requirement after the change")
            : changes.length > 0 ? t(T.frozen.ar, T.frozen.en) : t(T.none.ar, T.none.en)}
          colorClass={unresolved ? "text-state-warning-ink bg-state-warning-surface" : "text-state-neutral-ink bg-state-neutral-surface"}
        />
      </div>

      {changes.length > 0 && (
        <div className="space-y-1">
          {changes.map((c) => (
            <div key={c.seat_id} className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
              <span className="text-foreground">{c.person_name || c.seat_id}</span>
              <span>· {c.seat_role || "—"} · {c.ended_by || c.standing}</span>
              {c.effective_at && <span>· {t(T.effective.ar, T.effective.en)}: {String(c.effective_at).slice(0, 10)}</span>}
              {c.recorded_at && <span>· {t(T.recorded.ar, T.recorded.en)}: {String(c.recorded_at).slice(0, 10)}</span>}
              {c.recorded_after_effect && <span className="text-state-warning-ink">· {t(T.retro.ar, T.retro.en)}</span>}
            </div>
          ))}
        </div>
      )}

      {d.policy && (
        <p className="text-[11px] text-muted-foreground">
          {t(T.policy.ar, T.policy.en)}: <span className="text-foreground">{d.policy.mid_round_change}</span>
          {d.policy.resolution_route ? ` · ${d.policy.resolution_route}` : ""}
          {d.policy.policy_version ? ` · v${d.policy.policy_version}` : ""}
          {d.next_freeze_must_use_current_register ? ` · ${t(T.nextRound.ar, T.nextRound.en)}` : ""}
        </p>
      )}

      {unresolved && (
        <div className="space-y-1">
          <p className="text-[11px] text-state-warning-ink">{lang === "ar" ? d.refusal?.ar : d.refusal?.en}</p>
          <p className="text-[11px] text-muted-foreground">
            {t(T.affected.ar, T.affected.en)}: {(d.affected_facts || []).map((f) => t(FACT_LABEL[f]?.ar || f, FACT_LABEL[f]?.en || f)).join(" · ")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t(T.choices.ar, T.choices.en)}: {(d.authorized_choices || []).map((c) => t(CHOICE_LABEL[c]?.ar || c, CHOICE_LABEL[c]?.en || c)).join(" · ")}
          </p>
        </div>
      )}

      {d.retest && (
        <p className="text-[11px] text-muted-foreground">
          {t(T.retested.ar, T.retested.en)}: {d.retest.participation_after} / {d.retest.participation_required ?? "—"}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">{t(T.noBallotMove.ar, T.noBallotMove.en)}</p>
    </div>
  );
}