import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { XCircle, AlertTriangle, TrendingUp, Calendar, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function CanceledTrainings() {
  usePageTracking('canceled_trainings');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
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
  const latePercentage = totalCanceled > 0 ? ((lateCancellations / totalCanceled) * 100).toFixed(1) : '0';

  // Group by client
  const canceledByClient = clients.map((client) => {
    const clientCancellations = filteredCanceled.filter((t) => t.client_id === client.id);
    const lateCount = clientCancellations.filter((t) => t.is_late_cancellation).length;
    return {
      client,
      total: clientCancellations.length,
      late: lateCount,
      percentage: clientCancellations.length > 0 ? ((lateCount / clientCancellations.length) * 100).toFixed(0) : '0',
    };
  }).filter((c) => c.total > 0).sort((a, b) => b.late - a.late);

  // Generate chart data for last 3 months
  const getChartData = () => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthCanceled = canceledTrainings.filter(t => {
        const trainingDate = new Date(t.date);
        return trainingDate >= monthStart && trainingDate <= monthEnd;
      });

      months.push({
        month: format(date, 'LLLL', { locale: cs }),
        late: monthCanceled.filter(t => t.is_late_cancellation).length,
        onTime: monthCanceled.filter(t => !t.is_late_cancellation).length,
      });
    }
    return months;
  };

  const chartData = getChartData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Zrušené tréninky
          </h1>
          <p className="text-muted-foreground mt-1">
            Přehled zrušených a pozdně zrušených tréninků
          </p>
        </div>

        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className="rounded-xl"
            >
              {range === 'week' ? 'Týden' : range === 'month' ? 'Měsíc' : 'Rok'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Celkem zrušeno"
          value={totalCanceled}
          subtitle="Za vybrané období"
          icon={XCircle}
        />
        <StatCard
          title="Pozdní zrušení"
          value={lateCancellations}
          subtitle="Méně než 24h předem"
          icon={AlertTriangle}
          iconClassName="bg-warning/10 text-warning group-hover:bg-warning"
        />
        <StatCard
          title="Podíl pozdních"
          value={`${latePercentage}%`}
          subtitle="Z celkových zrušení"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Vývoj zrušených tréninků
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Bar
                  dataKey="late"
                  fill="hsl(var(--warning))"
                  name="Pozdní zrušení"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="onTime"
                  fill="hsl(var(--muted-foreground))"
                  name="Včasná zrušení"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Client */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Podle klienta
          </h3>
          {canceledByClient.length > 0 ? (
            <div className="space-y-3">
              {canceledByClient.map(({ client, total, late, percentage }) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50"
                >
                  <ClientAvatar name={client.name} size="md" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {total} zrušeno, {late} pozdě
                    </p>
                  </div>
                  <div className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium',
                    parseInt(percentage) > 50
                      ? 'bg-warning/10 text-warning'
                      : 'bg-secondary text-muted-foreground'
                  )}>
                    {percentage}% pozdě
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Žádní klienti se zrušenými tréninky
            </p>
          )}
        </div>
      </div>

      {/* Recent Cancellations */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Nedávno zrušené
        </h3>
        {filteredCanceled.length > 0 ? (
          <div className="space-y-3">
            {filteredCanceled.slice(0, 10).map((training) => {
              const client = clients.find((c) => c.id === training.client_id);
              return (
                <div
                  key={training.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-l-4',
                    training.is_late_cancellation
                      ? 'bg-warning/5 border-l-warning'
                      : 'bg-secondary/50 border-l-muted-foreground'
                  )}
                >
                  <ClientAvatar name={client?.name || ''} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {client?.name || 'Klient'}
                      </p>
                      {training.is_late_cancellation && (
                        <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                          Pozdní zrušení
                        </span>
                      )}
                    </div>
                    {training.notes && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {training.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(training.date), 'd.M.yyyy', { locale: cs })}</span>
                    </div>
                    {training.canceled_at && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Zrušeno {format(new Date(training.canceled_at), 'd.M.', { locale: cs })}
                        </span>
                      </div>
                    )}
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
    </div>
  );
}