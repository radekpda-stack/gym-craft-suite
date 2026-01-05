/**
 * ClientTrainingFinanceCard Component
 * 
 * Unified card combining Training History and Credit History with tabs
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  CreditCard,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  User,
  Plus,
  Minus,
  RefreshCw,
  Receipt,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  duration?: number;
  final_price?: number | null;
  payment_status?: string | null;
  participant_count?: number | null;
}

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

type TrainingFilterType = 'all' | 'completed' | 'cancelled_charged' | 'cancelled_free' | 'scheduled';
type CreditFilterType = 'all' | 'topup' | 'charge' | 'manual' | 'refund';

interface ClientTrainingFinanceCardProps {
  clientId: string;
  sessions: TrainingSession[];
  transactions: CreditTransaction[];
  isSharedBudget?: boolean;
  budgetGroupName?: string | null;
  isLoading?: boolean;
  defaultLimit?: number;
}

const TRAINING_FILTER_OPTIONS: { value: TrainingFilterType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'completed', label: 'Dokončeno' },
  { value: 'cancelled_charged', label: 'Strženo' },
  { value: 'scheduled', label: 'Plán' },
];

const CREDIT_FILTER_OPTIONS: { value: CreditFilterType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'topup', label: 'Dobití' },
  { value: 'charge', label: 'Čerpání' },
  { value: 'manual', label: 'Ruční' },
];

export function ClientTrainingFinanceCard({
  clientId,
  sessions,
  transactions,
  isSharedBudget = false,
  budgetGroupName,
  isLoading = false,
  defaultLimit = 10,
}: ClientTrainingFinanceCardProps) {
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilterType>('all');
  const [creditFilter, setCreditFilter] = useState<CreditFilterType>('all');
  const [showGroupTransactions, setShowGroupTransactions] = useState(false);
  const [showAllTrainings, setShowAllTrainings] = useState(false);
  const [showAllCredits, setShowAllCredits] = useState(false);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    switch (trainingFilter) {
      case 'completed':
        result = result.filter(s => s.status === 'completed');
        break;
      case 'cancelled_charged':
        result = result.filter(s => s.status === 'canceled' && s.final_price && s.final_price > 0);
        break;
      case 'cancelled_free':
        result = result.filter(s => s.status === 'canceled' && (!s.final_price || s.final_price === 0));
        break;
      case 'scheduled':
        result = result.filter(s => s.status === 'scheduled');
        break;
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return showAllTrainings ? result : result.slice(0, defaultLimit);
  }, [sessions, trainingFilter, showAllTrainings, defaultLimit]);

  const trainingTotalCount = useMemo(() => {
    switch (trainingFilter) {
      case 'completed':
        return sessions.filter(s => s.status === 'completed').length;
      case 'cancelled_charged':
        return sessions.filter(s => s.status === 'canceled' && s.final_price && s.final_price > 0).length;
      case 'cancelled_free':
        return sessions.filter(s => s.status === 'canceled' && (!s.final_price || s.final_price === 0)).length;
      case 'scheduled':
        return sessions.filter(s => s.status === 'scheduled').length;
      default:
        return sessions.length;
    }
  }, [sessions, trainingFilter]);

  // Credit helpers
  const getFilterCategory = (type: string): CreditFilterType => {
    switch (type) {
      case 'topup':
      case 'cash':
      case 'transfer':
      case 'package':
      case 'payment':
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

  const getPricingType = (participantCount: number | null | undefined): string => {
    const count = participantCount || 1;
    if (count === 1) return 'Solo';
    if (count === 2) return 'Duo';
    if (count === 3) return 'Trio';
    return `${count}x`;
  };

  const getStatusBadge = (session: TrainingSession) => {
    switch (session.status) {
      case 'completed':
        return (
          <Badge className="bg-success/10 text-success border-success/20 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hotovo
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Zrušeno
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Plán
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCreditImpact = (session: TrainingSession) => {
    if (session.status === 'scheduled') return null;
    
    const price = session.final_price || 0;
    if (price > 0) {
      return (
        <span className="text-destructive font-medium text-sm">
          −{formatCurrency(price)}
        </span>
      );
    }
    return <span className="text-muted-foreground text-sm">0 Kč</span>;
  };

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
      case 'payment':
        return 'Platba';
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
      <Tabs defaultValue="trainings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="trainings" className="gap-2">
            <Calendar className="w-4 h-4" />
            Tréninky ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Finance ({transactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Trainings Tab */}
        <TabsContent value="trainings" className="mt-0">
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TRAINING_FILTER_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={trainingFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTrainingFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Sessions list */}
          {filteredSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Žádné tréninky v této kategorii
            </p>
          ) : (
            <div className="space-y-1">
              {filteredSessions.map(session => (
                <Link
                  key={session.id}
                  to={`/trainings/${session.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="min-w-[80px]">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(session.date), "d.M.yyyy", { locale: cs })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.date), "HH:mm", { locale: cs })}
                      </p>
                    </div>

                    <Badge variant="outline" className="text-xs shrink-0">
                      {getPricingType(session.participant_count)}
                    </Badge>

                    {getStatusBadge(session)}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getCreditImpact(session)}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {trainingTotalCount > defaultLimit && !showAllTrainings && (
            <Button
              variant="ghost"
              className="w-full mt-2 text-sm"
              onClick={() => setShowAllTrainings(true)}
            >
              Zobrazit vše ({trainingTotalCount})
            </Button>
          )}
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
