/**
 * LIJAN™ Platform & Operations — Document Content
 *
 * Content for: Capability Catalogue, Operating Model, Role Guide,
 *              System Administration Runbook
 */

// ── Platform Capability Catalogue ──
export const capabilityCatalogue = {
  sections: [
    {
      title_ar: "الرئاسة التنفيذية واللوحة الرئيسية",
      title_en: "Executive Dashboard & Home",
      content_ar: "الغرض: لوحة رئيسية تكيّفية حسب الدور تعرض ما يحتاجه المستخدم فورًا. المستخدمون: جميع الأدوار. المدخلات: دور المستخدم، حالة اللجنة، الاجتماعات القادمة، الإجراءات المتأخرة. المخرجات: ملخص تنفيذي، تنبيهات، روابط سريعة. الحالة: LIVE — VERIFIED. مصدر الإثبات: صفحة CommitteeHome الفعلية.",
      content_en: "Purpose: role-adaptive home dashboard showing what the user needs immediately. Users: all roles. Inputs: user role, committee status, upcoming meetings, overdue actions. Outputs: executive summary, alerts, quick links. Status: LIVE — VERIFIED. Evidence: actual CommitteeHome page.",
    },
    {
      title_ar: "الأشخاص والتشكيل",
      title_en: "People & Formation",
      content_ar: "الغرض: إدارة أعضاء اللجنة وأدوارهم وصلاحياتهم. المستخدمون: الرئيس، أمين السر، مدير اللجنة. المدخلات: بيانات الأعضاء، الأدوار، الصلاحيات. مسار العمل: دعوة عضو ← قبول الدعوة ← تفعيل العضوية ← تعيين الدور ← تحديد الصلاحيات. المخرجات: تشكيل موثق، سجل أعضاء. الحالة: LIVE — VERIFIED.",
      content_en: "Purpose: manage committee members, roles, and authorities. Users: chair, secretary, committee administrator. Inputs: member data, roles, authorities. Workflow: invite member ← accept invitation ← activate membership ← assign role ← set authorities. Outputs: documented formation, member registry. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "إدارة الاجتماعات",
      title_en: "Meeting Management",
      content_ar: "الغرض: جدولة الاجتماعات وإدارة جدول الأعمال والمحاضر. المستخدمون: أمين السر، الرئيس، الأعضاء. المدخلات: التاريخ، المدة، الموقع، الوضع (حضوري/إلكتروني/مختلط). مسار العمل: إنشاء اجتماع ← إعداد جدول الأعمال ← إرسال الدعوات ← عقد الاجتماع ← تسجيل المحضر ← الاعتماد. المخرجات: اجتماع موثق، محضر معتمد. الحالة: LIVE — VERIFIED.",
      content_en: "Purpose: schedule meetings and manage agenda and minutes. Users: secretary, chair, members. Inputs: date, duration, location, mode (physical/online/hybrid). Workflow: create meeting ← prepare agenda ← send invitations ← hold meeting ← record minutes ← approve. Outputs: documented meeting, approved minutes. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "التصويت والقرارات",
      title_en: "Voting & Decisions",
      content_ar: "الغرض: إدارة دورة القرار من المسودة إلى الإصدار والتوقيع. المستخدمون: الرئيس، الأعضاء ذوو حق التصويت. المدخلات: عنوان القرار، الاقتراح، الأساس القانوني. مسار العمل: مسودة ← مراجعة ← فتح التصويت ← الإدلاء بالأصوات ← إغلاق التصويت ← الإصدار ← التوقيع. المخرجات: قرار موثق بتوقيعات وسلسلة إثبات. الحالة: LIVE — VERIFIED.",
      content_en: "Purpose: manage the decision cycle from draft to issuance and signature. Users: chair, voting members. Inputs: decision title, proposal, legal basis. Workflow: draft ← review ← open voting ← cast votes ← close voting ← issue ← sign. Outputs: documented decision with signatures and proof chain. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "الإجراءات والمتابعة",
      title_en: "Actions & Follow-up",
      content_ar: "الغرض: تتبع الإجراءات الصادرة عن القرارات حتى الإغلاق. المستخدمون: أمين السر، مالكو الإجراءات، الرئيس. المدخلات: وصف الإجراء، المسؤول، الموعد النهائي. مسار العمل: إنشاء إجراء ← تعيين مسؤول ← تحديث التقدم ← رفع الأدلة ← التحقق ← الإغلاق. المخرجات: إجراء مغلق بأدلة، تقرير متابعة. الحالة: LIVE — VERIFIED.",
      content_en: "Purpose: track actions arising from decisions until closure. Users: secretary, action owners, chair. Inputs: action description, owner, deadline. Workflow: create action ← assign owner ← update progress ← upload evidence ← verify ← close. Outputs: closed action with evidence, follow-up report. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "التقارير والذاكرة المؤسسية",
      title_en: "Reports & Institutional Memory",
      content_ar: "الغرض: إنشاء تقارير تنفيذية وتجميع ذاكرة اللجنة. المستخدمون: الرئيس، الإدارة العليا، أمين السر. المدخلات: بيانات الاجتماعات والقرارات والإجراءات. مسار العمل: تجميع آلي ← إنشاء تقرير ← مراجعة ← اعتماد ← نشر. المخرجات: تقرير تنفيذي، سجل ذاكرة قابل للبحث. الحالة: LIVE — VERIFIED.",
      content_en: "Purpose: generate executive reports and compile committee memory. Users: chair, executive management, secretary. Inputs: meeting, decision, and action data. Workflow: automated compilation ← generate report ← review ← approve ← publish. Outputs: executive report, searchable memory record. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "الذكاء المؤسسي والمساعدة الذكية",
      title_en: "Institutional Intelligence & Smart Assistance",
      content_ar: "الغرض: مساعدة ذكية لإنشاء المحاضر وتجميع الذاكرة وإنشاء سيناريوهات السياسات. المستخدمون: أمين السر، الرئيس. المدخلات: بيانات الاجتماعات والقرارات. ملاحظة: كل مخرج ذكاء اصطناعي يُسجل في سجل الأدلة ويحتاج مراجعة بشرية. الحالة: LIVE — VERIFIED. مصدر الإثبات: AIOutputLedger entity و CompileCommitteeMemory function.",
      content_en: "Purpose: smart assistance for minutes generation, memory compilation, and policy scenario creation. Users: secretary, chair. Inputs: meeting and decision data. Note: every AI output is recorded in the evidence ledger and requires human review. Status: LIVE — VERIFIED. Evidence: AIOutputLedger entity and CompileCommitteeMemory function.",
    },
    {
      title_ar: "الحوكمة والتدقيق",
      title_en: "Governance & Audit",
      content_ar: "الغرض: سجل تدقيق كامل وتتبع التغييرات ومصفوفة الإثبات. المستخدمون: الرئيس، المدقق، الإدارة العليا. المدخلات: كل عملية في المنصة. المخرجات: سجل تدقيق، مصفوفة تتبع، تتبع التغييرات. الحالة: LIVE — VERIFIED. مصدر الإثبات: AuditEvent entity و CommitteeAudit page.",
      content_en: "Purpose: complete audit log, change tracking, and proof matrix. Users: chair, auditor, executive management. Inputs: every operation in the platform. Outputs: audit log, traceability matrix, change tracking. Status: LIVE — VERIFIED. Evidence: AuditEvent entity and CommitteeAudit page.",
    },
    {
      title_ar: "الإشعارات",
      title_en: "Notifications",
      content_ar: "الغرض: إشعارات تلقائية للأحداث (اجتماع، قرار، إجراء متأخر). المستخدمون: جميع المستخدمين. القنوات: داخل التطبيق، البريد الإلكتروني. Teams و Push في خريطة الطريق. الحالة: داخل التطبيق والبريد — LIVE — VERIFIED. Teams و Push — ROADMAP — NOT YET RELEASED.",
      content_en: "Purpose: automatic notifications for events (meeting, decision, overdue action). Users: all users. Channels: in-app, email. Teams and Push on roadmap. Status: in-app and email — LIVE — VERIFIED. Teams and Push — ROADMAP — NOT YET RELEASED.",
    },
    {
      title_ar: "التكاملات",
      title_en: "Integrations",
      content_ar: "الغرض: ربط المنصة بالأنظمة الخارجية. التكاملات الحالية: تقويم Google (CONFIGURED — TESTED). التكاملات المخططة: Microsoft Teams، Zoom، Outlook، Google Drive، التوقيع الإلكتروني. كل تكامل قابل للتبديل مع تدهور رشيق. الحالة: Google Calendar — CONFIGURED — TESTED. البقية — ENGINEERING COMPLETE — AWAITING AUTHORIZATION.",
      content_en: "Purpose: connect the platform to external systems. Current integrations: Google Calendar (CONFIGURED — TESTED). Planned: Microsoft Teams, Zoom, Outlook, Google Drive, e-signature. Every integration is swappable with graceful degradation. Status: Google Calendar — CONFIGURED — TESTED. Others — ENGINEERING COMPLETE — AWAITING AUTHORIZATION.",
    },
    {
      title_ar: "التصدير والطباعة",
      title_en: "Export & Print",
      content_ar: "الغرض: تصدير الوثائق بصيغة PDF وطباعتها. المستخدمون: أمين السر، الرئيس. المدخلات: محتوى الوثيقة. المخرجات: ملف PDF مع الشعار والتصنيف والتذييل. الحالة: LIVE — VERIFIED. ملاحظة: تصدير DOCX و PPTX و XLSX متاح عبر مركز الوثائق.",
      content_en: "Purpose: export documents as PDF and print. Users: secretary, chair. Inputs: document content. Outputs: PDF file with logo, classification, and footer. Status: LIVE — VERIFIED. Note: DOCX, PPTX, and XLSX export available through the Documentation Hub.",
    },
  ],
};

