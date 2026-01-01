import { memo } from 'react';
import { Trophy, Clock, Banknote, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCareerStats, getNextMilestone } from '@/hooks/useCareerStats';
import { formatCurrency } from '@/lib/formatters';

export const CareerMilestoneCard = memo(function CareerMilestoneCard() {
  const { data, isLoading } = useCareerStats();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-24 mx-auto" />
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const nextMilestone = getNextMilestone(data.totalTrainings);
  const progressPercent = (data.totalTrainings / nextMilestone) * 100;
  const remaining = nextMilestone - data.totalTrainings;
  const totalHours = Math.round(data.totalMinutes / 60);

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-4 space-y-3 relative">
        {/* Header */}
        <div className="flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Kariérní statistiky
          </span>
        </div>

        {/* Main counter */}
        <div className="text-center py-2">
          <p className="text-4xl font-bold text-foreground tabular-nums">
            {data.totalTrainings.toLocaleString('cs-CZ')}
          </p>
          <p className="text-sm text-muted-foreground">
            odtrénovaných tréninků
          </p>
        </div>

        {/* Progress to milestone */}
        <div className="space-y-1.5">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Do milníku {nextMilestone}: {remaining} tréninků</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-semibold">{totalHours}h</p>
            <p className="text-[10px] text-muted-foreground">hodin</p>
          </div>
          <div className="text-center border-x border-border/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Banknote className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-semibold">{formatCurrency(data.totalIncome, false)}</p>
            <p className="text-[10px] text-muted-foreground">příjem</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-semibold">{data.activeClients}</p>
            <p className="text-[10px] text-muted-foreground">klientů</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
