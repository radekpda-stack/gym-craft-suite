import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { ClientRetentionCard } from './ClientRetentionCard';
import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { ClientActivityCard } from './ClientActivityCard';
import { ClientAcquisitionCard } from './ClientAcquisitionCard';
import { ClientLTVRankingCard } from './ClientLTVRankingCard';
import { Users, UserPlus, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ClientStatsSection() {
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');

  const isLoading = analyticsLoading || statsLoading;

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

  const activeClients = analytics?.activeClientsCount || 0;
  const retentionRate = analytics?.retentionRate || 0;
  const churnedClients = analytics?.churnedClientsCount || 0;
  const avgLifetime = analytics?.averageClientLifetimeMonths || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero KPI Cards */}
      <HeroKPIGrid>
        <KPICard
          title="Aktivní klienti"
          value={activeClients}
          subtitle="posledních 60 dní"
          icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
          trend={analytics?.vsLastMonth.clients}
          trendLabel="vs minulý měsíc"
          variant="primary"
        />
        <KPICard
          title="Noví klienti"
          value={stats?.topClientsByTrainings?.filter(c => c.count <= 5).length || 0}
          subtitle="méně než 5 tréninků"
          icon={<UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="success"
        />
        <KPICard
          title="Retence"
          value={`${retentionRate}%`}
          subtitle={`průměr ${analytics?.avgRetention6Months || 0}% za 6m`}
          icon={<UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant={retentionRate >= 80 ? 'success' : retentionRate >= 60 ? 'warning' : 'destructive'}
        />
        <KPICard
          title="Odešlí klienti"
          value={churnedClients}
          subtitle={`prům. délka ${avgLifetime}m`}
          icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant={churnedClients > 5 ? 'destructive' : 'default'}
        />
      </HeroKPIGrid>

      {/* Client Analytics */}
      <ClientAnalyticsCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ClientRetentionCard />
        <ClientActivityCard />
        <ClientAcquisitionCard />
      </div>

      {/* LTV Ranking */}
      <ClientLTVRankingCard />
    </div>
  );
}
