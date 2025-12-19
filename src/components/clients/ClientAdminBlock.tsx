import { useState } from 'react';
import { 
  Wallet, 
  FileText, 
  Archive,
  ChevronDown,
  ChevronUp,
  Plus,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditStatementDialog } from '@/components/credit/CreditStatementDialog';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { PaymentModeSelector, PaymentMode } from './PaymentModeSelector';
import { Client, useUpdatePaymentMode } from '@/hooks/useClients';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientAdminBlockProps {
  client: Client;
  creditBalance: number;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  onArchive?: () => void;
}

export function ClientAdminBlock({
  client,
  creditBalance,
  isSharedBudget,
  budgetGroupId,
  onArchive,
}: ClientAdminBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  
  const updatePaymentMode = useUpdatePaymentMode();
  const { data: transactions = [] } = useCreditTransactions(client.id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(client.id);

  const handlePaymentModeChange = (mode: PaymentMode) => {
    updatePaymentMode.mutate({ id: client.id, payment_mode: mode });
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-sm">Administrativa</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick credit indicator */}
          <span className={cn(
            "text-sm font-semibold",
            creditBalance < 0 ? "text-destructive" : 
            creditBalance < 500 ? "text-warning" : "text-success"
          )}>
            {formatCurrency(creditBalance)}
          </span>
          {unpaidTrainings.length > 0 && (
            <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              {unpaidTrainings.length} neuhrazeno
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Payment Mode Selector */}
          <PaymentModeSelector
            value={client.payment_mode || 'credit'}
            onChange={handlePaymentModeChange}
            disabled={updatePaymentMode.isPending}
          />

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              className="gap-2"
              onClick={() => setCreditModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Přidat kredit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4" />
              Historie
            </Button>
            
            <CreditStatementDialog
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email || undefined}
              clientPhone={client.phone || undefined}
              isSharedBudget={isSharedBudget}
              budgetGroupId={budgetGroupId}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              }
            />
            
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={onArchive}
              >
                <Archive className="w-4 h-4" />
                {client.is_archived ? 'Obnovit' : 'Archivovat'}
              </Button>
            )}
          </div>
          
          {/* Transaction History (read-only) */}
          {showHistory && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Poslední transakce</h4>
              {recentTransactions.length > 0 ? (
                <div className="space-y-1">
                  {recentTransactions.map((t) => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                    >
                      <div className="flex-1 truncate">
                        <span className="text-muted-foreground">
                          {format(new Date(t.created_at), 'd.M.', { locale: cs })}
                        </span>
                        <span className="ml-2">{t.description || t.type}</span>
                      </div>
                      <span className={cn(
                        "font-semibold ml-2",
                        t.amount > 0 ? "text-success" : "text-destructive"
                      )}>
                        {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Žádné transakce</p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Unified Credit Modal */}
      <UnifiedCreditModal
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
        defaultClientId={client.id}
        showTrigger={false}
      />
    </div>
  );
}
