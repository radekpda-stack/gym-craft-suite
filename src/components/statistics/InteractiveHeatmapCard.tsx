import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTrainingHeatmap } from '@/hooks/useTrainingHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type HeatmapPeriod = 'month' | '3months' | 'year' | 'all';

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6:00 - 19:00

const PERIOD_OPTIONS: { value: HeatmapPeriod; label: string }[] = [
  { value: 'month', label: 'Měsíc' },
  { value: '3months', label: '3 měsíce' },
  { value: 'year', label: 'Rok' },
  { value: 'all', label: 'Vše' },
];

function getHeatColor(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return 'bg-muted/30';
  
  const intensity = value / maxValue;
  
  if (intensity < 0.2) return 'bg-primary/20';
  if (intensity < 0.4) return 'bg-primary/40';
  if (intensity < 0.6) return 'bg-primary/60';
  if (intensity < 0.8) return 'bg-primary/80';
  return 'bg-primary';
}

export function InteractiveHeatmapCard() {
  const [period, setPeriod] = useState<HeatmapPeriod>('3months');
  const { data, isLoading } = useTrainingHeatmap(period);

  if (isLoading || !data) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  const { cells, maxCount, totalTrainings } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Heatmapa kapacity
          </CardTitle>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(val) => val && setPeriod(val as HeatmapPeriod)}
            className="bg-muted/50 p-0.5 rounded-md"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="text-xs px-2 py-1 data-[state=on]:bg-background"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {totalTrainings} tréninků za vybrané období
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Hour labels */}
              <div className="flex mb-1">
                <div className="w-8" /> {/* Spacer for day labels */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-[10px] text-muted-foreground"
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex gap-0.5 mb-0.5">
                  <div className="w-8 text-xs text-muted-foreground flex items-center">
                    {day}
                  </div>
                  {HOURS.map((hour) => {
                    const cellData = cells.find(
                      (d) => d.day === dayIndex && d.hour === hour
                    );
                    const count = cellData?.count || 0;
                    const avgDuration = cellData?.avgDuration || 0;

                    return (
                      <Tooltip key={`${dayIndex}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 aspect-square rounded-sm cursor-pointer transition-colors hover:ring-1 hover:ring-primary/50 ${getHeatColor(
                              count,
                              maxCount
                            )}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-medium">
                            {day} {hour}:00
                          </div>
                          <div className="text-muted-foreground">
                            {count} {count === 1 ? 'trénink' : count < 5 ? 'tréninky' : 'tréninků'}
                          </div>
                          {avgDuration > 0 && (
                            <div className="text-muted-foreground">
                              Ø {Math.round(avgDuration)} min
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                <span>Méně</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm bg-muted/30" />
                  <div className="w-3 h-3 rounded-sm bg-primary/20" />
                  <div className="w-3 h-3 rounded-sm bg-primary/40" />
                  <div className="w-3 h-3 rounded-sm bg-primary/60" />
                  <div className="w-3 h-3 rounded-sm bg-primary/80" />
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                </div>
                <span>Více</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
