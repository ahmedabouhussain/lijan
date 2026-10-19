import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Mail, Shield, Save, Camera, Briefcase,
  CheckCircle2, LogOut, PenLine, Building2, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOVERNANCE_ROLES } from "@/components/raqeem/home/shared";
import SignaturePad from "@/components/raqeem/SignaturePad";
import SecureFileImage from "@/components/raqeem/SecureFileImage";
import { Image as ContentImage } from "@/components/ui/image";
import { uploadPrivateFile, logFileAccess, isPublicFileUrl } from "@/lib/secureFiles";
import PageNav from "@/components/raqeem/PageNav";
import { findEntity } from "@/lib/qatariEntities";
import EntitySearchSelect from "@/components/raqeem/EntitySearchSelect";
import { resolveDemoPersona } from "@/lib/demoPersonas";
import MissingValue from "@/components/raqeem/MissingValue";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { useLanguage } from "@/lib/LanguageContext";

export default function Profile() {
  const { isDemoMode, effectiveActor, demoPersonaKey } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
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
  const [personaProfile, setPersonaProfile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: use the active demo persona — never touch the real user record. A saved
      // exploration profile (governed demonstration data) overrides the registry defaults,
      // so edits made here survive reloads and other devices.
      const persona = resolveDemoPersona(demoPersonaKey);
      (async () => {
        let profile = null;
        try {
          const page = await base44.entities.DemoPersonaProfile.filter(
            { persona_key: persona.key },
            { limit: 1 }
          );
          profile = page.items?.[0] || null;
        } catch {
          // No saved exploration profile yet — the registry values stand on their own.
        }
        setPersonaProfile(profile);
        // The governed demonstration identity is bilingual: the ACTIVE language's own edition is
        // shown (the registry carries both), and the other language is never substituted for a
        // value that was not authored in this one.
        const isAr = lang === "ar";
        const displayName = isAr
          ? (profile?.full_name || persona.name_ar)
          : (profile?.full_name_en || persona.name_en);
        const jobTitle = isAr
          ? (profile?.job_title || persona.job_title_ar)
          : (profile?.job_title_en || persona.job_title_en);
        setUser({ ...effectiveActor, full_name: displayName });
        setFullName(displayName);
        setTitle(jobTitle);
        setInstitutionEmail(profile?.institution_email || persona.email);
        // A demonstration persona carries its own approved photo — part of the governed demo
        // identity, so a public asset renders directly and a private reference stays signed.
        setAvatarUrl(profile?.avatar_url || persona.avatar_url || "");
        setGovernanceRole(profile?.governance_role || "member"); // Demo users are never admin
        setPhone(profile?.phone || "");
        setBio(isAr ? (profile?.bio || "") : (profile?.bio_en || ""));
        setSigText(profile?.signature_text || "");
        setSigImage(profile?.signature_image_url || "");
        setInstitutionId(profile?.institution_id || "");
        setDepartment(profile?.department || "");
        setLoading(false);
      })();
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
  }, [isDemoMode, effectiveActor, demoPersonaKey, lang]);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // A personal photo is private by default: it is stored privately and rendered
      // through a short-lived signed link inside the authorised surfaces only.
      const file_uri = await uploadPrivateFile(file);
      // Recorded without a record id, so the audit row is keyed by the file itself: that
      // is what lets the governed gate serve this draft photo back to its uploader only.
      await logFileAccess({ action: "upload", fileRef: file_uri, entityType: "UserProfile", title: file.name });
      setAvatarUrl(file_uri);
    } catch (error) {
      console.warn("The personal photo could not be stored:", error?.message || error);
    }
    setUploading(false);
  };

  const save = async () => {
    const selectedEntity = findEntity(institutionId);
    setSaving(true);
    setSaveError("");
    try {
      if (isDemoMode) {
        // The exploration session keeps its own governed demonstration record — never the
        // real user account, never production data. This record is what makes the edits made
        // inside the session permanent; the registry stays the default when none exists yet.
        const persona = resolveDemoPersona(demoPersonaKey);
        const stored = personaProfile || {};
        await base44.entities.DemoPersonaProfile.upsert(
          [
            {
              persona_key: persona.key,
              // The edited values are written to the ACTIVE language's own fields; the other
              // language's stored edition is carried over untouched — never overwritten by the
              // language being edited, and never invented.
              full_name: isAr ? fullName : (stored.full_name || ""),
              job_title: isAr ? title : (stored.job_title || ""),
              bio: isAr ? bio : (stored.bio || ""),
              full_name_en: isAr ? (stored.full_name_en || "") : fullName,
              job_title_en: isAr ? (stored.job_title_en || "") : title,
              bio_en: isAr ? (stored.bio_en || "") : bio,
              phone,
              bio,
              governance_role: governanceRole,
              avatar_url: avatarUrl,
              signature_text: sigText,
              signature_image_url: sigImage,
              institution_id: institutionId,
              institution_name_ar: selectedEntity?.ar || "",
              institution_name_en: selectedEntity?.en || "",
              institution_email: institutionEmail,
              department,
              is_demo_data: true,
              demo_dataset: persona.dataset || "",
            },
          ],
          { key: "persona_key" }
        );
        setUser((prev) => ({ ...prev, full_name: fullName }));
      } else {
        await base44.auth.updateMe({
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
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      // A failed save must be visible: swallowing it reads as "nothing was saved".
      setSaveError(error?.message || t("تعذر حفظ التغييرات", "Could not save the changes"));
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
  // A field the active language has no edition of is reported as such — the other language is
  // never displayed in its place (see MissingValue).
  const isAr = lang === "ar";
  const otherLangBio = isDemoMode
    ? (isAr ? (personaProfile?.bio_en || "") : (personaProfile?.bio || ""))
    : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
                {avatarUrl && isPublicFileUrl(avatarUrl) ? (
                  <ContentImage
                    src={avatarUrl}
                    alt={t("الصورة الشخصية", "Profile photo")}
                    fittingType="fill"
                    className="w-full h-full object-cover"
                  />
                ) : avatarUrl ? (
                  <SecureFileImage fileRef={avatarUrl} entityType="UserProfile" alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elevation-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
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
            <h2 className="text-sm font-semibold text-foreground">{t("هوية جلسة الاستكشاف", "Exploration Session Identity")}</h2>
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
              "جلسة استكشاف على بيانات معزولة — لا تتصل ببيانات الإنتاج",
              "Exploration session on isolated data — no connection to production data"
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
            "جهتك التابع لها — تُحل عضوياتك وصلاحياتك على الخادم بعد تسجيل الدخول",
            "Your affiliated entity — your memberships and authority are resolved on the server after sign-in"
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
                  "تُعرض هذه الجهة كسياقك المؤسسي الأساسي بعد تسجيل الدخول",
                  "This entity is shown as your primary organizational context after sign-in"
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
          {isDemoMode && !bio && otherLangBio && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <MissingValue entity="DemoPersonaProfile" record={{ ...personaProfile, bio_ar: personaProfile?.bio || "" }} fieldKey="bio" />
              <span className="text-xs text-muted-foreground">
                {t(
                  "— أضفها بالعربية لتظهر هنا.",
                  "— add it in English for it to appear here."
                )}
              </span>
            </div>
          )}
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
            {isDemoMode && (
              <span className="text-xs text-muted-foreground text-end max-w-[16rem]">
                {t(
                  "جلسة استكشاف — تُحفظ التغييرات في بيانات العرض المعزولة، لا على سجلك الحقيقي",
                  "Exploration session — changes are saved to the isolated demonstration data, not to your real record"
                )}
              </span>
            )}
            {saveError && <span className="text-xs text-destructive">{saveError}</span>}
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
      <Link to="/notification-preferences" className="raqeem-card p-5 flex items-center justify-between hover:shadow-elevation-3 transition-all group">
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