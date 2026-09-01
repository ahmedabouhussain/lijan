// قائمة الجهات القطرية المشتركة على منصة رَقِيم™
// Qatari Entities Registry — Government, Semi-Government, Holding Companies
// Bilingual (Arabic / English) — Business & Government language

export const ENTITY_CATEGORIES = {
  ministry: {
    ar: "الوزارات والمجالس العليا",
    en: "Ministries & Supreme Councils",
  },
  authority: {
    ar: "الهيئات والأجهزة الحكومية",
    en: "Government Authorities & Bodies",
  },
  semi_government: {
    ar: "المؤسسات شبه الحكومية",
    en: "Semi-Government Institutions",
  },
  holding: {
    ar: "الشركات القابضة المملوكة للدولة",
    en: "State-Owned Holding Companies",
  },
  judicial: {
    ar: "الجهات القضائية والتنظيمية",
    en: "Judicial & Regulatory Bodies",
  },
};

export const QATARI_ENTITIES = [
  // === Ministries & Supreme Councils ===
  { id: "diwan", ar: "الديوان الأميري", en: "Amiri Diwan", category: "ministry" },
  { id: "cabinet", ar: "مجلس الوزراء", en: "Council of Ministers", category: "ministry" },
  { id: "mofa", ar: "وزارة الخارجية", en: "Ministry of Foreign Affairs", category: "ministry" },
  { id: "moi", ar: "وزارة الداخلية", en: "Ministry of Interior", category: "ministry" },
  { id: "mod", ar: "وزارة الدفاع", en: "Ministry of Defense", category: "ministry" },
  { id: "mof", ar: "وزارة المالية", en: "Ministry of Finance", category: "ministry" },
  { id: "moj", ar: "وزارة العدل", en: "Ministry of Justice", category: "ministry" },
  { id: "moe", ar: "وزارة التربية والتعليم", en: "Ministry of Education and Higher Education", category: "ministry" },
  { id: "moph", ar: "وزارة الصحة العامة", en: "Ministry of Public Health", category: "ministry" },
  { id: "mom", ar: "وزارة البلدية", en: "Ministry of Municipality", category: "ministry" },
  { id: "moecc", ar: "وزارة البيئة والتغير المناخي", en: "Ministry of Environment and Climate Change", category: "ministry" },
  { id: "mol", ar: "وزارة العمل", en: "Ministry of Labour", category: "ministry" },
  { id: "moci", ar: "وزارة التجارة والصناعة", en: "Ministry of Commerce and Industry", category: "ministry" },
  { id: "moc", ar: "وزارة الثقافة", en: "Ministry of Culture", category: "ministry" },
  { id: "mot", ar: "وزارة المواصلات", en: "Ministry of Transport", category: "ministry" },
  { id: "mcit", ar: "وزارة الاتصالات وتكنولوجيا المعلومات", en: "Ministry of Communications and Information Technology", category: "ministry" },
  { id: "mdps", ar: "وزارة التخطيط التنموي والإحصاء", en: "Ministry of Development Planning and Statistics", category: "ministry" },
  { id: "moeia", ar: "وزارة الأوقاف والشؤون الإسلامية", en: "Ministry of Endowments and Islamic Affairs", category: "ministry" },
  { id: "moe_energy", ar: "وزارة الطاقة", en: "Ministry of Energy", category: "ministry" },
  { id: "mohup", ar: "وزارة الإسكان والتخطيط العمراني", en: "Ministry of Housing and Urban Planning", category: "ministry" },
  { id: "moys", ar: "وزارة الشباب والرياضة", en: "Ministry of Youth and Sports", category: "ministry" },
  { id: "scmc", ar: "المجلس البلدي المركزي", en: "Central Municipal Council", category: "ministry" },

  // === Government Authorities & Bodies ===
  { id: "gac", ar: "الهيئة العامة للجمارك", en: "General Authority of Customs", category: "authority" },
  { id: "gta", ar: "الهيئة العامة للضرائب", en: "General Tax Authority", category: "authority" },
  { id: "grsia", ar: "الهيئة العامة للتقاعد والتأمينات الاجتماعية", en: "General Retirement and Social Insurance Authority", category: "authority" },
  { id: "qcaa", ar: "الهيئة القطرية للطيران المدني", en: "Qatar Civil Aviation Authority", category: "authority" },
  { id: "qia", ar: "جهاز قطر للاستثمار", en: "Qatar Investment Authority", category: "authority" },
  { id: "ashghal", ar: "الهيئة العامة للأشغال", en: "Public Works Authority (Ashghal)", category: "authority" },
  { id: "kahramaa", ar: "الهيئة العامة للكهرباء والماء (كهرماء)", en: "Qatar General Electricity & Water Corporation (Kahramaa)", category: "authority" },
  { id: "ictqatar", ar: "المجلس الأعلى للاتصالات وتكنولوجيا المعلومات", en: "Supreme Council of Information and Communication Technology (ictQATAR)", category: "authority" },
  { id: "qgsm", ar: "الهيئة القطرية للمواصفات القياسية والتقييس", en: "Qatar General Organization for Standards and Metrology", category: "authority" },
  { id: "qfma", ar: "الهيئة القطرية للأسواق المالية", en: "Qatar Financial Markets Authority", category: "authority" },
  { id: "qsa", ar: "جهاز قطر للإحصاء", en: "Planning and Statistics Authority", category: "authority" },
  { id: "qta", ar: "الهيئة العامة للسياحة", en: "Qatar Tourism Authority", category: "authority" },
  { id: "qpa", ar: "الهيئة العامة للموانئ (موانئ قطر)", en: "Mwani Qatar (Qatar Ports)", category: "authority" },
  { id: "qupda", ar: "الهيئة العامة للتنظيم الحضري", en: "Qatar Urban Planning and Development Authority", category: "authority" },
  { id: "qpa_security", ar: "جهاز قطر للأمن الوطني", en: "Qatar State Security", category: "authority" },
  { id: "lhkwiya", ar: "جهاز قطر للأمن الداخلي (لخويا)", en: "Lekhwiya (Internal Security Force)", category: "authority" },

  // === Semi-Government Institutions ===
  { id: "qf", ar: "مؤسسة قطر للتربية والعلوم وتنمية المجتمع", en: "Qatar Foundation", category: "semi_government" },
  { id: "hmc", ar: "مؤسسة حمد الطبية", en: "Hamad Medical Corporation", category: "semi_government" },
  { id: "phcc", ar: "مؤسسة الرعاية الصحية الأولية", en: "Primary Health Care Corporation", category: "semi_government" },
  { id: "qmc", ar: "مؤسسة قطر للإعلام", en: "Qatar Media Corporation", category: "semi_government" },
  { id: "qna", ar: "وكالة قطر للأنباء", en: "Qatar News Agency", category: "semi_government" },
  { id: "qm", ar: "مؤسسة قطر للمتاحف", en: "Qatar Museums", category: "semi_government" },
  { id: "qsf", ar: "مؤسسة قطر للتنمية الاجتماعية", en: "Qatar Social Development Foundation", category: "semi_government" },
  { id: "qswf", ar: "مؤسسة قطر لحماية النزاهة", en: "Administrative Control and Transparency Authority", category: "semi_government" },
  { id: "nhri", ar: "المؤسسة الوطنية لحقوق الإنسان", en: "National Human Rights Committee", category: "semi_government" },
  { id: "qatar_charity", ar: "مؤسسة قطر للأعمال الخيرية", en: "Qatar Charity", category: "semi_government" },
  { id: "rdf", ar: "صندوق قطر للتنمية", en: "Qatar Development Fund", category: "semi_government" },
  { id: "qstc", ar: "مؤسسة قطر للعلوم والتكنولوجيا", en: "Qatar Science and Technology Park", category: "semi_government" },
  { id: "qnrf", ar: "صندوق قطر الوطني للبحث العلمي", en: "Qatar National Research Fund", category: "semi_government" },
  { id: "eaa", ar: "مؤسسة تعليم فوق الجميع", en: "Education Above All Foundation", category: "semi_government" },

  // === State-Owned Holding Companies ===
  { id: "qatarenergy", ar: "قطر للطاقة", en: "QatarEnergy", category: "holding" },
  { id: "qatargas", ar: "قطر للغاز", en: "QatarEnergy LNG", category: "holding" },
  { id: "qapco", ar: "قطر للبتروكيماويات", en: "Qatar Petrochemical Company (Qapco)", category: "holding" },
  { id: "qsteel", ar: "قطر للصلب", en: "Qatar Steel", category: "holding" },
  { id: "qatalum", ar: "قطر للألمنيوم", en: "Qatalum", category: "holding" },
  { id: "qncc", ar: "شركة قطر الوطنية للإسمنت", en: "Qatar National Cement Company", category: "holding" },
  { id: "qatar_airways", ar: "قطر للطيران", en: "Qatar Airways", category: "holding" },
  { id: "ooredoo", ar: "أوريدو", en: "Ooredoo", category: "holding" },
  { id: "vodafone_qatar", ar: "اتصالات قطر (فودافون قطر)", en: "Vodafone Qatar", category: "holding" },
  { id: "nakilat", ar: "قطر للملاحة (ناقلات)", en: "Nakilat", category: "holding" },
  { id: "mwani", ar: "موانئ قطر", en: "Mwani Qatar", category: "holding" },
  { id: "qnb", ar: "بنك قطر الوطني", en: "Qatar National Bank (QNB Group)", category: "holding" },
  { id: "qdb", ar: "بنك قطر للتنمية", en: "Qatar Development Bank", category: "holding" },
  { id: "qic", ar: "شركة قطر للتأمين", en: "Qatar Insurance Company", category: "holding" },
  { id: "qatar_holding", ar: "قطر القابضة", en: "Qatar Holding", category: "holding" },
  { id: "barwa", ar: "شركة بروة العقارية", en: "Barwa Real Estate", category: "holding" },
  { id: "diar", ar: "شركة الديار القطرية العقارية", en: "Qatar Diar", category: "holding" },
  { id: "ezdan", ar: "مجموعة إزدان القابضة", en: "Ezdan Holding Group", category: "holding" },
  { id: "qatar_rail", ar: "شركة قطر للسكك الحديدية", en: "Qatar Rail", category: "holding" },
  { id: "qpmc", ar: "شركة قطر للكيبلات", en: "Qatar National Broadband Network", category: "holding" },

  // === Judicial & Regulatory Bodies ===
  { id: "judiciary", ar: "المجلس الأعلى للقضاء", en: "Supreme Judiciary Council", category: "judicial" },
  { id: "prosecution", ar: "النيابة العامة", en: "Public Prosecution", category: "judicial" },
  { id: "qfc", ar: "مركز قطر المالي", en: "Qatar Financial Centre", category: "judicial" },
  { id: "qfcra", ar: "هيئة تنظيم مركز قطر المالي", en: "Qatar Financial Centre Regulatory Authority", category: "judicial" },
  { id: "cma", ar: "هيئة تنظيم المنشآت المالية", en: "Qatar Financial Markets Authority", category: "judicial" },
  { id: "qcb", ar: "مصرف قطر المركزي", en: "Qatar Central Bank", category: "judicial" },
  { id: "competition", ar: "هيئة حماية المنافسة", en: "Competition Protection Authority", category: "judicial" },
  { id: "consumer", ar: "هيئة حماية المستهلك", en: "Consumer Protection Department", category: "judicial" },
];

// Helper: get entities grouped by category for dropdown
export function getEntitiesByCategory() {
  const grouped = {};
  for (const cat of Object.keys(ENTITY_CATEGORIES)) {
    grouped[cat] = QATARI_ENTITIES.filter((e) => e.category === cat);
  }
  return grouped;
}

// Helper: find entity by id
export function findEntity(id) {
  return QATARI_ENTITIES.find((e) => e.id === id);
}