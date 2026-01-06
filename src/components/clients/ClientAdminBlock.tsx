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
import { ClientPortalAccessSection } from '@/components/client-portal/ClientPortalAccessSection';
import { CustomPriceSection } from './CustomPriceSection';
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
      <div className="glass rounded-xl overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-sm">Nastavení</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        {/* Expandable content */}
        {isExpanded && (
          <div className="p-4 pt-0 space-y-6">
            {/* Client Portal Section - Full version with settings */}
            <ClientPortalAccessSection
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email}
              showSettings={true}
            />

            <div className="border-t border-border/50 pt-4">
              {/* Custom Price Section */}
              <CustomPriceSection
                clientId={client.id}
                currentPrice={client.custom_training_price}
                currentNote={client.custom_price_note}
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
