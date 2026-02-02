import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Clock, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnpaidTrainings, usePayTraining, UnpaidTraining } from '@/hooks/useUnpaidTrainings';
import { PaymentMethod } from '@/hooks/useTrainingSessions';
import { cn } from '@/lib/utils';

interface UnpaidTrainingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface UnpaidTrainingRowProps {
  training: UnpaidTraining;
  onPay: (trainingId: string, method: PaymentMethod, deductCredit: boolean) => void;
  isPaying: boolean;
}

function UnpaidTrainingRow({ training, onPay, isPaying }: UnpaidTrainingRowProps) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');

  const handlePay = () => {
    onPay(training.id, paymentMethod, paymentMethod === 'credit');
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(training.client_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {training.client_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        
        <div className="text-right shrink-0">
          <p className="font-semibold text-foreground">
            {training.final_price?.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-3">
        <Select
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
        >
          <SelectTrigger className="h-9 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credit">Z kreditu</SelectItem>
            <SelectItem value="cash">Hotovost</SelectItem>
            <SelectItem value="card">Karta</SelectItem>
            <SelectItem value="bank">Převodem</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          size="sm"
          onClick={handlePay}
          disabled={isPaying}
          className="shrink-0"
        >
          {isPaying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Uhradit'
          )}
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/trainings/${training.id}`)}
          className="shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function UnpaidTrainingsDialog({ open, onOpenChange }: UnpaidTrainingsDialogProps) {
  const { data: trainings, isLoading } = useUnpaidTrainings();
  const payTraining = usePayTraining();
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (trainingId: string, method: PaymentMethod, deductCredit: boolean) => {
    setPayingId(trainingId);
    try {
      await payTraining.mutateAsync({
        trainingId,
        paymentMethod: method,
        deductCredit,
      });
    } finally {
      setPayingId(null);
    }
  };

  const totalAmount = trainings?.reduce((sum, t) => sum + (t.final_price || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Neuhrazené tréninky
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !trainings?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Žádné neuhrazené tréninky
          </div>
        ) : (
          <>
            <ScrollArea className={cn(trainings.length > 4 && 'h-[400px]')}>
              <div className="space-y-3 pr-4">
                {trainings.map((training) => (
                  <UnpaidTrainingRow
                    key={training.id}
                    training={training}
                    onPay={handlePay}
                    isPaying={payingId === training.id}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Celkem</span>
                <span className="text-lg font-semibold">
                  {totalAmount.toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
