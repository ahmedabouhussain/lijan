// structureLabels.js — the Arabic/English labels for the structure and continuity contracts.
//
// The labels live beside the surfaces that render them, but the RULES stay in the shared contracts
// (base44/shared/committeeStructure.ts, base44/shared/continuityContract.ts). A surface never decides
// what a relationship means: it reads the contract's own declaration through this map.

export const RELATIONSHIP_TYPES = {
  parent_committee: { ar: "اللجنة الأم", en: "Parent committee", conveys_approval: true },
  subcommittee: { ar: "لجنة فرعية", en: "Subcommittee", conveys_approval: false },
  advisory_group: { ar: "مجموعة عمل استشارية", en: "Advisory working group", conveys_approval: false },
  joint_committee: { ar: "لجنة مشتركة", en: "Joint committee", conveys_approval: false },
  appointing_body: { ar: "جهة التعيين", en: "Appointing body", conveys_approval: false },
  ratifying_body: { ar: "جهة المصادقة", en: "Ratifying body", conveys_approval: true },
  reporting_recipient: { ar: "متلقّي التقارير", en: "Reporting recipient", conveys_approval: false },
  oversight_body: { ar: "جهة الرقابة", en: "Oversight body", conveys_approval: false },
  execution_dependency: { ar: "تبعية تنفيذية", en: "Execution dependency", conveys_approval: false },
  secretariat_custodian: { ar: "أمانة الحفظ", en: "Secretariat custodian", conveys_approval: false },
};

export const REVIEW_OR_OVERTURN = ["none", "review", "ratify", "overturn"];

export const APPOINTMENT_EVENTS = {
  nomination: { ar: "ترشيح", en: "Nomination", self_service: false, ends_seat: false },
  acceptance: { ar: "قبول التعيين", en: "Acceptance", self_service: true, ends_seat: false },
  appointment: { ar: "تعيين", en: "Appointment", self_service: false, ends_seat: false },
  acting_appointment: { ar: "تكليف مؤقت", en: "Acting appointment", self_service: false, ends_seat: false },
  acting_expiry: { ar: "انتهاء التكليف المؤقت", en: "Acting expiry", self_service: false, ends_seat: true },
  end_of_term: { ar: "انتهاء المدة", en: "End of term", self_service: false, ends_seat: true },
  resignation: { ar: "استقالة", en: "Resignation", self_service: true, ends_seat: true },
  removal: { ar: "عزل", en: "Removal", self_service: false, ends_seat: true },
  death: { ar: "وفاة", en: "Death", self_service: false, ends_seat: true },
  incapacity: { ar: "تعذّر", en: "Incapacity", self_service: false, ends_seat: true },
  representation_transfer: { ar: "تغيّر الجهة الممثَّلة", en: "Representation transfer", self_service: false, ends_seat: true },
  temporary_absence: { ar: "غياب مؤقت", en: "Temporary absence", self_service: true, ends_seat: false },
  reinstatement: { ar: "عودة إلى المقعد", en: "Reinstatement", self_service: false, ends_seat: false },
};

export const SELF_SERVICE_EVENTS = Object.keys(APPOINTMENT_EVENTS).filter((k) => APPOINTMENT_EVENTS[k].self_service);
export const INSTITUTIONAL_EVENTS = Object.keys(APPOINTMENT_EVENTS).filter((k) => !APPOINTMENT_EVENTS[k].self_service);
export const ASSIGNING_EVENTS = ["appointment", "acting_appointment", "reinstatement"];

export const REASON_CLASSES = [
  { value: "institutional", ar: "مؤسسي", en: "Institutional" },
  { value: "public", ar: "معلن", en: "Public" },
  { value: "personal_private", ar: "شخصي خاص", en: "Personal (private)" },
];

export const HANDOVER_DISPOSITIONS = {
  assign_to_successor: { ar: "يُسند إلى الخلف", en: "Assign to successor" },
  return_to_institution: { ar: "يُعاد إلى الجهة", en: "Return to the institution" },
  interim_custodian: { ar: "حافظ مؤقت", en: "Interim custodian" },
  retain_with_seat: { ar: "يبقى مع المقعد", en: "Retained with the seat" },
  revoke_not_transferred: { ar: "يُلغى ولا يُنقل", en: "Revoked, never transferred" },
  expire: { ar: "ينتهي", en: "Allowed to expire" },
};

export const HANDOVER_STATUS = {
  pending_acceptance: { ar: "بانتظار قبول الخلف", en: "Awaiting the successor" },
  partially_accepted: { ar: "مقبول جزئيًا", en: "Partially accepted" },
  returned: { ar: "أُعيد للناقص", en: "Returned for completion" },
  accepted: { ar: "مقبول", en: "Accepted" },
};

export const HANDOVER_ITEM_STATUS = {
  pending: { ar: "بانتظار", en: "Pending" },
  accepted: { ar: "مُسند", en: "Assigned" },
  returned: { ar: "أُعيد", en: "Returned" },
  reassigned: { ar: "أُعيد الإسناد", en: "Reassigned" },
  not_transferred: { ar: "لم يُنقل", en: "Not transferred" },
};

export const EXCLUDED_FROM_HANDOVER = {
  private_notes: { ar: "الملاحظات الخاصة", en: "Private notes" },
  personal_delegations: { ar: "التفويضات الشخصية", en: "Personal delegations" },
  personal_credentials: { ar: "بيانات الدخول", en: "Credentials" },
  personal_messages: { ar: "المراسلات الشخصية", en: "Personal messages" },
  unrelated_memberships: { ar: "العضويات غير المتصلة", en: "Unrelated memberships" },
  own_consents: { ar: "الإقرارات الشخصية", en: "Own consents" },
};

export const OBLIGATION_TYPES = {
  open_action: { ar: "إجراء مفتوح", en: "Open action" },
  agenda_item: { ar: "بند أجندة", en: "Agenda item" },
  pending_signature: { ar: "توقيع معلّق", en: "Pending signature" },
  upcoming_meeting: { ar: "اجتماع قادم", en: "Upcoming meeting" },
  group_membership: { ar: "عضوية مجموعة عمل", en: "Working-group membership" },
  document_custody: { ar: "حفظ مستندات", en: "Document custody" },
  official_correspondence: { ar: "مراسلات رسمية", en: "Official correspondence" },
  review_request: { ar: "طلب مراجعة", en: "Review request" },
  personal_delegation: { ar: "تفويض شخصي", en: "Personal delegation" },
  active_delegation: { ar: "تفويض قائم", en: "Active delegation" },
  risk: { ar: "خطر", en: "Risk" },
  unresolved_exception: { ar: "استثناء غير محلول", en: "Unresolved exception" },
};

export function label(map, key, lang) {
  const row = map[key];
  if (!row) return key;
  return lang === "ar" ? row.ar : row.en;
}