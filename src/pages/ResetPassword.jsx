import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/raqeem/PasswordInput";
import { useLanguage } from "@/lib/LanguageContext";

export default function ResetPassword() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(t("كلمتا المرور غير متطابقتين", "Passwords do not match"));
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || t("فشل إعادة التعيين", "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title={t("رابط إعادة غير صالح", "Invalid reset link")}
        subtitle={t("رابط إعادة كلمة المرور مفقود أو غير صالح", "This password reset link is missing or invalid")}
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            {t("اطلب رابطاً جديداً", "Request a new link")}
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          {t(
            "الرابط المستخدم غير مكتمل. الرجاء طلب رسالة إعادة كلمة مرور جديدة.",
            "The link you used appears to be incomplete. Please request a new password reset email."
          )}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title={t("كلمة مرور جديدة", "New password")}
      subtitle={t("أدخل كلمة المرور الجديدة", "Enter your new password below")}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          id="password"
          label={t("كلمة المرور الجديدة", "New Password")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          placeholder="••••••••"
        />
        <PasswordInput
          id="confirm"
          label={t("تأكيد كلمة المرور", "Confirm Password")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("جارٍ الإعادة...", "Resetting...")}
            </>
          ) : (
            t("إعادة تعيين كلمة المرور", "Reset password")
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}