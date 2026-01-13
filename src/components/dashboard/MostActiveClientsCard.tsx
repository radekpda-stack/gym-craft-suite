import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendingUp, ChevronRight, Flame } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { startOfMonth, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientWithCount {
  id: string;
  name: string;
  count: number;
}

export function MostActiveClientsCard() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: sessions = [], isLoading: sessionsLoading } = useTrainingSessions();

  const isLoading = clientsLoading || sessionsLoading;

  const activeClients = useMemo<ClientWithCount[]>(() => {
    if (clients.length === 0 || sessions.length === 0) return [];

    const thisMonthStart = startOfMonth(new Date());
    
    // Count completed trainings per client this month
    const countMap = new Map<string, number>();
    
    sessions.forEach(session => {
      if (session.status !== 'completed') return;
      const sessionDate = new Date(session.date);
      if (!isAfter(sessionDate, thisMonthStart) && sessionDate.getTime() !== thisMonthStart.getTime()) return;
      
      const clientId = session.client_id;
      countMap.set(clientId, (countMap.get(clientId) || 0) + 1);
    });

    // Map to client info and sort by count
    const result: ClientWithCount[] = [];
    countMap.forEach((count, clientId) => {
      const client = clients.find(c => c.id === clientId);
      if (client && !client.is_archived) {
        result.push({ id: clientId, name: client.name, count });
      }
    });

    return result.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [clients, sessions]);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning" />
          Nejaktivnější klienti tento měsíc
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeClients.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Žádné tréninky"
            description="Tento měsíc zatím nejsou žádné dokončené tréninky"
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {activeClients.map((client, index) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-all group"
              >
                {/* Rank */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0',
                    index === 0 && 'bg-warning/20 text-warning',
                    index === 1 && 'bg-warning/20 text-warning',
                    index === 2 && 'bg-warning/20 text-warning',
                    index > 2 && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {index + 1}
                </div>

                <ClientAvatar name={client.name} size="sm" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {client.name}
                  </p>
                </div>

                {/* Training count badge */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {client.count}×
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
