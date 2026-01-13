import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DashboardViewModel, ClientQuickInfo } from '@/hooks/useDashboardViewModel';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditLevelIndicator } from '@/components/ui/credit-level-indicator';

interface ClientsQuickOverviewSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const ClientRow = memo(function ClientRow({ client }: { client: ClientQuickInfo }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className="timeline-item w-full group"
    >
      {/* Status dot - minimal */}
      <div className={cn(
        'status-dot shrink-0',
        client.status === 'ok' && 'status-dot-ok',
        client.status === 'warning' && 'status-dot-warning',
        client.status === 'error' && 'status-dot-error'
      )} />
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate text-foreground">
            {client.name}
          </span>
          {client.isFavorite && (
            <Star className="w-3 h-3 text-warning fill-warning" />
          )}
        </div>
        <p className="text-xs text-muted-foreground/60">
          {client.lastTrainingDate 
            ? format(client.lastTrainingDate, 'd.M.', { locale: cs })
            : '—'}
        </p>
      </div>
      
      <div className="text-right shrink-0 flex items-center gap-2">
        {/* Credit Leaves Indicator */}
        <CreditLevelIndicator 
          creditBalance={client.creditBalance} 
          size="sm"
          showAmount
        />
        {client.unpaidCount > 0 && (
          <span className="text-[10px] text-destructive/80 bg-destructive/10 px-1.5 py-0.5 rounded-full">
            {client.unpaidCount}
          </span>
        )}
      </div>
      
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  );
});
export function ClientsQuickOverviewSection({ data, isLoading }: ClientsQuickOverviewSectionProps) {
  if (isLoading) {
    return (
      <div className="premium-layer p-4">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { clientsQuickInfo } = data;

  // Mobile: max 4 clients, Desktop: max 6 clients
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const maxClients = isMobile ? 4 : 6;
  
  // Sort by status priority
  const sortedClients = [...clientsQuickInfo]
    .sort((a, b) => {
      const priority = { error: 0, warning: 1, ok: 2 };
      return priority[a.status] - priority[b.status];
    })
    .slice(0, maxClients);
  
  return (
    <div className="premium-layer p-4">
      {/* Header - minimal */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">Klienti</span>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link to="/clients">Vše</Link>
        </Button>
      </div>
      
      {sortedClients.length > 0 ? (
        <div className="space-y-2">
          {sortedClients.map(client => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">Žádní klienti</p>
        </div>
      )}
    </div>
  );
}
