import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { XCircle, AlertTriangle, TrendingUp, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { mockClients } from '@/data/mockData';
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

// Mock canceled trainings data
const mockCanceledTrainings = [
  {
    id: '1',
    clientId: '1',
    date: subDays(new Date(), 2),
    canceledAt: subDays(new Date(), 2),
    isLateCancellation: true,
    reason: 'Nemoc',
  },
  {
    id: '2',
    clientId: '2',
    date: subDays(new Date(), 5),
    canceledAt: subDays(new Date(), 6),
    isLateCancellation: false,
    reason: 'Pracovní povinnosti',
  },
  {
    id: '3',
    clientId: '1',
    date: subDays(new Date(), 10),
    canceledAt: subDays(new Date(), 10),
    isLateCancellation: true,
    reason: 'Osobní důvody',
  },
  {
    id: '4',
    clientId: '3',
    date: subDays(new Date(), 15),
    canceledAt: subDays(new Date(), 16),
    isLateCancellation: false,
    reason: 'Dovolená',
  },
];

const chartData = [
  { month: 'Říjen', late: 2, onTime: 3 },
  { month: 'Listopad', late: 3, onTime: 5 },
  { month: 'Prosinec', late: 2, onTime: 2 },
];

export default function CanceledTrainings() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const totalCanceled = mockCanceledTrainings.length;
  const lateCancellations = mockCanceledTrainings.filter((t) => t.isLateCancellation).length;
  const latePercentage = ((lateCancellations / totalCanceled) * 100).toFixed(1);

  // Group by client
  const canceledByClient = mockClients.map((client) => {
    const clientCancellations = mockCanceledTrainings.filter((t) => t.clientId === client.id);
    const lateCount = clientCancellations.filter((t) => t.isLateCancellation).length;
    return {
      client,
      total: clientCancellations.length,
      late: lateCount,
      percentage: clientCancellations.length > 0 ? ((lateCount / clientCancellations.length) * 100).toFixed(0) : '0',
    };
  }).filter((c) => c.total > 0).sort((a, b) => b.late - a.late);

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
        </div>
      </div>

      {/* Recent Cancellations */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Nedávno zrušené
        </h3>
        <div className="space-y-3">
          {mockCanceledTrainings.map((training) => {
            const client = mockClients.find((c) => c.id === training.clientId);
            return (
              <div
                key={training.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-l-4',
                  training.isLateCancellation
                    ? 'bg-warning/5 border-l-warning'
                    : 'bg-secondary/50 border-l-muted-foreground'
                )}
              >
                <ClientAvatar name={client?.name || ''} size="md" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {client?.name}
                    </p>
                    {training.isLateCancellation && (
                      <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                        Pozdní zrušení
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {training.reason}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(training.date, 'd.M.yyyy', { locale: cs })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Zrušeno {format(training.canceledAt, 'd.M.', { locale: cs })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
