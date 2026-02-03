/**
 * ClientSummaryStrip Component
 * 
 * Compact horizontal strip showing key metrics:
 * - Credit balance with breakdown
 * - This month's trainings
 * - Quick actions
 */
import { 
  CreditCard, 
  Plus,
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useClientCreditSummary } from '@/hooks/useCreditLots';
import { useClientLTV } from '@/hooks/useClientLTV';
import { differenceInDays, startOfMonth } from 'date-fns';

interface ClientSummaryStripProps {
  clientId: string;
  creditBalance: number;
  isSharedBudget: boolean;
  budgetGroupName?: string | null;
  sessionsThisMonth: number;
  unpaidCount?: number;
  unpaidAmount?: number;
  paymentMode?: string | null;
  onAddCredit: () => void;
  onAddTraining: () => void;
}

export function ClientSummaryStrip({
  clientId,
  creditBalance,
  isSharedBudget,
  budgetGroupName,
  sessionsThisMonth,
  unpaidCount = 0,
  unpaidAmount = 0,
  paymentMode,
  onAddCredit,
  onAddTraining,
}: ClientSummaryStripProps) {
  const { data: creditSummary } = useClientCreditSummary(clientId);
  const { data: ltvData } = useClientLTV(clientId);

  // Credit lots breakdown
  const oldCreditBalance = creditSummary?.old_balance || 0;
  const newCreditBalance = creditSummary?.new_balance || 0;
  const hasOldAndNew = oldCreditBalance > 0 && newCreditBalance > 0;
  
  // For cash_only clients, "debt" is the unpaid amount
  const isCashOnly = paymentMode === 'cash_only';
  const hasDebt = unpaidCount > 0;
  
  // Effective balance for display (for cash_only, show negative unpaid amount as "debt")
  const displayBalance = isCashOnly ? -unpaidAmount : creditBalance;

  const getCreditColor = () => {
    if (hasDebt) return 'text-destructive';
    if (displayBalance <= 0) return 'text-destructive';
    if (displayBalance < 800) return 'text-amber-500';
    return 'text-success';
  };

  const getCreditBg = () => {
    if (hasDebt) return 'bg-destructive/10 border-destructive/30';
    if (displayBalance <= 0) return 'bg-destructive/10 border-destructive/30';
    if (displayBalance < 800) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-success/10 border-success/30';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Credit/Debt Card - Premium instrument style */}
      <div className={cn(
        'rounded-2xl p-3.5 border backdrop-blur-sm transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'bg-card/80 shadow-sm',
        getCreditBg()
      )}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className={cn(
              'p-1.5 rounded-lg',
              hasDebt ? 'bg-destructive/20' : 'bg-primary/10'
            )}>
              {hasDebt ? (
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isCashOnly ? (hasDebt ? 'Dluh' : 'Stav') : 'Kredit'}
            </span>
          </div>
          {isSharedBudget && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="h-5 text-[10px] gap-1 bg-secondary/80">
                  <Users className="w-3 h-3" />
                  Sdílený
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{budgetGroupName || 'Sdílený rozpočet'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn('text-2xl font-bold tabular-nums tracking-tight', getCreditColor())}>
          {isCashOnly && hasDebt ? (
            <>-{formatCurrency(unpaidAmount)}</>
          ) : (
            formatCurrency(creditBalance)
          )}
        </div>
        {hasDebt && (
          <div className="text-[10px] text-destructive mt-1.5 font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            {unpaidCount}× nezaplaceno
          </div>
        )}
        {!isCashOnly && hasOldAndNew && !hasDebt && (
          <div className="flex gap-2 text-[10px] text-muted-foreground mt-1.5 font-medium">
            <span>Starý: {formatCurrency(oldCreditBalance)}</span>
            <span>Nový: {formatCurrency(newCreditBalance)}</span>
          </div>
        )}
        {!isCashOnly && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2.5 h-8 text-xs gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={onAddCredit}
          >
            <Plus className="w-3.5 h-3.5" />
            Dobít kredit
          </Button>
        )}
      </div>

      {/* Trainings This Month - Instrument card */}
      <div className={cn(
        'rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
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

      {/* LTV (Desktop only) - Instrument card */}
      <div className={cn(
        'hidden md:block rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
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
          <div className="text-sm text-muted-foreground">–</div>
        )}
      </div>

      {/* Avg per month (Desktop only) - Instrument card */}
      <div className={cn(
        'hidden md:block rounded-2xl p-3.5 border border-border/50 backdrop-blur-sm transition-all duration-200',
        'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
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
          <div className="text-sm text-muted-foreground">–</div>
        )}
      </div>
    </div>
  );
}
