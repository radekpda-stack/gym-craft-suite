import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface UnpaidTrainingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnpaidTrainingsDialog({ open, onOpenChange }: UnpaidTrainingsDialogProps) {
  const navigate = useNavigate();
  const { data: trainings, isLoading } = useUnpaidTrainings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuhrazené tréninky</DialogTitle>
          <DialogDescription>
            Tréninky čekající na platbu
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : !trainings?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Žádné neuhrazené tréninky
          </p>
        ) : (
          <div className="space-y-2">
            {trainings.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.client_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <p className="text-sm font-bold shrink-0 ml-2">
                  {formatCurrency(t.final_price)}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            onOpenChange(false);
            navigate('/finance');
          }}
        >
          Zobrazit vše ve financích
        </Button>
      </DialogContent>
    </Dialog>
  );
}
