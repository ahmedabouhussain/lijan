// institutionalChange.ts — THE one declaration of what a committee change must account for, and what a
// legal hold does to an obligation.
//
// CONTRACT VERSION: institutional-change-1.0.0 (6 Oct 2026 — product brief revision 5, material هـ).
//
// The rule this contract exists to make enforceable, rather than expressed as intention:
//
//   • A CHANGE IS NEVER EFFECTIVE OVER AN UNACCOUNTED OBLIGATION. Before a committee is merged, split,
//     renamed, suspended, reconstituted, closed or archived, every open obligation is ENUMERATED from
//     the committee's own records, and each one carries a DISPOSITION. An obligation with no
//     disposition blocks the change, and it is named — never rounded away.
//   • A SOURCE THAT COULD NOT BE READ IS NOT AN EMPTY SOURCE. A source with no read in this build, or
//     a read that failed, is reported as unresolved and makes the inventory INCOMPLETE. It can never
//     make a change look ready.
//   • A LEGAL HOLD IS STATE, NOT A NOTE. A held obligation cannot be closed, transferred, expired or
//     deleted while the hold stands. The hold does not lapse by itself, it never expires silently, and
//     releasing it is a governed act by the competent authority WITH ITS REASON. Releasing a hold
//     returns the obligation to ordinary treatment — it does not close it.
//   • NOTHING IS DELETED IN A GOVERNANCE SYSTEM: an obligation is dispositioned, and its record stays
//     on the file for audit.
//
// This module reads no records and writes none: it is pure policy, so the command and the suite consume
// the SAME object.

export const INSTITUTIONAL_CHANGE_VERSION = "institutional-change-1.0.0";

/** The change kinds a committee can undergo, and what each one owes the institution. */
export const CHANGE_KINDS: Record<string, any> = {
  rename: { ar: "تغيير التسمية", en: "Rename", seats_affected: false, registers_affected: true, requires_inventory: true, requires_handover: false, ends_committee: false },
  merge: { ar: "دمج", en: "Merge", seats_affected: true, registers_affected: true, requires_inventory: true, requires_handover: true, ends_committee: true },
  split: { ar: "تقسيم", en: "Split", seats_affected: true, registers_affected: true, requires_inventory: true, requires_handover: true, ends_committee: true },
  reconstitute: { ar: "إعادة تشكيل", en: "Reconstitute", seats_affected: true, registers_affected: true, requires_inventory: true, requires_handover: true, ends_committee: false },
  suspend: { ar: "تعليق", en: "Suspend", seats_affected: true, registers_affected: true, requires_inventory: true, requires_handover: false, ends_committee: false },
  close: { ar: "إغلاق", en: "Close", seats_affected: true, registers_affected: true, requires_inventory: true, requires_handover: true, ends_committee: true },
  archive: { ar: "أرشفة", en: "Archive", seats_affected: false, registers_affected: true, requires_inventory: true, requires_handover: false, ends_committee: true },
};
export const CHANGE_KIND_KEYS = Object.keys(CHANGE_KINDS);

/**
 * The categories that must be accounted for. `read: false` means this build implements NO read for the
 * source: it is reported as unresolved, never as empty — a source nobody can check is not a source that
 * is clear.
 */
export const INVENTORY_SOURCES: any[] = [
  { key: "open_actions", ar: "إجراءات مفتوحة", en: "Open actions", obligation_type: "open_action", entity: "Action", read: true },
  { key: "open_agenda_items", ar: "بنود أجندة مفتوحة", en: "Open agenda items", obligation_type: "agenda_item", entity: "AgendaItem", read: true },
  { key: "open_decisions", ar: "قرارات غير مكتملة", en: "Unfinished decisions", obligation_type: "open_decision", entity: "Decision", read: true },
  { key: "upcoming_meetings", ar: "اجتماعات قادمة أو جارية", en: "Upcoming or running meetings", obligation_type: "upcoming_meeting", entity: "Meeting", read: true },
  { key: "open_handovers", ar: "حزم تسليم غير مقبولة", en: "Unaccepted handover packs", obligation_type: "open_handover", entity: "HandoverPack", read: true },
  { key: "active_delegations", ar: "تفويضات سارية", en: "Delegations in force", obligation_type: "active_delegation", entity: "Delegation", read: true },
  { key: "open_reviews", ar: "طلبات مراجعة مفتوحة", en: "Open review requests", obligation_type: "review_request", entity: "ReviewRequest", read: true },
  { key: "document_custody", ar: "مستندات اللجنة في عهدتها", en: "Documents in the committee's custody", obligation_type: "document_custody", entity: "Document", read: true },
  { key: "pending_signatures", ar: "تواقيع معلّقة", en: "Pending signatures", obligation_type: "pending_signature", entity: "Signature", read: false, not_read_reason: "No signature read is implemented in this build; the category is named as unresolved rather than reported as clear." },
];
export const INVENTORY_SOURCE_KEYS = INVENTORY_SOURCES.map((s) => s.key);

/**
 * What may be done with one obligation during a change. This is the continuity contract's vocabulary
 * PLUS the legal hold, because a hold is a disposition of the institution, not a state of the record.
 */
