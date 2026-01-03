/**
 * ClientDaysSinceBadge Component
 * 
 * Shows days since last training as a badge in header
 */
import { Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useClientReadiness } from '@/hooks/useClientReadiness';

interface ClientDaysSinceBadgeProps {
  clientId: string;
}

export function ClientDaysSinceBadge({ clientId }: ClientDaysSinceBadgeProps) {
  const { data, isLoading } = useClientReadiness(clientId);

  if (isLoading || !data || data.daysSinceLastTraining === null) {
    return null;
  }

  const days = data.daysSinceLastTraining;
  const isWarning = days >= 7;
  const isCritical = days >= 14;

  const getLabel = () => {
    if (days === 0) return 'Dnes';
    if (days === 1) return 'Včera';
    return `${days} dní`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline"
          className={cn(
            'gap-1 text-xs',
            isCritical && 'border-destructive/50 text-destructive bg-destructive/10',
            isWarning && !isCritical && 'border-warning/50 text-warning bg-warning/10',
            !isWarning && 'border-border text-muted-foreground'
          )}
        >
          {isCritical ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Calendar className="w-3 h-3" />
          )}
          {getLabel()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Dní od posledního tréninku</p>
      </TooltipContent>
    </Tooltip>
  );
}
