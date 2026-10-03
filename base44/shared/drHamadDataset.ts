// LIJAN™ — Dr. Hamad Salem Majeegheer governed demonstration persona (V3).
// ONE person, ONE account, ONE permanent primary organization (Qatar Development Bank).
// Seven independent CommitteeMembership + AuthorityGrant + RoleAssignment records —
// never a single global role, never combined across committees.
// Never mixed with any other demo persona (Fahad Al-Fihaidi, Ahmed Abouhussain, etc.).

// Principal — the virtual identity every membership / grant / role assignment is keyed by.
export const DR_HAMAD_PERSON_KEY = "DEMO-USER-DR-HAMAD-MAJEEGHEER";
// Persona ID — the canonical, human-facing persona identifier.
export const DR_HAMAD_PERSONA_ID = "demo-dr-hamad-majeegheer";
export const DR_HAMAD_INTERNAL_EMAIL = "dr.hamad.majeegheer.demo@lijan.example";
export const DR_HAMAD_DATASET = "DR_HAMAD_GOVERNED_DEMO_V1";
export const DR_HAMAD_REPAIR_VERSION = "repairDrHamadDemoExperienceV3";

export const DR_HAMAD_PERSONA = {
  person_key: DR_HAMAD_PERSON_KEY,
  persona_id: DR_HAMAD_PERSONA_ID,
  name_ar: "الدكتور حمد سالم مجيغير",
  name_en: "Dr. Hamad Salem Majeegheer",
  email: DR_HAMAD_INTERNAL_EMAIL,
  account_classification_ar: "شخصية عرض تجريبية محكومة",
  account_classification_en: "Governed Synthetic Demonstration Persona",
  default_locale: "ar",
  default_direction: "rtl",
  assistant_ar: "أمين",
  assistant_en: "Ameen",
  primary_org_ar: "بنك قطر للتنمية",
  primary_org_en: "Qatar Development Bank",
  primary_org_abbr: "QDB",
  primary_org_public_id: "DEMO-ORG-QDB",
  // No verified professional title was supplied — demo-profile wording only.
  job_title_ar: "قيادي تنفيذي — بنك قطر للتنمية",
  job_title_en: "Executive Leader — Qatar Development Bank",
  job_title_is_demo_wording: true,
};

// ── Organizations / institutional contexts ──
// QDB is the ONLY primary organization. The national context and ELAN Group own
// committees the persona sits on — they are never presented as his employer.
export const DR_HAMAD_ORGS = {
  QDB: {
    public_id: "DEMO-ORG-QDB",
    slug: "qatar-development-bank",
    name_ar: "بنك قطر للتنمية",
    name_en: "Qatar Development Bank",
    type: "organization",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير رسمية",
    context: {
      kind: "primary",
      order: 1,
      title_ar: "بنك قطر للتنمية",
      title_en: "Qatar Development Bank",
      badges: [{ ar: "جهتي الأساسية", en: "Primary Organization", tone: "primary" }],
      section_label_ar: "لجاني في بنك قطر للتنمية",
      section_label_en: "My committees at Qatar Development Bank",
      path_label_ar: "بنك قطر للتنمية",
      path_label_en: "Qatar Development Bank",
    },
  },
  NATIONAL: {
    public_id: "DEMO-ORG-NATIONAL-JOINT",
    slug: "national-inter-entity-committees",
    name_ar: "اللجان الوطنية المشتركة",
    name_en: "National Inter-Entity Committees",
    type: "other",
    description: "سياق وطني مشترك بين الجهات — بيانات عرض مستندة إلى مواد مصدرية",
    context: {
      kind: "national",
      order: 2,
      title_ar: "اللجان الوطنية المشتركة",
      title_en: "National Inter-Entity Committees",
      badges: [{ ar: "عضوية وطنية — ممثل بنك قطر للتنمية", en: "National Membership — Representing QDB", tone: "gold" }],
      section_label_ar: "لجاني الوطنية",
      section_label_en: "My national committees",
      path_label_ar: "لجنة وطنية مشتركة",
      path_label_en: "Joint National Committee",
    },
  },
  ELAN: {
    public_id: "DEMO-ORG-ELAN",
    slug: "elan-group",
    name_ar: "مجموعة إعلان",
    name_en: "ELAN Group",
    type: "organization",
    description: "جهة خارجية ضمن سيناريو العرض — دور تجريبي افتراضي",
    context: {
      kind: "external",
      order: 3,
      title_ar: "مجموعة إعلان",
      title_en: "ELAN Group",
      badges: [
        { ar: "عضوية خارجية", en: "External Membership", tone: "neutral" },
        { ar: "دور تجريبي افتراضي", en: "Synthetic Demonstration Role", tone: "gold" },
      ],
      section_label_ar: "لجاني في مجموعة إعلان",
      section_label_en: "My committees at ELAN Group",
      path_label_ar: "مجموعة إعلان",
      path_label_en: "ELAN Group",
      notice_ar: "هذا الدور جزء من سيناريو العرض ولا يمثل منصبًا فعليًا.",
      notice_en: "This role is part of the demonstration scenario and does not represent an actual appointment.",
    },
  },
};

