import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRevenueByType } from '@/hooks/useRevenueByType';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';
import { Lightbulb } from 'lucide-react';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface RevenueByTrainingTypeCardProps {
  periodRange: StatsPeriodRange | undefined;
}

const TYPE_COLORS: Record<string, string> = {
  strength: 'bg-warning',
  cardio: 'bg-destructive',
  hiit: 'bg-orange-500',
  conditioning: 'bg-accent',
  functional: 'bg-primary',
  mobility: 'bg-emerald-500',
  running: 'bg-sky-500',
  other: 'bg-muted-foreground',
};

export function RevenueByTrainingTypeCard({ periodRange }: RevenueByTrainingTypeCardProps) {
  const { data, isLoading } = useRevenueByType(periodRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Výnosnost podle typu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádná data pro vybrané období
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Výnosnost podle typu tréninku</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.items.map((item) => (
          <div key={item.type} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.typeLabel}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{item.trainings} tréninků</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(item.revenue, false)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={item.percentage} 
                className="h-2 flex-1"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                Ø {formatCurrency(item.hourlyRate, false)}/h
              </span>
            </div>
          </div>
        ))}

        {/* Insight */}
        {data.insight && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 mt-4">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{data.insight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
