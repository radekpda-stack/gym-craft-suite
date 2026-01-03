import { memo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Flame, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientProgressHighlights } from '@/hooks/useClientProgressHighlights';
import { cn } from '@/lib/utils';

export const ClientProgressCard = memo(function ClientProgressCard() {
  const { data, isLoading } = useClientProgressHighlights();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasProgress = data.topProgressClients.length > 0;
  const hasConsistent = data.consistentClients.length > 0;
  const hasStagnating = data.stagnatingClients.length > 0;

  if (!hasProgress && !hasConsistent && !hasStagnating) {
    return null;
  }

  return (
    <Card className="glass">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Pokrok klientů</span>
        </div>

        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="progress" className="text-xs px-2">
              <TrendingDown className="w-3 h-3 mr-1" />
              Pokrok
            </TabsTrigger>
            <TabsTrigger value="consistent" className="text-xs px-2">
              <Flame className="w-3 h-3 mr-1" />
              Aktivní
            </TabsTrigger>
            <TabsTrigger value="stagnating" className="text-xs px-2">
              <TrendingUp className="w-3 h-3 mr-1 rotate-90" />
              Stagnují
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="mt-2 space-y-1">
            {data.topProgressClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Zatím žádná data o pokroku
              </p>
            ) : (
              data.topProgressClients.slice(0, 3).map(client => (
                <Link
                  key={client.clientId}
                  to={`/clients/${client.clientId}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <ClientAvatar name={client.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{client.detail}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    client.progressType === 'weight_loss' && 'bg-success/20 text-success',
                    client.progressType === 'weight_gain' && 'bg-primary/20 text-primary'
                  )}>
                    {client.progressType === 'weight_loss' ? '-' : '+'}{client.value.toFixed(1)} kg
                  </span>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="consistent" className="mt-2 space-y-1">
            {data.consistentClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Žádní super aktivní klienti
              </p>
            ) : (
              data.consistentClients.slice(0, 3).map(client => (
                <Link
                  key={client.clientId}
                  to={`/clients/${client.clientId}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <ClientAvatar name={client.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{client.detail}</p>
                  </div>
                  <Flame className="w-4 h-4 text-orange-500" />
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="stagnating" className="mt-2 space-y-1">
            {data.stagnatingClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Všichni klienti pokračují v pokroku
              </p>
            ) : (
              data.stagnatingClients.slice(0, 3).map(client => (
                <Link
                  key={client.clientId}
                  to={`/clients/${client.clientId}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <ClientAvatar name={client.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{client.detail}</p>
                  </div>
                  <span className="text-xs text-warning">⚠️</span>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
