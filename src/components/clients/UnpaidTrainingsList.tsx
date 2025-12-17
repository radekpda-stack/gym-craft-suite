import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertCircle, Wallet, CreditCard, Banknote, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUnpaidTrainings, usePayTraining } from '@/hooks/useUnpaidTrainings';
import { PaymentMethodSelector, PaymentOption, getPaymentMethodFromOption } from '@/components/trainings/PaymentMethodSelector';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface UnpaidTrainingsListProps {
  clientId: string;
  clientName: string;
}

export function UnpaidTrainingsList({ clientId, clientName }: UnpaidTrainingsListProps) {
  const { data: unpaidTrainings = [], isLoading } = useUnpaidTrainings(clientId);
  const payTraining = usePayTraining();
  
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('credit');

  const selectedTraining = unpaidTrainings.find(t => t.id === selectedTrainingId);
  const totalUnpaid = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);

  const handleOpenPayDialog = (trainingId: string) => {
    setSelectedTrainingId(trainingId);
    setPaymentMethod('credit');
    setShowPayDialog(true);
  };

  const handlePay = async () => {
    if (!selectedTrainingId) return;
    
    await payTraining.mutateAsync({
      trainingId: selectedTrainingId,
      paymentMethod: getPaymentMethodFromOption(paymentMethod),
      deductCredit: paymentMethod === 'credit',
    });
    
    setShowPayDialog(false);
    setSelectedTrainingId(null);
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-secondary rounded w-32 mb-3" />
        <div className="space-y-2">
          <div className="h-12 bg-secondary rounded" />
          <div className="h-12 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  if (unpaidTrainings.length === 0) {
    return null;
  }

  return (
    <>
      <div className="glass rounded-xl p-4 border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-warning" />
          <h3 className="font-medium text-foreground">Nezaplacené tréninky</h3>
          <Badge variant="outline" className="ml-auto bg-warning/10 text-warning border-warning/30">
            {unpaidTrainings.length} ({formatCurrency(totalUnpaid)})
          </Badge>
        </div>

        <div className="space-y-2">
          {unpaidTrainings.map((training) => (
            <div
              key={training.id}
              className="flex items-center justify-between p-3 rounded-lg bg-card border hover:bg-secondary/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {training.participant_count} {training.participant_count === 1 ? 'osoba' : training.participant_count < 5 ? 'osoby' : 'osob'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-warning">
                  {formatCurrency(training.final_price || 0)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleOpenPayDialog(training.id)}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Uhradit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uhradit trénink</DialogTitle>
            <DialogDescription>
              Vyberte způsob platby pro trénink ze dne{' '}
              {selectedTraining && format(new Date(selectedTraining.date), 'd. MMMM yyyy', { locale: cs })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Částka k úhradě:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(selectedTraining?.final_price || 0)}
                </span>
              </div>
            </div>

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={payTraining.isPending}
            />

            {paymentMethod === 'credit' && (
              <p className="text-sm text-muted-foreground text-center">
                Částka bude odečtena z kreditu klienta
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handlePay} 
              disabled={payTraining.isPending}
            >
              {payTraining.isPending ? 'Ukládám...' : 'Potvrdit platbu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
