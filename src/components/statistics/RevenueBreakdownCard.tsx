import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Wallet, CreditCard, Banknote, Coins } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { formatCurrency } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

export function RevenueBreakdownCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-breakdown'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('amount, payment_method, type')
        .eq('user_id', user.user.id)
        .gt('amount', 0);

      if (!transactions) return null;

      const breakdown = {
        cash: 0,
        card: 0,
        credit: 0,
        other: 0,
      };

      transactions.forEach(t => {
        const method = t.payment_method || 'other';
        if (method === 'cash') breakdown.cash += t.amount;
        else if (method === 'card') breakdown.card += t.amount;
        else if (method === 'credit') breakdown.credit += t.amount;
        else breakdown.other += t.amount;
      });

      return breakdown;
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Hotovost', value: data.cash, icon: Banknote },
      { name: 'Karta', value: data.card, icon: CreditCard },
      { name: 'Kredit', value: data.credit, icon: Coins },
      { name: 'Ostatní', value: data.other, icon: Wallet },
    ].filter(d => d.value > 0);
  }, [data]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const expandedContent = (
    <div className="space-y-6">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {chartData.map((item, i) => {
          const Icon = item.icon;
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={item.name} className="p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="p-2 rounded-lg" 
                  style={{ backgroundColor: `${COLORS[i]}20` }}
                >
                  <Icon className="h-4 w-4" style={{ color: COLORS[i] }} />
                </div>
                <span className="font-medium">{item.name}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(item.value)}</p>
              <p className="text-sm text-muted-foreground">{percentage}% z celku</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Příjmy podle plateb"
      icon={<Wallet className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      infoDescription="Rozdělení příjmů podle způsobu platby - hotovost, karta, kredit nebo ostatní."
      infoCalculation="Součet všech kladných transakcí (platby) rozdělených podle zvoleného způsobu platby."
    >
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        <p className="text-xs text-muted-foreground">Celkové příjmy</p>
      </div>
    </StatisticsCard>
  );
}
