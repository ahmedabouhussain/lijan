// LIJAN™ Documentation & Executive Pack — release v1.1 (authoritative release module)
// Source of truth: LIJAN_Documentation_and_Executive_Pack_Bilingual_v1.1_2026-10-03.zip
// ZIP SHA-256 (verified before upload): f43ce7ca694af76ffb61ebc0f40a2e1e8cd2a40183460d60fe80c0522884c93b
// Files are held in the app's private file storage; downloads resolve through short-lived signed URLs.
// This module replaces all content of the superseded pack. Do not add content from earlier releases.

export const PACK_RELEASE_V11 = {
  release_id: "LIJAN-DOC-EXEC-PACK-1.1",
  version: "1.1",
  release_date: "2026-10-03",
  supersedes_release_id: "LIJAN-DOC-EXEC-PACK-1.0",
  title_ar: "حزمة الوثائق والمواد التنفيذية",
  title_en: "Documentation & Executive Pack",
  subtitle_ar: "الحزمة المؤسسية الكاملة لمنصة لجان™ — للإدارة العليا والتشغيل وتقنية المعلومات",
  subtitle_en: "The complete institutional pack for LIJAN™ — for executive, operations, and IT",
  classification_ar: "سري — للاستخدام المؤسسي المخول فقط · بدعم من (CONNECTION™)",
  classification_en: "Confidential — Authorized Institutional Use Only · Powered by CONNECTION™",
  release_badge_ar: "الإصدار 1.1 — 3 أكتوبر 2026",
  release_badge_en: "Version 1.1 — 3 October 2026",
  status_note_ar: "مرشح اعتماد مؤسسي؛ ولا يُعد دليلًا على اكتمال التنفيذ أو الاختبار أو القبول.",
  status_note_en: "Institutional approval candidate; this pack is not evidence of completed implementation, testing, or acceptance.",
  zip_filename: "LIJAN_Documentation_and_Executive_Pack_Bilingual_v1.1_2026-10-03.zip",
  zip_mime_type: "application/zip",
  zip_size_bytes: 15056667,
  zip_file_uri: "mp/private/6a96a0e0cd5dac701b62b7f5/0400c0c44_LIJAN_Documentation_and_Executive_Pack_Bilingual_v11_2026-10-03.zip",
  sha256: "f43ce7ca694af76ffb61ebc0f40a2e1e8cd2a40183460d60fe80c0522884c93b",
  total_files: 65,
  word_documents: 24,
  pdf_documents: 26,
  presentations: 2,
  workbooks: 2,
  editions: 2,
  owner: "LIJAN Platform Office",
  classification: "confidential",
};

