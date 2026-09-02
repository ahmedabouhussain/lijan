import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Calendar, HardDrive, FolderOpen, Send, RefreshCw, CheckCircle2, AlertCircle, Clock, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const SERVICE_ICONS = {
  outlook: Mail,
  microsoft_teams: Send,
  one_drive: HardDrive,
  share_point: FolderOpen,
};

const SERVICE_NAMES = {
  outlook: { ar: "Outlook — البريد والتقويم", en: "Outlook — Mail & Calendar" },
  microsoft_teams: { ar: "Microsoft Teams", en: "Microsoft Teams" },
  one_drive: { ar: "OneDrive — التخزين", en: "OneDrive — Storage" },
  share_point: { ar: "SharePoint — المكتبة", en: "SharePoint — Library" },
};

function StatusIcon({ status }) {
  if (status === 'connected') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === 'not_authorized') return <Clock className="w-4 h-4 text-amber-500" />;
  if (status === 'error' || status === 'expired') return <XCircle className="w-4 h-4 text-destructive" />;
  return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
}

function StatusLabel({ status, lang }) {
  const labels = {
    connected: { ar: "متصل", en: "Connected" },
    not_authorized: { ar: "جاهز فنيًا — ينتظر تفويض مسؤول Microsoft 365", en: "Engineering Ready — Awaiting Microsoft 365 Admin Authorization" },
    error: { ar: "خطأ", en: "Error" },
    expired: { ar: "منتهي الصلاحية", en: "Expired" },
    live: { ar: "يعمل", en: "Live" },
    not_deployed: { ar: "غير منشور", en: "Not Deployed" },
    partial: { ar: "اتصال جزئي", en: "Partial" },
  };
  const label = labels[status] || labels.not_authorized;
  return <span className="text-sm font-medium">{lang === 'ar' ? label.ar : label.en}</span>;
}

export default function IntegrationHealthPanel({ lang = 'ar' }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('GetIntegrationHealth', {});
      setHealth(result);
    } catch (error) {
      toast({ title: lang === 'ar' ? 'خطأ في جلب حالة التكاملات' : 'Error fetching integration health', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      const result = await base44.functions.invoke('GetIntegrationHealth', { action: 'test_email', to: testEmail });
      toast({
        title: result.status === 'failed'
          ? (lang === 'ar' ? 'فشل الإرسال' : 'Send failed')
          : (lang === 'ar' ? 'تم الإرسال' : 'Email sent'),
        description: `${lang === 'ar' ? 'المزود' : 'Provider'}: ${result.provider}`,
        variant: result.status === 'failed' ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="raqeem-card p-6 space-y-3">
        <div className="h-6 w-48 bg-secondary rounded animate-pulse" />
        <div className="h-20 bg-secondary rounded animate-pulse" />
        <div className="h-20 bg-secondary rounded animate-pulse" />
      </div>
    );
  }

  const m365Services = health?.microsoft365?.services || [];
  const emailProvider = health?.email || {};
  const gateway = health?.gateway || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="raqeem-card p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {lang === 'ar' ? 'حالة التكاملات' : 'Integration Health'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === 'ar' ? 'حالة اتصال جميع الخدمات الخارجية' : 'Connection status for all external services'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchHealth}>
          <RefreshCw className="w-4 h-4" />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Microsoft 365 Services */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Microsoft 365</h4>
          {health?.microsoft365?.fallback_active && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
              {lang === 'ar' ? 'البديل يعمل' : 'Fallback Active'}
            </span>
          )}
        </div>

        <div className="grid gap-2">
          {m365Services.map((svc) => {
            const Icon = SERVICE_ICONS[svc.service] || Mail;
            const name = SERVICE_NAMES[svc.service] || svc.service;
            return (
              <div key={svc.service} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lang === 'ar' ? name.ar : name.en}</p>
                    {svc.connected_account && (
                      <p className="text-xs text-muted-foreground truncate">{svc.connected_account}</p>
                    )}
                    {svc.missing_scopes && svc.missing_scopes.length > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {lang === 'ar' ? 'صلاحيات ناقصة' : 'Missing scopes'}: {svc.missing_scopes.length}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusIcon status={svc.status} />
                  <StatusLabel status={svc.status} lang={lang} />
                </div>
              </div>
            );
          })}
        </div>

        {health?.microsoft365?.overall === 'not_authorized' && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800 leading-relaxed">
              {lang === 'ar'
                ? 'جميع خدمات Microsoft 365 جاهزة فنيًا. لتفعيلها، يحتاج مسؤول Microsoft 365 إلى تفويض Connector من إعدادات المنصة. حتى ذلك الحين، يعمل البديل: البريد عبر Base44، الاجتماعات عبر روابط يدوية، ICS للتقويم.'
                : 'All Microsoft 365 services are engineering-ready. To activate, your Microsoft 365 admin must authorize the Connector from platform settings. Until then, fallbacks are active: email via Base44, meetings via manual links, ICS for calendar.'}
            </p>
          </div>
        )}
      </div>

      {/* Email Provider */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Provider'}</h4>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'المزود الأساسي' : 'Primary Provider'}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon status={emailProvider.primary_status} />
              <span className="text-sm font-medium">Base44 Email</span>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'البديل' : 'Fallback'}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon status={emailProvider.fallback_status} />
              <span className="text-sm font-medium">Microsoft Outlook</span>
            </div>
          </div>
        </div>

        {/* Test Email */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={lang === 'ar' ? 'بريد إلكتروني للاختبار' : 'Email to test'}
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTestEmail} disabled={sendingTest || !testEmail} size="sm">
            {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {lang === 'ar' ? 'اختبار' : 'Test'}
          </Button>
        </div>
      </div>

      {/* Integration Gateway */}
      <div className="raqeem-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">{lang === 'ar' ? 'بوابة التكامل' : 'Integration Gateway'}</h4>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={gateway.status || 'not_deployed'} />
          <StatusLabel status={gateway.status || 'not_deployed'} lang={lang} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {gateway.note || (lang === 'ar'
            ? 'عقد البوابة جاهز — تنتظر النشر لمعالجة PDF/A وDOCX والوثائق الكبيرة.'
            : 'Gateway contract ready — awaiting deployment for PDF/A, DOCX, large documents.')}
        </p>
      </div>
    </div>
  );
}