export const CHANGE_DISPOSITIONS: Record<string, any> = {
  assign_to_successor: { ar: "يُسند إلى الخلف", en: "Assign to the successor", needs_successor: true, stops_the_change: false },
  return_to_institution: { ar: "يُعاد إلى الجهة", en: "Return to the institution", needs_successor: false, stops_the_change: false },
  interim_custodian: { ar: "حافظ مؤقت", en: "Interim accountable custodian", needs_successor: false, stops_the_change: false },
  retain_with_seat: { ar: "يبقى مع المقعد", en: "Retained with the seat", needs_successor: false, stops_the_change: false },
  revoke_not_transferred: { ar: "يُلغى ولا يُنقل", en: "Revoked, never transferred", needs_successor: false, stops_the_change: false },
  expire: { ar: "ينتهي", en: "Allowed to expire", needs_successor: false, stops_the_change: false },
  legal_hold: { ar: "حجز قانوني", en: "Legal hold", needs_successor: false, stops_the_change: false, requires_reason: true },
};
export const CHANGE_DISPOSITION_KEYS = Object.keys(CHANGE_DISPOSITIONS);

/** The default disposition the server PROPOSES for a category, before a human decides it. */
export function proposeForChange(obligation_type: string) {
  switch (obligation_type) {
    case "active_delegation":
    case "pending_signature":
    case "open_handover": return "return_to_institution";
    case "upcoming_meeting":
    case "document_custody": return "assign_to_successor";
    case "open_action":
    case "agenda_item":
    case "open_decision":
    case "review_request": return "assign_to_successor";
    default: return "return_to_institution";
  }
}

export const LEGAL_HOLD_RULES = {
  blocks_closure: true,
  blocks_transfer: true,
  blocks_expiry: true,
  blocks_deletion: true,
  lapses_by_itself: false,
  expiry_silent: false,
  requires_reason: true,
  release_requires_reason: true,
  release_closes_the_obligation: false,
  survives_committee_change: true,
  ar: "الحجز القانوني يمنع إغلاق الالتزام ونقله وإسقاطه بالانتهاء أو الحذف ما دام قائمًا. لا يسقط بمرور الوقت ولا صمتًا، ورفعه فعل محكوم من الجهة المختصة بسببه — والرفع لا يُغلق الالتزام، بل يعيده إلى المعالجة العادية. والحجز يبقى قائمًا على الرغم من تغيير اللجنة.",
  en: "A legal hold stops the obligation from being closed, transferred, allowed to expire or deleted while it stands. It never lapses by time or by silence, and releasing it is a governed act by the competent authority with its reason. Releasing a hold does not close the obligation: it returns it to ordinary treatment. The hold survives a committee change.",
};

export const CHANGE_REFUSALS: Record<string, { ar: string; en: string }> = {
  change_kind_unknown: { ar: "نوع التغيير غير معرّف في العقد", en: "The change kind is not in the contract" },
  obligation_type_unknown: { ar: "فئة الالتزام غير معرّفة في العقد", en: "The obligation category is not in the contract" },
  disposition_unknown: { ar: "المصير المقترح غير معرّف في العقد", en: "The disposition is not in the contract" },
  disposition_needs_successor: { ar: "إسناد الالتزام إلى الخلف يستلزم خلفًا مُسمّى", en: "Assigning an obligation to a successor requires a successor" },
  hold_reason_required: { ar: "الحجز القانوني يستلزم بيان سببه", en: "A legal hold states its reason" },
  hold_active: { ar: "الالتزام تحت حجز قانوني: لا يغلق ولا ينقل ولا يسقط ما دام الحجز قائمًا", en: "The obligation is under a legal hold: it cannot be closed, transferred or allowed to expire while the hold stands" },
  hold_not_active: { ar: "لا يوجد حجز قائم على هذا الالتزام", en: "There is no active hold on this obligation" },
  hold_release_reason_required: { ar: "رفع الحجز يستلزم بيان سببه", en: "Releasing a hold states its reason" },
  obligation_not_fully_described: { ar: "الالتزام غير موصوف وصفًا كافيًا (الفئة والسجل)", en: "The obligation is not described well enough (category and record)" },
  source_unreadable: { ar: "تعذّر قراءة أحد مصادر التعداد: التعداد غير مكتمل", en: "One inventory source could not be read: the inventory is incomplete" },
  change_already_decided: { ar: "حُسم مصير هذا الالتزام في هذا التغيير بالفعل", en: "This obligation's disposition for this change has already been decided" },
};

export function refusal(code: string, extra: Record<string, any> = {}, status = 400) {
  const text = CHANGE_REFUSALS[code] || { ar: null, en: code };
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, contract_version: INSTITUTIONAL_CHANGE_VERSION, ...extra };
}

export function changeContract(kind: string) {
  return CHANGE_KINDS[kind] || null;
}

/**
 * The inventory, assembled from what was READ and what could NOT be read. Both are returned, because a
 * boundary the reader cannot see is a boundary that will be mistaken for completeness.
 */
