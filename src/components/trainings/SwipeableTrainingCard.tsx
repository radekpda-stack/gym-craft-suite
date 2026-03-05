import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { Tag } from '@/hooks/useTags';
import { TrainingCard } from './TrainingCard';
import { TrainingQuickMenu } from './TrainingQuickMenu';
import type { FeedbackStatus } from '@/hooks/useTrainingFeedbackStatus';

interface SwipeableTrainingCardProps {
  session: TrainingSession;
  client?: Client | null;
  tags?: Tag[];
  feedbackStatus?: FeedbackStatus;
  className?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onPay?: () => void;
  onDuplicate?: () => void;
}

export const SwipeableTrainingCard = memo(function SwipeableTrainingCard({
  session,
  client,
  tags,
  feedbackStatus,
  className,
  onComplete,
  onCancel,
  onPay,
  onDuplicate,
}: SwipeableTrainingCardProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const canSwipe = isScheduled || isInProgress;
  
  const { offsetX, isDragging, direction, handlers } = useSwipeGesture({
    threshold: 80,
    maxOffset: 120,
    onSwipeRight: canSwipe ? onComplete : undefined,
    onSwipeLeft: isScheduled ? onCancel : undefined,
  });

  // Long press for context menu
  const longPressTimeout = useCallback(() => {
    let timeout: NodeJS.Timeout;
    
    const onMouseDown = () => {
      timeout = setTimeout(() => {
        setIsLongPressing(true);
      }, 500);
    };
    
    const onMouseUp = () => {
      clearTimeout(timeout);
      setTimeout(() => setIsLongPressing(false), 100);
    };
    
    return { onMouseDown, onMouseUp, onMouseLeave: onMouseUp };
  }, []);

  // Calculate background reveal
  const showCompleteHint = direction === 'right' && canSwipe;
  const showCancelHint = direction === 'left' && isScheduled;

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Background hints - Complete (right swipe) */}
      {canSwipe && (
        <div 
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-6 transition-all duration-200',
            'bg-success',
            showCompleteHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 20 }}
        >
          <Check className={cn(
            'w-6 h-6 text-success-foreground transition-transform',
            showCompleteHint && Math.abs(offsetX) > 60 ? 'scale-110' : 'scale-100'
          )} />
        </div>
      )}
      
      {/* Background hints - Cancel (left swipe) */}
      {isScheduled && (
        <div 
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-6 transition-all duration-200',
            'bg-destructive',
            showCancelHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 20 }}
        >
          <X className={cn(
            'w-6 h-6 text-destructive-foreground transition-transform',
            showCancelHint && Math.abs(offsetX) > 60 ? 'scale-110' : 'scale-100'
          )} />
        </div>
      )}
      
      {/* Main card content */}
      <TrainingQuickMenu
        session={session}
        onComplete={onComplete}
        onCancel={onCancel}
        onDuplicate={onDuplicate}
      >
        <div
          {...handlers}
          style={{
            transform: canSwipe ? `translateX(${offsetX}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className={cn(
            'relative bg-background',
            isDragging && 'cursor-grabbing'
          )}
        >
          <TrainingCard
            session={session}
            client={client}
            tags={tags}
            feedbackStatus={feedbackStatus}
            onComplete={onComplete}
            onCancel={onCancel}
            onPay={onPay}
            onDuplicate={onDuplicate}
          />
        </div>
      </TrainingQuickMenu>
    </div>
  );
});
