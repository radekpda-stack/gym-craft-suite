import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, ClientQuickInfo } from '@/hooks/useDashboardViewModel';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientsQuickOverviewSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const ClientRow = memo(function ClientRow({ client }: { client: ClientQuickInfo }) {
  const navigate = useNavigate();
  
  const statusConfig = {
    ok: { color: 'bg-[hsl(142_76%_36%)]', ring: '' },
    warning: { color: 'bg-[hsl(38_92%_50%)]', ring: 'ring-1 ring-[hsl(38_92%_50%/0.3)]' },
    error: { color: 'bg-destructive', ring: 'ring-1 ring-destructive/30' },
  };
  
  const config = statusConfig[client.status];
  
  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/20 transition-all',
        'hover:bg-secondary/40',
        config.ring
      )}
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', config.color)} />
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate text-foreground">
            {client.name}
          </span>
          {client.isFavorite && (
            <Star className="w-3 h-3 text-[hsl(38_92%_50%)] fill-[hsl(38_92%_50%)]" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {client.lastTrainingDate 
            ? format(client.lastTrainingDate, 'd.M.', { locale: cs })
            : 'Bez tréninku'}
        </p>
      </div>
      
      <div className="text-right shrink-0">
        <p className={cn(
          'text-sm font-medium',
          client.creditBalance < 0 ? 'text-destructive' : 
          client.creditBalance < 800 ? 'text-[hsl(38_92%_50%)]' : 'text-foreground'
        )}>
          {formatCurrency(client.creditBalance)}
        </p>
        {client.unpaidCount > 0 && (
          <p className="text-[10px] text-destructive flex items-center gap-0.5 justify-end">
            <AlertCircle className="w-3 h-3" />
            {client.unpaidCount} nezapl.
          </p>
        )}
      </div>
    </button>
  );
});

export function ClientsQuickOverviewSection({ data, isLoading }: ClientsQuickOverviewSectionProps) {
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { clientsQuickInfo } = data;

  // Separate clients by status for better overview - limit to 6 total
  const allClients = clientsQuickInfo.slice(0, 6);
  const errorClients = allClients.filter(c => c.status === 'error');
  const warningClients = allClients.filter(c => c.status === 'warning');
  const okClients = allClients.filter(c => c.status === 'ok');
  
  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div>
        <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Klienti – rychlý přehled
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Top 6 klientů • Kredit a poslední aktivita
          </p>
        </div>
      </CardHeader>
      
      <CardContent>
        {clientsQuickInfo.length > 0 ? (
          <div className="space-y-3">
            {errorClients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Vyžadují pozornost ({errorClients.length})
                </p>
                {errorClients.map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
            
            {warningClients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(38_92%_50%)]">
                  K dohlédnutí ({warningClients.length})
                </p>
                {warningClients.map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
            
            {okClients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  V pořádku ({okClients.length})
                </p>
                {okClients.map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Žádní klienti</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
