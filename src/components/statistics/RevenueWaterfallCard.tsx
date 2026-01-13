import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useRevenueWaterfall, WaterfallCompareType } from '@/hooks/useRevenueWaterfall';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const COMPARE_OPTIONS: { value: WaterfallCompareType; label: string }[] = [
  { value: 'month', label: 'vs Minulý měsíc' },
  { value: 'year', label: 'vs Minulý rok' },
];

export function RevenueWaterfallCard() {
  const [compareMode, setCompareMode] = useState<WaterfallCompareType>('month');
  const { data, isLoading } = useRevenueWaterfall(compareMode);

  if (isLoading || !data) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  const { segments, netChange, netChangePercent } = data;
  const isPositive = netChange >= 0;
  const maxAbsValue = Math.max(...segments.map(d => Math.abs(d.value)), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            Změna obratu
          </CardTitle>
          <ToggleGroup
            type="single"
            value={compareMode}
            onValueChange={(val) => val && setCompareMode(val as WaterfallCompareType)}
            className="bg-muted/50 p-0.5 rounded-md"
          >
            {COMPARE_OPTIONS.map((opt) => (
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
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{formatCurrency(netChange)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {isPositive ? '+' : ''}{netChangePercent.toFixed(1)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <div className="space-y-2">
            {segments.map((item, index) => {
              const isTotal = item.type === 'total';
              const barWidth = isTotal 
                ? 100 
                : (Math.abs(item.value) / maxAbsValue) * 100;
              
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div className="group cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {index > 0 && index < segments.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isTotal ? 'font-medium' : 'text-muted-foreground'}`}>
                            {item.name}
                          </span>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ml-2 ${
                          isTotal 
                            ? (item.value >= 0 ? 'text-success' : 'text-destructive')
                            : item.value >= 0 
                              ? 'text-success' 
                              : 'text-destructive'
                        }`}>
                          {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                        </span>
                      </div>
                      <div className="h-6 bg-muted/30 rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all group-hover:opacity-80 ${
                            isTotal
                              ? item.value >= 0 
                                ? 'bg-success' 
                                : 'bg-destructive'
                              : item.value >= 0
                                ? 'bg-success/70'
                                : 'bg-destructive/70'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">
                      {item.value >= 0 ? 'Nárůst' : 'Pokles'}: {formatCurrency(Math.abs(item.value))}
                    </div>
                    {item.tooltip && (
                      <div className="text-muted-foreground mt-1">{item.tooltip}</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          {isPositive ? (
            <span>📈 Obrat roste oproti {compareMode === 'month' ? 'minulému měsíci' : 'minulému roku'}</span>
          ) : (
            <span>📉 Obrat klesá oproti {compareMode === 'month' ? 'minulému měsíci' : 'minulému roku'}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
