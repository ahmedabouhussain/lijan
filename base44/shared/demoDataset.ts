// LIJAN™ — Fahad Al-Fihaidi Approved Demo Dataset V2
// 3 organizations, 7 committees — Qatar government-inspired fictional data
// All data is fictional and marked with is_demo_data=true, demo_dataset=FAHAD_QATAR_GOVERNMENT_DEMO_V2
//
// CRITICAL: Demo data is linked to DEMO_USER_ID (a virtual identity), NOT the founder's real user ID.
// This ensures complete isolation between the founder account and the demo persona.

export const DEMO_USER_ID = "DEMO-USER-FAHAD-AL-FIHAIDI";

export const DEMO_USER = {
  email: "F.alfihaidi@lijan.com",
  name_ar: "فهد الفهيدي",
  name_en: "Fahad Al-Fihaidi",
  job_title_ar: "مدير التدقيق",
  job_title_en: "Director of Audit",
  primary_org_ar: "مجلس التدقيق والمراجعة",
  primary_org_en: "Audit and Review Council",
  persona_key: "FAHAD_AL_FIHAIDI",
  user_id: DEMO_USER_ID,
};

export const DEMO_DATASET = "FAHAD_QATAR_GOVERNMENT_DEMO_V2";
export const DEMO_FLAG_KEY = "fahad_demo_v2_provisioned";

