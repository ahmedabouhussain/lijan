// LIJAN™ — Demo Mode Banner
// A calm, visible indicator shown when exploring the platform as Fahad.
// Includes an "Exit Demo" button that restores the real user's session.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { useEffectiveActor } from '@/lib/EffectiveActorContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function DemoBanner() {
  const navigate = useNavigate();
  const { isDemoMode, exitDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();

  const handleExit = () => {
    exitDemo();
    // Reload to clear all demo state
    window.location.href = '/';
  };

  if (!isDemoMode) return null;

  return (
    <div className="bg-accent/10 border-b border-accent/30 px-4 py-2.5 flex items-center justify-between gap-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">
            {t('أنت الآن تستكشف المنصة بشخصية فهد الفهيدي', 'You are exploring as Fahad Al-Fihaidi')}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {t('بيانات تجريبية — غير صالحة للاستخدام الرسمي', 'Demo data — not for official use')}
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