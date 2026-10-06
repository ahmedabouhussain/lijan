// auditChain.ts — G-5: the audit trail of EVIDENCE and DECISION as one declared chain (audit-chain-1.0.0).
//
// What this contract is for. The platform already records audit events; what was missing was a statement
// of which events CONSTITUTE a trail, in what order, and what a missing link MEANS. Without that, a trail
// is a list of rows a reader interprets — and the natural next step is to fill the gap by inference.
// This contract forbids exactly that:
//
//   • A step with no recorded event is ABSENT. When the chain's completion requires it, it is reported
//     as a GAP BY NAME. It is never inferred, and never quietly dropped.
//   • An event recorded BEFORE its predecessor is OUT OF ORDER and is reported as such. Rows are read in
//     server-recorded order and are never re-sorted to make a story read well.
//   • A trail shows WHAT WAS RECORDED. It never proves that nothing else happened, and it never
//     re-derives a decision, a quorum or a verdict from audit text: those come from the issuance package
//     and the verdict records.
//   • A trail that could not be read is not an empty trail: the read failure is reported with the source
//     it belongs to.
//
// Pure policy: reads nothing, writes nothing, consumed by `GetRecordAuditTrail` and `TestAuditChain`.

export const AUDIT_CHAIN_VERSION = "audit-chain-1.0.0";

type Step = {
  key: string; ar: string; en: string;
  /** Audit `action` values that record this step. A step may be recognised by more than one. */
  actions: string[];
  subject: "Action" | "Decision";
  /** A step without which the chain is incomplete. */
  required: boolean;
  meaning: "act" | "verdict" | "gate";
};

export const CHAINS: Record<string, { ar: string; en: string; subject: "Action" | "Decision"; steps: Step[] }> = {
  evidence: {
    ar: "أثر دليل الإجراء", en: "Action evidence trail", subject: "Action",
    steps: [
      { key: "progress_recorded", ar: "تحديث التقدّم", en: "Progress recorded", subject: "Action", required: true, meaning: "act",
        actions: ["action.progress", "action.progress_recorded", "action.evidence_submitted"] },
      { key: "evidence_submitted", ar: "تقديم الدليل", en: "Evidence submitted", subject: "Action", required: true, meaning: "act",
        actions: ["action.evidence_submitted", "action.evidence.returned"] },
      { key: "verdict_returned", ar: "إعادة الدليل للتصحيح", en: "Evidence returned for correction", subject: "Action", required: false, meaning: "verdict",
        actions: ["action.evidence.returned", "action.evidence_returned"] },
      { key: "verdict_accepted", ar: "قبول الدليل بحكم مستقل", en: "Evidence accepted by an independent verdict", subject: "Action", required: true, meaning: "verdict",
        actions: ["action.evidence.accepted", "action.evidence_accepted", "action.verified"] },
      { key: "hold_placed", ar: "حجز قانوني", en: "Legal hold placed", subject: "Action", required: false, meaning: "gate",
        actions: ["change.hold_placed"] },
      { key: "hold_released", ar: "رفع الحجز", en: "Legal hold released", subject: "Action", required: false, meaning: "gate",
        actions: ["change.hold_released"] },
      { key: "closed", ar: "إغلاق الإجراء", en: "Action closed", subject: "Action", required: true, meaning: "act",
        actions: ["action.closed", "action.close"] },
    ],
  },
  decision: {
    ar: "أثر القرار", en: "Decision trail", subject: "Decision",
    steps: [
      { key: "draft_created", ar: "إنشاء مشروع القرار", en: "Draft created", subject: "Decision", required: true, meaning: "act",
        actions: ["decision.draft_created", "decision.created"] },
      { key: "submitted_for_review", ar: "إرسال للمراجعة", en: "Sent for review", subject: "Decision", required: false, meaning: "act",
        actions: ["decision.submitted_for_review"] },
      { key: "round_opened", ar: "فتح دورة التصويت وتجميد النص", en: "Voting round opened and text frozen", subject: "Decision", required: true, meaning: "act",
        actions: ["vote.opened", "decision.vote_opened"] },
      { key: "ballots_cast", ar: "تسجيل الأصوات", en: "Ballots cast", subject: "Decision", required: false, meaning: "act",
        actions: ["vote.cast", "vote.casted"] },
      { key: "round_certified", ar: "تصديق النتيجة", en: "Result certified", subject: "Decision", required: true, meaning: "verdict",
        actions: ["vote.closed", "vote.certified"] },
      { key: "circulation_finalized", ar: "إنتاج نتيجة التمرير", en: "Circulation outcome finalized", subject: "Decision", required: false, meaning: "verdict",
        actions: ["circulation.finalized", "circulation.response_recorded"] },
      { key: "issued", ar: "الإصدار بحزمة موقّعة", en: "Issued with a verified package", subject: "Decision", required: true, meaning: "act",
        actions: ["decision.issued", "decision.issue"] },
      { key: "execution_started", ar: "بدء التنفيذ", en: "Execution started", subject: "Decision", required: false, meaning: "act",
        actions: ["decision.execution_started"] },
    ],
  },
};

export const CHAIN_KEYS = Object.keys(CHAINS);

