// LIJAN™ — Dr. Hamad Salem Majeegheer governed demonstration persona.
// ONE person, ONE account, ONE permanent primary organization (Qatar Development Bank).
// Seven independent CommitteeMembership + AuthorityGrant records — never a single global role.
// Never mixed with any other demo persona (Fahad Al-Fihaidi, Ahmed Abouhussain, etc.).

// Same virtual-identity convention as the platform demo user (DEMO-USER-*): the persona is
// a governed demo *user* whose memberships and grants are keyed by this id.
export const DR_HAMAD_PERSON_KEY = "DEMO-USER-DR-HAMAD-MAJEEGHEER";
export const DR_HAMAD_INTERNAL_EMAIL = "dr.hamad.majeegheer.demo@lijan.example";

// Demo dataset key — scopes this persona's data exactly the way the platform demo dataset
// scopes the platform demo user's data. Never mixed with another persona's dataset.
export const DR_HAMAD_DATASET = "DR_HAMAD_GOVERNED_DEMO_V1";

export const DR_HAMAD_PERSONA = {
  person_key: DR_HAMAD_PERSON_KEY,
  name_ar: "الدكتور حمد سالم مجيغير",
  name_en: "Dr. Hamad Salem Majeegheer",
  email: DR_HAMAD_INTERNAL_EMAIL,
  account_type_ar: "حساب تجريبي حوكمي تنفيذي",
  account_type_en: "Governed Executive Demonstration Persona",
  default_locale: "ar",
  default_direction: "rtl",
  primary_org_ar: "بنك قطر للتنمية",
  primary_org_en: "Qatar Development Bank",
  primary_org_abbr: "QDB",
  primary_org_public_id: "DEMO-ORG-QDB",
  job_title_ar: "حساب تجريبي حوكمي تنفيذي",
  job_title_en: "Governed Executive Demonstration Persona",
};

export const DEMO_SCENARIO_ID = DR_HAMAD_DATASET;

