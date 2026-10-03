import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  User as UserIcon, Mail, Shield, Save, Camera, Phone, Briefcase,
  CheckCircle2, LogOut, PenLine, Building2, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOVERNANCE_ROLES } from "@/components/raqeem/home/shared";
import { Image } from "@/components/ui/image";
import SignaturePad from "@/components/raqeem/SignaturePad";
import PageNav from "@/components/raqeem/PageNav";
import { findEntity } from "@/lib/qatariEntities";
import EntitySearchSelect from "@/components/raqeem/EntitySearchSelect";
import { resolveDemoPersona } from "@/lib/demoPersonas";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { useLanguage } from "@/lib/LanguageContext";
import DemoBanner from "@/components/raqeem/DemoBanner";

export default function Profile() {
  const { isDemoMode, effectiveActor, demoPersonaKey } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState("");
  const [governanceRole, setGovernanceRole] = useState("member");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [sigText, setSigText] = useState("");
  const [sigImage, setSigImage] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionEmail, setInstitutionEmail] = useState("");
  const [department, setDepartment] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: use the active demo persona — never touch the real user record
      const persona = resolveDemoPersona(demoPersonaKey);
      setUser(effectiveActor);
      setFullName(persona.name_ar);
      setTitle(persona.job_title_ar);
      setInstitutionEmail(persona.email);
      setGovernanceRole("member"); // Demo users are never admin
      setLoading(false);
    } else {
      // Normal mode: load real user profile
      base44.auth
        .me()
        .then((u) => {
          setUser(u);
          setFullName(u.full_name || "");
          setTitle(u.title || "");
          setInstitutionEmail(u.institution_email || u.email || "");
          setGovernanceRole(u.governance_role || "member");
          setAvatarUrl(u.avatar_url || "");
          setPhone(u.phone || "");
          setBio(u.bio || "");
          setSigText(u.signature_text || "");
          setSigImage(u.signature_image_url || "");
          setInstitutionId(u.institution_id || "");
          setDepartment(u.department || "");
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isDemoMode, effectiveActor, demoPersonaKey]);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } catch {
    }
    setUploading(false);
  };

  const save = async () => {
    // In demo mode, changes are local only — never written to the real user record
    if (isDemoMode) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    setSaving(true);
    try {
      const selectedEntity = findEntity(institutionId);
      const affiliationData = {
        full_name: fullName,
        governance_role: governanceRole,
        avatar_url: avatarUrl,
        title,
        phone,
        bio,
        signature_text: sigText,
        signature_image_url: sigImage,
        institution_id: institutionId,
        institution_name_ar: selectedEntity?.ar || "",
        institution_name_en: selectedEntity?.en || "",
        institution_email: institutionEmail,
        department,
      };
      await base44.auth.updateMe(affiliationData);
      // Persist affiliation locally so the Entry Portal can match it
      localStorage.setItem("lijan_profile_affiliation", JSON.stringify({
        institution_id: institutionId,
        institution_name_ar: selectedEntity?.ar || "",
        institution_name_en: selectedEntity?.en || "",
        institution_email: institutionEmail,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    }
    setSaving(false);
  };

  const logout = () => base44.auth.logout();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground text-center py-20">{t("تعذر تحميل الملف", "Could not load the profile")}</p>;
  }

  const initials = (user.full_name || "؟").split(" ").map((w) => w[0]).slice(0, 2).join("");
  const demoPersona = isDemoMode ? resolveDemoPersona(demoPersonaKey) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {isDemoMode && <DemoBanner />}
      <PageNav />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("الملف الشخصي", "Profile")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("هويتك داخل لِجان™", "Your identity within LIJAN™")}</p>
      </div>

      {/* Identity header card */}
      <div className="raqeem-card overflow-hidden">
        <div className="h-20 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full border-4 border-card bg-primary/10 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                title={t("تغيير الصورة", "Change photo")}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </div>
            <div className="flex-1 pb-1">
              <div className="text-xl font-bold text-foreground">{user.full_name || "—"}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {isDemoMode ? (
              <StatusBadge
                label={t("حساب تجريبي", "Demo Account")}
                colorClass="bg-accent/15 text-accent-foreground"
              />
            ) : (
              <StatusBadge
                label={user.role === "admin" ? t("مدير", "Admin") : t("مستخدم", "User")}
                colorClass={user.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}
              />
            )}
            {!isDemoMode && (
              <StatusBadge
                label={(lang === "ar" ? GOVERNANCE_ROLES[governanceRole]?.ar : GOVERNANCE_ROLES[governanceRole]?.en) || t("عضو", "Member")}
                colorClass="bg-accent/15 text-accent-foreground"
              />
            )}
            {title && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="w-3 h-3" /> {title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Demo Persona Info — bilingual identity card */}
      {demoPersona && (
        <div className="raqeem-card p-6 space-y-4 border-accent/30">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Shield className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">{t("هوية الشخصية التجريبية", "Demo Persona Identity")}</h2>
            <StatusBadge label={t("تجريبي", "Demo")} colorClass="bg-accent/15 text-accent-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("الاسم", "Name")}</Label>
              <div className="text-sm font-medium text-foreground">
                {lang === "ar" ? demoPersona.name_ar : demoPersona.name_en}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("البريد الإلكتروني", "Email")}</Label>
              <div className="text-sm font-medium text-foreground" dir="ltr">{demoPersona.email}</div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("الصفة الوظيفية", "Job Title")}</Label>
              <div className="text-sm font-medium text-foreground">
                {lang === "ar" ? demoPersona.job_title_ar : demoPersona.job_title_en}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("الجهة الأساسية", "Primary Organization")}</Label>
              <div className="text-sm font-medium text-foreground">
                {lang === "ar" ? demoPersona.primary_org_ar : demoPersona.primary_org_en}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            {t(
              "هذه هوية تجريبية لعرض قدرات المنصة — البيانات غير حقيقية",
              "This is a fictional persona for demonstration purposes"
            )}
          </p>
        </div>
      )}

      {/* Institutional Affiliation */}
      <div className="raqeem-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("الجهة المؤسسية", "Institutional Affiliation")}</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {t(
            "جهتك التابع لها — تُستخدم لمطابقة دخولك في بوابة الدخول المؤسسية",
            "Your affiliated entity — used to match your entry at the Institutional Entry Portal"
          )}
        </p>

        <div>
          <Label className="text-xs mb-1.5 block">{t("الجهة", "Institution")}</Label>
          <EntitySearchSelect
            value={institutionId}
            onChange={setInstitutionId}
            placeholder={t("— ابحث أو اختر الجهة —", "— Search or select entity —")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">{t("البريد المؤسسي", "Official Email")}</Label>
            <Input
              type="email"
              dir="ltr"
              value={institutionEmail}
              onChange={(e) => setInstitutionEmail(e.target.value)}
              placeholder="name@institution.gov.qa"
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{t("الإدارة", "Department")}</Label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t("مثال: إدارة الشؤون القانونية", "e.g. Legal Affairs Department")}
            />
          </div>
        </div>

        {institutionId && (
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-medium">
                {(lang === "ar" ? findEntity(institutionId)?.ar : findEntity(institutionId)?.en) || ""}
              </span>
              <span className="text-muted-foreground">
                {" — "}
                {t(
                  "ستظهر هذه الجهة كمطابقة عند دخولك من بوابة الدخول المؤسسية",
                  "This entity will appear as a match when you sign in from the Institutional Entry Portal"
                )}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Details form */}
      <div className="raqeem-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("تفاصيل الحساب", "Account Details")}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">{t("الاسم الكامل", "Full Name")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("الاسم الكامل", "Full Name")} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{t("البريد الإلكتروني", "Email")}</Label>
            <Input value={user.email} disabled className="bg-muted/50" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{t("المسمى الوظيفي", "Job Title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("مثال: مدير عام", "e.g. Director General")}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">{t("الهاتف", "Phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 ..." />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">{t("نبذة تعريفية", "Bio")}</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("نبذة مختصرة عنك", "A short introduction about you")}
            rows={3}
          />
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">{t("دور الحوكمة", "Governance Role")}</Label>
          <Select value={governanceRole} onValueChange={setGovernanceRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOVERNANCE_ROLES).map(([key, role]) => (
                <SelectItem key={key} value={key}>
                  {lang === "ar" ? role.ar : role.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">
            {t("يحدد تجربة لوحة التحكم المناسبة لدورك", "Determines your home dashboard experience")}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1.5" /> {t("تسجيل الخروج", "Log Out")}
          </Button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("تم الحفظ", "Saved")}
              </span>
            )}
            <Button size="sm" onClick={save} disabled={saving || uploading}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ التغييرات", "Save Changes")}
            </Button>
          </div>
        </div>
      </div>

      {/* Notification preferences link */}
      <Link to="/notification-preferences" className="raqeem-card p-5 flex items-center justify-between hover:shadow-md transition-all group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("تفضيلات الإشعارات", "Notification Preferences")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("تحكم في قنوات وتوقيت استلام إشعاراتك", "Control how and when you receive notifications")}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground group-hover:text-primary text-sm">←</span>
      </Link>

      {/* Signature customization */}
      <div className="raqeem-card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <PenLine className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("التوقيع الإلكتروني", "E-Signature")}</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          {t(
            "خصّص توقيعك المستخدم لاعتماد المحاضر والقرارات رسمياً",
            "Customize the signature used to formally approve minutes and decisions"
          )}
        </p>
        <SignaturePad
          value={{ text: sigText, image_url: sigImage }}
          onChange={(v) => { setSigText(v.text || ""); setSigImage(v.image_url || ""); }}
        />
      </div>
    </div>
  );
}