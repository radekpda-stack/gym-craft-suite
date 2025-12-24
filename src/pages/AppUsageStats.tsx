import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Activity, Clock, Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAppUsageAnalytics, AnalyticsPeriod } from '@/hooks/useAppUsageAnalytics';
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';
import { CategoryDistributionChart } from '@/components/analytics/CategoryDistributionChart';
import { NavigationVsActionsChart } from '@/components/analytics/NavigationVsActionsChart';
import { ModuleConversionTable } from '@/components/analytics/ModuleConversionTable';
import { FrictionPointsCard } from '@/components/analytics/FrictionPointsCard';
import { UsageRecommendations } from '@/components/analytics/UsageRecommendations';
import { TopFeaturesTable } from '@/components/analytics/TopFeaturesTable';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const ALLOWED_EMAIL = 'radek.pda@gmail.com';

// Export helper function
function exportAnalyticsToExcel(data: any, period: AnalyticsPeriod) {
  const wb = XLSX.utils.book_new();
  
  // 1. Summary sheet
  const summaryData = [
    ['Přehled používání aplikace', ''],
    ['Období', period === '7d' ? '7 dní' : period === '30d' ? '30 dní' : '90 dní'],
    ['Datum exportu', new Date().toLocaleDateString('cs-CZ')],
    ['', ''],
    ['Celkem událostí', data.totalEvents],
    ['Unikátních sessions', data.uniqueSessions],
    ['Ø událostí/session', data.avgEventsPerSession],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Přehled');
  
  // 2. Category distribution
  const catData = [
    ['Kategorie', 'Počet', 'Procento'],
    ...data.categoryDistribution.map((c: any) => [c.label, c.count, `${c.percentage}%`])
  ];
  const wsCat = XLSX.utils.aoa_to_sheet(catData);
  XLSX.utils.book_append_sheet(wb, wsCat, 'Kategorie');
  
  // 3. Top features
  const topData = [
    ['Funkce', 'Kategorie', 'Počet použití'],
    ...data.topFeatures.map((f: any) => [f.label, f.category, f.count])
  ];
  const wsTop = XLSX.utils.aoa_to_sheet(topData);
  XLSX.utils.book_append_sheet(wb, wsTop, 'Nejpoužívanější');
  
  // 4. Least used features
  const leastData = [
    ['Funkce', 'Kategorie', 'Počet použití'],
    ...data.leastUsedFeatures.map((f: any) => [f.label, f.category, f.count])
  ];
  const wsLeast = XLSX.utils.aoa_to_sheet(leastData);
  XLSX.utils.book_append_sheet(wb, wsLeast, 'Málo používané');
  
  // 5. Module conversion
  const modData = [
    ['Modul', 'Zobrazení', 'Akce', 'Konverze'],
    ...data.moduleConversion.map((m: any) => [m.label, m.views, m.actions, `${m.conversionRate}%`])
  ];
  const wsMod = XLSX.utils.aoa_to_sheet(modData);
  XLSX.utils.book_append_sheet(wb, wsMod, 'Konverze modulů');
  
  // 6. Friction points
  const frictionData = [
    ['Problém', 'Typ', 'Počet', 'Závažnost', 'Doporučení'],
    ...data.frictionPoints.map((f: any) => [f.pattern, f.type, f.count, f.severity, f.suggestion])
  ];
  const wsFriction = XLSX.utils.aoa_to_sheet(frictionData);
  XLSX.utils.book_append_sheet(wb, wsFriction, 'Problémy');
  
  // 7. Recommendations
  const recData = [
    ['Typ', 'Doporučení'],
    ...data.recommendations.map((r: any) => [r.type, r.message])
  ];
  const wsRec = XLSX.utils.aoa_to_sheet(recData);
  XLSX.utils.book_append_sheet(wb, wsRec, 'Doporučení');
  
  // Download
  XLSX.writeFile(wb, `app-usage-analytics-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export default function AppUsageStats() {
  usePageTracking('app_usage_stats');
  const { trackFeature } = useFeatureTracking();
  
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { data, isLoading, error } = useAppUsageAnalytics(period);

  // Only allow specific user
  if (user?.email !== ALLOWED_EMAIL) {
    return <Navigate to="/" replace />;
  }

  const handleExport = () => {
    if (!data) return;
    trackFeature('export_app_usage_analytics', 'export', { metadata: { period } });
    exportAnalyticsToExcel(data, period);
    exportAnalyticsToExcel(data, period);
    toast({
      title: 'Export úspěšný',
      description: 'Analytika byla exportována do Excel souboru.',
    });
  };

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

        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <TabsList>
              <TabsTrigger value="7d">7 dní</TabsTrigger>
              <TabsTrigger value="30d">30 dní</TabsTrigger>
              <TabsTrigger value="90d">90 dní</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {data && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export
            </Button>
          )}
        </div>
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
