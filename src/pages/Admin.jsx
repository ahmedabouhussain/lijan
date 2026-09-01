import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Settings, Users, Building2, Shield, Bell, Link2, Plus } from "lucide-react";

export default function Admin() {
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    base44.entities.Institution.list().then(setInstitutions).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإدارة · Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة المؤسسة والمستخدمين والسياسات والتكاملات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/institutions/new" className="raqeem-card p-5 hover:border-primary/40 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">المؤسسة · Institution</h3>
          <p className="text-xs text-muted-foreground mb-3">الملف والهوية والسياسات</p>
          <div className="text-xs text-muted-foreground">{institutions.length} مؤسسة مسجلة · إنشاء جديدة</div>
        </Link>
        <div className="raqeem-card p-5">
          <Users className="w-5 h-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">المستخدمون · Users</h3>
          <p className="text-xs text-muted-foreground mb-3">الأدوار والصلاحيات</p>
          <div className="text-xs text-muted-foreground">دعوة وإدارة المستخدمين</div>
        </div>
        <div className="raqeem-card p-5">
          <Shield className="w-5 h-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">الصلاحيات · Permissions</h3>
          <p className="text-xs text-muted-foreground mb-3">مصفوفة الصلاحيات والتصنيفات</p>
          <div className="text-xs text-muted-foreground">التحكم في الوصول</div>
        </div>
        <div className="raqeem-card p-5">
          <Bell className="w-5 h-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">التنبيهات · Notifications</h3>
          <p className="text-xs text-muted-foreground mb-3">إعدادات الإشعارات والتنبيهات</p>
          <div className="text-xs text-muted-foreground">قواعد التصعيد</div>
        </div>
        <div className="raqeem-card p-5">
          <Link2 className="w-5 h-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">التكاملات · Integrations</h3>
          <p className="text-xs text-muted-foreground mb-3">مزودو الاجتماعات والتقويم والهوية</p>
          <div className="text-xs text-muted-foreground">طبقة التجريد · Integration Fabric</div>
        </div>
        <div className="raqeem-card p-5">
          <Settings className="w-5 h-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold mb-1">الإعدادات · Settings</h3>
          <p className="text-xs text-muted-foreground mb-3">الإعدادات العامة والسياسات</p>
          <div className="text-xs text-muted-foreground">الاحتفاظ والتصنيف</div>
        </div>
      </div>
    </div>
  );
}