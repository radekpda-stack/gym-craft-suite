import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardViewModel, ClientQuickInfo } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditLevelIndicator } from '@/components/ui/credit-level-indicator';

interface ClientStatusCardProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const ClientRow = memo(function ClientRow({ client }: { client: ClientQuickInfo }) {
  const navigate = useNavigate();
  
  const getStatusDot = () => {
    if (client.status === 'error') return 'bg-destructive';
    if (client.status === 'warning') return 'bg-warning';
    return 'bg-success';
  };
  
  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors',
        'hover:bg-secondary/50 active:bg-secondary/70'
      )}
    >
      {/* Status dot */}
      <div className={cn('w-2 h-2 rounded-full shrink-0', getStatusDot())} />
      
      {/* Name */}
      <span className="text-sm font-medium text-foreground truncate flex-1 text-left">
        {client.name}
      </span>
      
      {/* Favorite indicator */}
      {client.isFavorite && (
        <Star className="w-3 h-3 text-warning fill-warning shrink-0" />
      )}
      
      {/* Credit level indicator with leaves */}
      <CreditLevelIndicator 
        creditBalance={client.creditBalance} 
        size="sm"
        showAmount
      />
    </button>
  );
});

export function ClientStatusCard({ data, isLoading }: ClientStatusCardProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  // Sort by status (error first, then warning, then ok) and take top 5
  const sortedClients = [...data.clientsQuickInfo]
    .sort((a, b) => {
      const statusOrder = { error: 0, warning: 1, ok: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    })
    .slice(0, 5);
  
  const problemCount = data.clientsQuickInfo.filter(c => c.status !== 'ok').length;
  
  return (
    <div className="liquid-glass rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-modern-sm">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Klienti</span>
        </div>
        {problemCount > 0 && (
          <span className="text-xs text-warning flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {problemCount}
          </span>
        )}
      </div>
      
      {/* Client list */}
      {sortedClients.length > 0 ? (
        <div className="space-y-0.5">
          {sortedClients.map(client => (
            <ClientRow key={client.id} client={client} />
          ))}
          
          {data.clientsQuickInfo.length > 5 && (
            <button
              onClick={() => navigate('/clients')}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Zobrazit všechny ({data.clientsQuickInfo.length}) →
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Žádní klienti</p>
        </div>
      )}
    </div>
  );
}
