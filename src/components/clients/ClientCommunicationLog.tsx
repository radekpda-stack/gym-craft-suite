/**
 * ClientCommunicationLog Component
 * 
 * Shows recent communication/touchpoints with client
 */
import { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Globe, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useClientCommunicationLog, CommunicationType } from '@/hooks/useClientCommunicationLog';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientCommunicationLogProps {
  clientId: string;
  defaultOpen?: boolean;
}

const TYPE_CONFIG: Record<CommunicationType, { icon: typeof MessageSquare; color: string; label: string }> = {
  note: { icon: MessageSquare, color: 'text-blue-500', label: 'Poznámka' },
  feedback_request: { icon: Send, color: 'text-primary', label: 'Feedback' },
  portal_login: { icon: Globe, color: 'text-green-500', label: 'Portál' },
  training_complete: { icon: Clock, color: 'text-orange-500', label: 'Trénink' },
  credit_added: { icon: CreditCard, color: 'text-emerald-500', label: 'Kredit' },
  package_purchased: { icon: CreditCard, color: 'text-purple-500', label: 'Balíček' },
};

export function ClientCommunicationLog({ clientId, defaultOpen = false }: ClientCommunicationLogProps) {
  const { data, isLoading } = useClientCommunicationLog(clientId, 10);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isLoading) {
    return <Skeleton className="h-16 rounded-xl" />;
  }

  if (!data || data.entries.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full rounded-xl p-3 bg-secondary/30 border border-transparent hover:border-border transition-colors text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Komunikace</span>
              <Badge variant="secondary" className="text-xs">
                {data.entries.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {data.daysSinceLastContact !== null && (
                <span className={cn(
                  'text-xs',
                  data.daysSinceLastContact > 14 ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {data.daysSinceLastContact === 0 
                    ? 'Dnes' 
                    : `Před ${data.daysSinceLastContact} dny`}
                </span>
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
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {data.entries.map(entry => {
            const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.note;
            const Icon = config.icon;

            return (
              <div 
                key={entry.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className={cn('p-1.5 rounded', 'bg-secondary/50')}>
                  <Icon className={cn('w-3 h-3', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {entry.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.date), { locale: cs, addSuffix: true })}
                    </span>
                  </div>
                  {entry.content && (
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