export function buildInventory({ change_kind, items = [], unread = [], existing = [] }: Record<string, any>) {
  const contract = CHANGE_KINDS[change_kind] || null;
  const byKey = new Map<string, any>();
  for (const it of items) byKey.set(`${it.source_entity_type}:${it.source_entity_id}`, it);

  const decided = new Map<string, any>();
  for (const d of existing) decided.set(`${d.source_entity_type}:${d.source_entity_id}`, d);

  const rows = [...byKey.values()].map((it) => {
    const key = `${it.source_entity_type}:${it.source_entity_id}`;
    const d = decided.get(key) || null;
    return {
      ...it,
      proposed_disposition: proposeForChange(it.obligation_type),
      disposition: d?.disposition || null,
      decided_at: d?.decided_at || null,
      decided_by_name: d?.decided_by_name || null,
      legal_hold: d?.legal_hold === true,
      legal_hold_reason: d?.legal_hold_reason || null,
      decided: !!d?.disposition,
      disposition_id: d?.id || null,
    };
  });

  const undispositioned = rows.filter((r) => !r.decided);
  const held = rows.filter((r) => r.legal_hold);
  const notRead = unread.map((u) => ({ ...u }));

  const readiness = notRead.length > 0
    ? { verdict: "incomplete", code: "source_unreadable", ar: "التعداد غير مكتمل: تعذّر قراءة مصدر أو أكثر، فلا يُعدّ التغيير جاهزًا.", en: "The inventory is incomplete: one or more sources could not be read, so the change is not ready." }
    : undispositioned.length > 0
      ? { verdict: "blocked", code: "undispositioned_obligations", ar: "التغيير موقوف: التزامات مفتوحة بلا مصير محسوم.", en: "The change is blocked: open obligations carry no disposition." }
      : { verdict: "ready", code: null, ar: "التعداد مكتمل وكل التزام مفتوح له مصير محسوم.", en: "The inventory is complete and every open obligation carries a disposition." };

  return {
    contract_version: INSTITUTIONAL_CHANGE_VERSION,
    change: contract
      ? { kind: change_kind, label: { ar: contract.ar, en: contract.en }, ...contract }
      : { kind: change_kind, label: null, unsupported: true },
    counts: {
      total: rows.length,
      decided: rows.length - undispositioned.length,
      undispositioned: undispositioned.length,
      held: held.length,
      unread_sources: notRead.length,
    },
    rows,
    undispositioned,
    held,
    inventory_not_read: notRead,
    readiness,
    legal_hold_rules: LEGAL_HOLD_RULES,
    no_deletion: { ar: "لا حذف في نظام حوكمة: الالتزام يُصرف بمصير محسوم ويبقى سجله للتدقيق.", en: "Nothing is deleted in a governance system: an obligation is dispositioned and its record stays for audit." },
  };
}

/** One disposition, judged against the contract — including the hold rules. */
export function assessChangeDisposition({ obligation_type, disposition, legal_hold_active = false, hold_reason = null, release = false, release_reason = null }: Record<string, any>) {
  const known = INVENTORY_SOURCES.find((s) => s.obligation_type === obligation_type);
  if (!known) return refusal("obligation_type_unknown", { obligation_type });
  const contract = CHANGE_DISPOSITIONS[disposition];
  if (!contract) return refusal("disposition_unknown", { disposition });

  if (release) {
    if (!legal_hold_active) return refusal("hold_not_active", {}, 409);
    if (!String(release_reason || "").trim()) return refusal("hold_release_reason_required", {}, 400);
    return {
      ok: true, contract_version: INSTITUTIONAL_CHANGE_VERSION,
      effect: "hold_released", closes_obligation: false,
      release_reason: String(release_reason).trim(),
      note: { ar: "رفع الحجز يعيد الالتزام إلى المعالجة العادية ولا يغلقه.", en: "Releasing the hold returns the obligation to ordinary treatment and does not close it." },
    };
  }

  // A disposition that would close, transfer or expire an obligation is refused while a hold stands.
  if (legal_hold_active && disposition !== "legal_hold") {
    return refusal("hold_active", { disposition }, 409);
  }
  if (contract.requires_reason && !String(hold_reason || "").trim()) return refusal("hold_reason_required", {}, 400);

  return {
    ok: true, contract_version: INSTITUTIONAL_CHANGE_VERSION,
    effect: disposition === "legal_hold" ? "hold_placed" : "disposition_recorded",
    legal_hold: disposition === "legal_hold",
    hold_reason: disposition === "legal_hold" ? String(hold_reason).trim() : null,
    needs_successor: contract.needs_successor === true,
    closes_obligation: ["expire", "revoke_not_transferred"].includes(disposition),
  };
}

/** A disposition that assigns to a successor is only lawful when a successor exists. */
export function requireSuccessorForDisposition(disposition: string, has_successor: boolean) {
  const contract = CHANGE_DISPOSITIONS[disposition];
  if (contract?.needs_successor && !has_successor) return refusal("disposition_needs_successor", { disposition }, 400);
  return { ok: true, contract_version: INSTITUTIONAL_CHANGE_VERSION, needs_successor: contract?.needs_successor === true };
}