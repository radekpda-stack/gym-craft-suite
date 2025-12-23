import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatisticsCard } from './StatisticsGrid';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { UserPlus, UserMinus } from 'lucide-react';
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns';
import { cs } from 'date-fns/locale';

export function ClientAcquisitionCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-acquisition'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const sixMonthsAgo = subMonths(new Date(), 6);

      // Get clients with creation dates
      const { data: clients } = await supabase
        .from('clients')
        .select('id, created_at, is_archived')
        .eq('user_id', user.user.id)
        .gte('created_at', sixMonthsAgo.toISOString());

      if (!clients) return null;

      // Get all trainings to detect "churned" clients
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .eq('user_id', user.user.id)
        .eq('status', 'completed');

      const trainingsByClient: Record<string, string[]> = {};
      trainings?.forEach(t => {
        if (t.client_id) {
          if (!trainingsByClient[t.client_id]) trainingsByClient[t.client_id] = [];
          trainingsByClient[t.client_id].push(t.date);
        }
      });

      // Build monthly data
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(monthStart);
        const monthStr = format(monthStart, 'yyyy-MM');
        const nextMonthStart = startOfMonth(subMonths(new Date(), i - 1));

        // New clients this month
        const newClients = clients.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;

        // Churned clients (last training before this month, no training after)
        let churned = 0;
        Object.entries(trainingsByClient).forEach(([clientId, dates]) => {
          const sortedDates = dates.sort();
          const lastTraining = sortedDates[sortedDates.length - 1];
          if (lastTraining < monthStr && !clients.find(c => c.id === clientId)?.is_archived) {
            // Check if they had trainings before but none this month or after
            const hasOlderTrainings = sortedDates.some(d => d < monthStr);
            const hasRecentTrainings = sortedDates.some(d => d >= monthStr);
            if (hasOlderTrainings && !hasRecentTrainings) {
              churned++;
            }
          }
        });

        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: cs }),
          fullMonth: format(monthStart, 'MMMM yyyy', { locale: cs }),
          new: newClients,
          churned: -churned, // Negative for visualization
          net: newClients - churned,
        });
      }

      const totalNew = monthlyData.reduce((sum, m) => sum + m.new, 0);
      const totalChurned = monthlyData.reduce((sum, m) => sum + Math.abs(m.churned), 0);

      return { monthlyData, totalNew, totalChurned };
    },
  });

  const chartData = data?.monthlyData || [];

  const expandedContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Noví</span>
          </div>
          <p className="text-3xl font-bold text-success">+{data?.totalNew || 0}</p>
          <p className="text-xs text-muted-foreground">za 6 měsíců</p>
        </div>
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <UserMinus className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Odešlí</span>
          </div>
          <p className="text-3xl font-bold text-destructive">-{data?.totalChurned || 0}</p>
          <p className="text-xs text-muted-foreground">za 6 měsíců</p>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorChurned" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
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
              labelFormatter={(label) => chartData.find(d => d.month === label)?.fullMonth || label}
              formatter={(value: number, name: string) => [
                Math.abs(value),
                name === 'new' ? 'Noví' : 'Odešlí',
              ]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="new"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fill="url(#colorNew)"
            />
            <Area
              type="monotone"
              dataKey="churned"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#colorChurned)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {chartData.map(m => (
          <div key={m.month} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
            <span className="font-medium text-sm">{m.fullMonth}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-success">+{m.new}</span>
              <span className="text-destructive">{m.churned}</span>
              <span className={m.net >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                = {m.net >= 0 ? '+' : ''}{m.net}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const netChange = (data?.totalNew || 0) - (data?.totalChurned || 0);

  return (
    <StatisticsCard
      title="Noví vs odešlí"
      icon={<UserPlus className="h-4 w-4 text-success" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      infoDescription="Porovnání nově získaných klientů a těch, kteří přestali trénovat, za posledních 6 měsíců."
      infoCalculation="Nový klient = vytvořen v daném měsíci. Odešlý klient = měl trénink v předchozích měsících, ale v daném měsíci a později již ne."
    >
      <div className="flex flex-col items-center justify-center py-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">+{data?.totalNew || 0}</p>
            <p className="text-xs text-muted-foreground">noví</p>
          </div>
          <div className="text-muted-foreground">/</div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">-{data?.totalChurned || 0}</p>
            <p className="text-xs text-muted-foreground">odešlí</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`text-lg font-bold ${netChange >= 0 ? 'text-success' : 'text-destructive'}`}>
            Netto: {netChange >= 0 ? '+' : ''}{netChange}
          </span>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Za posledních 6 měsíců
      </p>
    </StatisticsCard>
  );
}