export const AUDIT_CHAIN_REFUSALS: Record<string, { ar: string; en: string }> = {
  chain_unknown: { ar: "سلسلة الأثر غير معرّفة في العقد", en: "The audit chain is not in the contract" },
  subject_required: { ar: "يجب تسمية السجل الذي يُبنى أثره", en: "The record whose trail is built must be named" },
  subject_type_mismatch: { ar: "نوع السجل لا يوافق السلسلة المطلوبة", en: "The record type does not match the requested chain" },
  trail_unreadable: { ar: "تعذّرت قراءة أثر هذا السجل: الأثر غير مكتمل", en: "The trail of this record could not be read: the trail is incomplete" },
};

export function refusal(code: string, extra: Record<string, any> = {}, status = 400) {
  const text = AUDIT_CHAIN_REFUSALS[code] || { ar: null, en: code };
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, contract_version: AUDIT_CHAIN_VERSION, ...extra };
}

const timeOf = (e: any) => e?.created_date || e?.created_at || null;

/**
 * Build the chain from the events that were READ. Nothing is filled in: `absent` stays absent, and a
 * required absence is a named gap.
 */
export function buildChain({ chain, events = [], unread = null }: Record<string, any>) {
  const spec = CHAINS[chain];
  if (!spec) return refusal("chain_unknown", { supported: CHAIN_KEYS });

  const rows = (events || []).filter(Boolean);
  const sorted = [...rows].sort((a, b) => String(timeOf(a) || "").localeCompare(String(timeOf(b) || "")));

  const steps: any[] = spec.steps.map((step: Step, index: number) => {
    const matched = sorted.filter((e) => step.actions.includes(e.action));
    const state = matched.length === 0 ? "absent" : "recorded";
    return {
      key: step.key, ar: step.ar, en: step.en, required: step.required, meaning: step.meaning,
      state,
      count: matched.length,
      first_at: matched.length ? timeOf(matched[0]) : null,
      last_at: matched.length ? timeOf(matched[matched.length - 1]) : null,
      // Only what the record carries: who, in what capacity, and the correlation it belongs to.
      records: matched.map((e) => ({
        at: timeOf(e), actor: e.actor_name || e.actor_user_id || null,
        action: e.action, capacity: e.authority_context || null,
        correlation_id: e.correlation_id || null, description: e.description || null,
      })),
      order_index: index,
    };
  });

  // Order: a step whose first event precedes the last event of an earlier RECORDED step is out of order.
  let lastSeen: string | null = null;
  for (const s of steps) {
    if (s.state !== "recorded") { s["order"] = "unverifiable"; continue; }
    if (lastSeen && s.first_at && String(s.first_at) < String(lastSeen)) s["order"] = "out_of_order";
    else s["order"] = "in_order";
    if (s.last_at) lastSeen = s.last_at;
  }

  const gaps = steps
    .filter((s) => s.state === "absent" && s.required)
    .map((s) => ({
      key: s.key, ar: s.ar, en: s.en,
      why_ar: "لم يُسجَّل حدث لهذه الخطوة: الخطوة غائبة عن الأثر ولا تُستنتج من غيرها.",
      why_en: "No event records this step: it is absent from the trail and is never inferred from the others.",
    }));

  const outOfOrder = steps.filter((s) => s["order"] === "out_of_order").map((s) => ({ key: s.key, ar: s.ar, en: s.en, at: s.first_at }));

  return {
    ok: true,
    contract_version: AUDIT_CHAIN_VERSION,
    chain,
    chain_label: { ar: spec.ar, en: spec.en },
    subject_type: spec.subject,
    steps,
    gaps,
    out_of_order: outOfOrder,
    completeness: gaps.length === 0 && !unread ? "complete" : unread ? "incomplete" : "open",
    event_count: rows.length,
    inventory_not_read: unread ? [unread] : [],
    meaning_note: {
      ar: "الأثر يُظهر ما سُجِّل، ولا يُثبت أن شيئًا آخر لم يحدث؛ ولا يُعاد منه استنتاج قرار ولا نصاب ولا حكم — تلك تُقرأ من حزمة الإصدار وسجلات الأحكام.",
      en: "A trail shows what was recorded; it does not prove that nothing else happened, and no decision, quorum or verdict is re-derived from it — those are read from the issuance package and the verdict records.",
    },
    refusal_note: {
      ar: "غياب خطوة إلزامية يعني أن الأثر ناقص، لا أن الفعل لم يقع بالضرورة.",
      en: "A missing required step means the trail is incomplete, not necessarily that the act never happened.",
    },
  };
}

/** One sentence for the surface, so the reader never mistakes a complete trail for a legal conclusion. */
export function trailVerdict(chain: any) {
  if (!chain || chain.ok !== true) return null;
  if (chain.completeness === "incomplete") return { ar: "الأثر غير مكتمل: تعذّرت قراءة مصدر.", en: "The trail is incomplete: a source could not be read." };
  if (chain.gaps.length > 0) return { ar: `الأثر ناقص: ${chain.gaps.length} خطوة إلزامية غائبة.`, en: `The trail is incomplete: ${chain.gaps.length} required step(s) absent.` };
  return { ar: "الأثر مكتمل للخطوات الإلزامية المسجَّلة.", en: "The trail is complete for the required steps." };
}