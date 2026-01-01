/**
 * ClientCreditHistory Component
 * 
 * Displays credit transaction history with:
 * - Filters: Vše | Dobití | Čerpání | Ruční úprava | Refund
 * - Toggle: "Jen tento klient" / "Celá skupina" (for shared budgets)
 * - Each row: date, amount, reason, link to session
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  Receipt,
  Loader2,
  Users,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

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

type FilterType = 'all' | 'topup' | 'charge' | 'manual' | 'refund';

interface ClientCreditHistoryProps {
  clientId: string;
  transactions: CreditTransaction[];
  isSharedBudget?: boolean;
  budgetGroupName?: string | null;
  isLoading?: boolean;
  defaultLimit?: number;
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'topup', label: 'Dobití' },
  { value: 'charge', label: 'Čerpání' },
  { value: 'manual', label: 'Ruční' },
  { value: 'refund', label: 'Refund' },
];

export function ClientCreditHistory({
  clientId,
  transactions,
  isSharedBudget = false,
  budgetGroupName,
  isLoading = false,
  defaultLimit = 15,
}: ClientCreditHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showGroupTransactions, setShowGroupTransactions] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Map transaction types to filter categories
  const getFilterCategory = (type: string): FilterType => {
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
        return 'refund';
      default:
        return 'all';
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by client or group
    if (isSharedBudget && !showGroupTransactions) {
      result = result.filter(t => t.client_id === clientId);
    }

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(t => getFilterCategory(t.type) === filter);
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return showAll ? result : result.slice(0, defaultLimit);
  }, [transactions, filter, showGroupTransactions, isSharedBudget, clientId, showAll, defaultLimit]);

  const totalCount = useMemo(() => {
    let result = [...transactions];
    
    if (isSharedBudget && !showGroupTransactions) {
      result = result.filter(t => t.client_id === clientId);
    }
    
    if (filter !== 'all') {
      result = result.filter(t => getFilterCategory(t.type) === filter);
    }
    
    return result.length;
  }, [transactions, filter, showGroupTransactions, isSharedBudget, clientId]);

  const getTypeIcon = (type: string) => {
    const category = getFilterCategory(type);
    switch (category) {
      case 'topup':
        return <Plus className="w-3 h-3" />;
      case 'charge':
        return <Minus className="w-3 h-3" />;
      case 'refund':
        return <RefreshCw className="w-3 h-3" />;
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
      <div className="glass rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-foreground">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Kreditová historie</h3>
          <span className="text-sm text-muted-foreground">({totalCount})</span>
        </div>
      </div>

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
            Jen tento klient
          </Button>
          <Button
            variant={showGroupTransactions ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowGroupTransactions(true)}
          >
            <Users className="w-3 h-3" />
            Celá skupina
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_OPTIONS.map(option => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(option.value)}
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
                "flex items-center justify-between p-3 rounded-lg",
                transaction.training_session_id ? "hover:bg-secondary/50 transition-colors cursor-pointer" : ""
              )}
              onClick={() => {
                if (transaction.training_session_id) {
                  window.location.href = `/trainings/${transaction.training_session_id}`;
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  transaction.amount > 0 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {getTypeIcon(transaction.type)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {getTypeLabel(transaction.type)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {transaction.description || format(new Date(transaction.created_at), "d.M.yyyy HH:mm", { locale: cs })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Amount */}
                <span className={cn(
                  "font-bold",
                  transaction.amount > 0 ? "text-success" : "text-destructive"
                )}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                </span>

                {/* Link indicator */}
                {transaction.training_session_id && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more */}
      {totalCount > defaultLimit && !showAll && (
        <Button
          variant="ghost"
          className="w-full mt-2 text-sm"
          onClick={() => setShowAll(true)}
        >
          Zobrazit vše ({totalCount})
        </Button>
      )}
    </div>
  );
}
