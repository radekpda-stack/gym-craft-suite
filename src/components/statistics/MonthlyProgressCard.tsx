import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, startOfMonth, format, endOfMonth } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export function MonthlyProgressCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-progress'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const now = new Date();
      const twelveMonthsAgo = subMonths(now, 11);

      // Get sessions
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('date, status')
        .eq('user_id', user.user.id)
        .gte('date', startOfMonth(twelveMonthsAgo).toISOString().split('T')[0]);

      // Get income
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('amount, created_at')
        .eq('user_id', user.user.id)
        .gt('amount', 0)
        .gte('created_at', startOfMonth(twelveMonthsAgo).toISOString());

      // Get new clients
      const { data: clients } = await supabase
        .from('clients')
        .select('created_at')
        .eq('user_id', user.user.id)
        .gte('created_at', startOfMonth(twelveMonthsAgo).toISOString());

      if (!sessions || !transactions || !clients) return null;

      // Build monthly data
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const trainings = sessions.filter(s => {
          const d = new Date(s.date);
          return d >= monthStart && d <= monthEnd && s.status === 'completed';
        }).length;

        const income = transactions.filter(t => {
          const d = new Date(t.created_at);
          return d >= monthStart && d <= monthEnd;
        }).reduce((sum, t) => sum + t.amount, 0);

        const newClients = clients.filter(c => {
          const d = new Date(c.created_at);
          return d >= monthStart && d <= monthEnd;
        }).length;

        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: cs }),
          fullMonth: format(monthStart, 'LLLL yyyy', { locale: cs }),
          trainings,
          income,
          newClients,
        });
      }

      // Calculate trends
      const currentMonth = monthlyData[monthlyData.length - 1];
      const lastMonth = monthlyData[monthlyData.length - 2];

      const trainingsTrend = lastMonth.trainings > 0 
        ? ((currentMonth.trainings - lastMonth.trainings) / lastMonth.trainings) * 100 
        : 0;
      const incomeTrend = lastMonth.income > 0 
        ? ((currentMonth.income - lastMonth.income) / lastMonth.income) * 100 
        : 0;

      return {
        monthlyData,
        currentMonth,
        trainingsTrend: Math.round(trainingsTrend),
        incomeTrend: Math.round(incomeTrend),
        totalTrainings: sessions.filter(s => s.status === 'completed').length,
        totalIncome: transactions.reduce((sum, t) => sum + t.amount, 0),
        totalNewClients: clients.length,
      };
    },
  });

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-success" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const expandedContent = data && (
    <div className="space-y-6">
      {/* Trainings chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Tréninky za 12 měsíců</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trainingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullMonth || ''}
                formatter={(value: number) => [`${value} tréninků`, 'Počet']}
              />
              <Area 
                type="monotone" 
                dataKey="trainings" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#trainingsGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Příjmy za 12 měsíců</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullMonth || ''}
                formatter={(value: number) => [formatCurrency(value), 'Příjem']}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                fill="url(#incomeGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
          <p className="text-sm text-muted-foreground mb-1">Celkem tréninků</p>
          <p className="text-2xl font-bold">{data.totalTrainings}</p>
        </div>
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
          <p className="text-sm text-muted-foreground mb-1">Celkový příjem</p>
          <p className="text-2xl font-bold">{formatCurrency(data.totalIncome)}</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50 text-center">
          <p className="text-sm text-muted-foreground mb-1">Nových klientů</p>
          <p className="text-2xl font-bold">{data.totalNewClients}</p>
        </div>
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Měsíční vývoj"
      icon={<TrendingUp className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      className="col-span-2"
    >
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data?.monthlyData || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Area 
              type="monotone" 
              dataKey="trainings" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fill="url(#miniGrad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tento měsíc:</span>
          <span className="text-sm font-bold">{data?.currentMonth?.trainings || 0}</span>
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            (data?.trainingsTrend || 0) > 0 && "text-success",
            (data?.trainingsTrend || 0) < 0 && "text-destructive"
          )}>
            <TrendIndicator value={data?.trainingsTrend || 0} />
            {Math.abs(data?.trainingsTrend || 0)}%
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Příjem: </span>
          <span className="text-sm font-bold text-success">
            {formatCurrency(data?.currentMonth?.income || 0)}
          </span>
        </div>
      </div>
    </StatisticsCard>
  );
}
