import React, { useEffect, useState } from "react";
import { L } from "@/lib/l10n";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CLASSIFICATION } from "@/lib/raqeemUtils";

export default function SettingsAdmin() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Institution.list()
      .then(setInstitutions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">الإعدادات · Settings</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات · Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">الإعدادات العامة وسياسات الاحتفاظ والتصنيف</p>
      </div>

      <div className="raqeem-card p-5">
        <h3 className="text-sm font-semibold mb-3">سياسة الاحتفاظ الافتراضية · Default Retention Policy</h3>
        <div className="text-sm text-muted-foreground">
          مدة الاحتفاظ الافتراضية بالسجلات المؤسسية: <span className="font-semibold text-foreground">7 سنوات</span>، قابلة للتعديل لكل مؤسسة.
        </div>
      </div>

      <div className="raqeem-card p-5">
        <h3 className="text-sm font-semibold mb-3">مستويات التصنيف الافتراضية · Default Classification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(CLASSIFICATION).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-secondary/50">
              <span className="text-muted-foreground">{v.en}</span>
              <span className="font-medium">{v.ar}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">المؤسسات المسجّلة · Registered Institutions ({institutions.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : (
          <div className="divide-y divide-border">
            {institutions.map((inst) => (
              <div key={inst.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{L.name(inst)}</div>
                  <div className="text-xs text-muted-foreground">{inst.name_en}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  الاحتفاظ: {inst.retention_policy_years || 7} سنة
                </div>
              </div>
            ))}
            {institutions.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">لا توجد مؤسسات مسجّلة</div>}
          </div>
        )}
      </div>
    </div>
  );
}