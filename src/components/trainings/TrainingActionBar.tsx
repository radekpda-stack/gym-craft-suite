/**
 * TrainingActionBar - Sticky action bar for training actions
 */
import { Play, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrainingActionBarProps {
  status: string;
  onStart?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function TrainingActionBar({
  status,
  onStart,
  onCancel,
  onComplete,
  isLoading,
  className,
}: TrainingActionBarProps) {
  // Don't show for completed or cancelled trainings
  if (status === 'completed' || status === 'canceled' || status === 'cancelled') {
    return null;
  }

  return (
    <div className={cn(
      'sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border/50',
      'safe-area-bottom',
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Cancel button - always visible for scheduled/in_progress */}
        {onCancel && (
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Zrušit
          </Button>
        )}

        {/* Start button - only for scheduled */}
        {status === 'scheduled' && onStart && (
          <Button
            className="flex-[2] h-12"
            onClick={onStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Zahájit trénink
          </Button>
        )}

        {/* Complete button - for in_progress */}
        {status === 'in_progress' && onComplete && (
          <Button
            className="flex-[2] h-12"
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
        )}
      </div>
    </div>
  );
}
