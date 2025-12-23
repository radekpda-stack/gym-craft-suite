import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Crown, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { format, differenceInMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

const COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--muted-foreground))',
];

export function ClientLTVRankingCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-ltv-ranking'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, is_archived')
        .eq('user_id', user.user.id);

      if (!clients) return null;

      // Get all transactions (deposits)
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('client_id, amount, type')
        .eq('user_id', user.user.id)
        .in('type', ['payment', 'manual']);

      // Get training count
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.user.id)
        .eq('status', 'completed');

      // Calculate LTV per client
      const clientLTV: Record<string, { 
        revenue: number; 
        trainings: number; 
        months: number;
        avgPerMonth: number;
      }> = {};

      transactions?.forEach(t => {
        if (!clientLTV[t.client_id]) {
          clientLTV[t.client_id] = { revenue: 0, trainings: 0, months: 0, avgPerMonth: 0 };
        }
        clientLTV[t.client_id].revenue += Math.abs(t.amount);
      });

      trainings?.forEach(t => {
        if (t.client_id && clientLTV[t.client_id]) {
          clientLTV[t.client_id].trainings++;
        }
      });

      // Calculate months active
      clients.forEach(c => {
        if (clientLTV[c.id]) {
          const months = Math.max(1, differenceInMonths(new Date(), new Date(c.created_at)));
          clientLTV[c.id].months = months;
          clientLTV[c.id].avgPerMonth = clientLTV[c.id].revenue / months;
        }
      });

      const clientMap = new Map(clients.map(c => [c.id, c]));

      const ranking = Object.entries(clientLTV)
        .map(([id, data]) => {
          const client = clientMap.get(id);
          return {
            id,
            name: client?.name || 'Neznámý',
            isArchived: client?.is_archived || false,
            createdAt: client?.created_at || '',
            ...data,
          };
        })
        .filter(c => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const totalLTV = ranking.reduce((sum, c) => sum + c.revenue, 0);
      const avgLTV = ranking.length > 0 ? totalLTV / ranking.length : 0;

      return { ranking, totalLTV, avgLTV };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const ranking = data?.ranking || [];
  const chartData = ranking.slice(0, 8).map((c, i) => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '...' : c.name,
    fullName: c.name,
    value: c.revenue,
    rank: i + 1,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-5 w-5 text-warning" />
          Lifetime Value klientů
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <p className="text-sm text-muted-foreground mb-1">Top 10 celkem</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalLTV || 0)}</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-1">Průměrná LTV</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.avgLTV || 0)}</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'LTV']}
                labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[Math.min(index, 3)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {ranking.slice(0, 5).map((client, i) => (
            <div
              key={client.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                i === 0 && 'bg-warning/10 border border-warning/20',
                i > 0 && 'bg-secondary/30'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    i === 0 && 'bg-warning/20 text-warning',
                    i === 1 && 'bg-muted text-muted-foreground',
                    i > 1 && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {client.trainings} tréninků • {client.months} měsíců • Ø {formatCurrency(client.avgPerMonth)}/m
                  </p>
                </div>
              </div>
              <span className="font-bold text-lg text-success">
                {formatCurrency(client.revenue)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
