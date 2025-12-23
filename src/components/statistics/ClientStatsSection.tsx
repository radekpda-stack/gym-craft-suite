import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { InsightsBar, generateClientInsights } from './InsightsBar';
import { ClientRetentionCard } from './ClientRetentionCard';
import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { ClientActivityCard } from './ClientActivityCard';
import { ClientAcquisitionCard } from './ClientAcquisitionCard';
import { ClientLTVRankingCard } from './ClientLTVRankingCard';
import { Users, UserPlus, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ClientStatsSection() {
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();
  const { data: stats, isLoading: statsLoading } = useAnnualStats('year');

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
  const newClients = analytics?.newClientsCount || 0;
  const retentionRate = analytics?.retentionRate || 0;
  const churnedClients = analytics?.churnedClientsCount || 0;
  const avgLifetime = analytics?.averageClientLifetimeMonths || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Hero KPI Cards */}
      <HeroKPIGrid>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Aktivní klienti"
                value={activeClients30}
                subtitle="posledních 30 dní"
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                trend={analytics?.vsLastMonth.clients}
                trendLabel="vs minulý měsíc"
                variant="primary"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Klienti s alespoň 1 tréninkem za posledních 30 dní</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Noví klienti"
                value={newClients}
                subtitle="první trénink ≤30 dní"
                icon={<UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />}
                variant="success"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Klienti, kteří začali trénovat v posledních 30 dnech</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Retence (60d)"
                value={`${retentionRate}%`}
                subtitle={`30d: ${analytics?.retentionRate30Days || 0}%`}
                icon={<UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
                variant={retentionRate >= 80 ? 'success' : retentionRate >= 60 ? 'warning' : 'destructive'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>% klientů, kteří pokračují v tréninku</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Odešlí klienti"
                value={churnedClients}
                subtitle={`prům. délka ${avgLifetime}m`}
                icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
                variant={churnedClients > 5 ? 'destructive' : 'default'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Klienti bez tréninku 60+ dní</p>
          </TooltipContent>
        </Tooltip>
      </HeroKPIGrid>

      {/* Client Analytics */}
      <ClientAnalyticsCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <ClientRetentionCard />
        <ClientActivityCard />
        <ClientAcquisitionCard />
      </div>

      {/* LTV Ranking */}
      <ClientLTVRankingCard />
    </div>
  );
}
