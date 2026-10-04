import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ShieldCheck, ShieldAlert, FileText, Calendar, User, Lock,
  CheckCircle2, Loader2, Award, Link2,
} from "lucide-react";
import { CLASSIFICATION, formatDate } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import QRCode from "@/components/raqeem/QRCode";
import { Image } from "@/components/ui/image";

/**
 * VerifyRecord — Section 5: QR Verification Page
 * Public page (no auth required) for verifying the authenticity of an
 * institutional product via QR code scan.
 * Route: /verify/:type/:id
 */
export default function VerifyRecord() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [record, setRecord] = useState(null);
  const [committee, setCommittee] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        // Use backend function for public verification (bypasses RLS safely)
        const res = await base44.functions.invoke('VerifyProductInstance', { product_id: id });
        const data = res.data || res;
        if (cancelled) return;
        if (data.error) {
          setError(new Error(data.error));
        } else {
          setRecord(data.product);
          setCommittee(data.committee);
          setSignatures(data.signatures || []);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const verifyUrl = typeof window !== "undefined" ? window.location.href : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="raqeem-card p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-bold text-foreground mb-2">
            {t("وثيقة غير صالحة", "Invalid Document")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "تعذر العثور على هذه الوثيقة أو أنها لم تعد سارية.",
              "This document could not be found or is no longer valid."
            )}
          </p>
        </div>
      </div>
    );
  }

  const isVerified = record.status === "published" || record.status === "approved";
  const classification = CLASSIFICATION[record.classification] || CLASSIFICATION.internal;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {t("لِجان™ — التحقق المؤسسي", "LIJAN™ — Institutional Verification")}
          </span>
        </div>

        {/* Verification status banner */}
        <div className={`raqeem-card p-6 text-center ${isVerified ? "border-emerald-200" : "border-amber-200"}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isVerified ? "bg-emerald-50" : "bg-amber-50"
          }`}>
            {isVerified ? (
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            {isVerified
              ? t("وثيقة معتمدة وموثقة", "Verified & Approved Document")
              : t("وثيقة قيد المراجعة", "Document Under Review")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isVerified
              ? t("تم التحقق من صحة هذه الوثيقة عبر سلسلة البرهان المؤسسي.", "This document has been verified through the institutional proof chain.")
              : t("هذه الوثيقة لم تُعتمد رسمياً بعد.", "This document has not been formally approved yet.")}
          </p>
        </div>

        {/* Document metadata */}
        <div className="raqeem-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("تفاصيل الوثيقة", "Document Details")}
            </h2>
          </div>

          <div>
            <p className="text-lg font-bold text-foreground">{(lang === "ar" ? record.title_ar : record.title) || record.title || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("نوع المنتج", "Product Type")}: {record.product_type || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("التصنيف", "Classification")}</p>
                <p className="text-xs font-medium text-foreground">{lang === "ar" ? classification.ar : classification.en}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("الحالة", "Status")}</p>
                <p className="text-xs font-medium text-foreground">{record.status || "—"}</p>
              </div>
            </div>
            {record.generated_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("تاريخ الإنشاء", "Generated")}</p>
                  <p className="text-xs font-medium text-foreground">{formatDate(record.generated_at)}</p>
                </div>
              </div>
            )}
            {record.generated_by_name && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("مولّد بواسطة", "Generated By")}</p>
                  <p className="text-xs font-medium text-foreground">{record.generated_by_name}</p>
                </div>
              </div>
            )}
            {record.approved_by_name && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("معتمد بواسطة", "Approved By")}</p>
                  <p className="text-xs font-medium text-foreground">{record.approved_by_name}</p>
                </div>
              </div>
            )}
            {record.approved_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("تاريخ الاعتماد", "Approved At")}</p>
                  <p className="text-xs font-medium text-foreground">{formatDate(record.approved_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Committee context */}
        {committee && (
          <div className="raqeem-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("الجهة المُصدِرة", "Issuing Body")}</h3>
            </div>
            <p className="text-sm font-medium text-foreground">
              {lang === "ar" ? committee.name_ar : committee.name_en || committee.name_ar}
            </p>
            {committee.mandate && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{committee.mandate}</p>
            )}
          </div>
        )}

        {/* Signatures */}
        {signatures.length > 0 && (
          <div className="raqeem-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("التواقيع المعتمدة", "Verified Signatures")}</h3>
            </div>
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/30">
                  {sig.signature_image_url ? (
                    <Image src={sig.signature_image_url} alt={sig.signer_name} className="w-16 h-10 object-contain" />
                  ) : (
                    <div className="w-16 h-10 flex items-center justify-center text-[10px] text-muted-foreground italic">
                      {sig.signature_text || sig.signer_name}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{sig.signer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{sig.signer_role || ""}</p>
                  </div>
                  {sig.signed_at && (
                    <span className="text-[10px] text-muted-foreground">{formatDate(sig.signed_at)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR code for sharing */}
        <div className="raqeem-card p-6 flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            {t("امسح هذا الرمز للتحقق المباشر", "Scan this code for direct verification")}
          </p>
          <QRCode value={verifyUrl} size={140} label={t("رمز التحقق", "Verification Code")} />
          <div className="w-full pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-mono" dir="ltr">{record.id?.slice(0, 12)}…</span>
            <span>{t("سلسلة البرهان المؤسسي", "Institutional Proof Chain")}</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground pt-2">
          {t(
            "لِجان™ — نظام التشغيل المؤسسي الوطني للمجالس واللجان",
            "LIJAN™ — National Institutional Operating System for Councils & Committees"
          )}
        </p>
      </div>
    </div>
  );
}