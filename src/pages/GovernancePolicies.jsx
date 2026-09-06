import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, ShieldCheck, Lock, FileText, Scale, Eye, Layers } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

export default function GovernancePolicies() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState("governance");

  const dir = isAr ? "rtl" : "ltr";

  const tabs = [
    {
      key: "governance",
      icon: Scale,
      labelAr: "سياسة الحوكمة",
      labelEn: "Governance Policy",
    },
    {
      key: "classification",
      icon: Layers,
      labelAr: "سياسة التصنيف المؤسسي",
      labelEn: "Institutional Classification Policy",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{t("رجوع", "Back")}</span>
          </button>
          <div className="h-9 w-28 overflow-hidden shrink-0">
            <Image
              src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png"
              alt="LIJAN™"
              fittingType="fit"
              className="w-full h-full"
            />
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {t("سياسات الحوكمة والتصنيف المؤسسي", "Governance & Institutional Classification Policies")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t(
                "تحدد هذه السياسات الإطار المؤسسي لاستخدام منصة لِجان™ وحماية المعلومات والسلوك الحوكمي المعتمد.",
                "These policies define the institutional framework for using the LIJAN™ platform, information protection, and approved governance conduct."
              )}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 mb-8 justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {isAr ? tab.labelAr : tab.labelEn}
                </button>
              );
            })}
          </div>

          {/* Policy Content */}
          <div className="raqeem-card p-6 sm:p-10">
            {activeTab === "governance" ? <GovernancePolicyContent isAr={isAr} t={t} /> : <ClassificationPolicyContent isAr={isAr} t={t} />}
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <PoweredByConnection variant="dark" />
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-md">
              {t(
                "باستخدامك للمنصة فإنك توافق على الالتزام بهذه السياسات. آخر تحديث: سبتمبر 2026.",
                "By using this platform you agree to comply with these policies. Last updated: September 2026."
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Governance Policy ── */
function GovernancePolicyContent({ isAr, t }) {
  const sections = isAr
    ? [
        {
          icon: Scale,
          title: "1. النطاق والغرض",
          body: "تطبّق سياسة الحوكمة هذه على جميع المستخدمين والجهات المؤسسية على منصة لِجان™. الهدف هو ضمان أن تكون عمليات تشكيل اللجان واتخاذ القرارات وإصدار الوثائق مؤسسية، موثّقة، وقابلة للتدقيق.",
        },
        {
          icon: FileText,
          title: "2. السلطة المؤسسة",
          body: "كل لجنة يجب أن تستند إلى صلاحية (Mandate) موثّقة ومرجع تأسيسي معتمد (قرار، مرسوم، ميثاق). لا تُنشأ لجنة دون مرجع قانوني أو تنظيمي واضح يحدد نطاقها وصلاحياتها.",
        },
        {
          icon: Eye,
          title: "3. الشفافية والتدقيق",
          body: "جميع القرارات والمحاضر والوثائق الرسمية تُسجّل في سجل تدقيق دائم. يحق للجهات المخوّلة بالتدقيق مراجعة سلسلة الإثبات (Proof Chain) لكل قرار من المنشأ حتى النشر.",
        },
        {
          icon: Lock,
          title: "4. فصل الصلاحيات",
          body: "تُطبّق مبادئ فصل الصلاحيات بين منشئ القرار، المُعتمِد، والمنفّذ. لا يجوز لشخص واحد أن يجمع صلاحيتي الإنشاء والاعتماد النهائي للوثيقة الرسمية نفسها.",
        },
        {
          icon: Scale,
          title: "5. النصاب والتصويت",
          body: "تُتخذ القرارات وفق قاعدة النصاب المحددة للجنة (بسيطة، ثلثين، إجماع، أو يقررها الرئيس). تُسجّل أصوات الامتناع والتحفظات في المحضر الرسمي ولا تُمحى.",
        },
        {
          icon: FileText,
          title: "6. إدارة التعارض",
          body: "على العضو الإفصاح عن أي تعارض مصالح قبل المداولات أو التصويت. يُسجّل التنحي (Recusal) رسمياً ويُستبعد العضو من التصويت على البند المعني دون حرمان من المداولة.",
        },
        {
          icon: Eye,
          title: "7. الذاكرة المؤسسية",
          body: "تُحفظ الذاكرة المؤسسية للجنة عبر دورات التشكيل والتعديلات. عند تجديد اللجنة أو تعديل تشكيلها، تُنقل المعرفة والسياقات والقرارات السابقة إلى التشكيل الجديد لضمان الاستمرارية الحوكمية.",
        },
        {
          icon: Lock,
          title: "8. الامتثال والعقوبات",
          body: "أي مخالفة لهذه السياسة (تزوير، تجاوز صلاحية، إتلاف سجل) تُحال إلى مراجعة إدارية. قد تؤدي إلى تعليق الصلاحيات أو إغلاق اللجنة مؤقتاً ريثما تُستكمل المراجعة.",
        },
      ]
    : [
        {
          icon: Scale,
          title: "1. Scope & Purpose",
          body: "This governance policy applies to all users and institutional entities on the LIJAN™ platform. Its purpose is to ensure that committee formation, decision-making, and document issuance are institutional, documented, and auditable.",
        },
        {
          icon: FileText,
          title: "2. Institutional Authority",
          body: "Every committee must be grounded in a documented mandate and an approved establishing instrument (decision, decree, charter). No committee is created without a clear legal or regulatory reference defining its scope and authority.",
        },
        {
          icon: Eye,
          title: "3. Transparency & Auditability",
          body: "All decisions, minutes, and official records are logged in a permanent audit trail. Authorized audit bodies may review the Proof Chain of any decision from origin to publication.",
        },
        {
          icon: Lock,
          title: "4. Separation of Duties",
          body: "Principles of separation of duties are enforced between the decision drafter, approver, and executor. No single person may hold both creation and final approval authority for the same official document.",
        },
        {
          icon: Scale,
          title: "5. Quorum & Voting",
          body: "Decisions are taken according to the committee's defined quorum rule (simple majority, two-thirds, unanimous, or chair-decides). Abstentions and reservations are recorded in the official minutes and never erased.",
        },
        {
          icon: FileText,
          title: "6. Conflict of Interest Management",
          body: "A member must disclose any conflict of interest before deliberations or voting. Recusal is formally recorded and the member is excluded from voting on the relevant item without losing the right to deliberate.",
        },
        {
          icon: Eye,
          title: "7. Institutional Memory",
          body: "Committee institutional memory is preserved across formation cycles and amendments. Upon committee renewal or formation change, knowledge, context, and prior decisions are transferred to the new formation to ensure governance continuity.",
        },
        {
          icon: Lock,
          title: "8. Compliance & Sanctions",
          body: "Any breach of this policy (falsification, authority override, record destruction) is referred for administrative review. It may result in suspension of privileges or temporary committee closure pending review completion.",
        },
      ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-1">
          {isAr ? "سياسة الحوكمة المؤسسية" : "Institutional Governance Policy"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "الإطار الحوكمي المعتمد لإدارة المجالس واللجان على المنصة."
            : "The approved governance framework for managing councils and committees on the platform."}
        </p>
      </div>
      {sections.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex gap-4">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Classification Policy ── */
function ClassificationPolicyContent({ isAr, t }) {
  const levels = isAr
    ? [
        { level: "عام", levelEn: "Public", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "معلومات يمكن نشرها للعموم دون قيود. لا تتطلب ضوابط وصول خاصة." },
        { level: "داخلي", levelEn: "Internal", color: "bg-blue-100 text-blue-700 border-blue-200", desc: "معلومات للاستخدام الداخلي للجهة وأعضاء اللجان. لا تُنشر خارج السياق المؤسسي." },
        { level: "سري", levelEn: "Confidential", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "معلومات حساسة تُقيّد الوصول إليها للأشخاص المخوّلين فقط. تُسجّل عمليات الاطلاع." },
        { level: "مقيّد", levelEn: "Restricted", color: "bg-orange-100 text-orange-700 border-orange-200", desc: "معلومات عالية الحساسية. الوصول بموافقة مسبقة وتوقيع التزام. يُمنع النسخ أو الإخراج." },
        { level: "عالي التقييد", levelEn: "Highly Restricted", color: "bg-red-100 text-red-700 border-red-200", desc: "أعلى مستوى حماية. وصول محدود جداً ومراقب. أي تسريب يُعدّ خرقاً جسيماً." },
      ]
    : [
        { level: "Public", levelEn: "Public", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Information that may be published to the public without restrictions. No special access controls required." },
        { level: "Internal", levelEn: "Internal", color: "bg-blue-100 text-blue-700 border-blue-200", desc: "Information for internal use by the entity and committee members. Not published outside the institutional context." },
        { level: "Confidential", levelEn: "Confidential", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "Sensitive information restricted to authorized persons only. Access events are logged." },
        { level: "Restricted", levelEn: "Restricted", color: "bg-orange-100 text-orange-700 border-orange-200", desc: "Highly sensitive information. Access requires prior approval and a signed undertaking. Copying or extraction prohibited." },
        { level: "Highly Restricted", levelEn: "Highly Restricted", color: "bg-red-100 text-red-700 border-red-200", desc: "Highest protection level. Very limited and monitored access. Any leak constitutes a serious breach." },
      ];

  const rules = isAr
    ? [
        "تُطبّق سياسة التصنيف الافتراضية للجهة على جميع الوثائق والقرارات والمحاضر ما لم يُحدد خلاف ذلك.",
        "يُحدّد مستوى التصنيف عند إنشاء الوثيقة ولا يُخفّض إلا بموافقة الجهة المخوّلة وتسجيل سبب التغيير.",
        "تُورّث الوثائق المشتقة (محاضر، تقارير) تصنيف أعلى مصدرها ما لم تُنقّى صراحةً.",
        "تُسجّل عمليات الاطلاع والتنزيل للوثائق المصنّفة «سري» فأعلى في سجل التدقيق.",
        "يُمنع نسخ أو إخراج أو تصوير الوثائق المصنّفة «مقيّد» و«عالي التقييد» خارج المنصة.",
        "عند انتهاء اللجنة أو إغلاقها، تُحفظ الوثائق وفق سياسة الاحتفاظ المحددة للجهة (افتراضياً 7 سنوات).",
      ]
    : [
        "The entity's default classification policy applies to all documents, decisions, and minutes unless otherwise specified.",
        "Classification level is set at document creation and may only be downgraded by an authorized body with the reason recorded.",
        "Derived documents (minutes, reports) inherit the higher classification of their source unless explicitly sanitized.",
        "Access and download events for documents classified 'Confidential' or higher are logged in the audit trail.",
        "Copying, extracting, or photographing documents classified 'Restricted' and 'Highly Restricted' outside the platform is prohibited.",
        "Upon committee termination or closure, documents are retained per the entity's retention policy (default 7 years).",
      ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-1">
          {isAr ? "سياسة التصنيف المؤسسي" : "Institutional Classification Policy"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "مستويات التصنيف المعتمدة وقواعد التعامل مع المعلومات المؤسسية."
            : "Approved classification levels and rules for handling institutional information."}
        </p>
      </div>

      {/* Classification Levels */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isAr ? "مستويات التصنيف" : "Classification Levels"}
        </h3>
        <div className="space-y-3">
          {levels.map((l, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0 w-fit ${l.color}`}>
                {isAr ? l.level : l.levelEn}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Handling Rules */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isAr ? "قواعد التعامل" : "Handling Rules"}
        </h3>
        <ul className="space-y-2.5">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}