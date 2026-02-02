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
        'rounded-2xl p-3.5 border backdrop-blur-sm transition-all hover:shadow-md',
        getCreditBg()
      )}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {hasDebt ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">
              {isCashOnly ? (hasDebt ? 'Dluh' : 'Stav') : 'Kredit'}
            </span>
          </div>
          {isSharedBudget && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="h-5 text-[10px] gap-1">
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
        <div className={cn('text-xl font-bold', getCreditColor())}>
          {isCashOnly && hasDebt ? (
            <>-{formatCurrency(unpaidAmount)}</>
          ) : (
            formatCurrency(creditBalance)
          )}
        </div>
        {hasDebt && (
          <div className="text-[10px] text-destructive mt-1 font-medium">
            {unpaidCount}× nezaplaceno
          </div>
        )}
        {!isCashOnly && hasOldAndNew && !hasDebt && (
          <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
            <span>Starý: {formatCurrency(oldCreditBalance)}</span>
            <span>Nový: {formatCurrency(newCreditBalance)}</span>
          </div>
        )}
        {!isCashOnly && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 h-7 text-xs gap-1"
            onClick={onAddCredit}
          >
            <Plus className="w-3 h-3" />
            Dobít kredit
          </Button>
        )}
      </div>

      {/* Trainings This Month - Instrument card */}
      <div className="rounded-2xl p-3.5 border border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Tento měsíc</span>
        </div>
        <div className="text-2xl font-bold text-foreground tracking-tight">
          {sessionsThisMonth}
          <span className="text-sm font-normal text-muted-foreground ml-1.5">tréninků</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2.5 h-8 text-xs gap-1.5 rounded-lg hover:bg-primary/10 hover:text-primary"
          onClick={onAddTraining}
        >
          <Plus className="w-3.5 h-3.5" />
          Nový trénink
        </Button>
      </div>

      {/* LTV (Desktop only) - Instrument card */}
      <div className="hidden md:block rounded-2xl p-3.5 border border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Celková hodnota</span>
        </div>
        {ltvData && ltvData.totalRevenue > 0 ? (
          <>
            <div className="text-2xl font-bold text-foreground tracking-tight">
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
      <div className="hidden md:block rounded-2xl p-3.5 border border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Průměr/měsíc</span>
        </div>
        {ltvData && ltvData.avgRevenuePerMonth > 0 ? (
          <>
            <div className="text-2xl font-bold text-foreground tracking-tight">
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
