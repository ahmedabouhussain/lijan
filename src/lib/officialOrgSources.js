// LIJAN™ — the sanctioned source list for institutional identity assets.
//
// These are the ONLY publishers an institutional mark may be imported from. The server
// re-validates every import against the same policy (base44/shared/orgAssetIntake.ts), so this
// list is the operator's guide — never the enforcement point.
//
// The Qatari Government Brand Assets portal is the first stop for national identity assets.

export const GOVERNMENT_BRAND_ASSETS_URL = "https://gba.gco.gov.qa/";

export const OFFICIAL_ORG_SOURCES = [
  { key: "moci", name_ar: "وزارة التجارة والصناعة", name_en: "Ministry of Commerce and Industry", site: "https://www.moci.gov.qa/", asset: "https://www.moci.gov.qa/sites/default/files/2026-05/logo-main.svg" },
  { key: "minister", name_ar: "صفحة الوزير الرسمية", name_en: "Minister Profile", site: "https://www.moci.gov.qa/en/minister", asset: null },
  { key: "qcb", name_ar: "مصرف قطر المركزي", name_en: "Qatar Central Bank", site: "https://www.qcb.gov.qa/", asset: "https://www.qcb.gov.qa/assets/img/logo.svg" },
  { key: "qdb", name_ar: "بنك قطر للتنمية", name_en: "Qatar Development Bank", site: "https://www.qdb.qa/", asset: null },
  { key: "cb", name_ar: "مركز قطر للمعلومات الائتمانية", name_en: "Qatar Credit Bureau", site: "https://www.cb.gov.qa/", asset: null },
  { key: "qrdi", name_ar: "مجلس قطر للبحوث والتطوير والابتكار", name_en: "QRDI Council", site: "https://qrdi.org.qa/", asset: "https://qrdi.org.qa/Portals/0/QRDI%20Logo_Master%201.svg" },
  { key: "npc", name_ar: "المجلس الوطني للتخطيط", name_en: "National Planning Council", site: "https://www.npc.qa/", asset: "https://www.npc.qa/Style%20Library/NPC/images/npc-site-logo.svg" },
  { key: "mol", name_ar: "وزارة العمل", name_en: "Ministry of Labour", site: "https://www.mol.gov.qa/", asset: null },
  { key: "mcit", name_ar: "وزارة الاتصالات وتكنولوجيا المعلومات", name_en: "Ministry of Communications and Information Technology", site: "https://www.mcit.gov.qa/", asset: null },
  { key: "mof", name_ar: "وزارة المالية", name_en: "Ministry of Finance", site: "https://www.mof.gov.qa/", asset: null },
  { key: "qia", name_ar: "جهاز قطر للاستثمار", name_en: "Qatar Investment Authority", site: "https://www.qia.qa/", asset: "https://www.qia.qa/Resources/QIA-Logo.svg" },
  { key: "qfc", name_ar: "مركز قطر للمال", name_en: "Qatar Financial Centre", site: "https://www.qfc.qa/", asset: "https://www.qfc.qa/_QFC_Assets/assets/images/QFC-logo.svg" },
  { key: "qstp", name_ar: "واحة قطر للعلوم والتكنولوجيا", name_en: "Qatar Science & Technology Park", site: "https://qstp.qa/", asset: null },
  { key: "invest", name_ar: "استثمر قطر", name_en: "Invest Qatar", site: "https://www.invest.qa/", asset: "https://www.invest.qa/assets/front/theme/images/page-logo.svg" },
  { key: "qvca", name_ar: "جمعية كيو لرأس المال الاستثماري", name_en: "QVenture Capital Association", site: "https://www.qvca.co/", asset: null },
];

export const ASSET_VERIFICATION_LABELS = {
  pending_review: { ar: "بانتظار المراجعة", en: "Pending review", color: "text-amber-700 bg-amber-50" },
  approved: { ar: "معتمد", en: "Approved", color: "text-emerald-700 bg-emerald-50" },
  rejected: { ar: "مرفوض", en: "Rejected", color: "text-destructive bg-red-50" },
  inactive: { ar: "معطّل", en: "Inactive", color: "text-muted-foreground bg-secondary" },
};