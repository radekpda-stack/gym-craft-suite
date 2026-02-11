/**
 * TrainingStatusBar - Sticky bottom bar showing readiness + main CTA
 * Always visible, no scrolling needed to reach actions.
 */
import { Check, Play, X, Loader2, Tag, Gauge, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface TrainingStatusBarProps {
  status: string;
  tagsReady: boolean;
  rpeSet: boolean;
  totalPrice: number;
  rpe: number | null;
  onComplete: () => void;
  onStart?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function TrainingStatusBar({
  status,
  tagsReady,
  rpeSet,
  totalPrice,
  rpe,
  onComplete,
  onStart,
  onCancel,
  isLoading,
  className,
}: TrainingStatusBarProps) {
  if (status === 'completed' || status === 'canceled' || status === 'cancelled') {
    return null;
  }

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-40 border-t border-border/50',
      'bg-card/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)]',
      'safe-area-bottom',
      className
    )}>
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
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
          {onCancel && (
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={onCancel}
              disabled={isLoading}
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {status === 'scheduled' && onStart && (
            <Button
              className="flex-1 h-12 text-base font-bold"
              onClick={onStart}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Zahájit
            </Button>
          )}

          <Button
            className="flex-1 h-12 text-base font-bold bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
            onClick={onComplete}
            disabled={isLoading}
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
  );
}
