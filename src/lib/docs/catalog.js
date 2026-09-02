/**
 * LIJAN™ Documentation & Executive Pack — Master Catalog
 *
 * Single source of truth for all document metadata.
 * Content lives in separate files under src/lib/docs/content/.
 *
 * Capability status classification (strict):
 *   LIVE — VERIFIED
 *   CONFIGURED — TESTED
 *   ENGINEERING COMPLETE — AWAITING AUTHORIZATION
 *   ROADMAP — NOT YET RELEASED
 *   BLOCKED WITH EVIDENCE
 */

export const CAPABILITY_STATUS = {
  LIVE: "LIVE — VERIFIED",
  CONFIGURED: "CONFIGURED — TESTED",
  ENGINEERING: "ENGINEERING COMPLETE — AWAITING AUTHORIZATION",
  ROADMAP: "ROADMAP — NOT YET RELEASED",
  BLOCKED: "BLOCKED WITH EVIDENCE",
};

export const CATEGORIES = {
  executive: { ar: "باقة الإدارة العليا", en: "Executive Pack" },
  platform: { ar: "تعريف المنصة والقدرات", en: "Platform & Capabilities" },
  operations: { ar: "التشغيل والحوكمة", en: "Operations & Governance" },
  userGuides: { ar: "أدلة المستخدمين", en: "User Guides" },
  it: { ar: "إدارة تقنية المعلومات", en: "IT Management" },
  security: { ar: "الأمن والبيانات", en: "Security & Data" },
  implementation: { ar: "التنفيذ والتدريب", en: "Implementation & Training" },
  support: { ar: "الدعم واستمرارية الأعمال", en: "Support & Continuity" },
  templates: { ar: "القوالب وقوائم الفحص", en: "Templates & Checklists" },
  archive: { ar: "الإصدارات السابقة والأرشيف", en: "Versions & Archive" },
};

export const CLASSIFICATIONS = {
  public: { ar: "عام", en: "Public" },
  internal: { ar: "داخلي", en: "Internal" },
  confidential: { ar: "سري", en: "Confidential" },
  restricted: { ar: "مقيد", en: "Restricted" },
  highly_restricted: { ar: "سري للغاية", en: "Highly Restricted" },
};

/**
 * Document catalog — metadata for every document in the pack.
 * Content is loaded from src/lib/docs/content/ modules.
 */
