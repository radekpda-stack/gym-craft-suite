import { memo, useState } from 'react';
import { Gauge, Info, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessHealthScore } from '@/hooks/useBusinessHealthScore';
import { cn } from '@/lib/utils';
import { BusinessHealthDetailModal } from './BusinessHealthDetailModal';

export const BusinessHealthScoreCard = memo(function BusinessHealthScoreCard() {
  const { data, isLoading } = useBusinessHealthScore();
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statusColors = {
    excellent: 'text-success',
    good: 'text-primary',
    warning: 'text-warning',
    critical: 'text-destructive',
  };

  const statusBg = {
    excellent: 'from-success/10 to-success/5',
    good: 'from-primary/10 to-primary/5',
    warning: 'from-warning/10 to-warning/5',
    critical: 'from-destructive/10 to-destructive/5',
  };

  const statusLabels = {
    excellent: 'Výborný',
    good: 'Dobrý',
    warning: 'Vyžaduje pozornost',
    critical: 'Kritický',
  };

  return (
    <>
      <Card 
        className={cn(
          'overflow-hidden bg-gradient-to-br cursor-pointer transition-all hover:ring-2 hover:ring-primary/20',
          statusBg[data.status]
        )}
        onClick={() => setDetailOpen(true)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className={cn('w-5 h-5', statusColors[data.status])} />
              <span className="text-sm font-semibold">Business Health Score</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                      <p className="font-medium">Jak se počítá skóre:</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p>• Retence: aktivní klienti za 60 dní</p>
                        <p>• Zdraví kreditů: klienti s kladným kreditem</p>
                        <p>• Trend příjmů: změna oproti minulému měsíci</p>
                        <p>• Platební morálka: % zaplacených tréninků</p>
                      </div>
                      {data.creditInfo && (
                        <div className="pt-1 border-t border-border/50 text-muted-foreground">
                          <p>• {data.creditInfo.clientsWithCredit} s kreditem</p>
                          <p>• {data.creditInfo.clientsInDebt} v dluhu</p>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', 
                data.status === 'excellent' && 'bg-success/20 text-success',
                data.status === 'good' && 'bg-primary/20 text-primary',
                data.status === 'warning' && 'bg-warning/20 text-warning',
                data.status === 'critical' && 'bg-destructive/20 text-destructive'
              )}>
                {statusLabels[data.status]}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn('text-4xl font-bold', statusColors[data.status])}>
              {data.score}
            </div>
            <div className="flex-1">
              <Progress value={data.score} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {Object.entries(data.components).map(([key, comp]) => (
              <div key={key} className="p-1.5 rounded-lg bg-background/50">
                <div className="font-semibold">{comp.value}%</div>
                <div className="text-muted-foreground text-[10px] truncate">{comp.label}</div>
              </div>
            ))}
          </div>

          {data.insights.length > 0 && (
            <p className="text-xs text-muted-foreground">
              💡 {data.insights[0]}
            </p>
          )}
        </CardContent>
      </Card>

      <BusinessHealthDetailModal 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
    </>
  );
});