// ── Operating Model and Governance ──
export const operatingModel = {
  sections: [
    {
      title_ar: "نموذج تشغيل المنصة",
      title_en: "Platform Operating Model",
      content_ar: "تعمل المنصة بنموذج متعدد المستأجرين: كل مؤسسة لها بوابة مستقلة، وكل لجنة لها مساحة عمل مستقلة. المؤسس يملك المنصة. مدير المؤسسة يدير البوابة. رئيس اللجنة يدير اللجنة. أمين السر يدير العمليات اليومية. الأعضاء يشاركون وفق صلاحياتهم. كل دور يرى ما يحتاجه فقط.",
      content_en: "The platform operates on a multi-tenant model: each organization has an independent portal, each committee has an independent workspace. The founder owns the platform. The organization admin manages the portal. The committee chair manages the committee. The secretary manages daily operations. Members participate per their authorities. Each role sees only what they need.",
    },
    {
      title_ar: "سلسلة السلطة والاعتماد",
      title_en: "Authority Chain & Approval",
      content_ar: "المؤسس ← مدير المؤسسة ← رئيس اللجنة ← أمين السر ← الأعضاء. كل مستوى له صلاحيات محددة. لا يمكن لأحد تجاوز مستواه. القرارات تمر بسلسلة اعتماد واضحة: مسودة ← مراجعة ← تصويت ← إصدار ← توقيع. لا يُعتمد قرار دون اكتمال السلسلة.",
      content_en: "Founder ← Organization Admin ← Committee Chair ← Secretary ← Members. Each level has defined authorities. No one can bypass their level. Decisions pass through a clear approval chain: draft ← review ← voting ← issuance ← signature. No decision is approved without completing the chain.",
    },
    {
      title_ar: "فصل الواجبات",
      title_en: "Separation of Duties",
      content_ar: "لا يمكن لنفس الشخص: إنشاء القرار وتوقيعه، فتح التصويت وإغلاقه، إنشاء الإجراء والتحقق من إغلاقه. كل عملية تتطلب شخصين على الأقل. هذا يمنع التضارض ويضمن الرقابة.",
      content_en: "The same person cannot: create and sign a decision, open and close voting, create an action and verify its closure. Every operation requires at least two people. This prevents conflicts and ensures oversight.",
    },
    {
      title_ar: "إدارة التفويض والبدائل",
      title_en: "Delegation & Alternates Management",
      content_ar: "يمكن للرئيس تفويض صلاحياته مؤقتًا لنائب الرئيس أو عضو. يُسجل التفويض بتاريخ بداية ونهاية ونطاق. البدائل: عند غياب عضو أصلي، يُفعّل البديل بصلاحيات العضو الأصلي. التنحي: عند وجود تعارض مصالح، يُسجل التنحي ويُستبعد العضو من التصويت. الحالة: LIVE — VERIFIED.",
      content_en: "The chair can delegate authority temporarily to the vice chair or a member. Delegation is recorded with start/end dates and scope. Alternates: when a primary member is absent, the alternate is activated with the primary's authorities. Recusal: when a conflict of interest exists, recusal is recorded and the member is excluded from voting. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "حوكمة الاجتماعات",
      title_en: "Meeting Governance",
      content_ar: "لا يُعقد اجتماع دون نصاب. النصاب محدد في إعدادات اللجنة. يُسجل الحضور لكل اجتماع. لا يُعتمد محضر دون مصادقة الرئيس وأمين السر. الاجتماعات المتكررة تُولد آليًا وفق قاعدة التكرار. الحالة: LIVE — VERIFIED.",
      content_en: "No meeting is held without quorum. Quorum is defined in committee settings. Attendance is recorded for every meeting. No minutes are approved without chair and secretary certification. Recurring meetings are generated automatically per the recurrence rule. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "حوكمة القرارات والتوقيعات",
      title_en: "Decision & Signature Governance",
      content_ar: "كل قرار يحمل: تصنيف سرية، أساس قانوني، سلسلة إثبات، توقيعات رقمية. لا يُعدل قرار معتمد — يُنشأ إصدار جديد. يمكن التحقق من القرار عبر رمز QR عام. التوقيعات إلكترونية وموثقة. الحالة: LIVE — VERIFIED.",
      content_en: "Every decision carries: classification, legal basis, proof chain, digital signatures. An approved decision cannot be modified — a new version is created. Decisions can be verified via public QR code. Signatures are electronic and documented. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "حوكمة الإجراءات والتصعيد",
      title_en: "Action & Escalation Governance",
      content_ar: "كل إجراء له مسؤول وموعد نهائي. تنبيهات تلقائية قبل الموعد وعند التأخير. تصعيد تلقائي عند تجاوز الموعد. لا يُغلق إجراء دون رفع أدلة والتحقق منها. الإجراءات المتأخرة تظهر في لوحة الرئيس. الحالة: LIVE — VERIFIED.",
      content_en: "Every action has an owner and deadline. Automatic alerts before deadline and on delay. Automatic escalation on deadline breach. No action is closed without evidence upload and verification. Overdue actions appear on the chair's dashboard. Status: LIVE — VERIFIED.",
    },
    {
      title_ar: "دور الإنسان في مراجعة الذكاء الاصطناعي",
      title_en: "Human Oversight of AI",
      content_ar: "كل مخرج ذكاء اصطناعي (محضر، ذاكرة، سيناريو سياسة) يُسجل في سجل الأدلة بحالة 'يحتاج مراجعة بشرية'. لا يُعتمد أي مخرج آلي دون مراجعة واعتماد بشري. يُسجل اسم المراجع وتاريخ المراجعة وملاحظاته. هذا مبدأ حاكم غير قابل للتفاوض.",
      content_en: "Every AI output (minutes, memory, policy scenario) is recorded in the evidence ledger with 'requires human review' status. No automated output is approved without human review and approval. Reviewer name, review date, and notes are recorded. This is a non-negotiable governing principle.",
    },
    {
      title_ar: "مصفوفة المسؤوليات",
      title_en: "Responsibility Matrix",
      content_ar: "الرئيس: إدارة اللجنة، اعتماد القرارات، التوقيع. أمين السر: إدارة الاجتماعات، المحاضر، الإجراءات. مدير اللجنة: الإدارة اليومية، الإعدادات. الأعضاء: التصويت، تنفيذ الإجراءات. المراقب: الرؤية دون تصويت. المدقق: سجلات التدقيق. تفاصيل كاملة في ملف XLSX مصفوفة المسؤوليات.",
      content_en: "Chair: committee management, decision approval, signing. Secretary: meeting management, minutes, actions. Committee Admin: daily management, settings. Members: voting, action execution. Observer: visibility without voting. Auditor: audit logs. Full details in the Responsibility Matrix XLSX file.",
    },
    {
      title_ar: "ضوابط عدم ضياع المعرفة",
      title_en: "Knowledge Retention Controls",
      content_ar: "عند تغير الأعضاء: تبقى الذاكرة المؤسسية محفوظة، تبقى سجلات الاجتماعات والقرارات، تُحدّث الصلاحيات دون فقدان البيانات. التحويل المعرفي: عند إغلاق اللجنة، تُحوّل الذاكرة إلى أرشيف دائم قابل للبحث. لا تُحذف بيانات اللجنة المُغلقة — تُؤرشف.",
      content_en: "When members change: institutional memory is preserved, meeting and decision records remain, permissions update without data loss. Knowledge transfer: on committee closure, memory is transferred to a permanent searchable archive. Closed committee data is not deleted — it is archived.",
    },
  ],
};

