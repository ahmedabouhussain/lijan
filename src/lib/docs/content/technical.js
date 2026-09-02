/**
 * LIJAN™ Technical & Security — Document Content
 *
 * Content for: IT Guide, Security Guide, Implementation Plan, Support Guide
 */

// ── IT Technical and Integration Guide ──
export const itGuide = {
  sections: [
    {
      title_ar: "المعمارية المنطقية",
      title_en: "Logical Architecture",
      content_ar: "تتكون المنصة من ثلاث طبقات: طبقة العرض (React + Tailwind CSS)، طبقة المنطق (وظائف خلفية على Deno runtime)، طبقة البيانات (قاعدة بيانات متعددة المستأجرين مع فصل صارم). كل طبقة مستقلة وقابلة للتطوير بشكل منفصل. الاتصال بين الطبقات عبر SDK آمن.",
      content_en: "The platform consists of three layers: presentation layer (React + Tailwind CSS), logic layer (backend functions on Deno runtime), data layer (multi-tenant database with strict separation). Each layer is independent and independently scalable. Inter-layer communication via secure SDK.",
    },
    {
      title_ar: "نموذج تعدد المستأجرين",
      title_en: "Multi-Tenant Model",
      content_ar: "كل مؤسسة (Organization) مستأجر مستقل. الفصل على مستوى قاعدة البيانات عبر حقل organization_id في كل كيان. صلاحيات على مستوى الصف (RLS) تمنع الوصول عبر المؤسسات. لا يمكن لمستخدم في مؤسسة الوصول لبيانات مؤسسة أخرى. التحقق يتم على مستوى قاعدة البيانات وليس التطبيق فقط.",
      content_en: "Each organization is an independent tenant. Separation at the database level via organization_id field in every entity. Row-level security (RLS) prevents cross-organization access. A user in one organization cannot access another's data. Verification is at the database level, not just the application.",
    },
    {
      title_ar: "الهوية والوصول",
      title_en: "Identity & Access",
      content_ar: "المصادقة: البريد الإلكتروني وكلمة المرور، OAuth عبر Google. إدارة الجلسات: رمز JWT مع انتهاء صلاحية. التحكم القائم على الدور: كل دور له صلاحيات محددة. التحكم القائم على السلطة: داخل اللجنة، الصلاحيات تحدد ما يمكن فعله. دورة حياة المستخدم: دعوة ← قبول ← نشط ← معلق. الوصول الطارئ: عبر Break Glass مع تسجيل كامل.",
      content_en: "Authentication: email/password, OAuth via Google. Session management: JWT token with expiry. Role-based access: each role has defined permissions. Authority-based access: within a committee, authorities determine what can be done. User lifecycle: invite ← accept ← active ← suspended. Emergency access: via Break Glass with full logging.",
    },
    {
      title_ar: "التكاملات — سجل الحالة",
      title_en: "Integrations — Status Register",
      content_ar: "1. تقويم Google: مزامنة الاجتماعات — CONFIGURED — TESTED. 2. Microsoft Teams: اجتماعات إلكترونية — ENGINEERING COMPLETE — AWAITING AUTHORIZATION. 3. Zoom: اجتماعات إلكترونية — ENGINEERING COMPLETE — AWAITING AUTHORIZATION. 4. Outlook: تقويم وبريد — ROADMAP. 5. Google Drive: تخزين — ROADMAP. 6. التوقيع الإلكتروني — ROADMAP. كل تكامل: اتجاه البيانات، المصادقة، البديل التشغيلي موثقة.",
      content_en: "1. Google Calendar: meeting sync — CONFIGURED — TESTED. 2. Microsoft Teams: electronic meetings — ENGINEERING COMPLETE — AWAITING AUTHORIZATION. 3. Zoom: electronic meetings — ENGINEERING COMPLETE — AWAITING AUTHORIZATION. 4. Outlook: calendar and email — ROADMAP. 5. Google Drive: storage — ROADMAP. 6. E-signature — ROADMAP. Each integration: data direction, authentication, operational alternative documented.",
    },
    {
      title_ar: "البيانات — التصنيف والملكية",
      title_en: "Data — Classification & Ownership",
      content_ar: "التصنيفات: عام، داخلي، سري، مقيد، سري للغاية. الملكية: المؤسسة تملك بياناتها. الموقع: بنية تحتية سيادية. الاحتفاظ: حسب سياسة المؤسسة (افتراضي 7 سنوات). الأرشفة: عند إغلاق اللجنة. الحذف: لا يُحذف — يُؤرشف. التصدير: عبر مركز الوثائق ووظائف التصدير.",
      content_en: "Classifications: public, internal, confidential, restricted, highly restricted. Ownership: the organization owns its data. Location: sovereign infrastructure. Retention: per organization policy (default 7 years). Archiving: on committee closure. Deletion: not deleted — archived. Export: via documentation hub and export functions.",
    },
    {
      title_ar: "التشغيل التقني — المراقبة والسجلات",
      title_en: "Technical Operations — Monitoring & Logs",
      content_ar: "المراقبة: لوحة التكاملات تعرض حالة كل تكامل. السجلات: سجل تدقيق لكل عملية (AuditEvent). التنبيهات: إشعارات تلقائية للأحداث الحرجة. الأداء: زمن الاستجابة يُقاس عبر SDK. إدارة الحوادث: عبر مسار التصعيد المحدد. لا توجد نقاط وصول مباشرة لقاعدة البيانات من خارج المنصة.",
      content_en: "Monitoring: integration panel shows each integration's status. Logs: audit log for every operation (AuditEvent). Alerts: automatic notifications for critical events. Performance: response time measured via SDK. Incident management: via defined escalation path. No direct database access points from outside the platform.",
    },
    {
      title_ar: "استمرارية الأعمال والتعافي",
      title_en: "Business Continuity & Recovery",
      content_ar: "النسخ الاحتياطي: تُدار على مستوى المنصة. الاستعادة: عبر طلب رسمي. أهداف الاستعادة: [تتطلب اعتمادًا — قيم مقترحة: RTO 4 ساعات، RPO 1 ساعة]. اتفاقية مستوى الخدمة: [تتطلب اعتمادًا]. لا توجد أرقام نهائية دون اعتماد.",
      content_en: "Backup: managed at the platform level. Recovery: via formal request. Recovery objectives: [require approval — proposed values: RTO 4 hours, RPO 1 hour]. SLA: [requires approval]. No final numbers without approval.",
    },
    {
      title_ar: "خطة تسليم النظام لإدارة تقنية المعلومات",
      title_en: "System Handover Plan to IT",
      content_ar: "1. مراجعة الدليل التقني. 2. مراجعة سجل التكاملات والحالة. 3. مراجعة مصفوفة الصلاحيات. 4. التحقق من قائمة الجاهزية التقنية. 5. تسليم بيانات الاعتماد الآمنة (بدون مفاتيح في الوثائق). 6. تدريب مسؤولي تقنية المعلومات. 7. توقيع محضر التسليم. كل خطوة موثقة.",
      content_en: "1. Review the IT guide. 2. Review integration register and status. 3. Review permissions matrix. 4. Verify technical readiness checklist. 5. Hand over secure credentials (no keys in documents). 6. Train IT administrators. 7. Sign handover minutes. Every step is documented.",
    },
  ],
};

