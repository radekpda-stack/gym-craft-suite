import { usePageTracking } from '@/hooks/useFeatureTracking';
import { CapacityHeatmapCard } from '@/components/dashboard/CapacityHeatmapCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { YearComparisonCard } from '@/components/dashboard/YearComparisonCard';
import { StatsOverviewCard } from '@/components/dashboard/StatsOverviewCard';
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
            Detailní analýzy a přehledy
          </p>
        </div>
      </div>

      {/* Stats Overview with PDF export */}
      <StatsOverviewCard />

      {/* Year comparison */}
      <YearComparisonCard />

      {/* Capacity Heatmap */}
      <CapacityHeatmapCard />

      {/* PR Timeline */}
      <PRTimelineCard />
    </div>
  );
}