export const DOCUMENT_CATALOG = [
  // ── 1. Executive Pack ──
  {
    id: "master-index",
    key: "LIJAN_Master_Document_Index",
    title_ar: "الفهرس الرئيسي للباقة",
    title_en: "Master Document Index",
    category: "executive",
    audience: ["executive", "all"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "خريطة شاملة لجميع وثائق الباقة مع العلاقات والملكية ودورة الاعتماد.",
    description_en: "Comprehensive map of all pack documents with relationships, ownership, and approval cycle.",
    contentModule: "executive",
    order: 1,
  },
  {
    id: "executive-presentation",
    key: "LIJAN_Executive_Presentation",
    title_ar: "العرض التنفيذي للإدارة العليا",
    title_en: "Executive Presentation",
    category: "executive",
    audience: ["executive"],
    formats: ["pptx", "pdf"],
    version: "1.0",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "عرض تنفيذي بنسبة 16:9 يتضمن فيديو المقدمة و28 شريحة تغطي المنصة بالكامل.",
    description_en: "16:9 executive presentation with intro video and 28 slides covering the full platform.",
    contentModule: "executive",
    hasVideo: true,
    order: 2,
  },
  {
    id: "executive-dossier",
    key: "LIJAN_Executive_Platform_Dossier",
    title_ar: "الملف التنفيذي الشامل للمنصة",
    title_en: "Executive Platform Dossier",
    category: "executive",
    audience: ["executive"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "ملف شامل يغطي الرؤية والقيمة والقدرات والحوكمة والقرارات المطلوبة من الإدارة العليا.",
    description_en: "Comprehensive dossier covering vision, value, capabilities, governance, and decisions required from executive management.",
    contentModule: "executive",
    order: 3,
  },
  {
    id: "kpi-framework",
    key: "LIJAN_Business_Value_and_KPI_Framework",
    title_ar: "إطار القيمة ومؤشرات الأداء",
    title_en: "Business Value and KPI Framework",
    category: "executive",
    audience: ["executive"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "إطار قيمة استراتيجية وتشغيلية ورقابية ومعرفية وتقنية ومالية مع مؤشرات أداء قابلة للقياس.",
    description_en: "Strategic, operational, oversight, knowledge, technical, and financial value framework with measurable KPIs.",
    contentModule: "executive",
    order: 4,
  },
  {
    id: "demo-speaker-notes",
    key: "LIJAN_Executive_Demo_and_Speaker_Notes",
    title_ar: "دليل العرض الحي وملاحظات المتحدث",
    title_en: "Executive Demo and Speaker Notes",
    category: "executive",
    audience: ["executive"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "سيناريوهات عرض بمدد مختلفة مع ملاحظات متحدث مفصلة وإجابات للأسئلة الصعبة.",
    description_en: "Demo scenarios of varying durations with detailed speaker notes and answers to difficult questions.",
    contentModule: "executive",
    order: 5,
  },

  // ── 2. Platform & Capabilities ──
  {
    id: "capability-catalogue",
    key: "LIJAN_Platform_Capability_Catalogue",
    title_ar: "دليل قدرات المنصة",
    title_en: "Platform Capability Catalogue",
    category: "platform",
    audience: ["executive", "operations", "it"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "كتالوج شامل لكل مجموعة وظيفية مع الغرض والمستخدمين ومسار العمل والحالة الفعلية.",
    description_en: "Comprehensive catalogue of every functional group with purpose, users, workflow, and actual status.",
    contentModule: "platform",
    order: 6,
  },
  {
    id: "operating-model",
    key: "LIJAN_Operating_Model_and_Governance",
    title_ar: "نموذج التشغيل والحوكمة",
    title_en: "Operating Model and Governance",
    category: "platform",
    audience: ["executive", "operations", "governance"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "نموذج تشغيل وحوكمة المجالس واللجان مع سلسلة السلطة وفصل الواجبات ومصفوفات المسؤولية.",
    description_en: "Councils and committees operating and governance model with authority chain, separation of duties, and responsibility matrices.",
    contentModule: "platform",
    order: 7,
  },

  // ── 3. User Guides ──
  {
    id: "role-guide",
    key: "LIJAN_Role_Based_User_Guide",
    title_ar: "دليل الاستخدام القائم على الأدوار",
    title_en: "Role-Based User Guide",
    category: "userGuides",
    audience: ["operations", "endUsers"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "فصول مستقلة لكل دور مع خطوات العمليات اليومية والأسئلة المتكررة والأخطاء الشائعة.",
    description_en: "Independent chapters for each role with daily operation steps, FAQs, and common mistakes.",
    contentModule: "platform",
    order: 8,
  },

  // ── 4. Operations ──
  {
    id: "system-admin-runbook",
    key: "LIJAN_System_Administration_Runbook",
    title_ar: "دليل إدارة النظام والتشغيل اليومي",
    title_en: "System Administration Runbook",
    category: "operations",
    audience: ["operations", "it"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "دليل تشغيل يومي وأسبوعي وشهر مع إجراءات الإغلاق والأرشفة وجهات الاتصال والتصعيد.",
    description_en: "Daily, weekly, and monthly runbook with closure, archiving procedures, contacts, and escalation.",
    contentModule: "platform",
    order: 9,
  },

  // ── 5. IT Management ──
  {
    id: "it-guide",
    key: "LIJAN_IT_Technical_and_Integration_Guide",
    title_ar: "دليل تقنية المعلومات والتكامل",
    title_en: "IT Technical and Integration Guide",
    category: "it",
    audience: ["it"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "restricted",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "معمارية المنصة والهوية والوصول والتكاملات والبيانات والتشغيل التقني واتفاقيات مستوى الخدمة.",
    description_en: "Platform architecture, identity and access, integrations, data, technical operations, and SLAs.",
    contentModule: "technical",
    order: 10,
  },

  // ── 6. Security & Data ──
  {
    id: "security-guide",
    key: "LIJAN_Security_Privacy_and_Data_Governance",
    title_ar: "الأمن والخصوصية وسيادة البيانات",
    title_en: "Security, Privacy and Data Governance",
    category: "security",
    audience: ["it", "security", "governance"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "restricted",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "نموذج التهديدات ومبادئ الحد الأدنى من الصلاحيات وفصل المؤسسات والتشفير وسجلات التدقيق وسيادة البيانات.",
    description_en: "Threat model, least-privilege principles, tenant separation, encryption, audit logs, and data sovereignty.",
    contentModule: "technical",
    order: 11,
  },

  // ── 7. Implementation & Training ──
  {
    id: "implementation-plan",
    key: "LIJAN_Implementation_Adoption_and_Training_Plan",
    title_ar: "خطة التنفيذ والتبني والتدريب",
    title_en: "Implementation, Adoption and Training Plan",
    category: "implementation",
    audience: ["executive", "operations", "it"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "مراحل الاكتشاف والتهيئة والاختبار والإطلاق المرحلي مع خطة تدريب حسب الدور ومؤشرات التبني.",
    description_en: "Discovery, setup, testing, and phased launch phases with role-based training plan and adoption metrics.",
    contentModule: "technical",
    order: 12,
  },

  // ── 8. Support & Continuity ──
  {
    id: "support-guide",
    key: "LIJAN_Support_Service_and_Business_Continuity",
    title_ar: "الدعم واستمرارية الأعمال",
    title_en: "Support, Service and Business Continuity",
    category: "support",
    audience: ["operations", "it"],
    formats: ["docx", "pdf"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "نموذج الدعم ومستويات الأولوية وإدارة الحوادث والاستمرارية والتعافي من الكوارث ونموذج اتفاقية مستوى الخدمة.",
    description_en: "Support model, priority levels, incident management, continuity, disaster recovery, and SLA template.",
    contentModule: "technical",
    order: 13,
  },

  // ── 9. Templates & Checklists (XLSX) ──
  {
    id: "templates-pack",
    key: "LIJAN_Templates_and_Checklists",
    title_ar: "القوالب وقوائم الفحص",
    title_en: "Templates and Checklists",
    category: "templates",
    audience: ["executive", "operations", "it"],
    formats: ["xlsx"],
    version: "1.0",
    classification: "internal",
    owner: "LIJAN Platform Office",
    status: "approved",
    description_ar: "15 ملف جداول يشمل مصفوفة المسؤوليات والصلاحيات وسجل التكاملات وقاموس البيانات وقوائم الجاهزية.",
    description_en: "15 spreadsheet files including responsibility matrix, permissions, integration log, data dictionary, and readiness checklists.",
    contentModule: "templates",
    isMultiSheet: true,
    order: 14,
  },
];

/**
 * Audience types for role-based views.
 */
export const AUDIENCES = {
  executive: { ar: "الإدارة العليا", en: "Executive Management" },
  operations: { ar: "التشغيل", en: "Operations" },
  it: { ar: "تقنية المعلومات", en: "IT" },
  governance: { ar: "الحوكمة", en: "Governance" },
  security: { ar: "الأمن", en: "Security" },
  endUsers: { ar: "المستخدمون النهائيون", en: "End Users" },
  all: { ar: "الجميع", en: "All" },
};

/**
 * Role-based priority ordering for the hub.
 */
export const ROLE_PRIORITY = {
  executive: [
    "executive-presentation",
    "executive-dossier",
    "kpi-framework",
    "master-index",
    "demo-speaker-notes",
    "capability-catalogue",
    "operating-model",
    "implementation-plan",
  ],
  it: [
    "it-guide",
    "security-guide",
    "templates-pack",
    "system-admin-runbook",
    "implementation-plan",
    "support-guide",
    "capability-catalogue",
    "operating-model",
  ],
  operations: [
    "role-guide",
    "system-admin-runbook",
    "operating-model",
    "capability-catalogue",
    "support-guide",
    "implementation-plan",
  ],
  all: [
    "master-index",
    "executive-presentation",
    "executive-dossier",
    "capability-catalogue",
    "operating-model",
    "role-guide",
    "system-admin-runbook",
    "it-guide",
    "security-guide",
    "implementation-plan",
    "support-guide",
    "kpi-framework",
    "demo-speaker-notes",
    "templates-pack",
  ],
};

/**
 * The official logo URL — used in all generated documents.
 */
export const OFFICIAL_LOGO_URL =
  "https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/268a93442_LijanLogo.png";

/**
 * The intro video URL — used in the executive presentation.
 */
export const INTRO_VIDEO_URL =
  "https://media.base44.com/videos/public/6a96a0e0cd5dac701b62b7f5/f43411a16_Cq91lW4B.mp4";

/**
 * Founder email — always has unrestricted access.
 */
export const FOUNDER_EMAIL = "ahmed.abouhussain@gmail.com";