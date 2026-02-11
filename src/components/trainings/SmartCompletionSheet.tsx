/**
 * SmartCompletionSheet - Bottom sheet that shows ONLY missing fields.
 * Replaces the Dialog-based completion flow for faster training completion.
 */
import { CheckCircle, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CompactTagSelector } from './CompactTagSelector';
import { InlineRPESelector } from './InlineRPESelector';
import {
  ParticipantPaymentCard,
  ParticipantPayment,
  IndividualPaymentMethod,
  calculatePaymentSummary,
} from './ParticipantPaymentCard';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CompletionState {
  tagsReady: boolean;
  rpeSet: boolean;
  missingTypes: Array<"focus" | "body_part" | "intensity" | "goal" | "health" | "status" | "business">;
}

interface SmartCompletionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Completion state
  completionState: CompletionState;
  
  // Tags
  dialogTagIds: string[];
  onDialogTagIdsChange: (ids: string[]) => void;
  dialogTrainingType: string | null;
  allTags: Array<{ id: string; name: string; color: string }>;
  
  // RPE
  coachRPE: number | null;
  onCoachRPEChange: (rpe: number) => void;
  
  // Payments
  participantPayments: ParticipantPayment[];
  onPaymentMethodChange: (clientId: string, method: IndividualPaymentMethod) => void;
  onPriceChange: (clientId: string, newPrice: number) => void;
  
  // Notes
  notes: string;
  onNotesChange: (notes: string) => void;
  
  // Actions
  onComplete: () => void;
  isSubmitting: boolean;
  canComplete: boolean;
}

export function SmartCompletionSheet({
  open,
  onOpenChange,
  completionState,
  dialogTagIds,
  onDialogTagIdsChange,
  dialogTrainingType,
  allTags,
  coachRPE,
  onCoachRPEChange,
  participantPayments,
  onPaymentMethodChange,
  onPriceChange,
  notes,
  onNotesChange,
  onComplete,
  isSubmitting,
  canComplete,
}: SmartCompletionSheetProps) {
  const [showNotes, setShowNotes] = useState(!!notes);
  const totalPrice = participantPayments.reduce((sum, p) => sum + p.price_share, 0);
  const paymentSummary = calculatePaymentSummary(participantPayments);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0 pb-0">
        {/* Premium gradient header */}
        <SheetHeader className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-success/20 ring-1 ring-success/30">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Dokončit trénink</SheetTitle>
              <SheetDescription className="text-xs">
                {completionState.tagsReady && completionState.rpeSet 
                  ? 'Vše připraveno – zkontrolujte platby'
                  : 'Doplňte chybějící údaje'
                }
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4 max-h-[calc(85vh-140px)]">
          
          {/* Tags section - only if missing */}
          {!completionState.tagsReady && (
            <div className="p-3 bg-warning/5 rounded-xl border border-warning/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                <span className="text-xs font-medium text-warning">Doplňte povinné tagy</span>
              </div>
              <CompactTagSelector
                selectedTagIds={dialogTagIds}
                onChange={onDialogTagIdsChange}
                trainingType={dialogTrainingType}
                missingTypes={completionState.missingTypes}
              />
            </div>
          )}

          {/* Tag summary - if tags ready */}
          {completionState.tagsReady && dialogTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.filter(t => dialogTagIds.includes(t.id)).map(tag => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] py-0.5 px-2"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* RPE - only if missing */}
          {!completionState.rpeSet && (
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/30 space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Hodnocení zátěže (RPE)
              </span>
              <InlineRPESelector
                value={coachRPE}
                onChange={onCoachRPEChange}
                showLabel={false}
                showDescription={true}
              />
            </div>
          )}

          {/* Participants & payments - always shown */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Platby
              </Label>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {participantPayments.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {participantPayments.map((participant) => (
                <ParticipantPaymentCard
                  key={participant.client_id}
                  participant={participant}
                  onChange={onPaymentMethodChange}
                  onPriceChange={onPriceChange}
                  disabled={isSubmitting}
                  allowPriceEdit={true}
                />
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Celkem</span>
              <span className="text-lg font-bold text-primary tabular-nums">{formatCurrency(totalPrice)}</span>
            </div>
            {paymentSummary.length > 1 && (
              <div className="flex gap-3 mt-1.5">
                {paymentSummary.map(s => (
                  <span key={s.method} className="text-[10px] text-muted-foreground">
                    {s.label}: {formatCurrency(s.total)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes - collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform", showNotes && "rotate-180")} />
              Poznámky
            </button>
            {showNotes && (
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Přidat poznámku..."
                rows={2}
                className="mt-1.5 text-sm resize-none bg-secondary/30 border-border/50"
              />
            )}
          </div>
        </div>

        {/* Fixed footer */}
        <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 flex gap-2 safe-area-bottom">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
            size="lg"
          >
            Zrušit
          </Button>
          <Button
            onClick={onComplete}
            disabled={!canComplete || isSubmitting}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Dokončuji...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Dokončit
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
