import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCohortRetention, CohortGranularity } from '@/hooks/useCohortRetention';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getRetentionColor(rate: number | null): string {
  if (rate === null) return 'bg-muted/20';
  if (rate >= 80) return 'bg-success';
  if (rate >= 60) return 'bg-success/70';
  if (rate >= 40) return 'bg-warning/70';
  if (rate >= 20) return 'bg-warning/50';
  return 'bg-destructive/70';
}

function getTextColor(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground/50';
  if (rate >= 60) return 'text-white';
  return 'text-foreground';
}

export function CohortRetentionCard() {
  const [granularity, setGranularity] = useState<CohortGranularity>('month');
  const { data, isLoading } = useCohortRetention(granularity);

  if (isLoading || !data) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  const { rows, periodLabels } = data;
  const maxPeriods = periodLabels.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            Cohort retence
          </CardTitle>
          <ToggleGroup
            type="single"
            value={granularity}
            onValueChange={(val) => val && setGranularity(val as CohortGranularity)}
            className="bg-muted/50 p-0.5 rounded-md"
          >
            <ToggleGroupItem
              value="week"
              className="text-xs px-3 py-1 data-[state=on]:bg-background"
            >
              Týdenní
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="text-xs px-3 py-1 data-[state=on]:bg-background"
            >
              Měsíční
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Sledování retence klientů od prvního tréninku
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nedostatek dat pro zobrazení cohort retence
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                {/* Header row */}
                <div className="flex mb-1">
                  <div className="w-20 text-xs text-muted-foreground font-medium">
                    Cohort
                  </div>
                  <div className="w-12 text-xs text-muted-foreground text-center">
                    #
                  </div>
                  {periodLabels.map((label) => (
                    <div
                      key={label}
                      className="flex-1 text-center text-xs text-muted-foreground min-w-[40px]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Cohort rows */}
                {rows.map((cohort) => (
                  <div key={cohort.cohortLabel} className="flex gap-0.5 mb-0.5">
                    <div className="w-20 text-xs text-muted-foreground flex items-center truncate">
                      {cohort.cohortLabel}
                    </div>
                    <div className="w-12 text-xs text-center flex items-center justify-center text-muted-foreground">
                      {cohort.initialClients}
                    </div>
                    {cohort.retentionByPeriod.map((rate, periodIndex) => (
                      <Tooltip key={periodIndex}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 min-w-[40px] h-8 rounded-sm flex items-center justify-center cursor-pointer transition-colors hover:ring-1 hover:ring-primary/50 ${getRetentionColor(rate)}`}
                          >
                            <span className={`text-[10px] font-medium ${getTextColor(rate)}`}>
                              {rate !== null ? `${Math.round(rate)}%` : '-'}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-medium">
                            {cohort.cohortLabel} - {periodLabels[periodIndex]}
                          </div>
                          <div className="text-muted-foreground">
                            {rate !== null
                              ? `${Math.round(rate)}% retence`
                              : 'Zatím neproběhlo'}
                          </div>
                          <div className="text-muted-foreground">
                            {cohort.initialClients} klientů v cohortě
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {/* Fill remaining cells if needed */}
                    {Array.from({ length: maxPeriods - cohort.retentionByPeriod.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="flex-1 min-w-[40px] h-8 rounded-sm bg-muted/10"
                      />
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                  <span>0%</span>
                  <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-sm bg-destructive/70" />
                    <div className="w-3 h-3 rounded-sm bg-warning/50" />
                    <div className="w-3 h-3 rounded-sm bg-warning/70" />
                    <div className="w-3 h-3 rounded-sm bg-success/70" />
                    <div className="w-3 h-3 rounded-sm bg-success" />
                  </div>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
