import { useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { toVocative } from '@/lib/czechVocative';

// Dashboard widgets
import { ActiveChallengeWidget } from '@/components/client-portal/dashboard/ActiveChallengeWidget';
import { ClientQuickActions } from '@/components/client-portal/dashboard/ClientQuickActions';
import { ClientActionRequired } from '@/components/client-portal/dashboard/ClientActionRequired';
import { HeroStatsRow } from '@/components/client-portal/dashboard/HeroStatsRow';
import { ClientQuickStats } from '@/components/client-portal/dashboard/ClientQuickStats';
import { OverallPerformanceCard } from '@/components/client-portal/dashboard/OverallPerformanceCard';

export default function ClientPortalOverview() {
  const { clientProfile, clientId } = useClientPortal();
  
  const { trackPageMount } = useClientPortalPageTracking('client_portal_overview');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  return (
    <div className="space-y-4">
      {/* 1. Header - simplified */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold truncate">
          Ahoj, {toVocative(clientProfile?.first_name || clientProfile?.name?.split(' ')[0] || 'Klient')}!
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Tvůj tréninkový přehled</p>
      </div>

      {/* 2. ACTION REQUIRED - Hero section for pending tasks (conditional) */}
      <ClientActionRequired />

      {/* 3. Hero Stats Row - Credit + Next Training */}
      <HeroStatsRow />

      {/* 4. Quick Stats - 3 metrics in a row */}
      <ClientQuickStats />

      {/* 5. Overall Performance - Comparison with other clients */}
      {clientId && <OverallPerformanceCard clientId={clientId} />}

      {/* 6. Quick Actions - Dynamic shortcuts */}
      <ClientQuickActions />

      {/* 6. Active Challenges (only if any) - moved to bottom */}
      <ActiveChallengeWidget />
    </div>
  );
}
