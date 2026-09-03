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
import { DEMO_USER } from "@/../base44/shared/demoDataset";

export default function Profile() {
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
  const [isDemo, setIsDemo] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        // Detect demo persona — override displayed identity if demo user
        const isDemoUser = u.data?.is_demo_user === true ||
                       u.data?.demo_persona_key === DEMO_USER.persona_key;
        setIsDemo(isDemoUser);
        if (isDemoUser) {
          setUser({
            ...u,
            full_name: DEMO_USER.name_ar,
            email: DEMO_USER.email,
            data: { ...u.data, ...DEMO_USER },
          });
          setFullName(DEMO_USER.name_ar);
          setTitle(DEMO_USER.job_title_ar);
          setInstitutionEmail(DEMO_USER.email);
        } else {
          setUser(u);
          setFullName(u.full_name || "");
          setTitle(u.title || "");
          setInstitutionEmail(u.institution_email || u.email || "");
        }
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
  }, []);

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
    return <p className="text-muted-foreground text-center py-20">تعذر تحميل الملف</p>;
  }

  const initials = (user.full_name || "؟").split(" ").map((w) => w[0]).slice(0, 2).join("");
  const demoPersona = isDemo ? DEMO_USER : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageNav />
      <div>
        <h1 className="text-2xl font-bold text-foreground">الملف الشخصي · Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">هويتك داخل لِجان™</p>
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
                title="تغيير الصورة"
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
            <StatusBadge
              label={user.role === "admin" ? "مدير · Admin" : "مستخدم · User"}
              colorClass={user.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}
            />
            <StatusBadge
              label={`${GOVERNANCE_ROLES[governanceRole]?.ar || "عضو"} · ${GOVERNANCE_ROLES[governanceRole]?.en || "Member"}`}
              colorClass="bg-accent/15 text-accent-foreground"
            />
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
            <h2 className="text-sm font-semibold text-foreground">هوية الشخصية التجريبية · Demo Persona Identity</h2>
            <StatusBadge label="تجريبي · Demo" colorClass="bg-accent/15 text-accent-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">الاسم · Name</Label>
              <div className="text-sm font-medium text-foreground">{demoPersona.name_ar}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{demoPersona.name_en}</div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">البريد الإلكتروني · Email</Label>
              <div className="text-sm font-medium text-foreground" dir="ltr">{demoPersona.email}</div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">الصفة الوظيفية · Job Title</Label>
              <div className="text-sm font-medium text-foreground">{demoPersona.job_title_ar}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{demoPersona.job_title_en}</div>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">الجهة الأساسية · Primary Organization</Label>
              <div className="text-sm font-medium text-foreground">{demoPersona.primary_org_ar}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{demoPersona.primary_org_en}</div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            هذه هوية تجريبية لعرض قدرات المنصة — البيانات غير حقيقية · This is a fictional persona for demo purposes
          </p>
        </div>
      )}

      {/* Institutional Affiliation */}
      <div className="raqeem-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">الجهة المؤسسية · Institutional Affiliation</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          جهتك التابع لها — تُستخدم لمطابقة دخولك في بوابة الدخول المؤسسية · Your affiliated entity — used to match your entry at the Institutional Portal
        </p>

        <div>
          <Label className="text-xs mb-1.5 block">الجهة · Institution</Label>
          <EntitySearchSelect
            value={institutionId}
            onChange={setInstitutionId}
            placeholder="— ابحث أو اختر الجهة · Search or select entity —"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">البريد المؤسسي · Official Email</Label>
            <Input
              type="email"
              dir="ltr"
              value={institutionEmail}
              onChange={(e) => setInstitutionEmail(e.target.value)}
              placeholder="name@institution.gov.qa"
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">الإدارة · Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="مثال: إدارة الشؤون القانونية" />
          </div>
        </div>

        {institutionId && (
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-medium">{findEntity(institutionId)?.ar || ""}</span>
              <span className="text-muted-foreground"> — ستظهر هذه الجهة كمطابقة عند دخولك من بوابة الدخول المؤسسية</span>
            </p>
          </div>
        )}
      </div>

      {/* Details form */}
      <div className="raqeem-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">تفاصيل الحساب · Account Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">الاسم الكامل · Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">البريد الإلكتروني · Email</Label>
            <Input value={user.email} disabled className="bg-muted/50" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">المسمى الوظيفي · Job Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مدير عام" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">الهاتف · Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 ..." />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">نبذة تعريفية · Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة مختصرة عنك" rows={3} />
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">دور الحوكمة · Governance Role</Label>
          <Select value={governanceRole} onValueChange={setGovernanceRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GOVERNANCE_ROLES).map(([key, role]) => (
                <SelectItem key={key} value={key}>
                  {role.ar} · {role.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">يحدد تجربة لوحة التحكم المناسبة لدورك · Determines your home dashboard experience</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1.5" /> تسجيل الخروج
          </Button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم الحفظ
              </span>
            )}
            <Button size="sm" onClick={save} disabled={saving || uploading}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
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
            <h2 className="text-sm font-semibold text-foreground">تفضيلات الإشعارات · Notification Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5">تحكم في قنوات وتوقيت استلام إشعاراتك · Control how and when you receive notifications</p>
          </div>
        </div>
        <span className="text-muted-foreground group-hover:text-primary text-sm">←</span>
      </Link>

      {/* Signature customization */}
      <div className="raqeem-card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <PenLine className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">التوقيع الإلكتروني · E-Signature</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          خصّص توقيعك المستخدم لاعتماد المحاضر والقرارات رسمياً · Customize your signature used to formally approve minutes and decisions
        </p>
        <SignaturePad
          value={{ text: sigText, image_url: sigImage }}
          onChange={(v) => { setSigText(v.text || ""); setSigImage(v.image_url || ""); }}
        />
      </div>
    </div>
  );
}