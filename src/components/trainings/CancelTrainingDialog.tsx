import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertTriangle, Clock, Users, Coins } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

interface CancelTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    date: string;
    duration: number;
    participant_count?: number;
    client_id: string;
  } | null;
  clientName?: string;
  trainingPrice: number;
  onConfirm: (deductCredit: boolean) => void;
  isLoading?: boolean;
}

export function CancelTrainingDialog({
  open,
  onOpenChange,
  session,
  clientName,
  trainingPrice,
  onConfirm,
  isLoading = false,
}: CancelTrainingDialogProps) {
  const [deductCredit, setDeductCredit] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDeductCredit(false);
    }
  }, [open]);

  if (!session) return null;

  const sessionDate = new Date(session.date);
  const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilSession < 24 && hoursUntilSession > 0;
  const isPastSession = hoursUntilSession < 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Zrušit trénink
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Session info */}
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                {clientName && (
                  <p className="font-medium text-foreground">{clientName}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {format(sessionDate, 'EEEE d. M. yyyy, HH:mm', { locale: cs })}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {session.participant_count || 1} {(session.participant_count || 1) === 1 ? 'osoba' : 'osoby'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    {trainingPrice} Kč
                  </span>
                </div>
              </div>

              {/* Late cancellation warning */}
              {isLateCancellation && (
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    Pozdní zrušení (méně než 24 hodin do tréninku). 
                    Zvažte stržení kreditu.
                  </p>
                </div>
              )}

              {isPastSession && (
                <div className="bg-muted/50 border border-border/30 rounded-xl p-3 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Tento trénink již proběhl.
                  </p>
                </div>
              )}

              {/* Deduct credit switch */}
              <div 
                className={cn(
                  "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-colors",
                  deductCredit 
                    ? "bg-destructive/10 border-destructive/50" 
                    : "bg-secondary/30 border-border/50"
                )}
              >
                <div className="space-y-1">
                  <Label 
                    htmlFor="deduct-credit" 
                    className={cn(
                      "font-semibold cursor-pointer",
                      deductCredit ? "text-destructive" : "text-foreground"
                    )}
                  >
                    Odečíst kredit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {deductCredit 
                      ? `Bude strženo ${trainingPrice} Kč z kreditu klienta`
                      : "Kredit klienta zůstane beze změny"
                    }
                  </p>
                </div>
                <Switch
                  id="deduct-credit"
                  checked={deductCredit}
                  onCheckedChange={setDeductCredit}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading}>Zpět</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deductCredit)}
            disabled={isLoading}
            className={cn(
              deductCredit 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : ""
            )}
          >
            {deductCredit ? "Zrušit a stržit kredit" : "Zrušit bez stržení"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