// ── Organizations ──
// QDB (primary, employer, represented org in every committee) + ELAN Group (owns one
// committee only — Dr. Hamad is never represented as an ELAN employee).
export const DR_HAMAD_ORGS = {
  QDB: {
    public_id: "DEMO-ORG-QDB",
    slug: "qatar-development-bank",
    name_ar: "بنك قطر للتنمية",
    name_en: "Qatar Development Bank",
    type: "organization",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
  ELAN: {
    public_id: "DEMO-ORG-ELAN",
    slug: "elan-group",
    name_ar: "مجموعة إعلان",
    name_en: "ELAN Group",
    type: "organization",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
};

// Permitted-action vocabularies per committee role — evaluated server-side from
// AuthorityGrant, never from a bare role string compare.
export const ROLE_ACTIONS = {
  member: [
    "view_committee_info", "review_agenda", "comment", "recommend",
    "provide_evidence", "respond_to_actions", "request_clarification",
    "prepare_draft_contribution",
  ],
  chair: [
    "review_readiness", "approve_agenda", "request_missing_papers", "review_quorum",
    "manage_agenda_progression", "request_recommendations", "return_incomplete_submissions",
    "approve_reject_defer_decisions", "assign_actions", "approve_minutes",
    "monitor_implementation", "escalate_overdue",
  ],
  vice_chair: [
    "review_readiness", "recommend", "request_information", "support_chair",
    "monitor_implementation",
  ],
  secretary: [
    "prepare_draft_agendas", "collect_papers", "verify_submission_completeness",
    "coordinate_attendance", "prepare_draft_minutes", "record_draft_decisions",
    "maintain_action_register", "issue_reminders", "prepare_meeting_packages",
    "escalate_readiness_gaps",
  ],
};

// ── The seven committee memberships ──
export const DR_HAMAD_COMMITTEES = [
  {
    key: "national_sme",
    public_id: "DEMO-COMM-NATIONAL-SME",
    slug: "national-sme-development-committee",
    name_ar: "اللجنة الوطنية لتنمية الشركات الصغيرة والمتوسطة",
    name_en: "National Committee for Small and Medium Enterprise Development",
    type: "national_committee",
    owning_org: "QDB", // national/inter-entity, hosted here for demo linkage
    owning_org_display_ar: "لجنة وطنية مشتركة بين الجهات",
    owning_org_display_en: "National Inter-Entity Committee",
    role: "member",
    classification: "source_based_demonstration",
    workstream_ar: "فريق النفاذ إلى الأسواق",
    workstream_en: "Access to Markets Workstream",
    mandate_ar: "متابعة توحيد تعريف الشركات الصغيرة والمتوسطة، ومبادرات النفاذ إلى الأسواق والتمويل ورأس المال والمعرفة.",
    mandate_en: "Tracks the unified SME definition and initiatives for access to markets, finance, capital and knowledge.",
    source_note_ar: "سيناريو توضيحي مستند إلى مواد اجتماع اللجنة الوطنية الفعلية المرفقة — بيانات تجريبية غير رسمية",
    source_note_en: "Source-based demonstration derived from the supplied national committee meeting materials — unofficial demo data",
    topics_ar: ["توحيد تعريف الشركات الصغيرة والمتوسطة", "مبادرات الوصول إلى الأسواق", "السجل الذهبي", "اتفاقيات التجارة"],
  },
  {
    key: "elan_executive",
    public_id: "DEMO-COMM-ELAN-EXEC",
    slug: "elan-executive-committee",
    name_ar: "اللجنة التنفيذية لمجموعة إعلان",
    name_en: "ELAN Executive Committee",
    type: "committee",
    owning_org: "ELAN",
    owning_org_display_ar: "مجموعة إعلان",
    owning_org_display_en: "ELAN Group",
    role: "chair",
    classification: "synthetic_demonstration",
    synthetic_label_ar: "دور تجريبي افتراضي — لا يمثل منصبًا فعليًا",
    synthetic_label_en: "Synthetic Demonstration Role — Not an Actual Appointment",
    mandate_ar: "مراجعة الأداء والتوقعات المالية لمجموعة إعلان واعتماد القرارات التنفيذية ذات الصلة.",
    mandate_en: "Reviews ELAN Group's performance and financial forecast and approves related executive decisions.",
    source_note_ar: "تم استخدام جدول أعمال اللجنة التنفيذية لمجموعة إعلان المرفق كمرجع لتنسيق الاجتماع ومسار الوثائق فقط — دون افتراض حضور أو رئاسة الدكتور حمد للاجتماع الأصلي",
    source_note_en: "The supplied ELAN BEC agenda is used only as a meeting-format and document-workflow reference — no inference that Dr. Hamad attended or chaired the original meeting",
    topics_ar: ["أداء إعلان والتوقعات المالية", "موضوعات أخرى"],
  },
  {
    key: "digital_transformation",
    public_id: "DEMO-COMM-QDB-DIGITAL",
    slug: "digital-transformation-institutional-intelligence",
    name_ar: "لجنة التحول الرقمي والذكاء المؤسسي",
    name_en: "Digital Transformation and Institutional Intelligence Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    owning_org_display_ar: "بنك قطر للتنمية",
    owning_org_display_en: "Qatar Development Bank",
    role: "chair",
    classification: "synthetic_demonstration",
    mandate_ar: "قيادة مسار التحول الرقمي وحوكمة الذكاء المؤسسي داخل البنك.",
    mandate_en: "Leads the bank's digital transformation and institutional-intelligence governance track.",
    topics_ar: ["توحيد البيانات المؤسسية", "حوكمة الذكاء الاصطناعي", "أتمتة الإجراءات الداخلية", "جودة البيانات", "مؤشرات الأداء الاستباقية", "قياس أثر التحول الرقمي"],
  },
  {
    key: "sme_finance_steering",
    public_id: "DEMO-COMM-QDB-SME-FINANCE",
    slug: "sme-finance-steering-committee",
    name_ar: "اللجنة التوجيهية لتمويل الشركات الصغيرة والمتوسطة",
    name_en: "SME Finance Steering Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    owning_org_display_ar: "بنك قطر للتنمية",
    owning_org_display_en: "Qatar Development Bank",
    role: "vice_chair",
    classification: "synthetic_demonstration",
    mandate_ar: "توجيه برامج تمويل الشركات الصغيرة والمتوسطة ومتابعة مؤشرات الإقراض.",
    mandate_en: "Steers SME finance programs and tracks lending indicators.",
    topics_ar: ["مؤشرات الإقراض", "فجوة التمويل", "ضمانات القروض", "برامج التمويل البديل"],
  },
  {
    key: "investment_partnerships",
    public_id: "DEMO-COMM-QDB-INVESTMENT",
    slug: "investment-strategic-partnerships-committee",
    name_ar: "لجنة الاستثمار والشراكات الاستراتيجية",
    name_en: "Investment and Strategic Partnerships Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    owning_org_display_ar: "بنك قطر للتنمية",
    owning_org_display_en: "Qatar Development Bank",
    role: "member",
    classification: "synthetic_demonstration",
    mandate_ar: "تقييم فرص الاستثمار والشراكات الاستراتيجية ومواءمتها مع الأولويات الوطنية.",
    mandate_en: "Evaluates investment opportunities and strategic partnerships aligned with national priorities.",
    topics_ar: ["تقييم فرص الاستثمار", "الشراكات الاستراتيجية", "المواءمة مع الأولويات الوطنية", "نماذج التمويل", "المخاطر التجارية", "شروط التوصية الاستثمارية"],
  },
  {
    key: "risk_continuity",
    public_id: "DEMO-COMM-QDB-RISK",
    slug: "risk-business-continuity-committee",
    name_ar: "لجنة المخاطر واستمرارية الأعمال",
    name_en: "Risk and Business Continuity Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    owning_org_display_ar: "بنك قطر للتنمية",
    owning_org_display_en: "Qatar Development Bank",
    role: "member",
    classification: "synthetic_demonstration",
    mandate_ar: "مراجعة سجل المخاطر المؤسسية واستمرارية الخدمات الحيوية وسيناريوهات التعافي.",
    mandate_en: "Reviews the institutional risk register, continuity of critical services, and recovery scenarios.",
    topics_ar: ["سجل المخاطر المؤسسية", "المخاطر التشغيلية", "استمرارية الخدمات الحيوية", "سيناريوهات التعافي", "مخاطر الأطراف الخارجية", "قبول المخاطر المتبقية"],
  },
  {
    key: "innovation_services",
    public_id: "DEMO-COMM-QDB-INNOVATION",
    slug: "innovation-service-development-committee",
    name_ar: "لجنة الابتكار وتطوير الخدمات",
    name_en: "Innovation and Service Development Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    owning_org_display_ar: "بنك قطر للتنمية",
    owning_org_display_en: "Qatar Development Bank",
    role: "secretary",
    classification: "synthetic_demonstration",
    mandate_ar: "تنسيق أعمال لجنة الابتكار وتطوير الخدمات وإعداد حزم الاجتماعات ومتابعة سجل الإجراءات.",
    mandate_en: "Coordinates the innovation committee's work, prepares meeting packs, and maintains the action register.",
    topics_ar: ["ابتكار الخدمات", "تجربة العميل", "رقمنة الخدمات", "شراكات الابتكار"],
  },
];

export function getRolePermittedActions(role, authorityType, delegationActive) {
  if (role === "vice_chair" && authorityType === "chair_authority" && delegationActive) {
    return [...ROLE_ACTIONS.vice_chair, ...ROLE_ACTIONS.chair];
  }
  return ROLE_ACTIONS[role] || [];
}

/** Resolve the committee + Dr. Hamad's membership + his AuthorityGrant for it, by ref. */
export async function resolveDrHamadCommitteeGrant(sr, committeeRef) {
  const committee = (await sr.entities.Committee.filter({ public_id: committeeRef }).catch(() => []))[0]
    || (await sr.entities.Committee.filter({ slug: committeeRef }).catch(() => []))[0];
  if (!committee) return { committee: null, membership: null, grant: null };

  const membership = (await sr.entities.CommitteeMembership.filter({
    committee_id: committee.id, user_id: DR_HAMAD_PERSON_KEY, status: "active",
  }).catch(() => []))[0] || null;
  const grant = (await sr.entities.AuthorityGrant.filter({
    committee_id: committee.id, person_key: DR_HAMAD_PERSON_KEY,
  }).catch(() => []))[0] || null;

  return { committee, membership, grant };
}