import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileCheck2, AlertTriangle, Loader2, ShieldAlert, History } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// ProposalIntegrityPanel — the frozen-text surface for ONE decision (D-061, S14).
//
// Before a ballot and before an issuance, the person acting sees: the text frozen by the open round
// and its verifying fingerprint, the text in force now, and every field that moved (material changes
// highlighted). It never decides anything by itself: the refusal itself happens on the server, and
// this panel exists so the reason is visible BEFORE the attempt, not after it.

const FINDING_LABEL = {
  amount_changed: { ar: "تغيّر مبلغ/نسبة", en: "Amount or percentage changed" },
  date_changed: { ar: "تغيّر تاريخ", en: "Date changed" },
  negation_added: { ar: "أُضيف نفي/استثناء", en: "Negation or exception added" },
  negation_removed: { ar: "أُزيل نفي/استثناء", en: "Negation or exception removed" },
  responsibility_changed: { ar: "تغيّر مالك التنفيذ", en: "Execution owner changed" },
  deadline_changed: { ar: "تغيّرت المهلة", en: "Deadline changed" },
  legal_basis_changed: { ar: "تغيّر السند النظامي", en: "Legal basis changed" },
  field_added: { ar: "حقل أُضيف", en: "Field added" },
  field_removed: { ar: "حقل أُفرغ", en: "Field emptied" },
  wording_changed: { ar: "صياغة فقط", en: "Wording only" },
  // Materiality findings (material-change-1.0.0) — the changes a field-level diff cannot see.
  unit_changed: { ar: "تغيّرت الوحدة مع بقاء الرقم (يوم/أسبوع · نسبة/عملة)", en: "Unit changed while the number stayed (day/week · percent/currency)" },
  value_subject_swap: { ar: "انتقل الرقم إلى جهة أو بند آخر", en: "A number moved to another party or subject" },
  modality_strengthened: { ar: "تشددت الصيغة الإلزامية (يجوز ← يجب)", en: "Obligation strengthened (may → shall)" },
  modality_weakened: { ar: "تراخت الصيغة الإلزامية (يجب ← يجوز)", en: "Obligation weakened (shall → may)" },
  scope_changed: { ar: "تغيّر نطاق الالتزام (كل/بعض · حد أدنى/حد أعلى)", en: "Scope changed (all/some · floor/ceiling)" },
  reference_changed: { ar: "تغيّر السند المرجعي المُسمّى", en: "A named normative reference changed" },
  text_added: { ar: "أُضيف نص لم يكن مُصوَّتًا عليه", en: "Text was added that was not voted on" },
  text_removed: { ar: "أُزيل نص كان مُصوَّتًا عليه", en: "Text that was voted on was removed" },
};

const BINDING_STATE = {
  bound: {
    tone: "text-state-success-ink bg-state-success-surface border-state-success-ink/30",
    ar: "النص المعروض هو النص الذي جُمِّد في دورة التصويت.",
    en: "The text in force is the text this round froze.",
  },
  stale: {
    tone: "text-state-danger-ink bg-state-danger-surface border-destructive/30",
    ar: "تغيّر نص المقترح بعد فتح دورة التصويت — لا يُسجَّل صوت ولا يصدر قرار على نص غير المجمَّد.",
    en: "The proposal changed after the round opened — no ballot is recorded and nothing is issued on a text other than the frozen one.",
  },
  unbound_legacy: {
    tone: "text-state-warning-ink bg-state-warning-surface border-state-warning-ink/30",
    ar: "دورة التصويت هذه فُتحت قبل تثبيت النص، فلا يُعرف النص الذي يُصوَّت عليه.",
    en: "This round opened before content freezing, so the text being voted on is unknown.",
  },
  tampered: {
    tone: "text-state-danger-ink bg-state-danger-surface border-destructive/30",
    ar: "النسخة المجمّدة لا تطابق بصمتها المسجّلة؛ لا يُعتمد عليها كدليل.",
    en: "The frozen copy does not match its recorded fingerprint; it is not sound evidence.",
  },
};