// Each deliverable mirrors platform_manifest.json (release v1.1).
// files[lang] = [relative path inside the pack, private storage reference]
export const PACK_DELIVERABLES_V11 = [
  {
    deliverable_id: "DOC-01",
    category: "executive_pack",
    title_ar: "الفهرس الرئيسي للوثائق",
    title_en: "Institutional Master Index & Document Governance",
    purpose_ar: "فهرس الوثائق المعتمد: المعرّفات والإصدارات والمالك وحوكمة الحزمة.",
    purpose_en: "Institutional index of record: document identifiers, versions, ownership, and pack governance.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["01_Executive_Pack/Arabic/LIJAN_Master_Document_Index_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/463f49151_LIJAN_Master_Document_Index_AR_v11.docx"],
        ["01_Executive_Pack/Arabic/LIJAN_Master_Document_Index_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/4254dd1e5_LIJAN_Master_Document_Index_AR_v11.pdf"],
      ],
      en: [
        ["01_Executive_Pack/English/LIJAN_Master_Document_Index_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/b5b18b34f_LIJAN_Master_Document_Index_EN_v11.docx"],
        ["01_Executive_Pack/English/LIJAN_Master_Document_Index_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/463d621b4_LIJAN_Master_Document_Index_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-02",
    category: "executive_pack",
    title_ar: "الملف التنفيذي للمنصة الوطنية",
    title_en: "Executive Dossier for the National LIJAN Platform",
    purpose_ar: "الملف التنفيذي للمنصة الوطنية لجان™ لجلسات القرار القيادي.",
    purpose_en: "The executive dossier for the national LIJAN platform, for leadership decision sessions.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Platform_Dossier_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/3dcc1f205_LIJAN_Executive_Platform_Dossier_AR_v11.docx"],
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Platform_Dossier_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/89c3acd20_LIJAN_Executive_Platform_Dossier_AR_v11.pdf"],
      ],
      en: [
        ["01_Executive_Pack/English/LIJAN_Executive_Platform_Dossier_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/642277cec_LIJAN_Executive_Platform_Dossier_EN_v11.docx"],
        ["01_Executive_Pack/English/LIJAN_Executive_Platform_Dossier_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/56eeb19f8_LIJAN_Executive_Platform_Dossier_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-03",
    category: "executive_pack",
    title_ar: "إطار القيمة العامة ومؤشرات الأداء والأثر",
    title_en: "Public Value, KPI & Impact Framework",
    purpose_ar: "إطار القيمة العامة ومؤشرات الأداء والأثر لقياس النتائج المؤسسية.",
    purpose_en: "Public value, KPI, and impact framework for measuring institutional outcomes.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["01_Executive_Pack/Arabic/LIJAN_Business_Value_and_KPI_Framework_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/4f55f7946_LIJAN_Business_Value_and_KPI_Framework_AR_v11.docx"],
        ["01_Executive_Pack/Arabic/LIJAN_Business_Value_and_KPI_Framework_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/7bb89a80f_LIJAN_Business_Value_and_KPI_Framework_AR_v11.pdf"],
      ],
      en: [
        ["01_Executive_Pack/English/LIJAN_Business_Value_and_KPI_Framework_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/a823072cb_LIJAN_Business_Value_and_KPI_Framework_EN_v11.docx"],
        ["01_Executive_Pack/English/LIJAN_Business_Value_and_KPI_Framework_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/888ae7366_LIJAN_Business_Value_and_KPI_Framework_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-04",
    category: "executive_pack",
    title_ar: "سيناريو العرض التنفيذي وملاحظات المتحدث",
    title_en: "Executive Demo Storyline & Speaker Notes",
    purpose_ar: "سيناريو العرض التنفيذي مع ملاحظات المتحدث للعرض الموجّه.",
    purpose_en: "Executive demo storyline with speaker notes for guided presentation.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Demo_and_Speaker_Notes_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/5a307cf56_LIJAN_Executive_Demo_and_Speaker_Notes_AR_v11.docx"],
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Demo_and_Speaker_Notes_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/008e04413_LIJAN_Executive_Demo_and_Speaker_Notes_AR_v11.pdf"],
      ],
      en: [
        ["01_Executive_Pack/English/LIJAN_Executive_Demo_and_Speaker_Notes_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/9b0287d65_LIJAN_Executive_Demo_and_Speaker_Notes_EN_v11.docx"],
        ["01_Executive_Pack/English/LIJAN_Executive_Demo_and_Speaker_Notes_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/fa13e66ac_LIJAN_Executive_Demo_and_Speaker_Notes_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-05",
    category: "executive_pack",
    title_ar: "العرض التنفيذي الوطني",
    title_en: "National Executive Presentation",
    purpose_ar: "العرض التنفيذي الوطني للإحاطات الرسمية.",
    purpose_en: "The national executive presentation deck for formal briefings.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Presentation_AR_v1.1.pptx", "mp/private/6a96a0e0cd5dac701b62b7f5/675417025_LIJAN_Executive_Presentation_AR_v11.pptx"],
        ["01_Executive_Pack/Arabic/LIJAN_Executive_Presentation_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/692100923_LIJAN_Executive_Presentation_AR_v11.pdf"],
      ],
      en: [
        ["01_Executive_Pack/English/LIJAN_Executive_Presentation_EN_v1.1.pptx", "mp/private/6a96a0e0cd5dac701b62b7f5/8258af5d6_LIJAN_Executive_Presentation_EN_v11.pptx"],
        ["01_Executive_Pack/English/LIJAN_Executive_Presentation_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/a0d7b32f7_LIJAN_Executive_Presentation_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-06",
    category: "platform_capabilities",
    title_ar: "كتالوج القدرات المؤسسية لمنصة لجان",
    title_en: "LIJAN Institutional Capability Catalogue",
    purpose_ar: "كتالوج القدرات المؤسسية لمنصة لجان: ما تقدمه المنصة.",
    purpose_en: "LIJAN institutional capability catalogue: what the platform provides.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["02_Platform_Capabilities/Arabic/LIJAN_Platform_Capability_Catalogue_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/890b35cea_LIJAN_Platform_Capability_Catalogue_AR_v11.docx"],
        ["02_Platform_Capabilities/Arabic/LIJAN_Platform_Capability_Catalogue_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/214154ec7_LIJAN_Platform_Capability_Catalogue_AR_v11.pdf"],
      ],
      en: [
        ["02_Platform_Capabilities/English/LIJAN_Platform_Capability_Catalogue_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/11f0eb638_LIJAN_Platform_Capability_Catalogue_EN_v11.docx"],
        ["02_Platform_Capabilities/English/LIJAN_Platform_Capability_Catalogue_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/779c84f0c_LIJAN_Platform_Capability_Catalogue_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-07",
    category: "operating_model",
    title_ar: "نموذج التشغيل والحوكمة الوطنية",
    title_en: "National Operating Model & Governance",
    purpose_ar: "نموذج التشغيل والحوكمة الوطنية: تنفيذ اتحادي تحت حوكمة مركزية.",
    purpose_en: "National operating model and governance: federated execution under central governance.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["03_Operating_Model/Arabic/LIJAN_Operating_Model_and_Governance_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/f0b235a2e_LIJAN_Operating_Model_and_Governance_AR_v11.docx"],
        ["03_Operating_Model/Arabic/LIJAN_Operating_Model_and_Governance_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/027d2f20f_LIJAN_Operating_Model_and_Governance_AR_v11.pdf"],
      ],
      en: [
        ["03_Operating_Model/English/LIJAN_Operating_Model_and_Governance_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/3b8146598_LIJAN_Operating_Model_and_Governance_EN_v11.docx"],
        ["03_Operating_Model/English/LIJAN_Operating_Model_and_Governance_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/0919047cb_LIJAN_Operating_Model_and_Governance_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-08",
    category: "user_guides",
    title_ar: "دليل المستخدم المبني على الأدوار",
    title_en: "Role-Based User Guide",
    purpose_ar: "دليل المستخدم المبني على الأدوار لأدوار اللجان والاستخدام اليومي.",
    purpose_en: "Role-based user guide covering committee roles and daily use.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["04_User_Guides/Arabic/LIJAN_Role_Based_User_Guide_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/89dab29b1_LIJAN_Role_Based_User_Guide_AR_v11.docx"],
        ["04_User_Guides/Arabic/LIJAN_Role_Based_User_Guide_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/9d04661d8_LIJAN_Role_Based_User_Guide_AR_v11.pdf"],
      ],
      en: [
        ["04_User_Guides/English/LIJAN_Role_Based_User_Guide_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/1b3b58424_LIJAN_Role_Based_User_Guide_EN_v11.docx"],
        ["04_User_Guides/English/LIJAN_Role_Based_User_Guide_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/c2d85e50d_LIJAN_Role_Based_User_Guide_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-09",
    category: "user_guides",
    title_ar: "دليل إدارة النظام والعمليات",
    title_en: "System Administration & Operations Runbook",
    purpose_ar: "دليل إدارة النظام والعمليات للمسؤولين.",
    purpose_en: "System administration and operations runbook for administrators.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["04_User_Guides/Arabic/LIJAN_System_Administration_Runbook_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/b2b3b59dd_LIJAN_System_Administration_Runbook_AR_v11.docx"],
        ["04_User_Guides/Arabic/LIJAN_System_Administration_Runbook_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/ee8f017b5_LIJAN_System_Administration_Runbook_AR_v11.pdf"],
      ],
      en: [
        ["04_User_Guides/English/LIJAN_System_Administration_Runbook_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/e33718eca_LIJAN_System_Administration_Runbook_EN_v11.docx"],
        ["04_User_Guides/English/LIJAN_System_Administration_Runbook_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/3cad4b6c2_LIJAN_System_Administration_Runbook_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-10",
    category: "it_integration",
    title_ar: "دليل العمارة التقنية والتكامل",
    title_en: "IT Technical Architecture & Integration Guide",
    purpose_ar: "دليل العمارة التقنية والتكامل للفرق التقنية.",
    purpose_en: "IT technical architecture and integration guide for technical teams.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["05_IT_and_Integration/Arabic/LIJAN_IT_Technical_and_Integration_Guide_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/e33b579a2_LIJAN_IT_Technical_and_Integration_Guide_AR_v11.docx"],
        ["05_IT_and_Integration/Arabic/LIJAN_IT_Technical_and_Integration_Guide_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/c75b1e5c1_LIJAN_IT_Technical_and_Integration_Guide_AR_v11.pdf"],
      ],
      en: [
        ["05_IT_and_Integration/English/LIJAN_IT_Technical_and_Integration_Guide_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/d56cce44f_LIJAN_IT_Technical_and_Integration_Guide_EN_v11.docx"],
        ["05_IT_and_Integration/English/LIJAN_IT_Technical_and_Integration_Guide_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/761abe41e_LIJAN_IT_Technical_and_Integration_Guide_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-11",
    category: "security_data",
    title_ar: "الأمن والخصوصية وحوكمة البيانات",
    title_en: "Security, Privacy & Data Governance Framework",
    purpose_ar: "إطار الأمن والخصوصية وحوكمة البيانات، بما يشمل التصنيف والاحتفاظ.",
    purpose_en: "Security, privacy, and data governance framework, including classification and retention.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["06_Security_and_Data/Arabic/LIJAN_Security_Privacy_and_Data_Governance_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/01915e4fd_LIJAN_Security_Privacy_and_Data_Governance_AR_v11.docx"],
        ["06_Security_and_Data/Arabic/LIJAN_Security_Privacy_and_Data_Governance_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/75ad00931_LIJAN_Security_Privacy_and_Data_Governance_AR_v11.pdf"],
      ],
      en: [
        ["06_Security_and_Data/English/LIJAN_Security_Privacy_and_Data_Governance_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/4ab46a2cd_LIJAN_Security_Privacy_and_Data_Governance_EN_v11.docx"],
        ["06_Security_and_Data/English/LIJAN_Security_Privacy_and_Data_Governance_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/85e5a9dd1_LIJAN_Security_Privacy_and_Data_Governance_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-12",
    category: "implementation_training",
    title_ar: "خطة التنفيذ والتبني وبناء القدرات",
    title_en: "Implementation, Adoption & Capability-Building Plan",
    purpose_ar: "خطة التنفيذ والتبني وبناء القدرات للطرح الوطني.",
    purpose_en: "Implementation, adoption, and capability-building plan for national rollout.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["07_Implementation_and_Training/Arabic/LIJAN_Implementation_Adoption_and_Training_Plan_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/a76147789_LIJAN_Implementation_Adoption_and_Training_Plan_AR_v11.docx"],
        ["07_Implementation_and_Training/Arabic/LIJAN_Implementation_Adoption_and_Training_Plan_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/523b0eb8c_LIJAN_Implementation_Adoption_and_Training_Plan_AR_v11.pdf"],
      ],
      en: [
        ["07_Implementation_and_Training/English/LIJAN_Implementation_Adoption_and_Training_Plan_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/73e8ea41e_LIJAN_Implementation_Adoption_and_Training_Plan_EN_v11.docx"],
        ["07_Implementation_and_Training/English/LIJAN_Implementation_Adoption_and_Training_Plan_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/f54d91d57_LIJAN_Implementation_Adoption_and_Training_Plan_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-13",
    category: "support_continuity",
    title_ar: "الدعم وإدارة الخدمة واستمرارية الأعمال",
    title_en: "Support, Service Management & Business Continuity Model",
    purpose_ar: "نموذج الدعم وإدارة الخدمة واستمرارية الأعمال.",
    purpose_en: "Support, service management, and business continuity model.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["08_Support_and_Continuity/Arabic/LIJAN_Support_Service_and_Business_Continuity_AR_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/8ba978d76_LIJAN_Support_Service_and_Business_Continuity_AR_v11.docx"],
        ["08_Support_and_Continuity/Arabic/LIJAN_Support_Service_and_Business_Continuity_AR_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/1273fa734_LIJAN_Support_Service_and_Business_Continuity_AR_v11.pdf"],
      ],
      en: [
        ["08_Support_and_Continuity/English/LIJAN_Support_Service_and_Business_Continuity_EN_v1.1.docx", "mp/private/6a96a0e0cd5dac701b62b7f5/01bbc38f1_LIJAN_Support_Service_and_Business_Continuity_EN_v11.docx"],
        ["08_Support_and_Continuity/English/LIJAN_Support_Service_and_Business_Continuity_EN_v1.1.pdf", "mp/private/6a96a0e0cd5dac701b62b7f5/90313f546_LIJAN_Support_Service_and_Business_Continuity_EN_v11.pdf"],
      ],
    },
  },
  {
    deliverable_id: "DOC-14",
    category: "templates_checklists",
    title_ar: "القوالب التشغيلية وقوائم الجاهزية والقبول",
    title_en: "Operational Templates, Readiness & Acceptance Registers",
    purpose_ar: "القوالب التشغيلية وسجلات الجاهزية وقوائم القبول.",
    purpose_en: "Operational templates, readiness registers, and acceptance checklists.",
    version: "1.1",
    classification: "confidential",
    owner: "LIJAN Platform Office",
    files: {
      ar: [
        ["09_Templates_and_Checklists/Arabic/LIJAN_Templates_and_Checklists_AR_v1.1.xlsx", "mp/private/6a96a0e0cd5dac701b62b7f5/8dfcaaf54_LIJAN_Templates_and_Checklists_AR_v11.xlsx"],
      ],
      en: [
        ["09_Templates_and_Checklists/English/LIJAN_Templates_and_Checklists_EN_v1.1.xlsx", "mp/private/6a96a0e0cd5dac701b62b7f5/a5e8635a2_LIJAN_Templates_and_Checklists_EN_v11.xlsx"],
      ],
    },
  },
];