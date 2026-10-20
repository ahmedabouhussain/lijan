import { useLocation, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * PageNotFound — an intentional state, in the platform's own voice.
 * Bilingual, token-driven (so it reads in both themes), and free of implementation
 * language: a reader is told the page is not here and offered the way back.
 */
export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-6xl font-light text-muted-foreground/40 arabic-figures">404</p>
          <div className="h-px w-16 bg-border mx-auto" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="ui-title text-foreground">
            {t("الصفحة غير موجودة", "Page not found")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("لم نعثر على الصفحة المطلوبة ضمن المنصة.", "The page you asked for is not part of the platform.")}
            {pageName && (
              <>
                {" "}
                <span className="font-medium text-foreground break-words" dir="ltr">{pageName}</span>
              </>
            )}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-control bg-primary text-primary-foreground hover:bg-primary-dark transition-colors sovereign-focus touch-target"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            {t("العودة إلى البداية", "Go home")}
          </button>
        </div>
      </div>
    </div>
  );
}