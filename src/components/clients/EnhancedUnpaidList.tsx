import { useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertTriangle, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePayTraining, UnpaidTraining } from '@/hooks/useUnpaidTrainings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/hooks/useTrainingSessions';
import { formatCurrency } from '@/lib/formatters';

interface UnpaidTrainingsListProps {
  clientId: string;
  clientName: string;
  unpaidTrainings?: UnpaidTraining[];
  compact?: boolean;
}

export function EnhancedUnpaidList({ 
  clientId, 
  clientName,
  unpaidTrainings = [],
  compact = false,
}: UnpaidTrainingsListProps) {
  const payTraining = usePayTraining();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');

  const handlePay = async (trainingId: string) => {
    setPayingId(trainingId);
    try {
      await payTraining.mutateAsync({
        trainingId,
        paymentMethod,
        deductCredit: paymentMethod === 'credit',
      });
    } finally {
      setPayingId(null);
    }
  };

  const totalUnpaid = useMemo(() => {
    return unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  }, [unpaidTrainings]);

  if (unpaidTrainings.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {unpaidTrainings.length} neuhrazených tréninků
            </span>
          </div>
          <span className="text-sm font-bold text-destructive">
            {formatCurrency(totalUnpaid)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Neuhrazené tréninky ({unpaidTrainings.length})
        </h3>
        <span className="text-sm font-bold text-destructive">
          Celkem: {formatCurrency(totalUnpaid)}
        </span>
      </div>

      <div className="space-y-2">
        {unpaidTrainings.map((training) => (
          <div 
            key={training.id}
            className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20"
          >
            <div>
              <p className="text-sm font-medium">
                {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(training.date), 'HH:mm')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {formatCurrency(training.final_price || 0)}
              </span>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Z kreditu</SelectItem>
                  <SelectItem value="cash">Hotovost</SelectItem>
                  <SelectItem value="card">Karta</SelectItem>
                  <SelectItem value="bank">Převod</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePay(training.id)}
                disabled={payingId === training.id}
                className="h-8 gap-1"
              >
                {payingId === training.id ? (
                  'Platím...'
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Uhradit
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}