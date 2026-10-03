import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNSDCShowcaseData } from '@/hooks/useNSDCShowcaseData';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import DemoBanner from '@/components/showcase/DemoBanner';
import ExecutiveArrival from '@/components/showcase/ExecutiveArrival';
import CommitteeBrief from '@/components/showcase/CommitteeBrief';
import MarketsWorkspace from '@/components/showcase/MarketsWorkspace';
import EvidenceReadiness from '@/components/showcase/EvidenceReadiness';
import DependenciesView from '@/components/showcase/DependenciesView';
import DecisionRoom from '@/components/showcase/DecisionRoom';
import BeforeAfter from '@/components/showcase/BeforeAfter';
import NationalAdoption from '@/components/showcase/NationalAdoption';
import ElanReference from '@/components/showcase/ElanReference';

const TABS = [
  { key: 'arrival', label: 'الوصول' },
  { key: 'brief', label: 'ملخصي التنفيذي' },
  { key: 'markets', label: 'الوصول إلى الأسواق' },
  { key: 'evidence', label: 'جاهزية الأدلة' },
  { key: 'dependencies', label: 'التبعيات' },
  { key: 'decision', label: 'غرفة القرار' },
  { key: 'elan', label: 'مرجع إعلان' },
  { key: 'before_after', label: 'قبل ومع لِجان' },
  { key: 'national', label: 'التبني الوطني' },
];

export default function NationalAdoptionShowcase() {
  const { user } = useAuth();
  const [tab, setTab] = useState('arrival');
  const { loading, error, data } = useNSDCShowcaseData();
  const [seeding, setSeeding] = useState(false);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">يجب تسجيل الدخول.</div>;
  if (user.role !== 'admin') {
    return <div className="p-8 text-center text-sm text-muted-foreground">هذا العرض متاح للمؤسس أو المستخدمين المصرح لهم فقط.</div>;
  }

  const needsSeed = !loading && !error && !data?.nsdc;

  const runSeed = async () => {
    setSeeding(true);
    await base44.functions.invoke('SeedNSDCShowcase', {});
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <DemoBanner />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-bold">عرض تبنّي اللجان الوطنية والأثر</h1>
          <p className="text-xs text-muted-foreground">National Committee Adoption & Impact Showcase</p>
        </div>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-destructive">تعذر تحميل بيانات العرض: {error.message}</p>}

        {needsSeed && (
          <div className="raqeem-card p-5 text-center space-y-3">
            <p className="text-sm">لم يتم تهيئة بيانات العرض التوضيحي بعد.</p>
            <Button onClick={runSeed} disabled={seeding}>
              {seeding ? 'جارٍ التهيئة…' : 'تهيئة بيانات العرض (مرة واحدة)'}
            </Button>
          </div>
        )}

        {data?.nsdc && (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-border mb-5 pb-px">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${tab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'arrival' && <ExecutiveArrival data={data} onNavigate={setTab} />}
            {tab === 'brief' && <CommitteeBrief data={data} />}
            {tab === 'markets' && <MarketsWorkspace data={data} />}
            {tab === 'evidence' && <EvidenceReadiness data={data} />}
            {tab === 'dependencies' && <DependenciesView data={data} />}
            {tab === 'decision' && <DecisionRoom data={data} />}
            {tab === 'elan' && <ElanReference data={data} />}
            {tab === 'before_after' && <BeforeAfter />}
            {tab === 'national' && <NationalAdoption />}
          </>
        )}
      </div>
    </div>
  );
}