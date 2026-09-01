import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { User, Mail, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOVERNANCE_ROLES } from "@/components/raqeem/home/shared";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [governanceRole, setGovernanceRole] = useState("member");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        setUser(u);
        setFullName(u.full_name || "");
        setGovernanceRole(u.governance_role || "member");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: fullName, governance_role: governanceRole });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    }
    setSaving(false);
  };

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الملف الشخصي · Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">هويتك داخل رَقِيم™</p>
      </div>

      <div className="raqeem-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">{user.full_name || "—"}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">الاسم الكامل</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" />
          </div>
          <div>
            <Label className="text-xs">البريد الإلكتروني</Label>
            <Input value={user.email} disabled className="bg-muted/50" />
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">الدور:</span>
            <StatusBadge
              label={user.role === "admin" ? "مدير" : "مستخدم"}
              colorClass={user.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}
            />
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
          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            {saved && <span className="text-xs text-emerald-600">تم الحفظ</span>}
          </div>
        </div>
      </div>
    </div>
  );
}