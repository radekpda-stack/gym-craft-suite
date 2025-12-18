import { useState } from 'react';
import { 
  Wallet, 
  ShoppingBag, 
  FileText, 
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditManagement } from '@/components/credit/CreditManagement';
import { CreditStatementDialog } from '@/components/credit/CreditStatementDialog';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

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
  const [showCredits, setShowCredits] = useState(false);

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
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowCredits(!showCredits)}
            >
              <Wallet className="w-4 h-4" />
              Historie kreditů
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
                  Vyúčtování PDF
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
          
          {/* Credit Management */}
          {showCredits && (
            <CreditManagement
              clientId={client.id}
              clientName={client.name}
              currentBalance={creditBalance}
            />
          )}
        </div>
      )}
    </div>
  );
}
