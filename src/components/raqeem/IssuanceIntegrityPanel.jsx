import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Info } from "lucide-react";

/**
 * IssuanceIntegrityPanel — shows what a reader is actually allowed to conclude about a decision that
 * presents as issued.
 *
 * P0-01: the decision showed "issued" over a 0-seat electorate, 13 accepted votes, 5 of 6 mandatory
 * items, empty proof links and no issue date. The defect is NOT hidden by relabelling the badge: the
 * server re-verifies the package on every read and this panel lists exactly what does not reconcile.
 * A digest is a content fingerprint, not proof of legal validity, and it is labelled as such.
 */
export default function IssuanceIntegrityPanel({ decisionId, className = "" }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, issuance: null });

  useEffect(() => {
    let active = true;
    (async () => {
      let issuance = null;
      try {
        const res = await base44.functions.invoke("GetCommitteeRecord", {
          entity_type: "Decision",
          record_id: decisionId,
        });
        issuance = res?.data?.issuance || null;
      } catch (_e) {
        issuance = null;
      }
      if (active) setState({ loading: false, issuance });
    })();
    return () => { active = false; };
  }, [decisionId]);

  if (state.loading) {
    return (
      <div className={`raqeem-card p-3 sovereign-shimmer h-14 ${className}`} role="status" aria-busy="true" />
    );
  }
  const issuance = state.issuance;
  if (!issuance || issuance.state === "not_issued") return null;

  const verified = issuance.verified === true;
  const Icon = verified ? ShieldCheck : (issuance.state === "inconsistent" ? ShieldAlert : ShieldQuestion);
  const surface = verified ? "bg-state-success-surface text-state-success-ink" : "bg-state-warning-surface text-state-warning-ink";
  const facts = issuance.facts || {};
  const blockers = issuance.readiness?.blockers || issuance.reasons || [];
  const completeness = issuance.completeness || null;

  return (
    <section className={`raqeem-card overflow-hidden ${className}`} aria-live="polite">
      <div className={`flex items-start gap-3 p-3 ${surface}`}>
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {verified
              ? t("حزمة الإصدار موثّقة ومطابقة للأدلة المسجلة", "The issuance package is verified and reconciles with the stored evidence")
              : t("بيانات الإصدار غير متسقة مع الأدلة المسجلة", "The issuance record does not reconcile with the stored evidence")}
          </p>
          {!verified && (
            <p className="text-xs mt-1 opacity-90">
              {t("لا تُعدّ هذه الوثيقة موثّقة حتى يستوفي القرار المتطلبات الموضحة أدناه.", "This record is not verified until the requirements below are satisfied.")}
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border text-xs">
        <Fact label={t("الهيئة الناخبة المؤهلة", "Eligible electorate")} value={String(facts.electorate_size ?? "—")} />
        <Fact label={t("أصوات مقبولة", "Accepted ballots")} value={String(facts.accepted_ballot_count ?? "—")} />
        <Fact label={t("أصوات مرفوضة", "Rejected ballots")} value={String(facts.rejected_ballot_count ?? 0)} />
        <Fact
          label={t("الاكتمال", "Completeness")}
          value={completeness ? `${completeness.satisfied}/${completeness.required}` : "—"}
        />
      </dl>

      {blockers.length > 0 && (
        <ul className="divide-y divide-border">
          {blockers.map((b, i) => (
            <li key={`${b.code}-${i}`} className="flex items-start gap-2 p-3 text-xs">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-state-warning-ink shrink-0" />
              <span>{t(b.ar, b.en)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="p-3 border-t border-border space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-mono break-all">
          {issuance.stored_snapshot?.manifest_sha256
            ? issuance.stored_snapshot.manifest_sha256
            : t("لا توجد حزمة إصدار محفوظة", "No stored issuance package")}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t(issuance.assurance?.ar, issuance.assurance?.en)}</span>
        </p>
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-card p-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold mt-0.5 arabic-figures">{value}</dd>
    </div>
  );
}