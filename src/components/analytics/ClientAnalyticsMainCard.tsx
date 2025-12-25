import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Users, Activity, TrendingUp } from 'lucide-react';
import { TrendAreaChart, DistributionDonutChart } from '@/components/analytics';
import type { ClientAnalyticsData } from '@/hooks/useClientAnalytics';

interface ClientAnalyticsMainCardProps {
  data: ClientAnalyticsData;
  onShowDetail: () => void;
}

export function ClientAnalyticsMainCard({ data, onShowDetail }: ClientAnalyticsMainCardProps) {
  const trendData = (data?.clientActivityTrend ?? [])
    .filter((_, i) => i % 3 === 0)
    .map(d => ({ label: d.label, value: d.sessions }));

  const distributionData = (data?.activityDistribution ?? []).map(d => ({
    name: `${d.bucket} tréninků`,
    value: d.count,
    percentage: d.percentage,
  }));

  const activeClientsCount = data?.activeClientsCount ?? 0;
  const totalClientsCount = data?.totalClientsCount ?? 0;
  const activePercentage = data?.activePercentage ?? 0;

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Přehled klientů
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onShowDetail}>
            Detail
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Aktivní klient = alespoň 1 trénink ve zvoleném období
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {activeClientsCount}
            </p>
            <p className="text-xs text-muted-foreground">Aktivních klientů</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {totalClientsCount}
            </p>
            <p className="text-xs text-muted-foreground">Celkem klientů</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {activePercentage}%
            </p>
            <p className="text-xs text-muted-foreground">Aktivní</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Activity Trend */}
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trend aktivity
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Počet tréninků za den
            </p>
            <TrendAreaChart
              data={trendData}
              height={180}
              gradient={{ id: 'clientTrend', color: 'hsl(68 100% 50%)' }}
            />
          </div>

          {/* Activity Distribution */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Rozložení aktivity
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Klienti dle počtu tréninků
            </p>
            <DistributionDonutChart
              data={distributionData}
              height={180}
              innerRadius={40}
              outerRadius={65}
              legendLimit={4}
            />
          </div>
        </div>

        {/* LTV Distribution */}
        {(data?.ltvDistribution ?? []).length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Rozložení podle objemu tréninků (LTV)
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Věrnost klientů dle celkového počtu absolvovaných tréninků
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(data?.ltvDistribution ?? []).map((bucket) => (
                <div 
                  key={bucket.bucket}
                  className="p-3 rounded-lg bg-muted/20 text-center"
                >
                  <p className="text-lg font-bold">{bucket.count}</p>
                  <p className="text-xs text-muted-foreground">{bucket.bucket}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
