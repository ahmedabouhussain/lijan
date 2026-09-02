// قائمة الجهات القطرية المشتركة على منصة لِجان™
// Qatari Entities Registry — Government, Semi-Government, Holding Companies,
// Banks, Insurance, Private/Family Groups
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
    ar: "الشركات القابضة والكيانات الحكومية",
    en: "Holding Companies & State Entities",
  },
  bank: {
    ar: "البنوك والمؤسسات المالية",
    en: "Banks & Financial Institutions",
  },
  insurance: {
    ar: "شركات التأمين",
    en: "Insurance Companies",
  },
  private: {
    ar: "المجموعات العائلية والشركات الخاصة",
    en: "Family Groups & Private Companies",
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
  { id: "shura", ar: "مجلس الشورى", en: "Shura Council", category: "ministry" },
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
  { id: "qfza", ar: "هيئة قطر للمناطق الحرة", en: "Qatar Free Zones Authority", category: "authority" },
  { id: "qchamber", ar: "غرفة قطر للتجارة والصناعة", en: "Qatar Chamber of Commerce and Industry", category: "authority" },
  { id: "acta", ar: "هيئة تنظيم المنشآت السياحية", en: "Astrolabe (Tourism Regulatory Authority)", category: "authority" },
  { id: "qsl", ar: "هيئة قطر للسلامة والتراخيص", en: "Qatar Safety and Licensing Authority", category: "authority" },

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
  { id: "qrc", ar: "الهلال الأحمر القطري", en: "Qatar Red Crescent Society", category: "semi_government" },
  { id: "aspire", ar: "أكاديمية التفوق الرياضي (أسباير)", en: "Aspire Academy", category: "semi_government" },
  { id: "qsi", ar: "قطر للاستثمارات الرياضية", en: "Qatar Sports Investments", category: "semi_government" },
  { id: "aspetar", ar: "أسبتار للطب الرياضي", en: "Aspetar (Sports Medicine Hospital)", category: "semi_government" },
  { id: "qncc", ar: "مركز قطر الوطني للمؤتمرات", en: "Qatar National Convention Centre", category: "semi_government" },
  { id: "qosm", ar: "متحف 3-2-1 الأولمبي والرياضي القطري", en: "3-2-1 Qatar Olympic and Sports Museum", category: "semi_government" },
  { id: "difi", ar: "معهد الدوحة الدولي للأسرة", en: "Doha International Family Institute", category: "semi_government" },

  // === Holding Companies & State Entities ===
  { id: "qatarenergy", ar: "قطر للطاقة", en: "QatarEnergy", category: "holding" },
  { id: "qatargas", ar: "قطر للغاز", en: "QatarEnergy LNG", category: "holding" },
  { id: "qapco", ar: "قطر للبتروكيماويات", en: "Qatar Petrochemical Company (Qapco)", category: "holding" },
  { id: "qsteel", ar: "قطر للصلب", en: "Qatar Steel", category: "holding" },
  { id: "qatalum", ar: "قطر للألمنيوم", en: "Qatalum", category: "holding" },
  { id: "qncc_cement", ar: "شركة قطر الوطنية للإسمنت", en: "Qatar National Cement Company", category: "holding" },
  { id: "qatar_airways", ar: "قطر للطيران", en: "Qatar Airways", category: "holding" },
  { id: "ooredoo", ar: "أوريدو", en: "Ooredoo", category: "holding" },
  { id: "vodafone_qatar", ar: "اتصالات قطر (فودافون قطر)", en: "Vodafone Qatar", category: "holding" },
  { id: "nakilat", ar: "قطر للملاحة (ناقلات)", en: "Nakilat (Qatar Gas Transport)", category: "holding" },
  { id: "mwani", ar: "موانئ قطر", en: "Mwani Qatar", category: "holding" },
  { id: "qatar_holding", ar: "قطر القابضة", en: "Qatar Holding", category: "holding" },
  { id: "barwa", ar: "شركة بروة العقارية", en: "Barwa Real Estate", category: "holding" },
  { id: "diar", ar: "شركة الديار القطرية العقارية", en: "Qatar Diar", category: "holding" },
  { id: "ezdan", ar: "مجموعة إزدان القابضة", en: "Ezdan Holding Group", category: "holding" },
  { id: "qatar_rail", ar: "شركة قطر للسكك الحديدية", en: "Qatar Rail", category: "holding" },
  { id: "qpmc", ar: "شركة قطر للكيبلات", en: "Qatar National Broadband Network", category: "holding" },
  { id: "mowasalat", ar: "شركة موصالات (كروة)", en: "Mowasalat (Karwa)", category: "holding" },
  { id: "qewc", ar: "شركة قطر للكهرباء والماء", en: "Qatar Electricity & Water Company (QEWC)", category: "holding" },
  { id: "industries_qatar", ar: "قطر للصناعات", en: "Industries Qatar", category: "holding" },
  { id: "mesaieed_petrochemical", ar: "مسيعيد للبتروكيماويات القابضة", en: "Mesaieed Petrochemical Holding", category: "holding" },
  { id: "woqod", ar: "وقود (شركة قطر للوقود)", en: "Qatar Fuel Company (WOQOD)", category: "holding" },
  { id: "qamc", ar: "شركة قطر لصناعة الألمنيوم", en: "Qatar Aluminium Manufacturing Company", category: "holding" },
  { id: "aamal", ar: "شركة أعمال", en: "Aamal Company", category: "holding" },
  { id: "zad_holding", ar: "شركة زاد القابضة", en: "Zad Holding Company", category: "holding" },
  { id: "gulf_international", ar: "الخليج للخدمات الدولية", en: "Gulf International Services", category: "holding" },
  { id: "udc", ar: "شركة التطوير المتحدة", en: "United Development Company (UDC)", category: "holding" },
  { id: "estithmar", ar: "شركة إستثمار القابضة", en: "Estithmar Holding", category: "holding" },
  { id: "meeza", ar: "ميزة لإدارة مراكز البيانات", en: "MEEZA", category: "holding" },
  { id: "qatari_investors", ar: "مجموعة المستثمرين القطريين", en: "Qatari Investors Group", category: "holding" },
  { id: "qimc", ar: "شركة قطر للتصنيع الصناعي", en: "Qatar Industrial Manufacturing Company", category: "holding" },
  { id: "gulf_warehousing", ar: "شركة الخليج للتخزين", en: "Gulf Warehousing Company", category: "holding" },
  { id: "mosanada", ar: "مساندة لإدارة المرافق", en: "Mosanada Facility Management", category: "holding" },
  { id: "barzan_holdings", ar: "برزان القابضة (الدفاع)", en: "Barzan Holdings (Defense)", category: "holding" },
  { id: "nebras_energy", ar: "نبراس للطاقة", en: "Nebras Energy", category: "holding" },
  { id: "al_mahhar", ar: "المحار القابضة", en: "Al Mahhar Holding", category: "holding" },
  { id: "alijarah", ar: "الإجارة القابضة", en: "Alijarah Holding", category: "holding" },
  { id: "mekdam", ar: "مكدوم القابضة", en: "Mekdam Holding Group", category: "holding" },
  { id: "dlala", ar: "الدلالة للوساطة والاستثمار", en: "Dlala Brokerage and Investment Holding", category: "holding" },
  { id: "techno_q", ar: "تكنو كيو (الأنظمة الإلكترونية)", en: "Qatar Electronic Systems (Techno Q)", category: "holding" },
  { id: "inma_holding", ar: "إنماء القابضة", en: "INMA Holding", category: "holding" },
  { id: "qatar_cinema", ar: "قطر للسينما والتوزيع", en: "Qatar Cinema and Film Distribution", category: "holding" },
  { id: "qatar_oman", ar: "قطر عمان للاستثمار", en: "Qatar Oman Investment Company", category: "holding" },
  { id: "mgtc", ar: "شركة قطر لحلول القوى العاملة", en: "Qatar Manpower Solutions (MGTC)", category: "holding" },

  // === Banks & Financial Institutions ===
  { id: "qcb", ar: "مصرف قطر المركزي", en: "Qatar Central Bank", category: "bank" },
  { id: "qnb", ar: "بنك قطر الوطني (مجموعة QNB)", en: "Qatar National Bank (QNB Group)", category: "bank" },
  { id: "qdb", ar: "بنك قطر للتنمية", en: "Qatar Development Bank", category: "bank" },
  { id: "doha_bank", ar: "بنك الدوحة", en: "Doha Bank", category: "bank" },
  { id: "cbq", ar: "البنك التجاري القطري", en: "Commercial Bank of Qatar", category: "bank" },
  { id: "qiib", ar: "بنك قطر الدولي الإسلامي", en: "Qatar International Islamic Bank (QIIB)", category: "bank" },
  { id: "qib", ar: "بنك قطر الإسلامي", en: "Qatar Islamic Bank (QIB)", category: "bank" },
  { id: "ahlibank", ar: "بنك أحلى", en: "Ahlibank", category: "bank" },
  { id: "masraf_alrayan", ar: "مصرف الريان", en: "Masraf Al Rayan", category: "bank" },
  { id: "dukhan_bank", ar: "بنك دخان", en: "Dukhan Bank", category: "bank" },
  { id: "lesha_bank", ar: "بنك ليشا", en: "Lesha Bank", category: "bank" },
  { id: "al_khaliji", ar: "بنك الخليج التجاري القطري", en: "Al Khaliji Commercial Bank", category: "bank" },
  { id: "arab_bank_qa", ar: "البنك العربي - قطر", en: "Arab Bank Qatar", category: "bank" },
  { id: "mashreq_qa", ar: "مصرف الإمارات - قطر", en: "Mashreq Bank Qatar", category: "bank" },
  { id: "hsbc_qa", ar: "إتش إس بي سي الشرق الأوسط - قطر", en: "HSBC Bank Middle East Qatar", category: "bank" },
  { id: "standard_chartered_qa", ar: "ستاندرد تشارترد - قطر", en: "Standard Chartered Qatar", category: "bank" },
  { id: "bnpp_qa", ar: "بي إن بي باريبا الشرق الأوسط - قطر", en: "BNP Paribas Middle East Qatar", category: "bank" },
  { id: "ubl_qa", ar: "البنك المتحد المحدود - قطر", en: "United Bank Limited Qatar", category: "bank" },
  { id: "saderat_qa", ar: "بنك صادرات إيران - قطر", en: "Bank Saderat Iran Qatar", category: "bank" },

  // === Insurance Companies ===
  { id: "qic", ar: "شركة قطر للتأمين", en: "Qatar Insurance Company (QIC)", category: "insurance" },
  { id: "qgirc", ar: "شركة قطر العامة للتأمين وإعادة التأمين", en: "Qatar General Insurance & Reinsurance", category: "insurance" },
  { id: "doha_insurance", ar: "مجموعة الدوحة للتأمين", en: "Doha Insurance Group", category: "insurance" },
  { id: "qiig", ar: "مجموعة قطر للتأمين الإسلامي", en: "Qatar Islamic Insurance Group", category: "insurance" },
  { id: "beema", ar: "شركة ضمان للتأمين الإسلامي (بيمة)", en: "Damaan Islamic Insurance (Beema)", category: "insurance" },
  { id: "al_khaleej_takaful", ar: "الخليج للتكافل", en: "Al Khaleej Takaful Insurance", category: "insurance" },
  { id: "qlm", ar: "كيو إل إم للتأمين على الحياة والطبي", en: "QLM Life & Medical Insurance", category: "insurance" },

  // === Family Groups & Private Companies ===
  { id: "al_faisal_holding", ar: "القابضة الفيصلية (مجموعة الفيصلية)", en: "Al Faisal Holding", category: "private" },
  { id: "power_intl", ar: "باور إنترناشيونال القابضة", en: "Power International Holding", category: "private" },
  { id: "alfardan", ar: "مجموعة الفردان", en: "Alfardan Group", category: "private" },
  { id: "darwish_holding", ar: "مجموعة درويش القابضة", en: "Darwish Holding", category: "private" },
  { id: "almana_group", ar: "مجموعة المانع", en: "Almana Group", category: "private" },
  { id: "abuissa_holding", ar: "مجموعة أبو عيسى القابضة", en: "AbuIssa Holding", category: "private" },
  { id: "almuftah_group", ar: "مجموعة المفتاح", en: "Almuftah Group", category: "private" },
  { id: "salam_intl", ar: "سالم الدولية للاستثمار", en: "Salam International Investment", category: "private" },
  { id: "baladna", ar: "شركة بلدنا للأغذية", en: "Baladna", category: "private" },
  { id: "al_meera", ar: "الشركة الميرة للسلع الاستهلاكية", en: "Al Meera Consumer Goods", category: "private" },
  { id: "mannai", ar: "شركة مناعي", en: "Mannai Corporation", category: "private" },
  { id: "medicare_group", ar: "مجموعة ميديكير", en: "Medicare Group", category: "private" },
  { id: "widam", ar: "شركة ودام للأغذية", en: "Widam Food Company", category: "private" },
  { id: "mazaya", ar: "مازايا للتطوير العقاري", en: "Mazaya Real Estate Development", category: "private" },
  { id: "al_faleh", ar: "الفالح التعليمية القابضة", en: "Al Faleh Educational Holding", category: "private" },
  { id: "qgmd", ar: "القطرية الألمانية للأجهزة الطبية", en: "Qatari German Medical Devices", category: "private" },

  // === Judicial & Regulatory Bodies ===
  { id: "judiciary", ar: "المجلس الأعلى للقضاء", en: "Supreme Judiciary Council", category: "judicial" },
  { id: "prosecution", ar: "النيابة العامة", en: "Public Prosecution", category: "judicial" },
  { id: "qfc", ar: "مركز قطر المالي", en: "Qatar Financial Centre", category: "judicial" },
  { id: "qfcra", ar: "هيئة تنظيم مركز قطر المالي", en: "Qatar Financial Centre Regulatory Authority", category: "judicial" },
  { id: "cma", ar: "هيئة تنظيم المنشآت المالية", en: "Qatar Financial Markets Authority", category: "judicial" },
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