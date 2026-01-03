import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, UserMinus, ChevronRight, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Progress } from '@/components/ui/progress';
import { useCapacityAlerts } from '@/hooks/useCapacityAlerts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const CapacityAlertsCard = memo(function CapacityAlertsCard() {
  const { data, isLoading } = useCapacityAlerts();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const showInactive = data.inactiveClients.length > 0;
  const hasLowCapacity = data.thisWeek.utilizationPercent < 50 || data.nextWeek.utilizationPercent < 50;

  return (
    <Card className="glass">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Kapacita</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tento týden</span>
              <span className="font-medium">{data.thisWeek.utilizationPercent}%</span>
            </div>
            <Progress value={data.thisWeek.utilizationPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {data.thisWeek.totalAvailable} volných slotů
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Příští týden</span>
              <span className="font-medium">{data.nextWeek.utilizationPercent}%</span>
            </div>
            <Progress value={data.nextWeek.utilizationPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {data.nextWeek.totalAvailable} volných slotů
            </p>
          </div>
        </div>

        {showInactive && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <UserMinus className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium">Neaktivní klienti</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {data.inactiveClients.length} klientů
              </span>
            </div>
            <div className="space-y-1">
              {data.inactiveClients.slice(0, 3).map(client => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-sm"
                >
                  <ClientAvatar name={client.name} size="xs" />
                  <span className="flex-1 truncate">{client.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {client.daysSinceLastTraining}d
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {data.suggestions.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p>{data.suggestions[0]}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
