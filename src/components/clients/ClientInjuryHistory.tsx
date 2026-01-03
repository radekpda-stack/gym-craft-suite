/**
 * ClientInjuryHistory Component
 * 
 * Timeline of injuries and pain history
 */
import { useState } from 'react';
import { 
  Activity,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useClientInjuryHistory, InjuryRecord } from '@/hooks/useClientInjuryHistory';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientInjuryHistoryProps {
  clientId: string;
  defaultOpen?: boolean;
}

export function ClientInjuryHistory({ clientId, defaultOpen = false }: ClientInjuryHistoryProps) {
  const { data, isLoading } = useClientInjuryHistory(clientId);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isLoading) {
    return <Skeleton className="h-16 rounded-xl" />;
  }

  if (!data || data.injuries.length === 0) {
    return null;
  }

  const getTypeIcon = (type: InjuryRecord['type']) => {
    switch (type) {
      case 'health_restriction': return ShieldAlert;
      case 'diagnostic': return Activity;
      default: return AlertTriangle;
    }
  };

  const getTypeColor = (type: InjuryRecord['type'], isActive: boolean) => {
    if (isActive) return 'text-destructive';
    switch (type) {
      case 'health_restriction': return 'text-warning';
      case 'diagnostic': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          'w-full rounded-xl p-3 border text-left transition-colors',
          data.hasActiveInjury 
            ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10' 
            : 'bg-secondary/30 border-transparent hover:border-border'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={cn(
                'w-4 h-4',
                data.hasActiveInjury ? 'text-destructive' : 'text-muted-foreground'
              )} />
              <span className="text-sm font-medium text-foreground">Historie zranění</span>
              <Badge 
                variant={data.hasActiveInjury ? 'destructive' : 'secondary'} 
                className="text-xs"
              >
                {data.injuries.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {data.activeInjuries.length > 0 && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                  {data.activeInjuries.length} aktivní
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
          {data.injuries.slice(0, 15).map(injury => {
            const Icon = getTypeIcon(injury.type);
            const color = getTypeColor(injury.type, injury.isActive);

            return (
              <div 
                key={injury.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  injury.isActive 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-secondary/20 border-transparent'
                )}
              >
                <div className={cn('p-1.5 rounded', injury.isActive ? 'bg-destructive/10' : 'bg-secondary/50')}>
                  <Icon className={cn('w-3 h-3', color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {injury.bodyArea && (
                        <span className="text-sm font-medium text-foreground">
                          {injury.bodyArea}
                        </span>
                      )}
                      {injury.painLevel && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            injury.painLevel >= 8 ? 'text-destructive border-destructive/30' :
                            injury.painLevel >= 6 ? 'text-warning border-warning/30' :
                            'text-muted-foreground'
                          )}
                        >
                          {injury.painLevel}/10
                        </Badge>
                      )}
                      {injury.isActive && (
                        <Badge variant="destructive" className="text-[10px] h-4">
                          Aktivní
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {injury.type === 'health_restriction' 
                        ? 'Trvale'
                        : formatDistanceToNow(new Date(injury.date), { locale: cs, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {injury.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Zdroj: {injury.source}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
