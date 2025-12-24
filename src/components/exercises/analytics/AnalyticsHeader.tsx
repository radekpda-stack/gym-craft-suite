import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { AnalyticsPeriod, ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';

interface AnalyticsHeaderProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
}

export function AnalyticsHeader({
  period,
  onPeriodChange,
  comparisonMode,
  onComparisonModeChange,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
      {/* Period selector */}
      <ToggleGroup
        type="single"
        size="sm"
        value={String(period)}
        onValueChange={(v) => v && onPeriodChange(v === 'custom' ? 'custom' : Number(v) as AnalyticsPeriod)}
        className="bg-muted/50 rounded-lg p-0.5 shrink-0"
      >
        <ToggleGroupItem 
          value="30" 
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md whitespace-nowrap"
        >
          30 dní
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="90" 
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md whitespace-nowrap"
        >
          90 dní
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Comparison mode selector */}
      <ToggleGroup
        type="single"
        size="sm"
        value={comparisonMode}
        onValueChange={(v) => v && onComparisonModeChange(v as ComparisonMode)}
        className="bg-muted/50 rounded-lg p-0.5 shrink-0"
      >
        <ToggleGroupItem 
          value="client" 
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md whitespace-nowrap"
        >
          Klient
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="all" 
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md whitespace-nowrap"
        >
          Průměr
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
