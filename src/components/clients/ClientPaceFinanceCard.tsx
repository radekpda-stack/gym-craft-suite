/**
 * ClientPaceFinanceCard Component
 * 
 * Card combining Pace Trend chart and Credit History with tabs
 * Replaces the previous Training & Finance card
 */
import { useState, useMemo } from 'react';
import { 
  CreditCard,
  ChevronRight,
  Plus,
  Minus,
  Receipt,
  Loader2,
  Users,
  User,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ClientPaceTrendCard } from './ClientPaceTrendCard';

interface CreditTransaction {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  description?: string | null;
  training_session_id?: string | null;
  client_id: string;
  group_id?: string | null;
}

type CreditFilterType = 'all' | 'topup' | 'charge' | 'manual' | 'refund';

interface ClientPaceFinanceCardProps {
  clientId: string;
  transactions: CreditTransaction[];
  isSharedBudget?: boolean;
  budgetGroupName?: string | null;
  isLoading?: boolean;
  defaultLimit?: number;
}

const CREDIT_FILTER_OPTIONS: { value: CreditFilterType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'topup', label: 'Dobití' },
  { value: 'charge', label: 'Čerpání' },
  { value: 'manual', label: 'Ruční' },
];

export function ClientPaceFinanceCard({
  clientId,
  transactions,
  isSharedBudget = false,
  budgetGroupName,
  isLoading = false,
  defaultLimit = 10,
}: ClientPaceFinanceCardProps) {
  const [creditFilter, setCreditFilter] = useState<CreditFilterType>('all');
  const [showGroupTransactions, setShowGroupTransactions] = useState(false);
  const [showAllCredits, setShowAllCredits] = useState(false);

  // Credit helpers
  const getFilterCategory = (type: string): CreditFilterType => {
    switch (type) {
      case 'topup':
      case 'cash':
      case 'transfer':
      case 'package':
        return 'topup';
      case 'training':
      case 'deduction':
        return 'charge';
      case 'manual':
      case 'adjustment':
        return 'manual';
      case 'refund':
        return 'manual';
      default:
        return 'all';
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (isSharedBudget && !showGroupTransactions) {
      result = result.filter(t => t.client_id === clientId);
    }

    if (creditFilter !== 'all') {
      result = result.filter(t => getFilterCategory(t.type) === creditFilter);
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return showAllCredits ? result : result.slice(0, defaultLimit);
  }, [transactions, creditFilter, showGroupTransactions, isSharedBudget, clientId, showAllCredits, defaultLimit]);

  const creditTotalCount = useMemo(() => {
    let result = [...transactions];
    
    if (isSharedBudget && !showGroupTransactions) {
      result = result.filter(t => t.client_id === clientId);
    }
    
    if (creditFilter !== 'all') {
      result = result.filter(t => getFilterCategory(t.type) === creditFilter);
    }
    
    return result.length;
  }, [transactions, creditFilter, showGroupTransactions, isSharedBudget, clientId]);

  const getTypeIcon = (type: string) => {
    const category = getFilterCategory(type);
    switch (category) {
      case 'topup':
        return <Plus className="w-3 h-3" />;
      case 'charge':
        return <Minus className="w-3 h-3" />;
      default:
        return <Receipt className="w-3 h-3" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'topup':
      case 'cash':
        return 'Dobití hotově';
      case 'transfer':
        return 'Dobití převodem';
      case 'package':
        return 'Balíček';
      case 'training':
        return 'Trénink';
      case 'deduction':
        return 'Stržení';
      case 'manual':
        return 'Ruční úprava';
      case 'adjustment':
        return 'Korekce';
      case 'refund':
        return 'Vrácení';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <Tabs defaultValue="pace" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pace" className="gap-2">
            <Timer className="w-4 h-4" />
            Vývoj tempa
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Finance ({transactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Pace Trend Tab */}
        <TabsContent value="pace" className="mt-0">
          <ClientPaceTrendCard clientId={clientId} />
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="mt-0">
          {/* Scope toggle for shared budgets */}
          {isSharedBudget && (
            <div className="flex gap-1.5 mb-3">
              <Button
                variant={!showGroupTransactions ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowGroupTransactions(false)}
              >
                <User className="w-3 h-3" />
                Klient
              </Button>
              <Button
                variant={showGroupTransactions ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowGroupTransactions(true)}
              >
                <Users className="w-3 h-3" />
                Skupina
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CREDIT_FILTER_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={creditFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCreditFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Transactions list */}
          {filteredTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Žádné transakce v této kategorii
            </p>
          ) : (
            <div className="space-y-1">
              {filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg",
                    transaction.training_session_id ? "hover:bg-secondary/50 transition-colors cursor-pointer" : ""
                  )}
                  onClick={() => {
                    if (transaction.training_session_id) {
                      window.location.href = `/trainings/${transaction.training_session_id}`;
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      transaction.amount > 0 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {getTypeIcon(transaction.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {getTypeLabel(transaction.type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(transaction.created_at), "d.M.yyyy HH:mm", { locale: cs })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "font-bold text-sm",
                      transaction.amount > 0 ? "text-success" : "text-destructive"
                    )}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </span>

                    {transaction.training_session_id && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {creditTotalCount > defaultLimit && !showAllCredits && (
            <Button
              variant="ghost"
              className="w-full mt-2 text-sm"
              onClick={() => setShowAllCredits(true)}
            >
              Zobrazit vše ({creditTotalCount})
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
