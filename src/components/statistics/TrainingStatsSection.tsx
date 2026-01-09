import { useState } from 'react';
import { useGlobalTrainingTagStats, GlobalDateRange } from '@/hooks/useGlobalTrainingTagStats';
import { TrainingHeroKPI } from './TrainingHeroKPI';
import { TrainingTypeDistributionCard } from './TrainingTypeDistributionCard';
import { GlobalTagDistributionCard } from './GlobalTagDistributionCard';
import { TrainingDurationCard } from './TrainingDurationCard';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const DATE_RANGE_OPTIONS: { value: GlobalDateRange; label: string }[] = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '3 měsíce' },
  { value: 365, label: 'Rok' },
  { value: 'all', label: 'Vše' },
];

export function TrainingStatsSection() {
  const [dateRange, setDateRange] = useState<GlobalDateRange>(365);
  
  const stats = useGlobalTrainingTagStats(dateRange);

  if (stats.isLoading) {
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Date range selector */}
      <div className="flex justify-center sm:justify-end">
        <ToggleGroup
          type="single"
          value={String(dateRange)}
          onValueChange={(val) => val && setDateRange(val === 'all' ? 'all' : Number(val) as GlobalDateRange)}
          className="bg-muted/50 p-1 rounded-lg"
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={String(option.value)}
              className="text-xs sm:text-sm px-2 sm:px-3 data-[state=on]:bg-background"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Hero KPI Cards */}
      <TrainingHeroKPI
        totalTrainings={stats.totalTrainings}
        trainingsThisMonth={stats.trainingsThisMonth}
        avgPerWeek={stats.avgTrainingsPerWeek}
        mostFrequentType={stats.mostFrequentType}
      />

      {/* Training Type Distribution and Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrainingTypeDistributionCard distribution={stats.trainingTypeDistribution} />
        <TrainingDurationCard />
      </div>

      {/* Tag Distribution */}
      <GlobalTagDistributionCard
        focusDistribution={stats.focusDistribution}
        bodyPartDistribution={stats.bodyPartDistribution}
        intensityDistribution={stats.intensityDistribution}
      />
    </div>
  );
}
