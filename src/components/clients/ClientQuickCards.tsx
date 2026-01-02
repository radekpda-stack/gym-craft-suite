/**
 * ClientQuickCards Component
 * 
 * 2 quick cards showing key information:
 * A) Next/Last Training (PT session)
 * B) Credit balance with finance info (unpaid trainings, packages)
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Plus,
  CalendarClock,
  CheckCircle,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format, differenceInDays, isFuture } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useClientPackages } from '@/hooks/useClientPackages';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  duration?: number;
}

interface QuickCardsProps {
  clientId: string;
  clientName: string;
  sessions: TrainingSession[];
  creditBalance: number;
  isSharedBudget: boolean;
  budgetGroupName?: string | null;
  budgetMemberCount?: number;
  onAddTraining: () => void;
  onAddCredit: () => void;
}

export function ClientQuickCards({
  clientId,
  sessions,
  creditBalance,
  isSharedBudget,
  budgetGroupName,
  budgetMemberCount,
  onAddTraining,
  onAddCredit,
}: QuickCardsProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Fetch finance data
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(clientId);
  const { data: packages = [] } = useClientPackages(clientId);
  const { data: transactions = [] } = useCreditTransactions(clientId);
  
  const unpaidCount = unpaidTrainings.length;
  const unpaidAmount = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  const activePackages = packages.filter(p => p.is_active);
  const recentTransactions = transactions.slice(0, 3);
  const hasFinanceDetails = unpaidCount > 0 || activePackages.length > 0 || recentTransactions.length > 0;
  
  // Find next scheduled and last completed training
  const { nextSession, lastSession } = useMemo(() => {
    const scheduled = sessions
      .filter(s => s.status === 'scheduled' && isFuture(new Date(s.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const completed = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      nextSession: scheduled[0] || null,
      lastSession: completed[0] || null,
    };
  }, [sessions]);

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = differenceInDays(date, new Date());
    
    if (days === 0) return `Dnes v ${format(date, 'HH:mm')}`;
    if (days === 1) return `Zítra v ${format(date, 'HH:mm')}`;
    if (days === -1) return 'Včera';
    if (days > 1 && days < 7) return format(date, "EEEE 'v' HH:mm", { locale: cs });
    return format(date, "d.M. 'v' HH:mm", { locale: cs });
  };

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
      {/* CARD A: Trainings */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Tréninky</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddTraining}>
            <Plus className="w-3 h-3" />
            Přidat
          </Button>
        </div>

        <div className="space-y-3">
          {/* Next session */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Další sezení</span>
              {nextSession ? (
                <Link 
                  to={`/trainings/${nextSession.id}`}
                  className="block text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {formatSessionDate(nextSession.date)}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenaplánováno</p>
              )}
            </div>
            {nextSession && (
              <Link to={`/trainings/${nextSession.id}`}>
                <Badge variant="outline" className="text-xs gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Přesunout
                </Badge>
              </Link>
            )}
          </div>

          {/* Last session */}
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Poslední sezení</span>
            {lastSession ? (
              <div className="flex items-center gap-2">
                <Link 
                  to={`/trainings/${lastSession.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {format(new Date(lastSession.date), "d.M.yyyy", { locale: cs })}
                </Link>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Dokončeno
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Zatím žádný</p>
            )}
          </div>
        </div>
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
                {isSharedBudget && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    Sdílený
                  </Badge>
                )}
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
