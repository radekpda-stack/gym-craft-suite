/**
 * ClientQuickCards Component
 * 
 * 2 quick cards showing key information:
 * A) Pace Trend Chart (cardio progress)
 * B) Credit balance with finance info (unpaid trainings, packages, LTV)
 */
import { useState } from 'react';
import { 
  CreditCard, 
  Users, 
  Plus,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useClientPackages } from '@/hooks/useClientPackages';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useClientLTV } from '@/hooks/useClientLTV';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClientPaceTrendCard } from './ClientPaceTrendCard';

interface QuickCardsProps {
  clientId: string;
  clientName: string;
  creditBalance: number;
  isSharedBudget: boolean;
  budgetGroupName?: string | null;
  budgetMemberCount?: number;
  onAddCredit: () => void;
}

export function ClientQuickCards({
  clientId,
  creditBalance,
  isSharedBudget,
  budgetGroupName,
  budgetMemberCount,
  onAddCredit,
}: QuickCardsProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Fetch finance data
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(clientId);
  const { data: packages = [] } = useClientPackages(clientId);
  const { data: transactions = [] } = useCreditTransactions(clientId);
  const { data: ltvData } = useClientLTV(clientId);
  
  const unpaidCount = unpaidTrainings.length;
  const unpaidAmount = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  const activePackages = packages.filter(p => p.is_active);
  const recentTransactions = transactions.slice(0, 3);
  const hasFinanceDetails = unpaidCount > 0 || activePackages.length > 0 || recentTransactions.length > 0;

  const getCreditStatusColor = () => {
    if (creditBalance <= 0) return 'text-destructive';
    if (creditBalance < 800) return 'text-warning';
    return 'text-success';
  };

  const getCreditBgColor = () => {
    if (creditBalance <= 0) return 'bg-destructive/10 border-destructive/30';
    if (creditBalance < 800) return 'bg-warning/10 border-warning/30';
    return 'bg-success/10 border-success/30';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* CARD A: Pace Trend */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <ClientPaceTrendCard clientId={clientId} />
      </div>

      {/* CARD B: Credit with Finance */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">Kredit</span>
              {unpaidCount > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px]">
                  {unpaidCount} nezaplaceno
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddCredit}>
              <Plus className="w-3 h-3" />
              Dobít
            </Button>
          </div>

          <div className="space-y-2">
            {/* Balance */}
            <div className={cn('p-3 rounded-xl border', getCreditBgColor())}>
              <div className="flex items-center justify-between">
                <span className={cn('text-2xl font-bold', getCreditStatusColor())}>
                  {formatCurrency(creditBalance)}
                </span>
                <div className="flex items-center gap-2">
                  {/* LTV indicator */}
                  {ltvData && ltvData.totalRevenue > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs gap-1 bg-background/50">
                          <TrendingUp className="w-3 h-3 text-success" />
                          LTV
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <p className="font-medium">Lifetime Value: {formatCurrency(ltvData.totalRevenue)}</p>
                          <p>Tréninků: {ltvData.totalTrainings}</p>
                          <p>Průměr/měsíc: {formatCurrency(ltvData.avgRevenuePerMonth)}</p>
                          <p>Aktivní měsíců: {ltvData.monthsActive}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isSharedBudget && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="w-3 h-3" />
                      Sdílený
                    </Badge>
                  )}
                </div>
              </div>
              {isSharedBudget && budgetGroupName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {budgetGroupName}
                  {budgetMemberCount && budgetMemberCount > 1 && ` (${budgetMemberCount} členů)`}
                </p>
              )}
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-2 flex-wrap">
              {unpaidCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{formatCurrency(unpaidAmount)} k zaplacení</span>
                </div>
              )}
              {activePackages.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{activePackages.length} aktivní balíček</span>
                </div>
              )}
            </div>

            {/* Expand button */}
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showDetails ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Skrýt detaily
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Zobrazit detaily
                  </>
                )}
              </button>
            </CollapsibleTrigger>
          </div>

          {/* Expandable content */}
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
              {/* Empty state */}
              {!hasFinanceDetails && (
                <div className="text-center py-4 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Zatím žádné finanční záznamy</p>
                  <p className="text-xs opacity-70">Přidejte kredit nebo balíček pro zobrazení historie</p>
                </div>
              )}

              {/* Unpaid trainings */}
              {unpaidCount > 0 && (
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Nezaplacené tréninky
                    </span>
                    <span className="text-xs font-bold text-destructive">
                      {unpaidCount}× ({formatCurrency(unpaidAmount)})
                    </span>
                  </div>
                </div>
              )}

              {/* Active packages */}
              {activePackages.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Aktivní balíčky
                  </p>
                  {activePackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <span className="text-sm font-medium text-foreground">{pkg.package_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {pkg.trainings_used || 0}/{pkg.trainings_total} tréninků
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent transactions */}
              {recentTransactions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    Poslední transakce
                  </p>
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(tx.created_at), 'd. MMM', { locale: cs })}
                        </p>
                      </div>
                      <span className={cn(
                        'text-sm font-medium shrink-0',
                        tx.amount > 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