// ── Role-Based User Guide ──
export const roleGuide = {
  sections: [
    {
      title_ar: "مسؤول المؤسسة",
      title_en: "Organization Owner",
      content_ar: "الصفحة الرئيسية: بوابة المؤسسة تعرض جميع اللجان والحالة. الصلاحيات: إنشاء لجان، تعيين الرؤساء، إدارة إعدادات المؤسسة، دعوة المستخدمين. العمليات اليومية: مراجعة حالة اللجان، اعتماد الإنشاءات، إدارة المستخدمين. لا يملك: تعديل قرارات لجنة محددة (هذا دور رئيس اللجنة).",
      content_en: "Home: organization portal showing all committees and status. Permissions: create committees, appoint chairs, manage organization settings, invite users. Daily operations: review committee status, approve creations, manage users. Cannot: modify specific committee decisions (that is the chair's role).",
    },
    {
      title_ar: "رئيس اللجنة",
      title_en: "Committee Chair",
      content_ar: "الصفحة الرئيسية: ملخص تنفيذي للجنة، تنبيهات، اجتماعات قادمة، إجراءات متأخرة. الصلاحيات: اعتماد القرارات، التوقيع، فتح/إغلاق التصويت، تعليق اللجنة. العمليات اليومية: مراجعة جدول الأعمال، اعتماد المحاضر، متابعة الإجراءات. الأخطاء الشائعة: محاولة تعديل قرار معتمد بدل إنشاء إصدار جديد.",
      content_en: "Home: executive committee summary, alerts, upcoming meetings, overdue actions. Permissions: approve decisions, sign, open/close voting, suspend committee. Daily operations: review agenda, approve minutes, follow up on actions. Common mistake: trying to modify an approved decision instead of creating a new version.",
    },
    {
      title_ar: "أمين سر اللجنة",
      title_en: "Committee Secretary",
      content_ar: "الصفحة الرئيسية: عمليات اليوم — اجتماعات تحتاج جدول أعمال، محاضر تحتاج اعتماد، إجراءات تحتاج متابعة. الصلاحيات: إنشاء الاجتماعات، إعداد جدول الأعمال، تسجيل المحضر، إنشاء الإجراءات. العمليات اليومية: جدولة الاجتماعات، إعداد المحاضر، متابعة الإجراءات. الأخطاء الشائعة: نسيان إرسال الدعوات قبل الاجتماع.",
      content_en: "Home: daily operations — meetings needing agenda, minutes needing approval, actions needing follow-up. Permissions: create meetings, prepare agenda, record minutes, create actions. Daily operations: schedule meetings, prepare minutes, follow up on actions. Common mistake: forgetting to send invitations before the meeting.",
    },
    {
      title_ar: "عضو اللجنة",
      title_en: "Committee Member",
      content_ar: "الصفحة الرئيسية: اجتماعات قادمة، قرارات تحت تصويت، إجراءات مُسندة. الصلاحيات: التصويت، رفع الأدلة، التعليق على جدول الأعمال. العمليات اليومية: مراجعة جدول الأعمال قبل الاجتماع، التصويت، تحديث تقدم الإجراءات. الأخطاء الشائعة: عدم التحقق من جدول الأعمال قبل الاجتماع.",
      content_en: "Home: upcoming meetings, decisions under voting, assigned actions. Permissions: vote, upload evidence, comment on agenda. Daily operations: review agenda before meeting, vote, update action progress. Common mistake: not reviewing the agenda before the meeting.",
    },
    {
      title_ar: "المراقب",
      title_en: "Observer",
      content_ar: "الصفحة الرئيسية: عرض اجتماعات وقرارات اللجنة دون صلاحية التصويت. الصلاحيات: الرؤية فقط. العمليات اليومية: متابعة الاجتماعات والقرارات. لا يملك: التصويت، إنشاء الإجراءات، التعديل.",
      content_en: "Home: view committee meetings and decisions without voting rights. Permissions: view only. Daily operations: follow meetings and decisions. Cannot: vote, create actions, modify.",
    },
    {
      title_ar: "مسؤول تقنية المعلومات",
      title_en: "IT Administrator",
      content_ar: "الصفحة الرئيسية: حالة النظام، التكاملات، سجلات التدقيق. الصلاحيات: إدارة التكاملات، مراقبة النظام، إدارة الإعدادات. العمليات اليومية: مراقبة حالة التكاملات، مراجعة سجلات التدقيق، إدارة الإشعارات. الأخطاء الشائعة: تعطيل تكامل دون خطة تدهور رشيق.",
      content_en: "Home: system status, integrations, audit logs. Permissions: manage integrations, monitor system, manage settings. Daily operations: monitor integration health, review audit logs, manage notifications. Common mistake: disabling an integration without a graceful degradation plan.",
    },
    {
      title_ar: "المدقق",
      title_en: "Auditor",
      content_ar: "الصفحة الرئيسية: سجل التدقيق، مصفوفة التتبع، تتبع التغييرات. الصلاحيات: الرؤية الكاملة لسجلات التدقيق. العمليات اليومية: مراجعة سجل التدقيق، التحقق من سلسلة الإثبات، فحص التغييرات. لا يملك: التعديل أو الحذف.",
      content_en: "Home: audit log, traceability matrix, change tracking. Permissions: full visibility of audit logs. Daily operations: review audit log, verify proof chains, examine changes. Cannot: modify or delete.",
    },
  ],
};

