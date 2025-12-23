import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatisticsCard } from './StatisticsGrid';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { startOfMonth, subMonths, format } from 'date-fns';
import { cs } from 'date-fns/locale';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--muted-foreground))',
];

export function ClientActivityCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-activity'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);

      // Get completed trainings
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .eq('user_id', user.user.id)
        .eq('status', 'completed')
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      if (!trainings) return null;

      // Count trainings per client
      const clientCounts: Record<string, number> = {};
      trainings.forEach(t => {
        if (t.client_id) {
          clientCounts[t.client_id] = (clientCounts[t.client_id] || 0) + 1;
        }
      });

      // Calculate distribution
      const distribution = {
        high: 0,      // 8+ trainings/month
        medium: 0,    // 4-7 trainings/month
        low: 0,       // 1-3 trainings/month
        inactive: 0,  // 0 trainings
      };

      const avgTrainingsPerMonth = 3; // 3 months period
      Object.values(clientCounts).forEach(count => {
        const monthly = count / avgTrainingsPerMonth;
        if (monthly >= 8) distribution.high++;
        else if (monthly >= 4) distribution.medium++;
        else if (monthly >= 1) distribution.low++;
      });

      // Get all active clients to find inactive ones
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('is_archived', false);

      if (clients) {
        distribution.inactive = clients.filter(c => !clientCounts[c.id]).length;
      }

      const chartData = [
        { name: 'Vysoká (8+/m)', value: distribution.high },
        { name: 'Střední (4-7/m)', value: distribution.medium },
        { name: 'Nízká (1-3/m)', value: distribution.low },
        { name: 'Neaktivní', value: distribution.inactive },
      ].filter(d => d.value > 0);

      // Monthly trend
      const monthlyTrend = [];
      for (let i = 2; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthStr = format(monthStart, 'yyyy-MM');
        
        const monthTrainings = trainings.filter(t => t.date.startsWith(monthStr));
        const uniqueClients = new Set(monthTrainings.map(t => t.client_id)).size;
        const avgPerClient = uniqueClients > 0 ? monthTrainings.length / uniqueClients : 0;

        monthlyTrend.push({
          month: format(monthStart, 'MMM', { locale: cs }),
          activeClients: uniqueClients,
          avgTrainings: Math.round(avgPerClient * 10) / 10,
        });
      }

      const totalClients = Object.keys(clientCounts).length + distribution.inactive;
      const avgActivity = totalClients > 0 
        ? trainings.length / totalClients / avgTrainingsPerMonth 
        : 0;

      return { chartData, distribution, monthlyTrend, avgActivity: Math.round(avgActivity * 10) / 10, totalClients };
    },
  });

  const chartData = data?.chartData || [];

  const expandedContent = (
    <div className="space-y-6">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} klientů`, 'Počet']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Průměr tréninků/klient</p>
          <p className="text-2xl font-bold">{data?.avgActivity || 0}/m</p>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50">
          <p className="text-xs text-muted-foreground">Celkem klientů</p>
          <p className="text-2xl font-bold">{data?.totalClients || 0}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Měsíční trend</h4>
        <div className="space-y-2">
          {data?.monthlyTrend?.map(m => (
            <div key={m.month} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
              <span className="font-medium">{m.month}</span>
              <div className="flex items-center gap-4 text-sm">
                <span>{m.activeClients} aktivních</span>
                <span className="text-muted-foreground">Ø {m.avgTrainings}/klient</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Aktivita klientů"
      icon={<Activity className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="space-y-2">
        {chartData.slice(0, 4).map((item, i) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i] }}
            />
            <span className="text-xs truncate flex-1">{item.name}</span>
            <span className="text-xs font-medium">{item.value} klientů</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Průměr {data?.avgActivity || 0} tréninků/měsíc
      </p>
    </StatisticsCard>
  );
}
