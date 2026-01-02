import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  ChevronRight, 
  AlertTriangle,
  Package,
  Receipt,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useClientPackages } from '@/hooks/useClientPackages';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface ClientFinanceCardProps {
  clientId: string;
  creditBalance: number;
  isSharedBudget: boolean;
  budgetGroupName?: string;
  defaultOpen?: boolean;
}

export function ClientFinanceCard({ 
  clientId, 
  creditBalance, 
  isSharedBudget, 
  budgetGroupName,
  defaultOpen = false 
}: ClientFinanceCardProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const { data: transactions = [] } = useCreditTransactions(clientId);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(clientId);
  const { data: packages = [] } = useClientPackages(clientId);

  const unpaidCount = unpaidTrainings.length;
  const unpaidAmount = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  const activePackages = packages.filter(p => p.is_active);
  const recentTransactions = transactions.slice(0, 3);

  const getCreditStatus = () => {
    if (creditBalance <= 0) return 'critical';
    if (creditBalance < 800) return 'warning';
    return 'ok';
  };

  const creditStatus = getCreditStatus();

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-xl',
                creditStatus === 'critical' ? 'bg-destructive/10' :
                creditStatus === 'warning' ? 'bg-warning/10' : 'bg-success/10'
              )}>
                <Wallet className={cn(
                  'w-5 h-5',
                  creditStatus === 'critical' ? 'text-destructive' :
                  creditStatus === 'warning' ? 'text-warning' : 'text-success'
                )} />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Finance</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    'font-bold',
                    creditStatus === 'critical' ? 'text-destructive' :
                    creditStatus === 'warning' ? 'text-warning' : 'text-foreground'
                  )}>
                    {formatCurrency(creditBalance)}
                  </span>
                  {isSharedBudget && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      <Users className="w-3 h-3 mr-1" />
                      Sdílený
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unpaidCount > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px]">
                  {unpaidCount} nezaplaceno
                </Badge>
              )}
              <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-2 p-4 glass rounded-2xl space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {/* Balance */}
              <div className={cn(
                'p-3 rounded-xl border text-center',
                creditStatus === 'critical' ? 'bg-destructive/10 border-destructive/30' :
                creditStatus === 'warning' ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'
              )}>
                <p className={cn(
                  'text-xl font-bold',
                  creditStatus === 'critical' ? 'text-destructive' :
                  creditStatus === 'warning' ? 'text-warning' : 'text-success'
                )}>
                  {formatCurrency(creditBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isSharedBudget ? budgetGroupName || 'Sdílený rozpočet' : 'Kredit'}
                </p>
              </div>

              {/* Unpaid */}
              <div className={cn(
                'p-3 rounded-xl border text-center',
                unpaidCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/50 border-border/50'
              )}>
                <div className="flex items-center justify-center gap-1">
                  {unpaidCount > 0 && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <p className={cn(
                    'text-xl font-bold',
                    unpaidCount > 0 ? 'text-destructive' : 'text-foreground'
                  )}>
                    {unpaidCount}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">Nezaplacené tréninky</p>
                {unpaidCount > 0 && (
                  <p className="text-[10px] text-destructive">{formatCurrency(unpaidAmount)}</p>
                )}
              </div>
            </div>

            {/* Active packages */}
            {activePackages.length > 0 && (
              <div className="space-y-2">
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
              <div className="space-y-2">
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

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => navigate(`/records/${clientId}?tab=transactions`)}
              >
                Historie
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
