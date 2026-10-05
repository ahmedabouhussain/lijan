import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { ShieldCheck, Hash, FileText, Users, Gavel, Pen, Clock, ChevronDown, ChevronUp, Lock } from "lucide-react";

export default function ProofChainSnapshot({ decision, committee, votes = [], signatures = [], actions = [], className }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (!decision) return null;

  // The base64 "content hash" that stood here was not a digest: it was a reversible encoding of the
  // record's own fields, refreshed on every render, so it could never verify anything. The digest
  // now comes from the stored issuance package, computed server-side over the frozen evidence, and
  // IssuanceIntegrityPanel reports what it does and does not prove.

  const snapshotFields = [
    { icon: Hash, label: { ar: "حزمة الإصدار", en: "Issuance Package" }, value: decision.issue_snapshot_id ? t("محفوظة", "Stored") : t("غير محفوظة", "None stored") },
    { icon: Hash, label: { ar: "بصمة حزمة الإصدار (SHA-256)", en: "Manifest Digest (SHA-256)" }, value: decision.issue_manifest_sha256 || "—", mono: true },
    { icon: FileText, label: { ar: "مرجع الصلاحية", en: "Mandate Reference" }, value: decision.legal_basis || "—" },
    { icon: Users, label: { ar: "سجلات التصويت المرتبطة", en: "Ballots Recorded" }, value: `${votes.length}` },
    { icon: Gavel, label: { ar: "النتيجة المسجّلة على السجل", en: "Recorded Result" }, value: `${decision.vote_for || 0} / ${decision.vote_against || 0} / ${decision.vote_abstain || 0}` },
    { icon: Pen, label: { ar: "التواقيع المسجّلة", en: "Signatures Recorded" }, value: `${(signatures || []).filter((s) => s.status === "active").length}` },
    { icon: Clock, label: { ar: "تاريخ الإصدار", en: "Issuance Date" }, value: decision.issued_at || "—" },
    { icon: ShieldCheck, label: { ar: "الجهة المُصدِرة", en: "Issuing Authority" }, value: committee?.chair_name || "—" },
  ];

  return (
    <div className={cn("raqeem-card overflow-hidden", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground">
            {t("سلسلة الإثبات", "Proof Chain Snapshot")}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {t("لقطة غير قابلة للتعديل لإصدار القرار", "Immutable snapshot of decision issuance")}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {snapshotFields.map((field, i) => {
              const Icon = field.icon;
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(field.label.ar, field.label.en)}
                    </div>
                    <div className={cn("text-xs font-medium text-foreground truncate", field.mono && "font-mono")}>
                      {field.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {actions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("الإجراءات المنشأة من القرار", "Actions Created from Decision")} ({actions.length})
              </div>
              <div className="space-y-1">
                {actions.map((a) => (
                  <div key={a.id} className="text-xs text-foreground/80 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {a.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
            <Lock className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              {t(
                "هذه البصمة تجريبية للتحقق. الضمانات التشفيرية الكاملة تتطلب التحقق الخارجي.",
                "This hash is a pilot verification artifact. Full cryptographic assurance requires external verification."
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}