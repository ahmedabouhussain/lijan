import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import PageHeader from "@/components/raqeem/PageHeader";
import EmptyState from "@/components/raqeem/EmptyState";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import { Button } from "@/components/ui/button";
import { Handshake, Plus } from "lucide-react";
import { HANDOVER_DISPOSITIONS, HANDOVER_STATUS, HANDOVER_ITEM_STATUS, OBLIGATION_TYPES, EXCLUDED_FROM_HANDOVER, label } from "@/lib/structureLabels";

// CommitteeHandover — what the institution must settle before a seat changes hands.
//
// The pack is raised from the committee's OWN records, every obligation gets one disposition, the
// NAMED successor accepts under their own identity, and an unaccepted item stays visible as
// unresolved. Private notes, personal delegations, credentials, personal messages and unrelated
// memberships are excluded by contract and shown as such — never quietly moved with the seat.
export default function CommitteeHandover() {
  const { records: packs, loading, reload } = useCommitteeScopedData("HandoverPack");
  const { records: items, reload: reloadItems } = useCommitteeScopedData("HandoverItem");
  const { records: seats } = useCommitteeScopedData("CommitteeMembership");
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { canManageGovernance } = useCommitteeAdmin();
  const [showRaise, setShowRaise] = useState(false);
  const [openPack, setOpenPack] = useState(null);
  const [choices, setChoices] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  // The acceptance is personal: the surface reads the signed-in identity itself rather than
  // inferring it, so "you are the named successor" is never a guess.
  const [myUserId, setMyUserId] = useState(null);
  useEffect(() => {
    base44.auth.me().then((u) => setMyUserId(u?.id || null)).catch(() => setMyUserId(null));
  }, []);

  const SEAT_OPTIONS = (seats || []).map((s) => ({
    value: s.id,
    label_ar: `${s.full_name_ar || s.full_name} — ${s.role}`,
    label_en: `${s.full_name || s.full_name_ar} — ${s.role}`,
  }));

  const itemsOf = (packId) => (items || []).filter((i) => i.pack_id === packId);

  const decide = async (pack, decision) => {
    setBusy(true);
    setMessage("");
    try {
      const dispositions = Object.entries(choices)
        .filter(([itemId]) => itemsOf(pack.id).some((i) => i.id === itemId))
        .map(([item_id, disposition]) => ({ item_id, disposition }));
      const res = await base44.functions.invoke("AcceptHandover", {
        pack_id: pack.id,
        decision,
        return_reason: decision === "return" ? returnReason : undefined,
        item_dispositions: dispositions,
      });
      const d = res?.data || {};
      setMessage(decision === "return"
        ? t(`أُعيد التسليم للناقص (${d.items_unresolved ?? ""} بند قائم)`, `Handover returned for completion (${d.items_unresolved ?? ""} open items)`, lang)
        : t(`قُبل التسليم: ${d.items_assigned ?? 0} بند أُسند مرة واحدة، ${d.items_unresolved ?? 0} غير محلول، ${d.personal_items_revoked ?? 0} بند شخصي أُلغي.`,
            `Handover accepted: ${d.items_assigned ?? 0} assigned once, ${d.items_unresolved ?? 0} unresolved, ${d.personal_items_revoked ?? 0} personal item(s) revoked.`, lang));
      setChoices({});
      setReturnReason("");
      reload();
      reloadItems();
    } catch (e) {
      setMessage(e?.response?.data?.error_ar || e?.response?.data?.error || e?.message || t("تعذّر تنفيذ القرار", "The decision failed", lang));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Handshake}
        title={t("التسليم للخلف", "Handover & Succession", lang)}
        actions={canManageGovernance && (
          <Button size="sm" onClick={() => setShowRaise(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("رفع حزمة تسليم", "Raise a Handover")}
          </Button>
        )}
      />
      <p className="text-sm text-muted-foreground -mt-2">
        {t(
          "التزامات الجهة تنتقل بحزمة معتمدة، والملكية التاريخية للأفعال تبقى لصاحبها. ما لا يُقبل يبقى ظاهرًا كغير محلول.",
          "Institutional obligations move by an approved pack; historical attribution stays with the person who acted, and what is not accepted stays visibly unresolved.",
          lang
        )}
      </p>

      {showRaise && canManageGovernance && (
        <CrudFormDialog
          open={showRaise}
          onClose={() => setShowRaise(false)}
          title={t("رفع حزمة تسليم", "Raise a Handover Pack")}
          functionName="InitiateHandover"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={() => { reload(); reloadItems(); }}
          submitLabel={t("رفع الحزمة", "Raise")}
          fields={[
            { name: "membership_id", label: t("المقعد المغادر", "Outgoing Seat"), type: "select", required: true, options: SEAT_OPTIONS },
            { name: "successor_membership_id", label: t("مقعد الخلف (يُقبل لاحقًا بهويته)", "Successor Seat (accepts later, under their own identity)"), type: "select", options: SEAT_OPTIONS },
            { name: "successor_user_id", label: t("معرّف الخلف (user id)", "Successor User ID"), fullWidth: true },
            { name: "successor_name", label: t("اسم الخلف", "Successor Name") },
            { name: "effective_date", label: t("تاريخ النفاذ", "Effective Date"), type: "date" },
            { name: "approving_authority", label: t("السلطة المعتمدة", "Approving Authority") },
            { name: "history_scope", label: t("نطاق السجل التاريخي المسموح", "Permitted History Scope"), fullWidth: true },
          ]}
        />
      )}

      {message && <div className="raqeem-card p-3 text-sm">{message}</div>}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...", lang)}</div>
      ) : (packs || []).length === 0 ? (
        <EmptyState icon={Handshake} title={t("لا توجد حزم تسليم", "No handovers", lang)} description={t("لم تُرفع حزمة تسليم لهذه اللجنة.", "No handover has been raised for this committee.", lang)} />
      ) : (
        <div className="space-y-2">
          {packs.map((p) => {
            const rows = itemsOf(p.id);
            const isOpen = openPack === p.id;
            const mine = p.successor_user_id && myUserId && p.successor_user_id === myUserId;
            return (
              <div key={p.id} className="raqeem-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium">{p.predecessor_name || "—"}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span>{p.successor_name || t("بلا خلف بعد", "no successor yet", lang)}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {label(HANDOVER_STATUS, p.status, lang)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("النفاذ", "Effective", lang)}: {p.effective_date || "—"} · {t("المعتمِد", "Approving", lang)}: {p.approving_authority || "—"} ·{" "}
                  {t("بنود", "Items", lang)}: {p.items_total} — {t("أُسندت", "assigned", lang)}: {p.items_assigned} — {t("غير محلولة", "unresolved", lang)}: {p.items_unresolved}
                </p>
                {Array.isArray(p.inventory_not_read) && p.inventory_not_read.length > 0 && (
                  <p className="text-xs text-state-warning-ink">
                    {t("مصادر لم تُقرأ في هذه الحزمة (تبقى غير محلولة)", "Sources NOT read by this pack (kept unresolved)", lang)}: {p.inventory_not_read.join(" · ")}
                  </p>
                )}
                {Array.isArray(p.excluded_from_handover) && p.excluded_from_handover.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("مستثنى من النقل تلقائيًا", "Excluded from automatic transfer", lang)}: {p.excluded_from_handover.map((k) => label(EXCLUDED_FROM_HANDOVER, k, lang)).join(" · ")}
                  </p>
                )}
                {Array.isArray(p.reassessed_delegations) && p.reassessed_delegations.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {p.reassessed_delegations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}

                <Button size="sm" variant="outline" onClick={() => setOpenPack(isOpen ? null : p.id)}>
                  {isOpen ? t("إخفاء البنود", "Hide items", lang) : t("عرض البنود والمصائر", "Show items & dispositions", lang)}
                </Button>

                {isOpen && (
                  <div className="space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("لا توجد بنود في هذه الحزمة.", "No items in this pack.", lang)}</p>
                    ) : rows.map((i) => (
                      <div key={i.id} className="border border-border rounded-md p-3 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-medium">{i.title}</span>
                          <span className="text-muted-foreground">
                            {label(OBLIGATION_TYPES, i.obligation_type, lang)}
                            {i.due_date ? ` · ${t("الاستحقاق", "due", lang)} ${i.due_date}` : ""}
                            {i.status !== "pending" ? ` · ${label(HANDOVER_ITEM_STATUS, i.status, lang)}` : ""}
                          </span>
                        </div>
                        <label className="text-xs text-muted-foreground block">
                          {t("المصير", "Disposition", lang)}
                          <select
                            className="mt-1 w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm"
                            value={choices[i.id] ?? i.disposition ?? i.proposed_disposition ?? ""}
                            onChange={(e) => setChoices((prev) => ({ ...prev, [i.id]: e.target.value }))}
                            disabled={p.status === "accepted"}
                          >
                            {Object.keys(HANDOVER_DISPOSITIONS).map((k) => (
                              <option key={k} value={k}>{label(HANDOVER_DISPOSITIONS, k, lang)}</option>
                            ))}
                          </select>
                        </label>
                        {i.status === "pending" && (
                          <p className="text-xs text-state-warning-ink">{t("غير محلول بعد", "Still unresolved", lang)}</p>
                        )}
                      </div>
                    ))}

                    {mine && (p.status === "pending_acceptance" || p.status === "partially_accepted" || p.status === "returned") && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {t("أنت الخلف المُسمّى — القبول بشخصك لا بالنيابة.", "You are the named successor — acceptance is personal, not on anyone's behalf.", lang)}
                        </p>
                        <input
                          className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm"
                          placeholder={t("سبب الإعادة إن كان هناك نقص", "Reason for return, when something is missing")}
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={busy} onClick={() => decide(p, "accept")}>
                            {t("أقبل وأسند", "Accept and assign", lang)}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy || !returnReason.trim()} onClick={() => decide(p, "return")}>
                            {t("أُعيد للناقص", "Return for completion", lang)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}