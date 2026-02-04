import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { XCircle, AlertTriangle, Calendar, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type TimeRange = 'week' | 'month' | 'year';

export function CanceledTrainingsSheet() {
  const [open, setOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();

  // Filter only canceled trainings
  const canceledTrainings = sessions.filter(s => s.status === 'canceled');

  // Filter by time range
  const now = new Date();
  const filteredCanceled = canceledTrainings.filter(training => {
    const trainingDate = new Date(training.date);
    if (timeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return trainingDate >= weekAgo;
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return trainingDate >= monthAgo;
    } else {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return trainingDate >= yearAgo;
    }
  });

  const totalCanceled = filteredCanceled.length;
  const lateCancellations = filteredCanceled.filter((t) => t.is_late_cancellation).length;

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 rounded-lg bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-warning/10 hover:border-warning/30 transition-all gap-1.5"
        >
          <XCircle className="w-4 h-4 text-warning" />
          <span className="text-xs font-medium text-foreground/80 hidden sm:inline">Zrušené</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-warning" />
            Zrušené tréninky
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Time range filter */}
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="rounded-xl flex-1"
              >
                {range === 'week' ? 'Týden' : range === 'month' ? 'Měsíc' : 'Rok'}
              </Button>
            ))}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50 text-center">
              <div className="text-2xl font-bold text-foreground">{totalCanceled}</div>
              <div className="text-xs text-muted-foreground">Celkem zrušeno</div>
            </div>
            <div className="p-3 rounded-xl bg-warning/10 text-center">
              <div className="text-2xl font-bold text-warning">{lateCancellations}</div>
              <div className="text-xs text-muted-foreground">Pozdní zrušení</div>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredCanceled.length > 0 ? (
            <div className="space-y-2">
              {filteredCanceled.slice(0, 20).map((training) => {
                const client = getClient(training.client_id);
                return (
                  <div
                    key={training.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-l-4',
                      training.is_late_cancellation
                        ? 'bg-warning/5 border-l-warning'
                        : 'bg-secondary/50 border-l-muted-foreground'
                    )}
                  >
                    <ClientAvatar name={client?.name || ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">
                          {client?.name || 'Klient'}
                        </p>
                        {training.is_late_cancellation && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                            Pozdní
                          </Badge>
                        )}
                      </div>
                      {training.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {training.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(training.date), 'd.M.', { locale: cs })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Žádné zrušené tréninky za vybrané období
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
