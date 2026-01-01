/**
 * QuickActionsSection Component
 * 
 * Provides 4 quick actions for scheduled trainings:
 * A) Dokončit trénink (complete + deduct credit)
 * B) Zrušit pozdě (cancel + deduct credit)
 * C) Zrušit z dobré vůle (cancel + no credit)
 * D) Přesunout termín (reschedule)
 */
import { useState } from 'react';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { formatCurrency } from '@/lib/formatters';

interface QuickActionsSectionProps {
  trainingId: string;
  trainingDate: string;
  trainingPrice: number;
  clientName: string;
  onComplete: () => void;
  onCancelWithCredit: () => void;
  onCancelNoCredit: () => void;
  onReschedule: (newDate: Date) => Promise<void>;
  isCompleting?: boolean;
  isCanceling?: boolean;
  isRescheduling?: boolean;
}

export function QuickActionsSection({
  trainingId,
  trainingDate,
  trainingPrice,
  clientName,
  onComplete,
  onCancelWithCredit,
  onCancelNoCredit,
  onReschedule,
  isCompleting,
  isCanceling,
  isRescheduling,
}: QuickActionsSectionProps) {
  const [showCancelCreditDialog, setShowCancelCreditDialog] = useState(false);
  const [showCancelNoCreditDialog, setShowCancelNoCreditDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState<Date>(new Date(trainingDate));

  const date = new Date(trainingDate);
  const hoursUntilTraining = differenceInHours(date, new Date());
  const isLateCancellation = hoursUntilTraining < 24 && hoursUntilTraining > 0;
  const isPastTraining = hoursUntilTraining < 0;

  const handleRescheduleConfirm = async () => {
    await onReschedule(newDate);
    setShowRescheduleDialog(false);
  };

  const handleCancelWithCreditConfirm = () => {
    onCancelWithCredit();
    setShowCancelCreditDialog(false);
  };

  const handleCancelNoCreditConfirm = () => {
    onCancelNoCredit();
    setShowCancelNoCreditDialog(false);
  };

  return (
    <>
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Rychlé akce</span>
        </div>

        {/* Primary action - DOKONČIT */}
        <Button 
          size="lg" 
          className="w-full gap-2 h-12 text-base font-semibold"
          onClick={onComplete}
          disabled={isCompleting || isCanceling || isRescheduling}
        >
          {isCompleting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          DOKONČIT TRÉNINK
        </Button>

        {/* Secondary actions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Cancel with credit */}
          <Button 
            variant="outline" 
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowCancelCreditDialog(true)}
            disabled={isCompleting || isCanceling || isRescheduling}
          >
            <XCircle className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Zrušit (strhnout)</span>
          </Button>

          {/* Cancel without credit */}
          <Button 
            variant="outline" 
            className="gap-1.5"
            onClick={() => setShowCancelNoCreditDialog(true)}
            disabled={isCompleting || isCanceling || isRescheduling}
          >
            <XCircle className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Zrušit (bez kreditu)</span>
          </Button>

          {/* Reschedule */}
          <Button 
            variant="outline" 
            className="gap-1.5"
            onClick={() => {
              setNewDate(new Date(trainingDate));
              setShowRescheduleDialog(true);
            }}
            disabled={isCompleting || isCanceling || isRescheduling}
          >
            {isRescheduling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarClock className="w-4 h-4" />
            )}
            <span className="text-xs sm:text-sm">Přesunout</span>
          </Button>
        </div>
      </div>

      {/* Cancel WITH credit dialog */}
      <Dialog open={showCancelCreditDialog} onOpenChange={setShowCancelCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Zrušit a strhnout kredit
            </DialogTitle>
            <DialogDescription>
              Trénink bude zrušen a z kreditu klienta bude odečtena cena tréninku.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Klient:</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Termín:</span>
                <span className="font-medium">{format(date, "d.M. HH:mm", { locale: cs })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Strhnout:</span>
                <span className="font-bold text-destructive">{formatCurrency(trainingPrice)}</span>
              </div>
            </div>

            {isLateCancellation && (
              <div className="p-2 rounded bg-warning/10 text-warning text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Pozdní zrušení (méně než 24h)
              </div>
            )}

            {isPastTraining && (
              <div className="p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Trénink již proběhl
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelCreditDialog(false)}>
              Zpět
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelWithCreditConfirm}
              disabled={isCanceling}
            >
              {isCanceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Zrušit a strhnout {formatCurrency(trainingPrice)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel WITHOUT credit dialog */}
      <Dialog open={showCancelNoCreditDialog} onOpenChange={setShowCancelNoCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Zrušit bez odečtení kreditu
            </DialogTitle>
            <DialogDescription>
              Trénink bude zrušen, ale kredit klienta zůstane beze změny.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Klient:</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Termín:</span>
                <span className="font-medium">{format(date, "d.M. HH:mm", { locale: cs })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kredit:</span>
                <span className="font-medium text-success">Beze změny</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelNoCreditDialog(false)}>
              Zpět
            </Button>
            <Button 
              onClick={handleCancelNoCreditConfirm}
              disabled={isCanceling}
            >
              {isCanceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Zrušit trénink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              Přesunout termín
            </DialogTitle>
            <DialogDescription>
              Vyberte nový datum a čas pro tento trénink.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Aktuální termín:</span>
                  <span className="font-medium">{format(date, "EEEE d.M. 'v' HH:mm", { locale: cs })}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Nový termín:</label>
                <DateTimePicker
                  value={newDate}
                  onChange={(d) => setNewDate(typeof d === 'string' ? new Date(d) : d as Date)}
                  returnString={false}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleRescheduleConfirm}
              disabled={isRescheduling}
            >
              {isRescheduling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Přesunout na {format(newDate, "d.M. HH:mm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