// ── Organizations (3) ──
export const DEMO_ORGS = [
  {
    public_id: "DEMO-ORG-AUDIT-COUNCIL",
    slug: "audit-review-council",
    name_ar: "مجلس التدقيق والمراجعة",
    name_en: "Audit and Review Council",
    type: "council",
    is_primary: true,
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
  {
    public_id: "DEMO-ORG-GOV-EXCELLENCE",
    slug: "moassasat-al-hawkama",
    name_ar: "مؤسسة الحوكمة والتميز",
    name_en: "Governance & Excellence Foundation",
    type: "organization",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
  {
    public_id: "DEMO-ORG-NATIONAL-DIGITAL",
    slug: "majlis-alwatani-tahawol-raqami",
    name_ar: "المجلس الوطني للتحول الرقمي",
    name_en: "National Council for Digital Transformation",
    type: "council",
    description: "جهة تجريبية لعرض قدرات المنصة — بيانات غير حقيقية · Demo entity — fictional data",
  },
];

// ── Committees (7) — mapped to approved roles ──
export const DEMO_COMMITTEES = [
  // Org 0 — مجلس التدقيق والمراجعة (3 committees)
  {
    orgIndex: 0,
    public_id: "DEMO-COMM-INTERNAL-AUDIT",
    slug: "lajnat-al-tadqiq-dakhili-jawda",
    name_ar: "لجنة التدقيق الداخلي وضمان الجودة",
    name_en: "Internal Audit & Quality Assurance Committee",
    type: "permanent_committee",
    fahadRole: "chair",
    scenario: "minutes_pending_approval",
    topics: ["الخطة السنوية للتدقيق", "التدقيق القائم على المخاطر", "متابعة تنفيذ التوصيات", "جودة أعمال التدقيق", "مراجعة الضوابط الداخلية", "مؤشرات إغلاق الملاحظات"],
  },
  {
    orgIndex: 0,
    public_id: "DEMO-COMM-FIN-COMPLIANCE",
    slug: "lajnat-al-siyasat-al-maliya-imtithal",
    name_ar: "لجنة السياسات المالية والامتثال",
    name_en: "Financial Policies & Compliance Committee",
    type: "permanent_committee",
    fahadRole: "vice_chair",
    scenario: "delegation_active",
    hasDelegation: true,
    topics: ["الالتزام المالي", "الحوكمة والامتثال", "رقابة العقود والمشتريات", "مراجعة الانحرافات المالية", "تقارير الامتثال", "ضوابط الإنفاق"],
  },
  {
    orgIndex: 0,
    public_id: "DEMO-COMM-DIGITAL-AUDIT-CYBER",
    slug: "firqan-al-tadqiq-raqami-amn-sibrani",
    name_ar: "فريق عمل التدقيق الرقمي والأمن السيبراني",
    name_en: "Digital Audit & Cybersecurity Task Force",
    type: "task_force",
    fahadRole: "member",
    scenario: "open_voting",
    topics: ["التدقيق على الأنظمة الرقمية", "الأمن السيبراني", "تقييم المخاطر السيبرانية", "جاهزية الاستجابة للحوادث", "اختبار استمرارية الخدمات", "مراجعة الضوابط التقنية"],
  },
  // Org 1 — مؤسسة الحوكمة والتميز (2 committees)
  {
    orgIndex: 1,
    public_id: "DEMO-COMM-RISK-BCP",
    slug: "lajnat-al-makhater-amtiyar",
    name_ar: "لجنة المخاطر واستمرارية الأعمال",
    name_en: "Risk & Business Continuity Committee",
    type: "permanent_committee",
    fahadRole: "chair",
    scenario: "conflict_of_interest",
    topics: ["استمرارية الخدمات الحكومية", "سيناريوهات الانقطاع", "جاهزية المرافق", "مخاطر الموردين", "التعافي من الكوارث", "تمارين المحاكاة"],
  },
  {
    orgIndex: 1,
    public_id: "DEMO-COMM-PROCUREMENT",
    slug: "lajnat-al-mashariat-uqud",
    name_ar: "لجنة المشتريات والعقود",
    name_en: "Procurement & Contracts Committee",
    type: "permanent_committee",
    fahadRole: "vice_chair",
    scenario: "executive_report_ready",
    hasDelegation: false,
    topics: ["خطط المشتريات", "تقييم الموردين", "تضارب المصالح", "أوامر التغيير", "مؤشرات تنفيذ العقود", "متابعة التزامات الموردين"],
  },
  // Org 2 — المجلس الوطني للتحول الرقمي (2 committees)
  {
    orgIndex: 2,
    public_id: "DEMO-COMM-DATA-INTEL",
    slug: "lajnat-al-bayanat-thakaa",
    name_ar: "لجنة البيانات والذكاء المؤسسي",
    name_en: "Data & Institutional Intelligence Committee",
    type: "permanent_committee",
    fahadRole: "secretary",
    scenario: "pack_preparation",
    topics: ["حوكمة البيانات", "جودة البيانات", "تصنيف المعلومات", "تبادل البيانات بين الجهات", "استخدام الذكاء الاصطناعي بمسؤولية", "الذاكرة المؤسسية"],
  },
  {
    orgIndex: 2,
    public_id: "DEMO-COMM-DIGITAL-SERVICES",
    slug: "lajnat-tatwir-khadamat-raqamiya",
    name_ar: "لجنة تطوير الخدمات الرقمية",
    name_en: "Digital Services Development Committee",
    type: "working_group",
    fahadRole: "member",
    scenario: "overdue_action",
    topics: ["تحسين الخدمات الرقمية", "الوصول الشامل", "تجربة المستخدم", "تبسيط الإجراءات", "الخدمات عبر الهاتف", "قياس رضا المستفيدين"],
  },
];

// Fictional demo member names (no real user accounts)
export const DEMO_MEMBER_NAMES = [
  "أحمد المنصوري", "خالد العبدالله", "سارة الكواري", "محمد الدوسري",
  "نورة آل علي", "عبدالله الكبيسي", "ريم الأنصاري", "حمد المري",
  "عائشة النعيمي", "ماجد السليطي", "لطيفة آل ثاني", "بدر الكواري",
  "منى الهتمي", "سعود العطية", "دانة آل خليفة", "فيصل آل ثاني",
  "روضة العبيدلي", "ناصر المحيربي", "هند الكواري", "ثاني آل ثاني",
];

export const DEMO_INSTITUTIONS = [
  "وزارة المعرفة", "مؤسسة الحوكمة والتميز", "المجلس الوطني للتحول الرقمي",
  "إدارة تقنية المعلومات", "إدارة التخطيط والجودة", "إدارة الشؤون المالية",
  "إدارة المخاطر", "إدارة المشتريات", "الشؤون القانونية", "الإدارة التنفيذية",
];

// ── Generate committee members (8-12 per committee) ──
export function buildCommitteeMembers(committeeIndex, fahadRole) {
  const members = [];
  const baseRoles = ["chair", "vice_chair", "secretary", "member", "member", "member", "member", "member", "alternate", "advisor"];
  const roles = [...baseRoles];
  
  // Assign Fahad to his role
  const fahadRoleIndex = roles.indexOf(fahadRole);
  if (fahadRoleIndex >= 0) roles[fahadRoleIndex] = "__FAHAD__";
  
  let nameIdx = (committeeIndex * 3) % DEMO_MEMBER_NAMES.length;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === "__FAHAD__") {
      members.push({
        full_name: DEMO_USER.name_en,
        full_name_ar: DEMO_USER.name_ar,
        user_email: DEMO_USER.email,
        user_id: DEMO_USER_ID,
        role: fahadRole,
        authority_level: fahadRole === "chair" ? "decision" : fahadRole === "vice_chair" ? "approval" : fahadRole === "secretary" ? "execution" : "decision",
        voting_right: true,
        status: "active",
        protocol_order: i + 1,
        term_start: "2026-01-01",
        term_end: "2027-12-31",
        institution_name: DEMO_INSTITUTIONS[committeeIndex % DEMO_INSTITUTIONS.length],
      });
    } else {
      const name = DEMO_MEMBER_NAMES[nameIdx % DEMO_MEMBER_NAMES.length];
      nameIdx++;
      members.push({
        full_name: name,
        full_name_ar: name,
        user_email: `demo.member${nameIdx}@lijan-demo.com`,
        user_id: null,
        role: roles[i],
        authority_level: roles[i] === "chair" ? "decision" : roles[i] === "vice_chair" ? "approval" : roles[i] === "secretary" ? "execution" : "decision",
        voting_right: roles[i] !== "advisor" && roles[i] !== "observer",
        status: "active",
        protocol_order: i + 1,
        term_start: "2026-01-01",
        term_end: "2027-12-31",
        institution_name: DEMO_INSTITUTIONS[(committeeIndex + i) % DEMO_INSTITUTIONS.length],
      });
    }
  }
  return members;
}

