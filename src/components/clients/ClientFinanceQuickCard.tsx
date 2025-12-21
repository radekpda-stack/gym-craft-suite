import { useState } from 'react';
import { Wallet, Plus, AlertCircle, History, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ClientFinanceQuickCardProps {
  clientId: string;
  creditBalance: number;
  unpaidCount: number;
  isSharedBudget?: boolean;
  sharedBudgetName?: string;
  budgetGroupId?: string;
}

export function ClientFinanceQuickCard({
  clientId,
  creditBalance,
  unpaidCount,
  isSharedBudget,
  sharedBudgetName,
  budgetGroupId,
}: ClientFinanceQuickCardProps) {
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: transactions = [] } = useCreditTransactions(clientId);

  const getCreditStatusColor = () => {
    if (creditBalance < 0) return 'text-destructive bg-destructive/10';
    if (creditBalance < 500) return 'text-warning bg-warning/10';
    return 'text-success bg-success/10';
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Credit Balance - Main Focus */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
            getCreditStatusColor()
          )}>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xl font-bold',
                creditBalance < 0 ? 'text-destructive' : 
                creditBalance < 500 ? 'text-warning' : 'text-success'
              )}>
                {formatCurrency(creditBalance)}
              </span>
              {isSharedBudget && sharedBudgetName && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full truncate">
                  {sharedBudgetName}
                </span>
              )}
            </div>
            {unpaidCount > 0 && (
              <div className="flex items-center gap-1 text-warning text-sm mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{unpaidCount} neuhrazených tréninků</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Transaction History Dialog */}
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <History className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Historie transakcí</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto -mx-6 px-6">
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.slice(0, 20).map((t) => (
                      <div 
                        key={t.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.description || t.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                          </p>
                        </div>
                        <span className={cn(
                          'font-bold ml-3 shrink-0',
                          t.amount > 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Žádné transakce
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Credit Button */}
          <Button 
            onClick={() => setCreditModalOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Přidat kredit</span>
          </Button>
        </div>
      </div>

      {/* Credit Modal */}
      <UnifiedCreditModal
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
        defaultClientId={clientId}
        showTrigger={false}
      />
    </div>
  );
}
