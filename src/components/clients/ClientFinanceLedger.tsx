/**
 * ClientFinanceLedger Component
 * 
 * Unified financial timeline showing all credit movements:
 * - Trainings (completed/cancelled with charge)
 * - Payments (top-ups)
 * - Products
 * - Manual adjustments
 * 
 * Features:
 * - Monthly grouping for better readability
 * - Running balance per row
 * - XLSX export
 * - Filter by type
 * - Group budget support
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet,
  Download,
  Dumbbell,
  CreditCard,
  Package,
  Wrench,
  RefreshCw,
  ChevronRight,
  Users,
  User,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Loader2,
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, subDays, subMonths, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  LedgerEntry, 
  LedgerEntryType, 
  exportLedgerToXLSX,
  exportLedgerToTXT,
  formatPaymentMethod 
} from '@/lib/clientLedgerExport';

// ==================== Types ====================

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  duration?: number;
  final_price?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  participant_count?: number | null;
}

interface CreditTransaction {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  description?: string | null;
  training_session_id?: string | null;
  product_id?: string | null;
  payment_method?: string | null;
  client_id: string;
  group_id?: string | null;
  clients?: { name: string } | null;
}

type FilterType = 'all' | 'training' | 'payment' | 'product' | 'manual';
type PeriodFilter = 30 | 90 | 365 | 'all';
interface ClientFinanceLedgerProps {
  clientId: string;
  clientName: string;
  sessions: TrainingSession[];
  transactions: CreditTransaction[];
  currentBalance: number;
  isSharedBudget?: boolean;
  budgetGroupName?: string | null;
  isLoading?: boolean;
}

// ==================== Filter Config ====================

const FILTER_OPTIONS: { value: FilterType; label: string; icon: typeof Dumbbell }[] = [
  { value: 'all', label: 'Vše', icon: ArrowUpDown },
  { value: 'training', label: 'Tréninky', icon: Dumbbell },
  { value: 'payment', label: 'Dobití', icon: CreditCard },
  { value: 'product', label: 'Produkty', icon: Package },
  { value: 'manual', label: 'Korekce', icon: Wrench },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 30, label: 'Měsíc' },
  { value: 90, label: '3 měsíce' },
  { value: 365, label: 'Rok' },
  { value: 'all', label: 'Vše' },
];

// ==================== Helpers ====================

function getTransactionType(type: string): LedgerEntryType {
  switch (type) {
    case 'payment':
    case 'topup':
    case 'cash':
    case 'transfer':
    case 'package':
      return 'payment';
    case 'training':
    case 'deduction':
      return 'training';
    case 'product':
      return 'product';
    case 'refund':
    case 'canceled_training':
      return 'refund';
    case 'manual':
    case 'adjustment':
    default:
      return 'manual';
  }
}

function getPricingTypeLabel(participantCount: number | null | undefined): string {
  const count = participantCount || 1;
  if (count === 1) return 'Solo';
  if (count === 2) return 'Duo';
  if (count === 3) return 'Trio';
  return `${count}x`;
}

function getTypeIcon(type: LedgerEntryType) {
  switch (type) {
    case 'training':
      return <Dumbbell className="w-4 h-4" />;
    case 'payment':
      return <CreditCard className="w-4 h-4" />;
    case 'product':
      return <ShoppingCart className="w-4 h-4" />;
    case 'refund':
      return <RefreshCw className="w-4 h-4" />;
    default:
      return <Wrench className="w-4 h-4" />;
  }
}

// ==================== Component ====================

export function ClientFinanceLedger({
  clientId,
  clientName,
  sessions,
  transactions,
  currentBalance,
  isSharedBudget = false,
  budgetGroupName,
  isLoading = false,
}: ClientFinanceLedgerProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [showGroupScope, setShowGroupScope] = useState(true);

  // Build unified ledger entries with running balance
  const ledgerEntries = useMemo(() => {
    const entries: LedgerEntry[] = [];
    
    // Add transactions (except training-linked ones - we use sessions for those)
    const transactionSessionIds = new Set<string>();
    
    transactions.forEach(tx => {
      // Skip if this is a training transaction - we'll use session data instead
      if (tx.training_session_id) {
        transactionSessionIds.add(tx.training_session_id);
      }
      
      // Filter by client/group scope
      if (isSharedBudget && !showGroupScope && tx.client_id !== clientId) {
        return;
      }
      
      const type = getTransactionType(tx.type);
      
      // Skip training-type transactions (we'll add sessions separately)
      if (type === 'training' && tx.training_session_id) {
        return;
      }
      
      entries.push({
        id: tx.id,
        date: tx.created_at,
        type,
        description: tx.description || getDefaultDescription(type, tx),
        amount: tx.amount,
        balance: 0, // Will calculate below
        paymentMethod: tx.payment_method,
        memberName: tx.clients?.name || null,
        trainingSessionId: tx.training_session_id,
        productId: tx.product_id,
      });
    });
    
    // Add training sessions that affected credit
    sessions.forEach(session => {
      if (session.status === 'scheduled') return;
      
      const price = session.final_price || 0;
      if (price <= 0) return; // No credit impact
      
      const pricingType = getPricingTypeLabel(session.participant_count);
      
      entries.push({
        id: `session-${session.id}`,
        date: session.date,
        type: 'training',
        description: `${pricingType} trénink`,
        amount: -price,
        balance: 0,
        paymentMethod: session.payment_method || 'credit',
        trainingSessionId: session.id,
      });
    });
    
    // Sort by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate running balance (from most recent to oldest)
    let runningBalance = currentBalance;
    for (let i = 0; i < entries.length; i++) {
      entries[i].balance = runningBalance;
      // Subtract the amount to get previous balance
      runningBalance -= entries[i].amount;
    }
    
    return entries;
  }, [sessions, transactions, currentBalance, clientId, isSharedBudget, showGroupScope]);

  // Filter entries by type and period
  const filteredEntries = useMemo(() => {
    let filtered = ledgerEntries;
    
    // Type filter
    if (filter !== 'all') {
      filtered = filtered.filter(e => e.type === filter);
    }
    
    // Period filter
    if (periodFilter !== 'all') {
      const cutoffDate = subDays(new Date(), periodFilter);
      filtered = filtered.filter(e => isAfter(parseISO(e.date), cutoffDate));
    }
    
    return filtered;
  }, [ledgerEntries, filter, periodFilter]);

  // Group by month
  const groupedEntries = useMemo(() => {
    const groups: Map<string, LedgerEntry[]> = new Map();
    
    filteredEntries.forEach(entry => {
      const monthKey = format(parseISO(entry.date), 'yyyy-MM');
      const existing = groups.get(monthKey) || [];
      existing.push(entry);
      groups.set(monthKey, existing);
    });
    
    return Array.from(groups.entries()).map(([key, entries]) => ({
      monthKey: key,
      label: format(parseISO(`${key}-01`), 'LLLL yyyy', { locale: cs }),
      entries,
    }));
  }, [filteredEntries]);

  // Audit check - compare calculated balance with stored balance
  const auditResult = useMemo(() => {
    const calculatedBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);
    const difference = Math.abs(calculatedBalance - currentBalance);
    const matches = difference < 1; // Allow 1 CZK tolerance for rounding
    return {
      calculatedBalance,
      matches,
      difference,
    };
  }, [ledgerEntries, currentBalance]);

  // Stats
  const stats = useMemo(() => {
    const totalTopUp = ledgerEntries
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalSpent = ledgerEntries
      .filter(e => e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    
    const productCount = ledgerEntries.filter(e => e.type === 'product').length;
    
    return { totalTopUp, totalSpent, productCount };
  }, [ledgerEntries]);

  // Export handlers
  const handleExportXLSX = () => {
    exportLedgerToXLSX(ledgerEntries, clientName, isSharedBudget);
  };
  
  const handleExportTXT = () => {
    exportLedgerToTXT(ledgerEntries, clientName, currentBalance, stats, isSharedBudget);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Finanční přehled
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXLSX} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel (XLSX)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportTXT} className="gap-2">
                <FileText className="w-4 h-4" />
                Text (TXT)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Zůstatek</p>
            <p className={cn(
              "font-bold",
              currentBalance >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(currentBalance)}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Čerpáno</p>
            <p className="font-bold text-foreground flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-destructive" />
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Dobito</p>
            <p className="font-bold text-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-success" />
              {formatCurrency(stats.totalTopUp)}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Nákupy</p>
            <p className="font-bold text-foreground">
              {stats.productCount} ks
            </p>
          </div>
        </div>

        {/* Audit Banner */}
        {auditResult.matches ? (
          <Alert className="border-success/30 bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              Zůstatek souhlasí s evidencí
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Vypočtený zůstatek ({formatCurrency(auditResult.calculatedBalance)}) nesouhlasí s evidencí ({formatCurrency(currentBalance)}) — rozdíl {formatCurrency(auditResult.difference)}
            </AlertDescription>
          </Alert>
        )}

        {/* Group scope toggle */}
        {isSharedBudget && (
          <div className="flex gap-1.5">
            <Button
              variant={!showGroupScope ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowGroupScope(false)}
            >
              <User className="w-3 h-3" />
              Tento klient
            </Button>
            <Button
              variant={showGroupScope ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowGroupScope(true)}
            >
              <Users className="w-3 h-3" />
              Celá skupina
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {FILTER_OPTIONS.map(option => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setFilter(option.value)}
              >
                <Icon className="w-3 h-3" />
                {option.label}
              </Button>
            );
          })}
          
          {/* Period filter separator */}
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Period filter */}
          {PERIOD_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={periodFilter === option.value ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriodFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        {groupedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Žádné záznamy
          </p>
        ) : (
          <div className="space-y-4">
            {groupedEntries.map(group => (
              <div key={group.monthKey}>
                {/* Month header */}
                <div className="sticky top-0 bg-card z-10 py-2 border-b border-border mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h4>
                </div>
                
                {/* Entries */}
                <div className="space-y-1">
                  {group.entries.map(entry => (
                    <LedgerRow key={entry.id} entry={entry} showMember={isSharedBudget && showGroupScope} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Subcomponents ====================

interface LedgerRowProps {
  entry: LedgerEntry;
  showMember?: boolean;
}

function LedgerRow({ entry, showMember }: LedgerRowProps) {
  const isClickable = !!entry.trainingSessionId;
  const date = parseISO(entry.date);
  
  const content = (
    <div className={cn(
      "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
      isClickable && "hover:bg-secondary/50 cursor-pointer group"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        entry.amount > 0 
          ? "bg-success/10 text-success" 
          : "bg-destructive/10 text-destructive"
      )}>
        {getTypeIcon(entry.type)}
      </div>
      
      {/* Date column */}
      <div className="min-w-[50px] sm:min-w-[60px]">
        <p className="text-sm font-medium text-foreground">
          {format(date, 'd.M.', { locale: cs })}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(date, 'HH:mm', { locale: cs })}
        </p>
      </div>
      
      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.description}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {formatPaymentMethod(entry.paymentMethod)}
          {showMember && entry.memberName && ` • ${entry.memberName}`}
        </p>
      </div>
      
      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={cn(
          "text-sm font-bold",
          entry.amount > 0 ? "text-success" : "text-destructive"
        )}>
          {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(entry.balance)}
        </p>
      </div>
      
      {/* Arrow */}
      {isClickable && (
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
      )}
    </div>
  );
  
  if (isClickable && entry.trainingSessionId) {
    return (
      <Link to={`/trainings/${entry.trainingSessionId}`}>
        {content}
      </Link>
    );
  }
  
  return content;
}

// ==================== Helpers ====================

function getDefaultDescription(type: LedgerEntryType, tx: CreditTransaction): string {
  switch (type) {
    case 'payment':
      return 'Dobití kreditu';
    case 'product':
      return 'Nákup produktu';
    case 'refund':
      return 'Vrácení';
    case 'manual':
      return 'Ruční úprava';
    default:
      return tx.type;
  }
}