// ── System Administration Runbook ──
export const systemAdminRunbook = {
  sections: [
    {
      title_ar: "إدارة المؤسسات واللجان",
      title_en: "Organization & Committee Management",
      content_ar: "إنشاء المؤسسة: عبر بوابة الإنشاء، يُتحقق من التفرد عبر مفتاح المؤسسة. إنشاء اللجنة: عبر معالج الإنشاء، يُستخرج آليًا من وثيقة التأسيس. تعليق اللجنة: يُعلّق الوصول مع حفظ البيانات. إغلاق اللجنة: يُؤرشف مع تحويل الذاكرة. كل عملية موثقة في سجل التدقيق.",
      content_en: "Create organization: via the creation portal, uniqueness verified via organization key. Create committee: via the creation wizard, automated extraction from founding instrument. Suspend committee: suspends access while preserving data. Close committee: archives with memory transfer. Every operation is documented in the audit log.",
    },
    {
      title_ar: "إدارة المستخدمين والأدوار",
      title_en: "User & Role Management",
      content_ar: "دعوة المستخدمين: عبر البريد الإلكتروني مع تحديد الدور (مستخدم/مسؤول). قبول الدعوة: المستخدم يؤكد ويُفعّل. تعليق المستخدم: يُعلّق الوصول مع حفظ البيانات. حذف المستخدم: غير ممكن — يُعلّق فقط. الأدوار: مسؤول منصة، مدير مؤسسة، رئيس لجنة، أمين سر، عضو، مراقب، مدقق.",
      content_en: "Invite users: via email with role assignment (user/admin). Accept invitation: user confirms and is activated. Suspend user: suspends access while preserving data. Delete user: not possible — suspend only. Roles: platform admin, organization admin, committee chair, secretary, member, observer, auditor.",
    },
    {
      title_ar: "قائمة الفحص اليومية",
      title_en: "Daily Checklist",
      content_ar: "1. مراجعة حالة التكاملات (لوحة التكاملات). 2. فحص الإجراءات المتأخرة. 3. مراجعة الاجتماعات المُجدولة لليوم. 4. التحقق من عدم وجود أخطاء في الوظائف الخلفية. 5. مراجعة تنبيهات النظام.",
      content_en: "1. Review integration status (integration panel). 2. Check overdue actions. 3. Review today's scheduled meetings. 4. Verify no backend function errors. 5. Review system alerts.",
    },
    {
      title_ar: "قائمة الفحص الأسبوعية",
      title_en: "Weekly Checklist",
      content_ar: "1. مراجعة سجل التدقيق الأسبوعي. 2. فحص حالة الذاكرة المؤسسية للجان النشطة. 3. مراجعة تقارير الأداء. 4. التحقق من النسخ الاحتياطي. 5. مراجعة طلبات الوصول المعلقة.",
      content_en: "1. Review weekly audit log. 2. Check institutional memory status for active committees. 3. Review performance reports. 4. Verify backup. 5. Review pending access requests.",
    },
    {
      title_ar: "قائمة الفحص الشهرية",
      title_en: "Monthly Checklist",
      content_ar: "1. مراجعة شاملة لسجل التدقيق. 2. تقرير حالة المنصة للإدارة. 3. مراجعة اللجان النشطة والمعلقة. 4. تحديث الإعدادات حسب الحاجة. 5. مراجعة خريطة الطريق والتكاملات المخططة.",
      content_en: "1. Comprehensive audit log review. 2. Platform status report to management. 3. Review active and suspended committees. 4. Update settings as needed. 5. Review roadmap and planned integrations.",
    },
    {
      title_ar: "إجراءات الإغلاق والأرشفة",
      title_en: "Closure & Archiving Procedures",
      content_ar: "إغلاق اللجنة: 1. التحقق من اكتمال جميع الإجراءات. 2. اعتماد جميع المحاضر. 3. تجميع الذاكرة المؤسسية. 4. أرشفة السجلات. 5. تحويل الذاكرة للأرشيف الدائم. 6. تغيير حالة اللجنة إلى مغلقة. لا تُحذف البيانات — تُؤرشف فقط.",
      content_en: "Committee closure: 1. Verify all actions are complete. 2. Approve all minutes. 3. Compile institutional memory. 4. Archive records. 5. Transfer memory to permanent archive. 6. Change committee status to closed. Data is not deleted — archived only.",
    },
    {
      title_ar: "إجراءات الوضع المتدهور",
      title_en: "Degraded Mode Procedures",
      content_ar: "عند تعطل تكامل: الحوكمة تعمل، التكامل يتعطل فقط. يُسجل التعطل في لوحة التكاملات. عند تعطل البريد الإلكتروني: الإشعارات داخل التطبيق تعمل. عند تعطل التقويم: الاجتماعات تُجدول داخل المنصة. عند تعطل كامل: تعمل الحوكمة الأساسية (القرارات، الإجراءات، المحاضر) دون تكاملات.",
      content_en: "On integration failure: governance works, integration only pauses. Failure is recorded in the integration panel. On email failure: in-app notifications work. On calendar failure: meetings are scheduled within the platform. On full failure: core governance (decisions, actions, minutes) works without integrations.",
    },
    {
      title_ar: "جهات الاتصال والتصعيد",
      title_en: "Contacts & Escalation",
      content_ar: "المستوى 1: مسؤول المنصة (مشاكل التشغيل اليومي). المستوى 2: مدير المؤسسة (مشاكل الصلاحيات والإعدادات). المستوى 3: المؤسس (مشاكل النظام والبنية التحتية). التصعيد: من المستوى 1 إلى 2 إلى 3. كل تصعيد موثق.",
      content_en: "Level 1: platform administrator (daily operations issues). Level 2: organization admin (permissions and settings issues). Level 3: founder (system and infrastructure issues). Escalation: from Level 1 to 2 to 3. Every escalation is documented.",
    },
  ],
};