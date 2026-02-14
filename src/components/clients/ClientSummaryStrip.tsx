/**
 * ClientSummaryStrip Component
 * 
 * Compact horizontal strip showing secondary metrics:
 * - This month's trainings (with quick action)
 * - LTV (lifetime value)
 * - Average per month
 * 
 * Credit is moved to ClientCreditHeroCard for prominent display.
 */
import { 
  Plus,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useClientLTV } from '@/hooks/useClientLTV';

interface ClientSummaryStripProps {
  clientId: string;
  sessionsThisMonth: number;
  onAddTraining: () => void;
}

export function ClientSummaryStrip({
  clientId,
  sessionsThisMonth,
  onAddTraining,
}: ClientSummaryStripProps) {
  const { data: ltvData } = useClientLTV(clientId);

  return (
     <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-1 px-1 pb-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
      {/* Trainings This Month - Instrument card */}
      <div className={cn(
        'rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5',
        'min-w-[150px] flex-shrink-0 snap-start sm:min-w-0 sm:flex-shrink'
      )}>
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Calendar className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Tento měsíc</span>
        </div>
        <div className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
          {sessionsThisMonth}
          <span className="text-sm font-normal text-muted-foreground ml-1.5">tréninků</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2.5 h-8 text-xs gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={onAddTraining}
        >
          <Plus className="w-3.5 h-3.5" />
          Nový trénink
        </Button>
      </div>

       {/* LTV - Instrument card */}
      <div className={cn(
         'rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5',
        'min-w-[150px] flex-shrink-0 snap-start sm:min-w-0 sm:flex-shrink'
      )}>
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <div className="p-1.5 rounded-lg bg-success/10">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Celková hodnota</span>
        </div>
        {ltvData && ltvData.totalRevenue > 0 ? (
          <>
            <div className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
              {formatCurrency(ltvData.totalRevenue)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              {ltvData.totalTrainings} tréninků • {ltvData.monthsActive} měsíců
            </div>
          </>
        ) : (
           <div className="text-2xl font-bold text-muted-foreground">–</div>
        )}
      </div>

       {/* Avg per month - Instrument card */}
      <div className={cn(
         'rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5',
        'min-w-[150px] flex-shrink-0 snap-start sm:min-w-0 sm:flex-shrink'
      )}>
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Calendar className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Průměr/měsíc</span>
        </div>
        {ltvData && ltvData.avgRevenuePerMonth > 0 ? (
          <>
            <div className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
              {formatCurrency(ltvData.avgRevenuePerMonth)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              {(ltvData.totalTrainings / Math.max(ltvData.monthsActive, 1)).toFixed(1)} tréninků/měsíc
            </div>
          </>
        ) : (
           <div className="text-2xl font-bold text-muted-foreground">–</div>
        )}
      </div>
    </div>
  );
}
