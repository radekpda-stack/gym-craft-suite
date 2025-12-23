import { usePageTracking } from '@/hooks/useFeatureTracking';
import { CapacityHeatmapCard } from '@/components/dashboard/CapacityHeatmapCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { YearComparisonCard } from '@/components/dashboard/YearComparisonCard';
import { StatsOverviewCard } from '@/components/dashboard/StatsOverviewCard';
import { ClientAnalyticsCard } from '@/components/dashboard/ClientAnalyticsCard';
import { RevenueBreakdownCard } from '@/components/statistics/RevenueBreakdownCard';
import { ClientRetentionCard } from '@/components/statistics/ClientRetentionCard';
import { TrainingsByDayCard } from '@/components/statistics/TrainingsByDayCard';
import { TopExercisesCard } from '@/components/statistics/TopExercisesCard';
import { MonthlyProgressCard } from '@/components/statistics/MonthlyProgressCard';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Statistics() {
  usePageTracking('statistics');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Pokročilé statistiky
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailní analýzy a přehledy - klikněte pro rozšířený pohled
          </p>
        </div>
      </div>

      {/* Stats Overview with PDF export */}
      <StatsOverviewCard />

      {/* Main statistics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly progress - wider */}
        <div className="md:col-span-2">
          <MonthlyProgressCard />
        </div>

        {/* Client retention */}
        <ClientRetentionCard />

        {/* Revenue breakdown */}
        <RevenueBreakdownCard />

        {/* Trainings by day */}
        <TrainingsByDayCard />

        {/* Top exercises */}
        <TopExercisesCard />
      </div>

      {/* Year comparison */}
      <YearComparisonCard />

      {/* Client analytics */}
      <ClientAnalyticsCard />

      {/* Capacity Heatmap */}
      <CapacityHeatmapCard />

      {/* PR Timeline */}
      <PRTimelineCard />
    </div>
  );
}
