import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CLASSIFICATION, MEMBER_ROLE, COMMITTEE_TYPES } from "@/lib/raqeemUtils";

const ROLE_MATRIX = [
  { role: "chair", ar: "الرئيس", access: ["إدارة الاجتماعات", "اعتماد المحاضر", "تصويت حاسم", "التصعيد"] },
  { role: "vice_chair", ar: "نائب الرئيس", access: ["نيابة الرئيس", "تصويت", "اعتماد المحاضر بالنيابة"] },
  { role: "secretary", ar: "الأمين", access: ["إدارة جدول الأعمال", "تحرير المحاضر", "تتبع الإجراءات", "التصعيد"] },
  { role: "member", ar: "عضو", access: ["تصويت", "عرض الوثائق", "اقتراح بنود"] },
  { role: "observer", ar: "مراقب", access: ["عرض فقط", "بدون تصويت"] },
  { role: "advisor", ar: "مستشار", access: ["تقديم المشورة", "بدون تصويت"] },
];

export default function PermissionsAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">الصلاحيات · Permissions</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">الصلاحيات · Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">مصفوفة الصلاحيات والتصنيفات والتحكم في الوصول</p>
      </div>

      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">مصفوفة الأدوار · Role Matrix</h3>
        </div>
        <div className="divide-y divide-border">
          {ROLE_MATRIX.map((r) => (
            <div key={r.role} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="sm:w-32 text-sm font-medium">{r.ar}</div>
              <div className="flex flex-wrap gap-1.5">
                {r.access.map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">مستويات التصنيف · Classification Levels</h3>
          <div className="space-y-2">
            {Object.entries(CLASSIFICATION).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{v.en}</span>
                <span className="font-medium">{v.ar}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">أنواع اللجان · Committee Types</h3>
          <div className="space-y-2">
            {Object.entries(COMMITTEE_TYPES).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{v.en}</span>
                <span className="font-medium">{v.ar}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}