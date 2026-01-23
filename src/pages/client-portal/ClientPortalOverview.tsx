import { useState, useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { type PeriodDays } from '@/hooks/useClientPortalStats';
import { toVocative } from '@/lib/czechVocative';

// Dashboard widgets
import { ActiveChallengeWidget } from '@/components/client-portal/dashboard/ActiveChallengeWidget';
import { TrainingCalendar } from '@/components/client-portal/calendar/TrainingCalendar';
import { PeriodChips } from '@/components/client-portal/common/SharedComponents';
import { ClientQuickActions } from '@/components/client-portal/dashboard/ClientQuickActions';
import { ClientActionRequired } from '@/components/client-portal/dashboard/ClientActionRequired';
import { HeroStatsRow } from '@/components/client-portal/dashboard/HeroStatsRow';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
];

export default function ClientPortalOverview() {
  const { clientProfile } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  
  const { trackPageMount } = useClientPortalPageTracking('client_portal_overview');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            Ahoj, {toVocative(clientProfile?.first_name || clientProfile?.name?.split(' ')[0] || 'Klient')}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Tvůj tréninkový přehled</p>
        </div>
        <PeriodChips value={period} onChange={setPeriod} options={periodOptions} />
      </div>

      {/* 2. ACTION REQUIRED - Hero section for pending tasks */}
      <ClientActionRequired />

      {/* 3. Hero Stats Row - Credit + Streak + Next Training */}
      <HeroStatsRow period={period} />

      {/* 4. Quick Actions - Dynamic shortcuts */}
      <ClientQuickActions />

      {/* 5. Training Calendar */}
      <TrainingCalendar />

      {/* 6. Active Challenges (only if any) */}
      <ActiveChallengeWidget />
    </div>
  );
}
