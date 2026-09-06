import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useLanguage } from "@/lib/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title={t("إعادة تعيين كلمة المرور", "Reset password")}
      subtitle={t("سنرسل لك رابطاً لإعادة تعيينها", "We'll send you a link to reset it")}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          {t("العودة لتسجيل الدخول", "Back to log in")}
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground text-center">
          {t(
            "إذا كان هناك حساب بهذا البريد، ستتلقى رابط إعادة تعيين كلمة المرور قريباً.",
            "If an account exists with that email, you'll receive a password reset link shortly."
          )}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("البريد الإلكتروني", "Email address")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("جارٍ الإرسال...", "Sending...")}
              </>
            ) : (
              t("إرسال رابط الإعادة", "Send reset link")
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}