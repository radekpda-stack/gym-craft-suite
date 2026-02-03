import { useState } from 'react';
import { 
  Settings, 
  FileText, 
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditStatementDialog } from '@/components/credit/CreditStatementDialog';
import { PaymentModeSelector, PaymentMode } from './PaymentModeSelector';
import { CustomPriceSection } from './CustomPriceSection';
import { LegacyPriceFixSection } from './LegacyPriceFixSection';
import { Client, useUpdatePaymentMode } from '@/hooks/useClients';

interface ClientAdminBlockProps {
  client: Client;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  onArchive?: () => void;
  defaultExpanded?: boolean;
}

export function ClientAdminBlock({
  client,
  isSharedBudget,
  budgetGroupId,
  onArchive,
  defaultExpanded = false,
}: ClientAdminBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const updatePaymentMode = useUpdatePaymentMode();

  const handlePaymentModeChange = (mode: PaymentMode) => {
    updatePaymentMode.mutate({ id: client.id, payment_mode: mode });
  };

  return (
    <div className="space-y-4">
      {/* Admin Settings */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted/50">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm">Nastavení</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
          )}
        </button>
        
        {/* Expandable content */}
        {isExpanded && (
          <div className="p-4 pt-0 space-y-6">
            <div>
              {/* Custom Price Section */}
              <CustomPriceSection
                clientId={client.id}
                currentPrice={client.custom_training_price}
                currentNote={client.custom_price_note}
                currentCreditLimit={client.custom_price_credit_limit}
                currentCreditBalance={client.credit_balance}
              />
            </div>

            <div className="border-t border-border/50 pt-4">
              {/* Payment Mode Selector */}
              <PaymentModeSelector
                value={client.payment_mode || 'credit'}
                onChange={handlePaymentModeChange}
                disabled={updatePaymentMode.isPending}
              />
            </div>

            <div className="border-t border-border/50 pt-4">
              {/* Legacy Price Fix Section */}
              <LegacyPriceFixSection clientId={client.id} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
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
                    PDF výpis
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
          </div>
        )}
      </div>
    </div>
  );
}
