import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';

interface ActiveExercisesCardProps {
  activeCount: number;
  totalCount: number;
  percentage: number;
  isLoading?: boolean;
}

export function ActiveExercisesCard({ activeCount, totalCount, percentage, isLoading }: ActiveExercisesCardProps) {
  const isGood = percentage >= 30;
  const isMedium = percentage >= 15 && percentage < 30;
  const isLow = percentage < 15;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Využití knihovny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] flex items-center justify-center">
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
          <BookOpen className="w-4 h-4 text-primary" />
          Využití knihovny
          <StatInfoTooltip 
            title="Využití knihovny"
            description="Kolik cviků z knihovny bylo použito za posledních 30 dní"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {activeCount}
            </span>
            <span className="text-muted-foreground">
              / {totalCount} cviků
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isGood && "bg-green-500",
                  isMedium && "bg-yellow-500",
                  isLow && "bg-red-500"
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isGood && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              {percentage}% využití
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
