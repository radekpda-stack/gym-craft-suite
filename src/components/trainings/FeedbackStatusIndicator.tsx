import { memo } from 'react';
import { Clock, Send, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FeedbackStatus } from '@/hooks/useTrainingFeedbackStatus';

interface FeedbackStatusIndicatorProps {
  status: FeedbackStatus;
  className?: string;
}

const statusConfig: Record<FeedbackStatus, {
  icon: typeof Clock;
  color: string;
  label: string;
} | null> = {
  none: null, // Don't show anything
  pending_send: {
    icon: Clock,
    color: 'text-warning',
    label: 'Čeká na odeslání',
  },
  sent_waiting: {
    icon: Send,
    color: 'text-primary',
    label: 'Odesláno, čeká na vyplnění',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-success',
    label: 'Feedback vyplněn',
  },
};

export const FeedbackStatusIndicator = memo(function FeedbackStatusIndicator({
  status,
  className,
}: FeedbackStatusIndicatorProps) {
  const config = statusConfig[status];
  
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('shrink-0', className)}>
          <Icon className={cn('w-3.5 h-3.5', config.color)} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
});
