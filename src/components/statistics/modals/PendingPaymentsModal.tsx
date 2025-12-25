import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, User, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PendingPaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function PendingPaymentsModal({ open, onOpenChange, stats }: PendingPaymentsModalProps) {
  const navigate = useNavigate();
  
  if (!stats) return null;

  const pendingClients = stats.pendingPayments?.clients || [];
  const totalAmount = stats.pendingPayments?.amount || 0;
  const clientCount = stats.pendingPayments?.count || 0;

  const handleClientClick = (clientId: string) => {
    onOpenChange(false);
    navigate(`/clients/${clientId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            Nezaplacené platby - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-destructive/5 rounded-xl">
            <p className="text-4xl font-bold text-destructive">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              celkem k zaplacení od {clientCount} klientů
            </p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{clientCount}</p>
              <p className="text-xs text-muted-foreground">klientů dluží</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <CreditCard className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">
                {clientCount > 0 ? formatCurrency(totalAmount / clientCount) : formatCurrency(0)}
              </p>
              <p className="text-xs text-muted-foreground">průměr na klienta</p>
            </div>
          </div>

          {/* Info text */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              Tato karta zobrazuje klienty se záporným kreditem. Kliknutím na klienta přejdete na jeho profil, 
              kde můžete spravovat platby a kredit.
            </p>
          </div>

          {/* Client list */}
          {pendingClients.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-3">Klienti s nezaplaceným kreditem</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingClients.map((client) => (
                  <Button
                    key={client.id}
                    variant="ghost"
                    className="w-full justify-between h-auto p-3 hover:bg-destructive/5"
                    onClick={() => handleClientClick(client.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="font-medium">{client.name}</span>
                    </div>
                    <span className="font-bold text-destructive">
                      {formatCurrency(Math.abs(client.balance))}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Žádní klienti s nezaplaceným kreditem</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
