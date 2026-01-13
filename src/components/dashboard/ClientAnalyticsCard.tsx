import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Flame, 
  AlertTriangle, 
  Clock, 
  UserX,
  Users,
} from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { startOfMonth, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientWithCount {
  id: string;
  name: string;
  count: number;
}

export function ClientAnalyticsCard() {
  const [activeTab, setActiveTab] = useState<'active' | 'risk'>('active');
  
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: sessions = [], isLoading: sessionsLoading } = useTrainingSessions();
  const { data: clientsAtRisk, isLoading: riskLoading } = useClientsAtRisk();

  const isLoading = clientsLoading || sessionsLoading || riskLoading;

  const activeClients = useMemo<ClientWithCount[]>(() => {
    if (clients.length === 0 || sessions.length === 0) return [];

    const thisMonthStart = startOfMonth(new Date());
    const countMap = new Map<string, number>();
    
    sessions.forEach(session => {
      if (session.status !== 'completed') return;
      const sessionDate = new Date(session.date);
      if (!isAfter(sessionDate, thisMonthStart) && sessionDate.getTime() !== thisMonthStart.getTime()) return;
      
      const clientId = session.client_id;
      countMap.set(clientId, (countMap.get(clientId) || 0) + 1);
    });

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

  const riskCount = clientsAtRisk?.length || 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Analýza klientů
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'risk')}>
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="active" className="flex items-center gap-1.5 text-xs">
              <Flame className="w-3.5 h-3.5" />
              Nejaktivnější
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              V ohrožení
              {riskCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-medium">
                  {riskCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
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
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0',
                        index === 0 && 'bg-warning/20 text-warning',
                        index === 1 && 'bg-warning/15 text-warning',
                        index === 2 && 'bg-warning/10 text-warning',
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

                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {client.count}×
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="risk" className="mt-0">
            {!clientsAtRisk || clientsAtRisk.length === 0 ? (
              <EmptyState
                icon={UserX}
                title="Žádní klienti v ohrožení"
                description="Všichni klienti jsou aktivní"
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {clientsAtRisk.slice(0, 5).map((client) => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-all group"
                  >
                    <div
                      className={cn(
                        'w-1.5 h-7 rounded-full flex-shrink-0',
                        client.riskScore >= 60 && 'bg-destructive',
                        client.riskScore >= 40 && client.riskScore < 60 && 'bg-warning',
                        client.riskScore < 40 && 'bg-muted-foreground'
                      )}
                    />

                    <ClientAvatar name={client.name} size="sm" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">
                        {client.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {client.daysSinceLastTraining !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {client.daysSinceLastTraining}d
                          </span>
                        )}
                        {client.trainingTrend < 0 && (
                          <span className="flex items-center gap-1 text-destructive">
                            <TrendingDown className="w-3 h-3" />
                            {Math.abs(Math.round(client.trainingTrend))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        client.riskScore >= 60 && 'bg-destructive/10 text-destructive',
                        client.riskScore >= 40 && client.riskScore < 60 && 'bg-warning/10 text-warning',
                        client.riskScore < 40 && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {client.riskScore}%
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
