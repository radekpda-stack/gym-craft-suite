/**
 * Dialog pro hodnocení a komentář k nutričnímu záznamu (pro trenéra)
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Star, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TrainerFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRating: number | null;
  currentComment: string | null;
  clientReply?: string | null;
  onSave: (rating: number | null, comment: string) => Promise<void>;
  isLoading?: boolean;
}

// Get rating color based on value
const getRatingColor = (rating: number): string => {
  if (rating <= 3) return 'text-destructive';
  if (rating <= 6) return 'text-warning';
  if (rating <= 8) return 'text-success';
  return 'text-emerald-500';
};

// Get rating label based on value
const getRatingLabel = (rating: number): string => {
  if (rating <= 3) return 'Potřebuje zlepšit';
  if (rating <= 6) return 'Průměrné';
  if (rating <= 8) return 'Dobré';
  return 'Výborné!';
};

export function TrainerFeedbackDialog({
  open,
  onOpenChange,
  currentRating,
  currentComment,
  clientReply,
  onSave,
  isLoading = false,
}: TrainerFeedbackDialogProps) {
  const [rating, setRating] = useState<number | null>(currentRating);
  const [comment, setComment] = useState(currentComment || '');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setRating(currentRating);
      setComment(currentComment || '');
    }
  }, [open, currentRating, currentComment]);

  const handleSave = async () => {
    await onSave(rating, comment.trim());
    onOpenChange(false);
  };

  const displayRating = hoveredRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Hodnocení a komentář
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Hodnocení (1 = špatné, 10 = výborné)
            </Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(rating === value ? null : value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-6 h-6 transition-colors",
                      displayRating && value <= displayRating
                        ? cn("fill-current", getRatingColor(displayRating))
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
              {displayRating && (
                <span className={cn(
                  "ml-2 font-semibold tabular-nums",
                  getRatingColor(displayRating)
                )}>
                  {displayRating}/10
                </span>
              )}
            </div>
            {displayRating && (
              <p className={cn("text-sm font-medium", getRatingColor(displayRating))}>
                {getRatingLabel(displayRating)}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Komentář pro klienta
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Napište komentář pro klienta..."
              className="min-h-[100px]"
            />
          </div>

          {/* Client Reply (if exists) */}
          {clientReply && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Odpověď klienta
              </Label>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm">{clientReply}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Uložit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Display component for showing rating in cards
interface RatingDisplayProps {
  rating: number | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function NutritionRatingDisplay({ rating, size = 'sm', showLabel = false }: RatingDisplayProps) {
  if (!rating) return null;

  const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn("flex items-center gap-1", textSize)}>
      <Star className={cn(sizeClasses, "fill-current", getRatingColor(rating))} />
      <span className={cn("font-semibold tabular-nums", getRatingColor(rating))}>
        {rating}/10
      </span>
      {showLabel && (
        <span className={cn("text-muted-foreground", textSize)}>
          - {getRatingLabel(rating)}
        </span>
      )}
    </div>
  );
}
