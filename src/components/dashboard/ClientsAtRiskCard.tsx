import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle, ChevronRight, Clock, TrendingDown, UserX } from 'lucide-react';
import { useClientsAtRisk } from '@/hooks/useClientsAtRisk';
import { cn } from '@/lib/utils';

export function ClientsAtRiskCard() {
  const { data: clientsAtRisk, isLoading } = useClientsAtRisk();

  if (isLoading) {
    return (
      <Card className="glass border-destructive/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Klienti v ohrožení
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                {/* Risk indicator */}
                <div
                  className={cn(
                    'w-2 h-8 rounded-full flex-shrink-0',
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

                {/* Risk score badge */}
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
      </CardContent>
    </Card>
  );
}
