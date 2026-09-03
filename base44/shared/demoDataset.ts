// LIJAN™ — Fahad Al-Fihaidi Multi-Organization Demo Dataset
// All data is fictional and marked with is_demo_data=true, demo_dataset=FAHAD_MULTI_ORG

export const DEMO_USER = {
  id: "6a9926062b05cfe1ef31e6f8",
  email: "F.alfihaidi@lijan.com",
  name_ar: "فهد الفهيدي",
  name_en: "Fahad Al-Fihaidi",
};

export const DEMO_DATASET = "FAHAD_MULTI_ORG";
export const DEMO_FLAG_KEY = "fahad_demo_provisioned";

export const DEMO_ORGS = [
  {
    name_ar: "الهيئة الوطنية للتنمية المؤسسية",
    name_en: "National Authority for Institutional Development",
    type: "authority",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
  {
    name_ar: "المجلس الوطني للتحول الرقمي",
    name_en: "National Council for Digital Transformation",
    type: "council",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
  {
    name_ar: "مؤسسة الحوكمة والتميز",
    name_en: "Governance & Excellence Foundation",
    type: "organization",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
];

export const DEMO_COMMITTEES = [
  // Org 0 — National Authority for Institutional Development
  { orgIndex: 0, name_ar: "لجنة التحول المؤسسي", name_en: "Institutional Transformation Committee", type: "permanent_committee", fahadRole: "chair", scenario: "minutes_pending_approval" },
  { orgIndex: 0, name_ar: "لجنة السياسات والحوكمة", name_en: "Policy & Governance Committee", type: "permanent_committee", fahadRole: "vice_chair", scenario: "delegation_active", hasDelegation: true },
  { orgIndex: 0, name_ar: "لجنة متابعة تنفيذ الاستراتيجية", name_en: "Strategic Execution Follow-up Committee", type: "permanent_committee", fahadRole: "member", scenario: "open_voting" },
  // Org 1 — National Council for Digital Transformation
  { orgIndex: 1, name_ar: "لجنة البيانات والذكاء المؤسسي", name_en: "Data & Institutional Intelligence Committee", type: "permanent_committee", fahadRole: "secretary", scenario: "pack_preparation" },
  { orgIndex: 1, name_ar: "لجنة تطوير الخدمات الرقمية", name_en: "Digital Services Development Committee", type: "working_group", fahadRole: "member", scenario: "overdue_action" },
  // Org 2 — Governance & Excellence Foundation
  { orgIndex: 2, name_ar: "لجنة المخاطر واستمرارية الأعمال", name_en: "Risk & Business Continuity Committee", type: "permanent_committee", fahadRole: "chair", scenario: "conflict_of_interest" },
  { orgIndex: 2, name_ar: "لجنة المشتريات والعقود", name_en: "Procurement & Contracts Committee", type: "permanent_committee", fahadRole: "vice_chair", scenario: "executive_report_ready", hasDelegation: false },
];

// Fictional demo member names (no real user accounts)
export const DEMO_MEMBER_NAMES = [
  "أحمد المنصوري", "خالد العبدالله", "سارة الكواري", "محمد الدوسري",
  "نورة آل علي", "عبدالله الكبيسي", "ريم الأنصاري", "حمد المري",
  "عائشة النعيمي", "ماجد السليطي", "لطيفة آل ثاني", "بدر الكواري",
  "منى الهتمي", "سعود العطية", "دانة آل خليفة", "فيصل آل ثاني",
];

// Generate committee members for a committee, ensuring Fahad has the correct role
// and the committee has a full formation (chair, vice_chair, secretary, members)
export function buildCommitteeMembers(committeeIndex, fahadRole) {
  const members = [];
  const roles = ["chair", "vice_chair", "secretary", "member", "member", "member", "member"];
  
  // Assign Fahad to his role
  const fahadRoleIndex = roles.indexOf(fahadRole);
  if (fahadRoleIndex >= 0) roles[fahadRoleIndex] = "__FAHAD__";
  
  // Fill remaining roles with fictional members
  let nameIdx = (committeeIndex * 3) % DEMO_MEMBER_NAMES.length;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === "__FAHAD__") {
      members.push({
        full_name: DEMO_USER.name_en,
        full_name_ar: DEMO_USER.name_ar,
        user_id: DEMO_USER.id,
        user_email: DEMO_USER.email,
        role: fahadRole,
        authority_level: fahadRole === "chair" ? "decision" : fahadRole === "vice_chair" ? "approval" : fahadRole === "secretary" ? "execution" : "decision",
        voting_right: true,
        status: "active",
        protocol_order: i + 1,
        term_start: "2026-01-01",
        institution_name: "Demo Institution",
      });
    } else {
      const name = DEMO_MEMBER_NAMES[nameIdx % DEMO_MEMBER_NAMES.length];
      nameIdx++;
      members.push({
        full_name: name,
        full_name_ar: name,
        user_id: null,
        user_email: `demo.member${nameIdx}@lijan-demo.com`,
        role: roles[i],
        authority_level: roles[i] === "chair" ? "decision" : roles[i] === "vice_chair" ? "approval" : roles[i] === "secretary" ? "execution" : "decision",
        voting_right: true,
        status: "active",
        protocol_order: i + 1,
        term_start: "2026-01-01",
        institution_name: "Demo Institution",
      });
    }
  }
  return members;
}

// Meeting data for each committee (1 past + 1 upcoming)
export function buildMeetings(committeeId, orgId, committeeIndex) {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14 - committeeIndex * 2);
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 7 + committeeIndex * 3);

  return [
    {
      organization_id: orgId,
      committee_id: committeeId,
      title: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة السابقة`,
      title_ar: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة السابقة`,
      date: pastDate.toISOString(),
      duration_minutes: 90,
      location: "قاعة الاجتماعات الرئيسية — المقر",
      mode: "hybrid",
      provider: "none",
      quorum_required: 4,
      status: "completed",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    },
    {
      organization_id: orgId,
      committee_id: committeeId,
      title: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة القادمة`,
      title_ar: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة القادمة`,
      date: upcomingDate.toISOString(),
      duration_minutes: 90,
      location: "قاعة الاجتماعات الرئيسية — المقر",
      mode: "hybrid",
      provider: "none",
      quorum_required: 4,
      agenda_ready: false,
      status: "scheduled",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    },
  ];
}