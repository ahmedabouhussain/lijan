// guestAccess.ts — ITEM-LEVEL GUEST ACCESS for LIJAN™ (guest-access-1.0.0).
//
// Stated ONCE and consumed by the invitation command, the public guest view and the recipient
// preview, so what a secretary previews is exactly what the guest will receive.
//
// Product rules (brief §4A/C-D, streams C and D):
//   • A guest holds ONE capability — an unguessable token on ONE agenda item. There is no guest
//     account, no guest role and no guest scope that can be widened by a request.
//   • A guest sees the named item and the attachments the invitation names. Never other agenda
//     items, never the meeting pack, never minutes in any state, never the committee register,
//     members, votes, decisions or unrelated file links.
//   • Minutes and restricted / highly-restricted material are refused EVEN WHEN LISTED: the list is
//     a permission, it is never a declassification.
//   • Expiry and revocation are enforced server-side on every read, so an old link stops working.
//     Prior downloads cannot be recalled — that limit is stated, never papered over.
//   • File BYTES are not served to guests in this build: the app's file-access policy governs
//     authenticated seats and no unauthenticated file path is opened. The guest receives the item
//     extract and the attachment INDEX; downloads remain a labelled gap, not a silent success.

export const GUEST_ACCESS_VERSION = "guest-access-1.0.0";

/** The bounded scope statement, shown in the preview so an inviter sees exactly what is shared. */
export const GUEST_SCOPE = {
  visible_ar: [
    "البند المُسمّى وحده: عنوانه وهدفه والقرار المطلوب والمقدم ومدته",
    "المرفقات التي تُسمّيها الدعوة صراحةً (بالعنوان والنوع والإصدار)",
    "اسم اللجنة والجهة الحاضنة وتاريخ الاجتماع",
  ],
  visible_en: [
    "the named item alone: its title, objective, required decision, presenter and time allocation",
    "the attachments the invitation names explicitly (by title, type and version)",
    "the committee name, its custodian institution and the meeting date",
  ],
  never_ar: [
    "بقية بنود الأجندة",
    "حزمة الاجتماع أو محضره بأي حالة",
    "سجل اللجان أو الأعضاء أو الأصوات أو القرارات",
    "أي رابط ملف لم تُسمّه الدعوة",
  ],
  never_en: [
    "any other agenda item",
    "the meeting pack or minutes in any state",
    "the committee register, members, votes or decisions",
    "any file link the invitation did not name",
  ],
};

/** Where guest file delivery stands, stated rather than implied. */
export const GUEST_FILE_DELIVERY = {
  status: "blocked",
  code: "guest_file_delivery_not_enabled",
  reason_ar: "لا تُسلَّم بايتات الملفات للضيوف في هذا البناء: سياسة الوصول إلى الملفات تحكم المقاعد المُصادَقة، ولم يُفتح مسار ملفات بلا مصادقة. يستلم الضيف خلاصة البند وفهرس المرفقات.",
  reason_en: "File bytes are not served to guests in this build: the file-access policy governs authenticated seats, and no unauthenticated file path was opened. A guest receives the item extract and the attachment index.",
};

/** Material a guest is never given, whatever the invitation lists. */
export const GUEST_HARD_DENIED = { document_types: ["minutes"], classifications: ["restricted", "highly_restricted"] };

export const GUEST_REFUSALS: Record<string, any> = {
  token_unknown: {
    ar: "هذا الرابط غير معروف أو أُبطل. اطلب من أمانة اللجنة دعوة جديدة.",
    en: "This link is unknown or was invalidated. Ask the committee secretariat for a new invitation.",
  },
  revoked: {
    ar: "أُلغيت هذه الدعوة. لم يعُد الرابط صالحًا، ولا يمكن سحب ما نُزِّل سابقًا.",
    en: "This invitation was revoked. The link no longer works; material already downloaded cannot be recalled.",
  },
  expired: {
    ar: "انتهت صلاحية هذه الدعوة. الرابط مغلق على الخادم، ولا يمكن سحب ما نُزِّل سابقًا.",
    en: "This invitation has expired. The link is closed server-side; material already downloaded cannot be recalled.",
  },
  scheduled: {
    ar: "لم يبدأ نطاق صلاحية هذه الدعوة بعد.",
    en: "This invitation is not valid yet.",
  },
  scope_unsupported: {
    ar: "نطاق الوصول المطلوب غير معتمد؛ الدعوة محصورة ببند واحد.",
    en: "The requested access scope is not supported; a guest invitation is item-scoped.",
  },
  item_unavailable: {
    ar: "البند المُسمّى غير متاح الآن. تواصل مع أمانة اللجنة.",
    en: "The named item is not available now. Contact the committee secretariat.",
  },
};

const toMs = (value) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

/** The state of ONE invitation at a moment in time — never widened by anything the caller sends. */
export function guestState(guest, now = new Date()) {
  if (!guest) return "token_unknown";
  if (guest.status === "revoked") return "revoked";
  if (guest.access_scope && guest.access_scope !== "item_only") return "scope_unsupported";
  const expires = toMs(guest.expires_at);
  if (expires !== null && expires <= now.getTime()) return "expired";
  const from = toMs(guest.valid_from);
  if (from !== null && from > now.getTime()) return "scheduled";
  return "active";
}

export function evaluateGuestAccess({ guest, now = new Date() }) {
  const state = guestState(guest, now);
  if (state === "active") {
    return { allowed: true, state, code: null, reason: null, reason_ar: null, reason_en: null, contract_version: GUEST_ACCESS_VERSION };
  }
  const text = GUEST_REFUSALS[state] || GUEST_REFUSALS.token_unknown;
  return {
    allowed: false, state, code: state,
    reason: text.en, reason_ar: text.ar, reason_en: text.en,
    contract_version: GUEST_ACCESS_VERSION,
  };
}

