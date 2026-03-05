/**
 * TrainingStatusBar - Sticky bottom bar with readiness indicators + all actions
 * Consolidates: Complete, Start, Cancel, Reschedule into one bar.
 */
import { useState } from 'react';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Check,
  Play,
  X,
  Loader2,
  Tag,
  Gauge,
  Banknote,
  MoreVertical,
  XCircle,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface TrainingStatusBarProps {
  status: string;
  tagsReady: boolean;
  rpeSet: boolean;
  totalPrice: number;
  rpe: number | null;
  trainingDate: string;
  clientName: string;
  onComplete: () => void;
  onStart?: () => void;
  onCancelWithCredit?: (note?: string) => Promise<void>;
  onCancelNoCredit?: (note?: string) => Promise<void>;
  onReschedule?: (newDate: Date) => Promise<void>;
  isLoading?: boolean;
  isCanceling?: boolean;
  isRescheduling?: boolean;
  className?: string;
}

export function TrainingStatusBar({
  status,
  tagsReady,
  rpeSet,
  totalPrice,
  rpe,
  trainingDate,
  clientName,
  onComplete,
  onStart,
  onCancelWithCredit,
  onCancelNoCredit,
  onReschedule,
  isLoading,
  isCanceling,
  isRescheduling,
  className,
}: TrainingStatusBarProps) {
  const [showCancelCreditDialog, setShowCancelCreditDialog] = useState(false);
  const [showCancelNoCreditDialog, setShowCancelNoCreditDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [newDate, setNewDate] = useState<Date>(new Date(trainingDate));

  if (status === 'completed' || status === 'canceled' || status === 'cancelled') {
    return null;
  }

  const date = new Date(trainingDate);
  const hoursUntilTraining = differenceInHours(date, new Date());
  const isLateCancellation = hoursUntilTraining < 24 && hoursUntilTraining > 0;
  const isPastTraining = hoursUntilTraining < 0;

  const anyActionLoading = isLoading || isCanceling || isRescheduling;

  const handleCancelWithCreditConfirm = async () => {
    if (onCancelWithCredit) {
      await onCancelWithCredit(cancelNote || undefined);
    }
    setShowCancelCreditDialog(false);
    setCancelNote('');
  };

  const handleCancelNoCreditConfirm = async () => {
    if (onCancelNoCredit) {
      await onCancelNoCredit(cancelNote || undefined);
    }
    setShowCancelNoCreditDialog(false);
    setCancelNote('');
  };

  const handleRescheduleConfirm = async () => {
    if (onReschedule) {
      await onReschedule(newDate);
    }
    setShowRescheduleDialog(false);
  };

  return (
    <>
      <div className={cn(
        'fixed left-0 right-0 z-40 border-t border-border/50',
        'bg-card/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)]',
        'bottom-[calc(104px+env(safe-area-inset-bottom))] lg:bottom-0',
        'safe-area-bottom',
        className
      )}>
        <div className="max-w-2xl mx-auto px-4 py-2 space-y-1.5">
          {/* Readiness indicators */}
          <div className="flex items-center gap-3 text-xs">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full",
              tagsReady ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            )}>
              <Tag className="w-3 h-3" />
              <span className="font-medium">{tagsReady ? 'Tagy ✓' : 'Tagy ✗'}</span>
            </div>
            
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full",
              rpeSet ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}>
              <Gauge className="w-3 h-3" />
              <span className="font-medium">{rpe ? `RPE ${rpe}` : 'RPE —'}</span>
            </div>
            
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              <Banknote className="w-3 h-3" />
              <span className="font-medium tabular-nums">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Secondary actions dropdown */}
            {(onCancelWithCredit || onCancelNoCredit || onReschedule) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 px-3 shrink-0"
                    disabled={anyActionLoading}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56 backdrop-blur-md bg-popover/95">
                  {onCancelWithCredit && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setCancelNote('');
                        setShowCancelCreditDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Zrušit (strhnout kredit)
                    </DropdownMenuItem>
                  )}
                  {onCancelNoCredit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setCancelNote('');
                        setShowCancelNoCreditDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Zrušit (bez kreditu)
                    </DropdownMenuItem>
                  )}
                  {(onCancelWithCredit || onCancelNoCredit) && onReschedule && (
                    <DropdownMenuSeparator />
                  )}
                  {onReschedule && (
                    <DropdownMenuItem
                      onClick={() => {
                        setNewDate(new Date(trainingDate));
                        setShowRescheduleDialog(true);
                      }}
                    >
                      <CalendarClock className="w-4 h-4 mr-2" />
                      Přesunout termín
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Start button - for scheduled trainings */}
            {status === 'scheduled' && onStart && (
              <Button
                variant="outline"
                className="h-11 px-4 font-semibold"
                onClick={onStart}
                disabled={anyActionLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Zahájit
              </Button>
            )}

            {/* Complete button - always primary */}
            <Button
              className="flex-1 h-11 text-base font-bold bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
              onClick={onComplete}
              disabled={anyActionLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Dokončit trénink
            </Button>
          </div>
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
                <span className="font-bold text-destructive">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
            {isLateCancellation && (
              <div className="p-2 rounded bg-warning/10 text-warning text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Pozdní zrušení (méně než 24h)
              </div>
            )}
            {isPastTraining && (
              <div className="p-2 rounded bg-muted/50 text-muted-foreground text-sm flex items-center gap-2">
                <CalendarClock className="w-4 h-4 shrink-0" />
                Trénink je v minulosti — zpětné zrušení je možné
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cancel-note-credit">Důvod zrušení (volitelné)</Label>
              <Textarea
                id="cancel-note-credit"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Proč byl trénink zrušen..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelCreditDialog(false)} disabled={isCanceling}>
              Zpět
            </Button>
            <Button variant="destructive" onClick={handleCancelWithCreditConfirm} disabled={isCanceling}>
              {isCanceling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Zrušit a strhnout {formatCurrency(totalPrice)}
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
            <div className="space-y-2">
              <Label htmlFor="cancel-note-no-credit">Důvod zrušení (volitelné)</Label>
              <Textarea
                id="cancel-note-no-credit"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Proč byl trénink zrušen..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelNoCreditDialog(false)} disabled={isCanceling}>
              Zpět
            </Button>
            <Button onClick={handleCancelNoCreditConfirm} disabled={isCanceling}>
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
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex justify-between text-sm">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleRescheduleConfirm} disabled={isRescheduling}>
              {isRescheduling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Přesunout na {format(newDate, "d.M. HH:mm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
