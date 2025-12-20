import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAppUsageAnalytics, AnalyticsPeriod } from '@/hooks/useAppUsageAnalytics';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { CategoryDistributionChart } from '@/components/analytics/CategoryDistributionChart';
import { NavigationVsActionsChart } from '@/components/analytics/NavigationVsActionsChart';
import { ModuleConversionTable } from '@/components/analytics/ModuleConversionTable';
import { FrictionPointsCard } from '@/components/analytics/FrictionPointsCard';
import { UsageRecommendations } from '@/components/analytics/UsageRecommendations';
import { TopFeaturesTable } from '@/components/analytics/TopFeaturesTable';

const ALLOWED_EMAIL = 'radek.pda@gmail.com';

export default function AppUsageStats() {
  usePageTracking('app_usage_stats');
  
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { data, isLoading, error } = useAppUsageAnalytics(period);

  // Only allow specific user
  if (user?.email !== ALLOWED_EMAIL) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-destructive">Chyba při načítání dat: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Používání aplikace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analýza workflow a efektivity používání aplikace
          </p>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
          <TabsList>
            <TabsTrigger value="7d">7 dní</TabsTrigger>
            <TabsTrigger value="30d">30 dní</TabsTrigger>
            <TabsTrigger value="90d">90 dní</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.totalEvents.toLocaleString('cs-CZ')}</p>
                    <p className="text-xs text-muted-foreground">Celkem událostí</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-2/10">
                    <Clock className="w-4 h-4 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.uniqueSessions}</p>
                    <p className="text-xs text-muted-foreground">Unikátních sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-3/10">
                    <BarChart3 className="w-4 h-4 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.avgEventsPerSession}</p>
                    <p className="text-xs text-muted-foreground">Ø událostí/session</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-4/10">
                    <Activity className="w-4 h-4 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.categoryDistribution.length}</p>
                    <p className="text-xs text-muted-foreground">Aktivních kategorií</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryDistributionChart data={data.categoryDistribution} />
            <NavigationVsActionsChart data={data.navigationVsActions} />
          </div>

          {/* Module Conversion */}
          <ModuleConversionTable data={data.moduleConversion} />

          {/* Top/Least Features */}
          <TopFeaturesTable 
            topFeatures={data.topFeatures} 
            leastUsedFeatures={data.leastUsedFeatures} 
          />

          {/* Friction Points & Recommendations */}
          <div className="grid gap-4 md:grid-cols-2">
            <FrictionPointsCard data={data.frictionPoints} />
            <UsageRecommendations data={data.recommendations} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