// ── Meeting data (4 past + 2 upcoming per committee) ──
export function buildMeetings(committeeId, orgId, committeeIndex) {
  const meetings = [];
  const locations = [
    "قاعة الاجتماعات الرئيسية — الدوحة",
    "قاعة المجلس التنفيذي — لوسيل",
    "مركز التنسيق الحكومي — موقع تجريبي",
    "قاعة الاجتماعات الافتراضية — عبر المنصة",
  ];
  
  // 4 past meetings
  for (let p = 4; p >= 1; p--) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - (p * 21 + committeeIndex * 2));
    // Adjust to a working day (Sun-Thu)
    const day = pastDate.getDay();
    if (day === 5) pastDate.setDate(pastDate.getDate() - 1); // Friday → Thursday
    if (day === 6) pastDate.setDate(pastDate.getDate() - 2); // Saturday → Thursday
    
    meetings.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة ${5 - p}`,
      title_ar: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة ${5 - p}`,
      date: pastDate.toISOString(),
      duration_minutes: 90,
      location: locations[(p + committeeIndex) % locations.length],
      mode: p % 2 === 0 ? "hybrid" : "physical",
      provider: "none",
      quorum_required: 4,
      status: "completed",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  
  // 2 upcoming meetings
  for (let u = 1; u <= 2; u++) {
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + (u * 14 + committeeIndex * 3));
    const day = upcomingDate.getDay();
    if (day === 5) upcomingDate.setDate(upcomingDate.getDate() + 2); // Friday → Sunday
    if (day === 6) upcomingDate.setDate(upcomingDate.getDate() + 1); // Saturday → Sunday
    
    meetings.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة القادمة ${u}`,
      title_ar: `اجتماع ${DEMO_COMMITTEES[committeeIndex].name_ar} — الدورة القادمة ${u}`,
      date: upcomingDate.toISOString(),
      duration_minutes: 90,
      location: locations[(u + committeeIndex) % locations.length],
      mode: "hybrid",
      provider: "none",
      quorum_required: 4,
      agenda_ready: u === 1,
      status: "scheduled",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  
  return meetings;
}

// ── Generate slug from Arabic name ──
export function slugifyArabic(name) {
  return name
    .replace(/ال/g, "al")
    .replace(/لجنة/g, "lajnat")
    .replace(/وزارة/g, "wizarat")
    .replace(/مؤسسة/g, "moassasat")
    .replace(/المجلس/g, "almajlis")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase();
}