// ── Security, Privacy and Data Governance ──
export const securityGuide = {
  sections: [
    {
      title_ar: "نموذج التهديدات",
      title_en: "Threat Model",
      content_ar: "التهديدات الرئيسية: الوصول غير المصرح به عبر المؤسسات، تلاعب القرارات، تسرب البيانات الحساسة، فقدان المعرفة، تعطل الخدمة. الضوابط: فصل صارم (RLS)، سجلات تدقيق غير قابلة للتعديل، تشفير، صلاحيات قائمة على الدور، تدهور رشيق. كل تهديد له ضابط موثق.",
      content_en: "Primary threats: cross-organization unauthorized access, decision tampering, sensitive data leakage, knowledge loss, service disruption. Controls: strict separation (RLS), immutable audit logs, encryption, role-based permissions, graceful degradation. Every threat has a documented control.",
    },
    {
      title_ar: "مبادئ الحد الأدنى من الصلاحيات",
      title_en: "Least-Privilege Principles",
      content_ar: "كل دور يرى ويعدل ما يحتاجه فقط. لا توجد صلاحيات عامة. الصلاحيات محددة على مستوى الكيان والعملية (قراءة، إنشاء، تعديل، حذف). المسؤولون فقط يمكنهم الحذف. المستخدم العادي يرى بيانات مؤسسته فقط. المؤسس يرى كل شيء.",
      content_en: "Each role sees and modifies only what it needs. No blanket permissions. Permissions are defined at the entity and operation level (read, create, update, delete). Only admins can delete. Regular users see only their organization's data. The founder sees everything.",
    },
    {
      title_ar: "فصل المؤسسات واللجان",
      title_en: "Organization & Committee Separation",
      content_ar: "على مستوى قاعدة البيانات: حقل organization_id في كل كيان. على مستوى الصلاحيات: RLS يمنع الوصول عبر المؤسسات. على مستوى اللجنة: كل لجنة لها مساحة عمل مستقلة. لا يمكن لمستخدم في لجنة الوصول لبيانات لجنة أخرى في نفس المؤسسة دون صلاحية صريحة.",
      content_en: "At the database level: organization_id field in every entity. At the permissions level: RLS prevents cross-organization access. At the committee level: each committee has an independent workspace. A user in one committee cannot access another committee's data in the same organization without explicit permission.",
    },
    {
      title_ar: "التشفير أثناء النقل والتخزين",
      title_en: "Encryption in Transit & at Rest",
      content_ar: "أثناء النقل: TLS لكل الاتصالات. التخزين: البيانات مشفرة على مستوى البنية التحتية. الملفات المرفوعة: مخزنة بأمان مع روابط موقعة. الوثائق الخاصة: روابط موقعة محدودة المدة. لا توجد مفاتيح في الكود أو الوثائق.",
      content_en: "In transit: TLS for all communications. At rest: data encrypted at the infrastructure level. Uploaded files: stored securely with signed URLs. Private documents: time-limited signed URLs. No keys in code or documents.",
    },
    {
      title_ar: "سجلات التدقيق ومنع التلاعب",
      title_en: "Audit Logs & Tamper Prevention",
      content_ar: "كل عملية تُسجل في AuditEvent: المستخدم، العملية، الكيان، التاريخ، التفاصيل. السجلات غير قابلة للتعديل (update: false في RLS). لا يمكن حذف سجل التدقيق إلا للمسؤول. القرارات المعتمدة لا تُعدل — يُنشأ إصدار جديد. سلسلة الإثبات تربط كل عنصر بأصله.",
      content_en: "Every operation is recorded in AuditEvent: user, operation, entity, date, details. Logs are immutable (update: false in RLS). Audit log deletion is admin-only. Approved decisions are not modified — a new version is created. The proof chain links every element to its origin.",
    },
    {
      title_ar: "الخصوصية وسيادة البيانات",
      title_en: "Privacy & Data Sovereignty",
      content_ar: "البيانات تحت سيطرة المؤسسة. لا وصول خارجي دون تفويض صريح. لا تُشارك البيانات مع أطراف ثالثة. المستخدم يتحكم في بياناته الشخصية (الملف الشخصي). سيادة البيانات: البيانات تخضع لسياسات المؤسسة والقوانين المحلية. لا معالجة خارجية دون موافقة.",
      content_en: "Data is under organization control. No external access without explicit authorization. Data is not shared with third parties. The user controls their personal data (profile). Data sovereignty: data is subject to organization policies and local laws. No external processing without consent.",
    },
    {
      title_ar: "حوكمة الذكاء الاصطناعي والإشراف البشري",
      title_en: "AI Governance & Human Oversight",
      content_ar: "كل مخرج ذكاء اصطناعي يُسجل في AIOutputLedger مع حالة المراجعة. لا يُعتمد مخرج آلي دون مراجعة بشرية. يُسجل المراجع وملاحظاته. النماذج المستخدمة موثقة. لا يوجد ذكاء اصطناعي مستقل يتخذ قرارات. الإشراف البشري إلزامي.",
      content_en: "Every AI output is recorded in AIOutputLedger with review status. No automated output is approved without human review. Reviewer and notes are recorded. Models used are documented. No autonomous AI makes decisions. Human oversight is mandatory.",
    },
    {
      title_ar: "قائمة مراجعة الأمن قبل الإطلاق",
      title_en: "Pre-Launch Security Checklist",
      content_ar: "1. التحقق من RLS لكل كيان. 2. مراجعة صلاحيات الأدوار. 3. التحقق من التشفير. 4. مراجعة سجل التدقيق. 5. اختبار فصل المؤسسات. 6. مراجعة التكاملات والمصادقة. 7. التحقق من عدم وجود مفاتيح في الكود. 8. مراجعة سياسة الاحتفاظ. 9. اختبار التدهور الرشيق. 10. اعتماد الإطلاق.",
      content_en: "1. Verify RLS for every entity. 2. Review role permissions. 3. Verify encryption. 4. Review audit log. 5. Test organization separation. 6. Review integrations and authentication. 7. Verify no keys in code. 8. Review retention policy. 9. Test graceful degradation. 10. Approve launch.",
    },
  ],
};