export default function ProposalIntegrityPanel({ decision }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = async () => {
    if (!decision?.id) return;
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("GetProposalChanges", {
        committee_id: decision.committee_id,
        decision_id: decision.id,
      });
      const data = res?.data || {};
      if (data.error) { setState({ loading: false, data: null, error: data.message?.[lang] || data.error }); return; }
      setState({ loading: false, data, error: null });
    } catch (e) {
      const data = e?.response?.data || {};
      setState({ loading: false, data: null, error: data.message?.[lang] || data.error || e?.message || t("تعذّر قراءة نسخة المقترح.", "The proposal version could not be read.") });
    }
  };

  useEffect(() => { load(); }, [decision?.id, decision?.updated_date]);

  if (state.loading) {
    return (
      <div className="p-3 rounded-md border border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("جارٍ التحقق من نسخة المقترح…", "Verifying the proposal version…")}
      </div>
    );
  }

  // A read that failed is reported as a failure — never rendered as "no changes".
  if (state.error) {
    return (
      <div className="p-3 rounded-md border border-destructive/30 bg-state-danger-surface text-xs text-state-danger-ink flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p>{state.error}</p>
          <button onClick={load} className="mt-1 underline text-[11px]">{t("إعادة المحاولة", "Retry")}</button>
        </div>
      </div>
    );
  }

  const d = state.data;
  if (!d) return null;
  const bind = BINDING_STATE[d.binding?.state] || BINDING_STATE.unbound_legacy;
  const changes = d.changes;
  const material = (changes?.fields || []).filter((f) => f.material);
  const textual = (changes?.fields || []).filter((f) => !f.material);

  return (
    <div className="rounded-md border border-border divide-y divide-border">
      {/* 1 — the binding verdict between the text now and the text frozen by the round */}
      <div className={`p-3 flex items-start gap-2 border-b ${bind.tone}`}>
        {d.binding?.state === "bound"
          ? <FileCheck2 className="w-4 h-4 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium">{lang === "ar" ? bind.ar : bind.en}</p>
          <p className="text-[11px] opacity-80">
            {t("نسخة النص في القوة:", "Text version in force:")} <span className="font-mono">{d.current?.version}</span>
            {d.open_round?.frozen_version ? <> · {t("نسخة الدورة المجمّدة:", "Round frozen version:")} <span className="font-mono">{d.open_round.frozen_version}</span></> : null}
          </p>
          {d.open_round && (
            <p className="text-[11px] opacity-80">
              {t("الدورة", "Round")} {d.open_round.round_number ?? "—"}
              {d.open_round.frozen_at ? ` · ${t("جُمِّدت", "frozen")} ${new Date(d.open_round.frozen_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : ""}
            </p>
          )}
          {d.round_conflict && (
            <p className="text-[11px] font-medium">{t("أكثر من دورة تصويت نشطة لهذا القرار — لا تُختار دورة بالترتيب.", "More than one active round exists — none is chosen by order.")}</p>
          )}
        </div>
      </div>

      {/* 2 — what moved between the frozen text and the text in force */}
      {changes?.changed && (
        <div className="p-3 space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            {t("ما تغيّر:", "What moved:")} {material.length > 0
              ? <span className="text-state-danger-ink">{t(`${material.length} تغيير جوهري`, `${material.length} material`)}</span>
              : <span className="text-muted-foreground">{t("صياغة فقط", "wording only")}</span>}
          </p>
          <div className="space-y-1.5">
            {[...material, ...textual].map((f) => (
              <div key={f.field} className={`rounded border p-2 text-[11px] ${f.material ? "border-destructive/30 bg-state-danger-surface" : "border-border bg-secondary/30"}`}>
                <p className={`font-medium ${f.material ? "text-state-danger-ink" : "text-muted-foreground"}`}>
                  {lang === "ar" ? f.label.ar : f.label.en}
                  {" · "}
                  <span className="font-normal">
                    {Array.from(new Set([...(f.findings || []), ...(f.semantic_findings || [])].map((x) => x.type || x.code)))
                      .map((code) => (lang === "ar" ? FINDING_LABEL[code]?.ar : FINDING_LABEL[code]?.en) || code)
                      .join(" · ")}
                  </span>
                </p>
                <p className="text-muted-foreground line-through truncate">{f.before || t("(فارغ)", "(empty)")}</p>
                <p className="text-foreground truncate">{f.after || t("(فارغ)", "(empty)")}</p>
              </div>
            ))}
          </div>

          {/* A change whose number and unit sit in DIFFERENT fields: no per-field diff can see it. */}
          {(changes?.cross_field_findings || []).length > 0 && (
            <div className="rounded border border-destructive/30 bg-state-danger-surface p-2 text-[11px]">
              <p className="font-medium text-state-danger-ink">{t("تغيير بين الحقول (رقم هنا ووحدته هناك)", "Movement across fields (a number here, its unit there)")}</p>
              <p className="text-state-danger-ink">
                {(changes.cross_field_findings || [])
                  .map((x) => (lang === "ar" ? FINDING_LABEL[x.code]?.ar || x.label?.ar : FINDING_LABEL[x.code]?.en || x.label?.en) || x.code)
                  .join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3 — the frozen text itself, so a member reads exactly what is being voted on */}
      {d.open_round?.frozen_content && (
        <details className="p-3">
          <summary className="text-xs font-medium text-foreground cursor-pointer">{t("النص المجمّد في هذه الدورة", "The text frozen in this round")}</summary>
          <div className="mt-2 space-y-1.5">
            {Object.entries(d.open_round.frozen_content).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="text-[11px]">
                <span className="text-muted-foreground">{k}</span>
                <p className="text-foreground whitespace-pre-wrap">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground font-mono">{d.open_round.frozen_sha256}</p>
        </details>
      )}

      {!d.open_round && (
        <div className="p-3 text-[11px] text-muted-foreground">
          {t("لا دورة تصويت مفتوحة بعد؛ تُجمَّد نسخة النص عند فتح التصويت.", "No round is open yet; the text is frozen when the vote opens.")}
          {d.previous_round?.frozen_version ? ` · ${t("الدورة السابقة:", "Previous round:")} ${d.previous_round.round_number ?? "—"}` : ""}
        </div>
      )}
    </div>
  );
}