/** A guest may only ever be pointed at the item the invitation names. */
export function isGuestItem(guest, itemId) {
  return !!(guest && itemId && guest.agenda_item_id === itemId);
}

/**
 * Whether one document may be shown to this guest. The invitation's list is necessary and NOT
 * sufficient: minutes and restricted material are refused even when listed.
 */
export function isGuestDocumentPermitted({ guest, document }) {
  if (!guest || !document) return false;
  const listed = (guest.permitted_document_ids || []).includes(document.id);
  if (!listed) return { permitted: false, code: "not_listed" };
  if (GUEST_HARD_DENIED.document_types.includes(document.document_type)) return { permitted: false, code: "hard_denied_document_type" };
  if (GUEST_HARD_DENIED.classifications.includes(document.classification)) return { permitted: false, code: "hard_denied_classification" };
  return { permitted: true, code: null };
}

/**
 * The EXACT payload a guest receives. Permitted attachments are listed; withheld material is NOT
 * named here — a guest is never told that a document they may not see exists.
 */
export function buildGuestExtract({ guest, item, meeting, committee, organization, documents = [] }) {
  const attachments = [];
  for (const d of documents || []) {
    if (isGuestDocumentPermitted({ guest, document: d }).permitted) {
      attachments.push({
        id: d.id,
        title: d.title_ar || d.title,
        title_en: d.title_en || d.title,
        document_type: d.document_type,
        classification: d.classification,
        version_number: d.current_version_number || 1,
      });
    }
  }
  return {
    contract_version: GUEST_ACCESS_VERSION,
    scope: { access_scope: guest.access_scope || "item_only", expires_at: guest.expires_at || null, valid_from: guest.valid_from || null },
    guest: { name: guest.guest_name || null, name_en: guest.guest_name_en || null, organization: guest.guest_organization || null },
    committee: committee ? { id: committee.id, name: committee.name_ar || committee.name_en, name_en: committee.name_en || committee.name_ar } : null,
    organization: organization ? { id: organization.id, name: organization.name_ar || organization.name_en, name_en: organization.name_en || organization.name_ar } : null,
    meeting: meeting ? { id: meeting.id, title: meeting.title_ar || meeting.title, title_en: meeting.title_en || meeting.title, date: meeting.date || null } : null,
    item: item ? {
      id: item.id,
      sequence: item.sequence,
      title: item.title_ar || item.title,
      title_en: item.title_en || item.title,
      objective: item.objective_ar || item.objective || null,
      objective_en: item.objective_en || item.objective || null,
      required_decision: item.required_decision || null,
      required_decision_en: item.required_decision_en || item.required_decision || null,
      presenter: item.presenter_ar || item.presenter || null,
      presenter_en: item.presenter_en || item.presenter || null,
      time_allocation_minutes: item.time_allocation_minutes || null,
      classification: item.classification || null,
      status: item.status || null,
    } : null,
    attachments,
    file_delivery: GUEST_FILE_DELIVERY,
    limits: {
      ar: "لا يمكن سحب ما نُزِّل سابقًا؛ الدعوة تمنع القراءة الجديدة ولا تمحو نسخة قديمة.",
      en: "Material already downloaded cannot be recalled; revocation stops new reads, it does not erase a prior copy.",
    },
  };
}

/** The inviter's preview: the guest payload PLUS what is withheld from it (named, for the inviter only). */
export function buildGuestPreview({ guest, item, meeting, committee, organization, documents = [], now = new Date() }) {
  const access = evaluateGuestAccess({ guest, now });
  const extract = buildGuestExtract({ guest, item, meeting, committee, organization, documents });
  const withheld = [];
  for (const d of documents || []) {
    const verdict = isGuestDocumentPermitted({ guest, document: d });
    if (!verdict.permitted) withheld.push({ id: d.id, title: d.title_ar || d.title, code: verdict.code });
  }
  return {
    contract_version: GUEST_ACCESS_VERSION,
    access,
    extract,
    withheld,
    scope_statement: GUEST_SCOPE,
    link: access.allowed && guest.access_token ? `/guest/${guest.access_token}` : null,
  };
}

/** Bounded invitations: an expiry is required and can never be more than this many days out. */
export const MAX_GUEST_VALIDITY_DAYS = 180;

export function validateGuestInvitation({ guest_name, expires_at, now = new Date() }) {
  const errors = [];
  if (!guest_name || !String(guest_name).trim()) errors.push({ code: "guest_name_required", ar: "اسم الضيف مطلوب", en: "The guest name is required" });
  const expires = toMs(expires_at);
  if (expires === null) errors.push({ code: "expiry_required", ar: "تاريخ الانتهاء مطلوب — الدعوة محدودة دائمًا", en: "An expiry is required — a guest invitation is always bounded" });
  else if (expires <= now.getTime()) errors.push({ code: "expiry_not_future", ar: "تاريخ الانتهاء يجب أن يكون في المستقبل", en: "The expiry must be in the future" });
  else if (expires > now.getTime() + MAX_GUEST_VALIDITY_DAYS * 24 * 3600 * 1000) errors.push({ code: "expiry_too_far", ar: `أقصى صلاحية للدعوة ${MAX_GUEST_VALIDITY_DAYS} يومًا`, en: `A guest invitation may not exceed ${MAX_GUEST_VALIDITY_DAYS} days` });
  return { valid: errors.length === 0, errors };
}