// ── Implementation, Adoption and Training Plan ──
export const implementationPlan = {
  sections: [
    {
      title_ar: "مرحلة الاكتشاف والجاهزية المؤسسية",
      title_en: "Discovery & Organizational Readiness",
      content_ar: "المدة: أسبوعان. المخرجات: تقييم الجاهزية، تحديد اللجان المرشحة، تحديد أصحاب المصلحة. شروط الدخول: اعتماد الإدارة العليا. شروط الخروج: تقرير الجاهزية معتمد. المالك: مدير المؤسسة. المخاطر: مقاومة التغيير — المعالجة: خطة اتصال مبكرة.",
      content_en: "Duration: two weeks. Deliverables: readiness assessment, candidate committees identified, stakeholders identified. Entry criteria: executive approval. Exit criteria: approved readiness report. Owner: organization admin. Risk: change resistance — mitigation: early communication plan.",
    },
    {
      title_ar: "مرحلة التهيئة وإعداد التكاملات",
      title_en: "Setup & Integration Configuration",
      content_ar: "المدة: أسبوعان. المخرجات: المؤسسة واللجان منشأة، التكاملات مُعدة (تقويم Google)، الأدوار والصلاحيات محددة، القوالب جاهزة. شروط الخروج: اختبار التهيئة ناجح. المالك: مسؤول المنصة + تقنية المعلومات.",
      content_en: "Duration: two weeks. Deliverables: organization and committees created, integrations configured (Google Calendar), roles and permissions defined, templates ready. Exit criteria: successful setup test. Owner: platform admin + IT.",
    },
    {
      title_ar: "مرحلة الاختبار والتشغيل التجريبي",
      title_en: "Testing & Pilot Operations",
      content_ar: "المدة: أسبوعان. المخرجات: اختبارات القبول منجزة، لجنة تجريبية تعمل، ملاحظات المستخدمين مُجمعة. شروط الخروج: اختبارات القبول ناجحة. المالك: مسؤول المنصة + أمين السر التجريبي. المخاطر: اكتشاف فجوات — المعالجة: دورة إصحاح سريعة.",
      content_en: "Duration: two weeks. Deliverables: acceptance tests completed, pilot committee operational, user feedback collected. Exit criteria: successful acceptance tests. Owner: platform admin + pilot secretary. Risk: gap discovery — mitigation: rapid remediation cycle.",
    },
    {
      title_ar: "مرحلة الإطلاق المرحلي والتوسع",
      title_en: "Phased Launch & Expansion",
      content_ar: "المدة: 4-6 أسابيع. المخرجات: لجان إضافية تُطلق على مراحل، تدريب حسب الدور، مؤشرات التبني تُقاس. شروط الخروج: نسبة تبني مستهدفة محققة. المالك: مدير المؤسسة. المخاطر: تبني بطيء — المعالجة: تدريب إضافي ودعم مكثف.",
      content_en: "Duration: 4-6 weeks. Deliverables: additional committees launched in phases, role-based training, adoption metrics measured. Exit criteria: target adoption rate achieved. Owner: organization admin. Risk: slow adoption — mitigation: additional training and intensive support.",
    },
    {
      title_ar: "خطة التدريب حسب الدور",
      title_en: "Role-Based Training Plan",
      content_ar: "الرئيس: 2 ساعة (الاعتماد، التوقيع، الحوكمة). أمين السر: 4 ساعات (الاجتماعات، المحاضر، الإجراءات). العضو: 1 ساعة (التصويت، الإجراءات). مدير المؤسسة: 3 ساعات (الإدارة، الإعدادات). تقنية المعلومات: 4 ساعات (التكاملات، الأمن). تدريب المدربين: 8 ساعات شاملة.",
      content_en: "Chair: 2 hours (approval, signing, governance). Secretary: 4 hours (meetings, minutes, actions). Member: 1 hour (voting, actions). Organization admin: 3 hours (management, settings). IT: 4 hours (integrations, security). Train-the-trainer: 8 hours comprehensive.",
    },
    {
      title_ar: "مؤشرات التبني",
      title_en: "Adoption Metrics",
      content_ar: "نسبة المستخدمين النشطين (%), عدد اللجان المُدارة, عدد الاجتماعات المُجدولة, عدد القرارات الموثقة, نسبة الإجراءات المغلقة في الموعد (%). تُقاس من سجل التدقيق الفعلي. هدف المرحلة الأولى: 80% تبني للجان المرشحة.",
      content_en: "Active user rate (%), managed committee count, scheduled meeting count, documented decision count, on-time action closure rate (%). Measured from the actual audit log. Phase 1 target: 80% adoption for candidate committees.",
    },
  ],
};

