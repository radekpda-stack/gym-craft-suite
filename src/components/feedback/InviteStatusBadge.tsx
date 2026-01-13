import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Clock, Eye, Check, Send, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InviteStatusBadgeProps {
  status: 'pending' | 'completed' | 'expired' | 'draft' | string;
  sentAt?: string | null;
  openedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  compact?: boolean;
}

type InvitePhase = 'not_sent' | 'sent' | 'opened' | 'completed' | 'expired';

function getInvitePhase(props: InviteStatusBadgeProps): InvitePhase {
  if (props.status === 'completed' || props.completedAt) return 'completed';
  if (props.status === 'expired' || (props.expiresAt && new Date(props.expiresAt) < new Date())) return 'expired';
  if (props.openedAt) return 'opened';
  if (props.sentAt) return 'sent';
  return 'not_sent';
}

const PHASE_CONFIG: Record<InvitePhase, {
  label: string;
  icon: typeof Clock;
  className: string;
}> = {
  not_sent: {
    label: 'Neposlán',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  sent: {
    label: 'Odesláno',
    icon: Send,
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  opened: {
    label: 'Otevřeno',
    icon: Eye,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  completed: {
    label: 'Dokončeno',
    icon: Check,
    className: 'bg-success/10 text-success border-success/20',
  },
  expired: {
    label: 'Vypršelo',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function InviteStatusBadge(props: InviteStatusBadgeProps) {
  const phase = getInvitePhase(props);
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;
  
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return format(new Date(date), 'd.M. HH:mm', { locale: cs });
  };

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      {props.sentAt && (
        <div className="flex items-center gap-2">
          <Send className="w-3 h-3" />
          <span>Odesláno: {formatDate(props.sentAt)}</span>
        </div>
      )}
      {props.openedAt && (
        <div className="flex items-center gap-2">
          <Eye className="w-3 h-3" />
          <span>Otevřeno: {formatDate(props.openedAt)}</span>
        </div>
      )}
      {props.completedAt && (
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3" />
          <span>Dokončeno: {formatDate(props.completedAt)}</span>
        </div>
      )}
      {!props.completedAt && props.expiresAt && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Platnost do: {formatDate(props.expiresAt)}</span>
        </div>
      )}
    </div>
  );

  if (props.compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full cursor-help',
            config.className
          )}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium mb-1">{config.label}</p>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn('cursor-help gap-1', config.className)}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
