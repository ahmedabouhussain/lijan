import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ShieldCheck, ShieldAlert, FileText, Calendar, CheckCircle2, Loader2,
  Fingerprint, Ban, Link2, Lock,
} from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import QRCode from "@/components/raqeem/QRCode";

/**
 * VerifyRecord — public verification (no sign-in).
 *
 * This surface is deliberately narrow. It confirms that a document is authentic and
 * in force, and nothing more:
 *   shown  → verification result, verification code, issuing body, signer name and
 *            role, issue date, cancellation state, document fingerprint.
 *   never  → the signature image or its link, any storage path, the document body,
 *            attachments, internal typing/classification, unnecessary personal data.
 *
 * The signature and the document itself belong to authorized users, who sign in and
 * pass the governed file gate (`RequestFileAccess`). This page mints nothing.
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
        const res = await base44.functions.invoke("VerifyProductInstance", { product_id: id });
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
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-bold text-foreground mb-2">
            {t("تعذّر التحقق", "Verification Failed")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "رمز التحقق غير صحيح أو أن الوثيقة غير متاحة للتحقق العام.",
              "The verification code is invalid or this document is not available for public verification."
            )}
          </p>
        </div>
      </div>
    );
  }

  const isVerified = record.verified === true;
  const isRevoked = record.revoked === true;
  const statusTone = isRevoked ? "border-destructive/30" : isVerified ? "border-state-success/40" : "border-state-warning/40";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">
            {t("لِجان™ — التحقق المؤسسي", "LIJAN™ — Institutional Verification")}
          </span>
        </div>

        {/* Verification result */}
        <div className={`raqeem-card p-6 text-center ${statusTone}`}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-secondary/40">
            {isRevoked ? (
              <Ban className="w-8 h-8 text-destructive" aria-hidden="true" />
            ) : isVerified ? (
              <ShieldCheck className="w-8 h-8 text-state-success-ink" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-state-warning-ink" aria-hidden="true" />
            )}
          </div>
          <h1 className="ui-title text-foreground mb-1">
            {isRevoked
              ? t("وثيقة ملغاة", "Revoked Document")
              : isVerified
              ? t("وثيقة معتمدة وموثقة", "Verified & Approved Document")
              : t("وثيقة قيد المراجعة", "Document Under Review")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRevoked
              ? t("أُلغيت هذه الوثيقة ولم تعد سارية.", "This document has been cancelled and is no longer in force.")
              : isVerified
              ? t("تم التحقق من صحة هذه الوثيقة عبر سلسلة البرهان المؤسسي.", "This document has been verified through the institutional proof chain.")
              : t("هذه الوثيقة لم تُعتمد رسمياً بعد.", "This document has not been formally approved yet.")}
          </p>
        </div>

        {/* Public verification facts */}
        <div className="raqeem-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("بيانات التحقق", "Verification Details")}
            </h2>
          </div>

          <p className="text-lg font-bold text-foreground">
            {(lang === "ar" ? record.title_ar : record.title) || record.title || "—"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("رقم التحقق", "Verification Code")}</p>
                <p className="text-xs font-medium text-foreground font-mono" dir="ltr">{record.verification_code || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Ban className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("حالة الإلغاء", "Cancellation Status")}</p>
                <p className="text-xs font-medium text-foreground">
                  {isRevoked ? t("ملغاة", "Revoked") : t("سارية", "In force")}
                </p>
              </div>
            </div>
            {record.generated_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("تاريخ الإصدار", "Issue Date")}</p>
                  <p className="text-xs font-medium text-foreground">{formatDate(record.generated_at)}</p>
                </div>
              </div>
            )}
            {record.fingerprint && (
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("بصمة المستند", "Document Fingerprint")}</p>
                  <p className="text-xs font-medium text-foreground font-mono" dir="ltr">{record.fingerprint}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Issuing body — identity only */}
        {committee && (
          <div className="raqeem-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">{t("الجهة المُصدِرة", "Issuing Body")}</h3>
            </div>
            <p className="text-sm font-medium text-foreground">
              {lang === "ar" ? committee.name_ar : committee.name_en || committee.name_ar}
            </p>
          </div>
        )}

        {/* Signatories — the fact of signing, never the signature image */}
        {signatures.length > 0 && (
          <div className="raqeem-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">{t("الموقّعون", "Signatories")}</h3>
            </div>
            <div className="space-y-2">
              {signatures.map((sig, index) => (
                <div key={`${sig.signer_name}-${index}`} className="flex items-center justify-between gap-3 p-2 rounded-md bg-secondary/30">
                  <div>
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

        {/* What this page deliberately does not show */}
        <div className="raqeem-card p-5 flex items-start gap-3">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              "صورة التوقيع ونص المستند مخصصان للمصرّح لهم فقط، ويُعرضان بعد تسجيل الدخول واجتياز التحقق من الصلاحية والنطاق.",
              "The signature image and the document itself are available to authorized users only, after signing in and passing the permission and scope check."
            )}
          </p>
        </div>

        {/* QR for direct verification */}
        <div className="raqeem-card p-6 flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            {t("امسح هذا الرمز للتحقق المباشر", "Scan this code for direct verification")}
          </p>
          <QRCode value={verifyUrl} size={140} label={t("رمز التحقق", "Verification Code")} />
        </div>

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