// ── Support, Service and Business Continuity ──
export const supportGuide = {
  sections: [
    {
      title_ar: "نموذج الدعم",
      title_en: "Support Model",
      content_ar: "ثلاثة مستويات: المستوى 1 — مسؤول المنصة (المشاكل اليومية، الاستخدام). المستوى 2 — مدير المؤسسة (الصلاحيات، الإعدادات، التكاملات). المستوى 3 — المؤسس/الدعم الفني (مشاكل النظام، البنية التحتية). كل مستوى له قنوات ومسؤوليات محددة.",
      content_en: "Three levels: Level 1 — platform admin (daily issues, usage). Level 2 — organization admin (permissions, settings, integrations). Level 3 — founder/technical support (system issues, infrastructure). Each level has defined channels and responsibilities.",
    },
    {
      title_ar: "مستويات الأولوية وأوقات الاستجابة",
      title_en: "Priority Levels & Response Times",
      content_ar: "حرجة (النظام متوقف): الاستجابة [تتطلب اعتمادًا — مقترح: 1 ساعة]. عالية (وظيفة أساسية معطلة): [مقترح: 4 ساعات]. متوسطة (وظيفة غير أساسية): [مقترح: 1 يوم عمل]. منخفضة (استفسار): [مقترح: 3 أيام عمل]. كل القيم موسومة على أنها تحتاج اعتمادًا.",
      content_en: "Critical (system down): response [requires approval — proposed: 1 hour]. High (core function failed): [proposed: 4 hours]. Medium (non-core function): [proposed: 1 business day]. Low (inquiry): [proposed: 3 business days]. All values are marked as requiring approval.",
    },
    {
      title_ar: "إدارة الحوادث",
      title_en: "Incident Management",
      content_ar: "الإبلاغ: عبر قناة الدعم المحددة. التشخيص: تحديد المستوى والأولوية. المعالجة: وفق المستوى. التواصل: إشعار المستخدمين المتأثرين. الإغلاق: بعد التحقق من الحل. التوثيق: سجل الحادثة في سجل التدقيق. المراجعة: تحليل السبب الجذري بعد الحوادث الحرجة.",
      content_en: "Reporting: via defined support channel. Diagnosis: level and priority determination. Resolution: per level. Communication: notify affected users. Closure: after verifying resolution. Documentation: incident record in audit log. Review: root cause analysis after critical incidents.",
    },
    {
      title_ar: "الاستمرارية والتعافي من الكوارث",
      title_en: "Continuity & Disaster Recovery",
      content_ar: "النسخ الاحتياطي: تُدار على مستوى المنصة. الاستعادة: عبر طلب رسمي. إجراءات الانقطاع: التدهور الرشيق — الحوكمة تعمل دون تكاملات. العمل البديل: العمليات اليدوية المؤقتة موثقة. أهداف الاستعادة: [تتطلب اعتمادًا]. خطة التعافي: [تتطلب اعتمادًا].",
      content_en: "Backup: managed at platform level. Recovery: via formal request. Outage procedures: graceful degradation — governance works without integrations. Alternative work: documented temporary manual procedures. Recovery objectives: [require approval]. Recovery plan: [require approval].",
    },
    {
      title_ar: "نموذج اتفاقية مستوى الخدمة",
      title_en: "SLA Template",
      content_ar: "نموذج اتفاقية مستوى الخدمة يتضمن: نطاق الخدمة، مستويات الأولوية وأوقات الاستجابة [تتطلب اعتمادًا]، زمن التشغيل المستهدف [مقترح: 99.5% — يتطلب اعتمادًا]، مسؤوليات الأطراف، إجراءات التصعيد، التقرير الشهري، المراجعة الدورية. كل الأرقام موسومة على أنها تحتاج اعتمادًا.",
      content_en: "SLA template includes: service scope, priority levels and response times [require approval], target uptime [proposed: 99.5% — requires approval], party responsibilities, escalation procedures, monthly report, periodic review. All numbers are marked as requiring approval.",
    },
    {
      title_ar: "نموذج تقرير الخدمة الشهري",
      title_en: "Monthly Service Report Template",
      content_ar: "يتضمن: زمن التشغيل الفعلي، عدد الحوادث وتصنيفها، أوقات الاستجابة والحل، حالة التكاملات، عدد المستخدمين النشطين، عدد اللجان النشطة، مؤشرات التبني، الإجراءات الموصى بها. يُقدم للمؤسسة شهريًا.",
      content_en: "Includes: actual uptime, incident count and classification, response and resolution times, integration status, active user count, active committee count, adoption metrics, recommended actions. Presented to the organization monthly.",
    },
  ],
};