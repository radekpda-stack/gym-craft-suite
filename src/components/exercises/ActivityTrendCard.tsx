import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';

interface ActivityTrendCardProps {
  currentMonth: number;
  lastMonth: number;
  trendPercent: number;
  isLoading?: boolean;
}

export function ActivityTrendCard({ currentMonth, lastMonth, trendPercent, isLoading }: ActivityTrendCardProps) {
  const isPositive = trendPercent > 10;
  const isNegative = trendPercent < -10;
  const isNeutral = !isPositive && !isNegative;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Trend aktivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Trend aktivity
          <StatInfoTooltip 
            title="Trend aktivity"
            description="Porovnání počtu záznamů cviků tento měsíc vs. minulý měsíc"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-full",
            isPositive && "bg-green-500/10",
            isNegative && "bg-red-500/10",
            isNeutral && "bg-muted"
          )}>
            {isPositive && <TrendingUp className="w-8 h-8 text-green-500" />}
            {isNegative && <TrendingDown className="w-8 h-8 text-red-500" />}
            {isNeutral && <Minus className="w-8 h-8 text-muted-foreground" />}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-bold",
                isPositive && "text-green-500",
                isNegative && "text-red-500",
                isNeutral && "text-muted-foreground"
              )}>
                {trendPercent > 0 && '+'}
                {trendPercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonth} záznamů tento měsíc
            </p>
            <p className="text-xs text-muted-foreground">
              vs. {lastMonth} minulý měsíc
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic">
          {isPositive && "Skvělá práce! Aktivita roste."}
          {isNegative && "Aktivita klesá - čas zabrat!"}
          {isNeutral && "Stabilní tempo, držte kurz."}
        </p>
      </CardContent>
    </Card>
  );
}
