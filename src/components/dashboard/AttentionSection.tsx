import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle,
  MessageSquare, 
  Wallet, 
  Clock,
  X,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TodayAlertsData } from '@/hooks/useTodayAlerts';

interface AttentionSectionProps {
  data: TodayAlertsData | undefined;
  isLoading: boolean;
}

interface AttentionItem {
  id: string;
  type: 'credit' | 'feedback' | 'unpaid';
  clientId: string;
  clientName: string;
  reason: string;
  detail: string;
  severity: 'warning' | 'error';
  actionUrl: string;
}

function AttentionCard({ 
  item, 
  onDismiss, 
  onClick 
}: { 
  item: AttentionItem; 
  onDismiss: () => void;
  onClick: () => void;
}) {
  const typeConfig = {
    credit: { icon: Wallet, label: 'Kredit' },
    feedback: { icon: MessageSquare, label: 'Feedback' },
    unpaid: { icon: Clock, label: 'Platba' },
  };
  
  const { icon: Icon, label } = typeConfig[item.type];
  
  const severityStyles = {
    warning: 'border-orange-500/30 hover:border-orange-500/50',
    error: 'border-destructive/30 hover:border-destructive/50',
  };
  
  const iconStyles = {
    warning: 'text-orange-500 bg-orange-500/10',
    error: 'text-destructive bg-destructive/10',
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all group',
        severityStyles[item.severity]
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary/80 transition-all"
        title="Skrýt"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <button
        onClick={onClick}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', iconStyles[item.severity])}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
            <p className="font-semibold text-foreground truncate mt-0.5">
              {item.clientName}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.reason}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {item.detail}
            </p>
          </div>
          
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
        </div>
      </button>
    </div>
  );
}

export function AttentionSection({ data, isLoading }: AttentionSectionProps) {
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { lowCreditClients, missingFeedback, unpaidTrainings } = data;
  
  // Build attention items list
  const items: AttentionItem[] = [];
  
  // Low/no credit clients
  lowCreditClients.items.forEach(client => {
    const id = `credit-${client.id}`;
    if (!dismissedIds.has(id)) {
      items.push({
        id,
        type: 'credit',
        clientId: client.id,
        clientName: client.name,
        reason: client.balance <= 0 ? 'Bez kreditu' : 'Nízký kredit',
        detail: `${client.balance} Kč`,
        severity: client.balance <= 0 ? 'error' : 'warning',
        actionUrl: `/clients/${client.id}`,
      });
    }
  });
  
  // Missing feedback
  missingFeedback.items.forEach(item => {
    const id = `feedback-${item.id}`;
    if (!dismissedIds.has(id)) {
      const date = new Date(item.trainingDate);
      items.push({
        id,
        type: 'feedback',
        clientId: item.clientId,
        clientName: item.clientName,
        reason: 'Nevyplněný feedback',
        detail: date.toLocaleDateString('cs-CZ'),
        severity: 'warning',
        actionUrl: `/trainings/${item.id}`,
      });
    }
  });
  
  // Unpaid trainings
  unpaidTrainings.items.forEach(item => {
    const id = `unpaid-${item.id}`;
    if (!dismissedIds.has(id)) {
      items.push({
        id,
        type: 'unpaid',
        clientId: item.clientId,
        clientName: item.clientName,
        reason: 'Nezaplacený trénink',
        detail: `${item.amount} Kč • ${item.daysOld} dní`,
        severity: item.daysOld > 30 ? 'error' : 'warning',
        actionUrl: `/clients/${item.clientId}`,
      });
    }
  });
  
  // Sort by severity (error first)
  items.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return 0;
  });
  
  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };
  
  const visibleItems = items.slice(0, 6);
  const hasMore = items.length > 6;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Vyžaduje pozornost
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {items.length} položek
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {visibleItems.length > 0 ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleItems.map(item => (
                <AttentionCard
                  key={item.id}
                  item={item}
                  onDismiss={() => handleDismiss(item.id)}
                  onClick={() => navigate(item.actionUrl)}
                />
              ))}
            </div>
            
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/clients')}
              >
                Zobrazit všechny ({items.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p className="text-sm font-medium text-foreground">Vše v pořádku!</p>
            <p className="text-xs text-muted-foreground mt-1">Žádné urgentní úkoly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
