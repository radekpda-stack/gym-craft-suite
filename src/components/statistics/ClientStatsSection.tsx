import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { InsightsBar, generateClientInsights } from './InsightsBar';
import { ClientHeroKPI } from './ClientHeroKPI';
import { ClientLTVRankingCard } from './ClientLTVRankingCard';
import { ClientTenureCard } from './ClientTenureCard';
import { ClientFeedbackCard } from './ClientFeedbackCard';
import { ClientHealthDashboard } from './ClientHealthDashboard';
import { CohortRetentionCard } from './CohortRetentionCard';
import { ChurnRiskCard } from './ChurnRiskCard';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface ClientStatsSectionProps {
  periodRange?: StatsPeriodRange;
}

export function ClientStatsSection({ periodRange }: ClientStatsSectionProps) {
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  
  // Use custom period if provided
  const { data: stats, isLoading: statsLoading } = useAnnualStats(
    periodRange?.type === 'all' ? 'all' : periodRange?.type === 'custom' || periodRange ? 'custom' : 'year',
    periodRange?.start,
    periodRange?.end
  );

  const isLoading = analyticsLoading || statsLoading;

  // Generate insights
  const insights = generateClientInsights(
    {
      activeClients30Days: analytics?.activeClients30Days,
      churnedClients: analytics?.churnedClientsCount,
      newClients: analytics?.newClientsCount,
    },
    analytics?.retentionRate
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const activeClients30 = analytics?.activeClients30Days || 0;
  const retentionRate = analytics?.retentionRate || 0;
  const avgLifetime = analytics?.averageClientLifetimeMonths || 0;
  const totalClients = stats?.totalClients || 0;
  const avgFeedback = stats?.avgBodyFeel || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Client Health Dashboard - NEW consolidated view */}
      <ClientHealthDashboard periodRange={periodRange} />

      {/* Hero KPI Cards */}
      <ClientHeroKPI
        activeClients={activeClients30}
        totalClients={totalClients}
        retentionRate={retentionRate}
        avgLifetimeMonths={avgLifetime}
        avgFeedbackScore={avgFeedback}
        totalFeedback={stats?.totalFeedback}
      />

      {/* Top clients by LTV */}
      <ClientLTVRankingCard limit={5} />

      {/* Cohort Retention and Churn Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CohortRetentionCard />
        <ChurnRiskCard />
      </div>

      {/* Stats Grid - tenure and feedback (removed age and tags cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <ClientTenureCard />
        <ClientFeedbackCard stats={stats} />
      </div>
    </div>
  );
}