export const ROLE_LABELS = {
  chair: { ar: "رئيس اللجنة", en: "Committee Chair" },
  vice_chair: { ar: "نائب رئيس اللجنة", en: "Vice-Chair" },
  member: { ar: "عضو", en: "Member" },
  secretary: { ar: "أمين سر", en: "Committee Secretary" },
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

export function getRolePermittedActions(role, delegationActive) {
  if (role === "vice_chair" && delegationActive) {
    return [...ROLE_ACTIONS.vice_chair, ...ROLE_ACTIONS.chair];
  }
  return ROLE_ACTIONS[role] || [];
}

// ── The seven committee memberships (display order) ──
export const DR_HAMAD_COMMITTEES = [
  {
    key: "digital_transformation",
    public_id: "DEMO-COMM-QDB-DIGITAL",
    slug: "digital-transformation-institutional-intelligence",
    name_ar: "لجنة التحول الرقمي والذكاء المؤسسي",
    name_en: "Digital Transformation and Institutional Intelligence Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    role: "chair",
    classification: "synthetic_demonstration",
    mandate_ar: "قيادة مسار التحول الرقمي وحوكمة الذكاء المؤسسي داخل البنك.",
    mandate_en: "Leads the bank's digital transformation and institutional-intelligence governance track.",
    ameen_ar: "أنت رئيس لجنة التحول الرقمي والذكاء المؤسسي في بنك قطر للتنمية. يمكنك اعتماد جدول الأعمال وإدارة سير البنود والبت في القرارات واعتماد المحاضر ضمن هذه اللجنة فقط، ولا تنتقل هذه الصلاحية إلى لجانك الأخرى.",
    ameen_en: "You are Chair of the Digital Transformation and Institutional Intelligence Committee at Qatar Development Bank. You may approve the agenda, run agenda progression, decide on proposals and approve minutes in this committee only — this authority does not carry into your other committees.",
  },
  {
    key: "sme_finance_steering",
    public_id: "DEMO-COMM-QDB-SME-FINANCE",
    slug: "sme-finance-steering-committee",
    name_ar: "اللجنة التوجيهية لتمويل الشركات الصغيرة والمتوسطة",
    name_en: "SME Finance Steering Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    role: "vice_chair",
    classification: "synthetic_demonstration",
    mandate_ar: "توجيه برامج تمويل الشركات الصغيرة والمتوسطة ومتابعة مؤشرات الإقراض.",
    mandate_en: "Steers SME finance programs and tracks lending indicators.",
    ameen_ar: "أنت نائب رئيس اللجنة التوجيهية لتمويل الشركات الصغيرة والمتوسطة. يمكنك مراجعة الجاهزية ودعم رئيس اللجنة والتوصية، ولا تمارس صلاحيات الرئيس إلا بتفويض نافذ.",
    ameen_en: "You are Vice-Chair of the SME Finance Steering Committee. You may review readiness, support the Chair and recommend — you cannot exercise Chair powers without an active delegation.",
  },
  {
    key: "investment_partnerships",
    public_id: "DEMO-COMM-QDB-INVESTMENT",
    slug: "investment-strategic-partnerships-committee",
    name_ar: "لجنة الاستثمار والشراكات الاستراتيجية",
    name_en: "Investment and Strategic Partnerships Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    role: "member",
    classification: "synthetic_demonstration",
    mandate_ar: "تقييم فرص الاستثمار والشراكات الاستراتيجية ومواءمتها مع الأولويات الوطنية.",
    mandate_en: "Evaluates investment opportunities and strategic partnerships aligned with national priorities.",
    ameen_ar: "أنت عضو في لجنة الاستثمار والشراكات الاستراتيجية. يمكنك المراجعة والتعليق والتوصية وتقديم الأدلة، ولا تملك صلاحية اعتماد القرارات في هذه اللجنة.",
    ameen_en: "You are a Member of the Investment and Strategic Partnerships Committee. You may review, comment, recommend and provide evidence — you hold no approval authority in this committee.",
  },
  {
    key: "risk_continuity",
    public_id: "DEMO-COMM-QDB-RISK",
    slug: "risk-business-continuity-committee",
    name_ar: "لجنة المخاطر واستمرارية الأعمال",
    name_en: "Risk and Business Continuity Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    role: "member",
    classification: "synthetic_demonstration",
    mandate_ar: "مراجعة سجل المخاطر المؤسسية واستمرارية الخدمات الحيوية وسيناريوهات التعافي.",
    mandate_en: "Reviews the institutional risk register, continuity of critical services, and recovery scenarios.",
    ameen_ar: "أنت عضو في لجنة المخاطر واستمرارية الأعمال. يمكنك مراجعة سجل المخاطر والتوصية وتقديم الأدلة، ولا تملك صلاحية قبول المخاطر أو اعتماد القرارات.",
    ameen_en: "You are a Member of the Risk and Business Continuity Committee. You may review the risk register, recommend and provide evidence — you cannot accept risk or approve decisions.",
  },
  {
    key: "innovation_services",
    public_id: "DEMO-COMM-QDB-INNOVATION",
    slug: "innovation-service-development-committee",
    name_ar: "لجنة الابتكار وتطوير الخدمات",
    name_en: "Innovation and Service Development Committee",
    type: "permanent_committee",
    owning_org: "QDB",
    role: "secretary",
    classification: "synthetic_demonstration",
    mandate_ar: "تنسيق أعمال لجنة الابتكار وتطوير الخدمات وإعداد حزم الاجتماعات ومتابعة سجل الإجراءات.",
    mandate_en: "Coordinates the innovation committee's work, prepares meeting packs, and maintains the action register.",
    ameen_ar: "يمكنك تجهيز الأجندة والمحاضر وحزمة الاجتماع ومتابعة الإجراءات، ولا يمكنك اعتماد القرار بدلًا من رئيس اللجنة.",
    ameen_en: "You may prepare the agenda, minutes and meeting pack and follow up on actions — you cannot approve a decision in place of the Committee Chair.",
  },
  {
    key: "national_sme",
    public_id: "DEMO-COMM-NATIONAL-SME",
    slug: "national-sme-development-committee",
    name_ar: "اللجنة الوطنية لتنمية الشركات الصغيرة والمتوسطة",
    name_en: "National Committee for Small and Medium Enterprise Development",
    type: "national_committee",
    owning_org: "NATIONAL",
    role: "member",
    role_label_ar: "عضو ممثل لبنك قطر للتنمية",
    role_label_en: "Member Representing Qatar Development Bank",
    classification: "source_based_demonstration",
    workstream_ar: "فريق النفاذ إلى الأسواق",
    workstream_en: "Access to Markets Workstream",
    mandate_ar: "متابعة توحيد تعريف الشركات الصغيرة والمتوسطة، ومبادرات النفاذ إلى الأسواق والتمويل ورأس المال والمعرفة.",
    mandate_en: "Tracks the unified SME definition and initiatives for access to markets, finance, capital and knowledge.",
    ameen_ar: "أنت عضو ممثل لبنك قطر للتنمية في اللجنة الوطنية لتنمية الشركات الصغيرة والمتوسطة، وعضو في فريق النفاذ إلى الأسواق. يمكنك المراجعة والتوصية وتقديم الأدلة، ولا تملك صلاحية اعتماد قرار اللجنة النهائي.",
    ameen_en: "You are a Member representing Qatar Development Bank on the National Committee for SME Development, and a member of the Access to Markets Workstream. You may review, recommend and provide evidence — you hold no authority to approve the committee's final decision.",
  },
  {
    key: "elan_executive",
    public_id: "DEMO-COMM-ELAN-EXEC",
    slug: "elan-executive-committee",
    name_ar: "اللجنة التنفيذية لمجموعة إعلان",
    name_en: "ELAN Executive Committee",
    type: "permanent_committee",
    owning_org: "ELAN",
    role: "chair",
    role_label_ar: "رئيس اللجنة — دور تجريبي",
    role_label_en: "Committee Chair — Synthetic Role",
    path_role_label_ar: "رئيس اللجنة — تجريبي",
    path_role_label_en: "Committee Chair — Synthetic",
    classification: "synthetic_demonstration",
    synthetic_role: true,
    mandate_ar: "مراجعة الأداء والتوقعات المالية لمجموعة إعلان واعتماد القرارات التنفيذية ذات الصلة.",
    mandate_en: "Reviews ELAN Group's performance and financial forecast and approves related executive decisions.",
    ameen_ar: "أنت داخل سيناريو تجريبي بصفتك رئيس اللجنة التنفيذية لمجموعة إعلان. هذا الدور تجريبي ولا يمثل منصبًا فعليًا.",
    ameen_en: "You are inside a demonstration scenario as Chair of the ELAN Executive Committee. This role is synthetic and does not represent an actual appointment.",
  },
];

export const DR_HAMAD_AMEEN_GENERAL = {
  ar: "مرحبًا دكتور حمد. أنت مسجل تحت جهة بنك قطر للتنمية ولديك سبع عضويات مستقلة. اختر لجنة لعرض مسؤولياتك وصلاحياتك الحالية.",
  en: "Welcome, Dr. Hamad. You are registered under Qatar Development Bank and hold seven independent memberships. Choose a committee to see your current responsibilities and authority.",
};

export const DR_HAMAD_LANDING = {
  intro_ar: "تعمل عبر {n} لجان وطنية ومؤسسية بأدوار مختلفة. يعرض لك «أمين» ما يحتاج إلى انتباهك وفق اللجنة والدور الحالي.",
  intro_en: "You work across {n} national and institutional committees in different roles. «Ameen» shows what needs your attention based on the current committee and role.",
  quick_actions: [
    { key: "attention", kind: "attention", ar: "عرض ما يحتاج انتباهي", en: "Show what needs my attention" },
    { key: "national", kind: "committee", committee_public_id: "DEMO-COMM-NATIONAL-SME", ar: "متابعة اللجنة الوطنية", en: "Follow the National Committee" },
    { key: "elan", kind: "committee", committee_public_id: "DEMO-COMM-ELAN-EXEC", ar: "فتح اللجنة التنفيذية", en: "Open the Executive Committee" },
    { key: "documents", kind: "documents", ar: "مراجعة المستندات", en: "Review documents" },
    { key: "ameen", kind: "ameen", ar: "اسأل «أمين»", en: "Ask «Ameen»" },
  ],
};