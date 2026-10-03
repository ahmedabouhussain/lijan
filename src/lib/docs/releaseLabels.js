// Presentation labels for the Documentation & Executive Pack page.
// Values shown on the page come from the release records; labels live here.

export const CATEGORY_LABELS = {
  executive_pack: { ar: "الحزمة التنفيذية", en: "Executive Pack", order: 1 },
  platform_capabilities: { ar: "قدرات المنصة", en: "Platform Capabilities", order: 2 },
  operating_model: { ar: "نموذج التشغيل", en: "Operating Model", order: 3 },
  user_guides: { ar: "أدلة المستخدم", en: "User Guides", order: 4 },
  it_integration: { ar: "تقنية المعلومات والتكامل", en: "IT & Integration", order: 5 },
  security_data: { ar: "الأمن والبيانات", en: "Security & Data", order: 6 },
  implementation_training: { ar: "التنفيذ والتدريب", en: "Implementation & Training", order: 7 },
  support_continuity: { ar: "الدعم والاستمرارية", en: "Support & Continuity", order: 8 },
  templates_checklists: { ar: "القوالب وقوائم التحقق", en: "Templates & Checklists", order: 9 },
};

export const CATEGORY_ORDER = Object.entries(CATEGORY_LABELS)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key);

export const FORMAT_LABELS = {
  docx: "DOCX",
  pdf: "PDF",
  pptx: "PPTX",
  xlsx: "XLSX",
  zip: "ZIP",
};

// Approved classification wording for document records (mirrors the pack classification statement).
export const CLASSIFICATION_LABELS = {
  public: { ar: "عام", en: "Public" },
  internal: { ar: "داخلي", en: "Internal" },
  confidential: { ar: "سري", en: "Confidential" },
  restricted: { ar: "مقيد", en: "Restricted" },
  highly_restricted: { ar: "سري للغاية", en: "Highly Restricted" },
};

// Verified release indicators — Arabic figures stay Latin per the institutional standard.
export const SUMMARY_INDICATORS = [
  { key: "total_files", ar: "إجمالي الملفات في الحزمة", en: "Total packaged files" },
  { key: "word_documents", ar: "وثائق Word قابلة للتحرير", en: "Editable Word documents" },
  { key: "pdf_documents", ar: "وثائق PDF للأرشفة", en: "Archival PDF documents" },
  { key: "presentations", ar: "عروض تنفيذية", en: "Executive presentations" },
  { key: "workbooks", ar: "مصنفات تشغيلية", en: "Operational workbooks" },
  { flag: "editions", ar: "نسختان مستقلتان: العربية والإنجليزية", en: "Arabic and English editions" },
  { flag: "pdfa", ar: "توافق الأرشفة PDF/A-2B", en: "PDF/A-2B archival compliance" },
  { flag: "searchable", ar: "نص عربي قابل للبحث والتحديد", en: "Searchable and selectable Arabic text" },
  { flag: "fonts", ar: "خطوط مضمَّنة في الوثائق", en: "Embedded fonts" },
  { flag: "qa", ar: "تقرير ضمان الجودة مرفق بالحزمة", en: "Quality assurance report included" },
];

// Quality and compliance panel — statements confirmed by the pack's own quality assurance report.
export const QUALITY_POINTS = [
  {
    ar: "طُبِّق معيار الخط العربي: Noto Naskh Arabic بوزن Regular 400 و Bold 700.",
    en: "Arabic typography standard applied: Noto Naskh Arabic, Regular 400 and Bold 700.",
  },
  {
    ar: "الخطوط مضمَّنة في ملفات Word والعروض والملفات المصدَّرة كـ PDF.",
    en: "Fonts embedded in the Word files, presentations, and exported PDFs.",
  },
  {
    ar: "تتضمن الحزمة وثائق PDF/A-2B معتمدة للأرشفة.",
    en: "PDF/A-2B archival documents are included in the pack.",
  },
  {
    ar: "نصوص ملفات PDF قابلة للبحث والتحديد.",
    en: "PDF text is searchable and selectable.",
  },
  {
    ar: "روجعت جودة الشعارات وتخطيط الصفحات والجداول.",
    en: "Logo, layout, and table quality reviewed.",
  },
  {
    ar: "تم التحقق من الاتجاه العربي (RTL) والاتجاه الإنجليزي (LTR).",
    en: "Arabic (RTL) and English (LTR) direction verified.",
  },
  {
    ar: "تقرير ضمان الجودة مرفق داخل الحزمة.",
    en: "Quality assurance report included in the pack.",
  },
];