// LIJAN™ — Exploration banner.
// One governed persona at a time: the banner always names the ACTIVE persona, never a
// hardcoded one, and carries the synthetic-data notice.

import React from 'react';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { useEffectiveActor } from '@/lib/EffectiveActorContext';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';

export default function DemoBanner() {
  const { isDemoMode, demoSession, exitDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();

  const handleExit = () => {
    exitDemo();
    // Reload to clear all persona state
    window.location.href = '/';
  };

  if (!isDemoMode || !demoSession) return null;

  const personaName = lang === 'ar'
    ? (demoSession.display_name_ar || demoSession.display_name_en)
    : (demoSession.display_name_en || demoSession.display_name_ar);

  const lineAr = `أنت الآن تستكشف المنصة بشخصية ${personaName}`;
  const lineEn = `You are now exploring the platform as ${personaName || ''}`.trim();

  return (
    <div className="bg-accent/10 border-b border-accent/30 px-4 py-2.5 flex items-center justify-between gap-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">
            {t(lineAr, lineEn)}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {t('بيانات تجريبية — غير صالحة للاستخدام الرسمي', 'Synthetic demonstration data — not for official use')}
          </div>
        </div>
      </div>
      <button
        onClick={handleExit}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-destructive bg-card hover:bg-destructive/5 border border-border px-3 py-1.5 rounded-md transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        {t('إنهاء استكشاف التجربة', 'Exit Demo')}
      </button>
    </div>
  );
}