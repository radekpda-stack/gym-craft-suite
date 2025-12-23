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
        <KPICard
          title="Aktivní klienti"
          value={activeClients30}
          subtitle="posledních 30 dní"
          icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
          trend={analytics?.vsLastMonth.clients}
          trendLabel="vs minulý měsíc"
          variant="primary"
          infoDescription="Počet klientů s alespoň 1 dokončeným tréninkem za posledních 30 dní."
          infoCalculation="Unikátní klienti, kteří mají záznam o dokončeném tréninku v období (dnes - 30 dní)."
        />
        <KPICard
          title="Noví klienti"
          value={newClients}
          subtitle="první trénink ≤30 dní"
          icon={<UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="success"
          infoDescription="Klienti, kteří absolvovali svůj první trénink v posledních 30 dnech."
          infoCalculation="Klienti, jejichž nejstarší trénink je v rozmezí 0-30 dní od dneška."
        />
        <KPICard
          title="Retence (60d)"
          value={`${retentionRate}%`}
          subtitle={`30d: ${analytics?.retentionRate30Days || 0}%`}
          icon={<UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant={retentionRate >= 80 ? 'success' : retentionRate >= 60 ? 'warning' : 'destructive'}
          infoDescription="Procento klientů, kteří pokračují v trénování. 60d = bez tréninku max 60 dní."
          infoCalculation="(Aktivní klienti za 60 dní / Celkový počet nearchivovaných klientů) × 100%"
        />
        <KPICard
          title="Odešlí klienti"
          value={churnedClients}
          subtitle={`prům. délka ${avgLifetime}m`}
          icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant={churnedClients > 5 ? 'destructive' : 'default'}
          infoDescription="Klienti bez tréninku déle než 60 dní. Můžou potřebovat kontaktování."
          infoCalculation="Počet nearchivovaných klientů, jejichž poslední trénink je starší než 60 dní."
        />
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
