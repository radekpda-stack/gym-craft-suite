import { useMemo } from 'react';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { InsightsBar, generateClientInsights } from './InsightsBar';
import { ClientRetentionCard } from './ClientRetentionCard';
import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { ClientActivityCard } from './ClientActivityCard';
import { ClientAcquisitionCard } from './ClientAcquisitionCard';
import { ClientLTVRankingCard } from './ClientLTVRankingCard';
import { ClientFeedbackCard } from './ClientFeedbackCard';
import { MeasurementsCard } from './MeasurementsCard';
import { ClientTagsCard } from './ClientTagsCard';
import { GaugeCard, SparklineCard, MetricCard } from '@/components/charts';
import { Users, UserPlus, UserCheck, AlertTriangle, Loader2, Activity } from 'lucide-react';
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

  // Sparkline data from monthly trend
  const activitySparklineData = useMemo(() => {
    return (stats?.monthlyTrend || []).slice(-6).map(m => ({ value: m.trainings }));
  }, [stats?.monthlyTrend]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
  const totalClients = stats?.totalClients || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* WHOOP-style Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GaugeCard
          title="Retence (60d)"
          value={retentionRate}
          maxValue={100}
          displayValue={`${retentionRate}%`}
          sublabel="aktivní"
          description={`30d: ${analytics?.retentionRate30Days || 0}%`}
          variant={retentionRate >= 80 ? 'success' : retentionRate >= 60 ? 'warning' : 'destructive'}
          size="md"
        />
        
        <GaugeCard
          title="Aktivita"
          value={totalClients > 0 ? (activeClients30 / totalClients) * 100 : 0}
          maxValue={100}
          displayValue={String(activeClients30)}
          sublabel="aktivních"
          description={`z ${totalClients} klientů`}
          variant="blue"
          size="md"
        />

        <SparklineCard
          title="Tréninková aktivita"
          value={`${stats?.avgTrainingsPerWeek || 0}/týden`}
          subtitle="průměrně"
          data={activitySparklineData}
          trend={analytics?.vsLastMonth.clients}
          variant="primary"
          icon={<Activity className="h-4 w-4" />}
        />

        <MetricCard
          title="Noví klienti"
          value={newClients}
          subtitle="první trénink ≤30 dní"
          progress={Math.min((newClients / 10) * 100, 100)}
          variant="success"
          icon={<UserPlus className="h-4 w-4" />}
          showProgressValue={false}
        />
      </div>

      {/* Warning card for churned clients if any */}
      {churnedClients > 0 && (
        <MetricCard
          title="Odešlí klienti"
          value={churnedClients}
          subtitle={`prům. délka ${avgLifetime} měsíců`}
          progress={Math.min((churnedClients / 10) * 100, 100)}
          variant="destructive"
          orientation="horizontal"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      )}

      {/* Client Analytics */}
      <ClientAnalyticsCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <ClientRetentionCard />
        <ClientActivityCard />
        <ClientAcquisitionCard />
      </div>

      {/* Feedback and Measurements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <ClientFeedbackCard stats={stats} />
        <MeasurementsCard stats={stats} />
        <ClientTagsCard />
      </div>

      {/* LTV Ranking */}
      <ClientLTVRankingCard />
    </div>
  );
}
