import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Wallet, Dumbbell, ShoppingBag, CreditCard } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { formatCurrency } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatsPeriodRange } from './StatsPeriodSelector';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

interface RevenueBreakdownCardProps {
  periodRange?: StatsPeriodRange;
}

export function RevenueBreakdownCard({ periodRange }: RevenueBreakdownCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-breakdown-by-source', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      let query = supabase
        .from('credit_transactions')
        .select('amount, type, created_at')
        .eq('user_id', user.user.id)
        .in('type', ['training', 'product', 'canceled_training']);

      // Apply period filter if provided
      if (periodRange?.start) {
        query = query.gte('created_at', periodRange.start.toISOString());
      }
      if (periodRange?.end) {
        query = query.lte('created_at', periodRange.end.toISOString());
      }

      const { data: transactions } = await query;

      if (!transactions) return null;

      const breakdown = {
        training: 0,
        product: 0,
        cancellation: 0,
      };

      transactions.forEach(t => {
        const absAmount = Math.abs(t.amount);
        if (t.type === 'training') breakdown.training += absAmount;
        else if (t.type === 'product') breakdown.product += absAmount;
        else if (t.type === 'canceled_training') breakdown.cancellation += absAmount;
      });

      return breakdown;
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const items = [
      { name: 'Za tréninky', value: data.training, icon: Dumbbell },
      { name: 'Za produkty', value: data.product, icon: ShoppingBag },
    ];
    // Only show cancellation if there's any
    if (data.cancellation > 0) {
      items.push({ name: 'Storno poplatky', value: data.cancellation, icon: CreditCard });
    }
    return items.filter(d => d.value > 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      title="Struktura plateb"
      icon={<Wallet className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      infoDescription="Rozdělení plateb podle typu - tréninky, produkty a storno poplatky."
      infoCalculation="Za tréninky = stržené částky za tréninky. Za produkty = prodané produkty. Storno = poplatky za pozdní zrušení."
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
        <p className="text-xs text-muted-foreground">Celkový obrat</p>
      </div>
    </StatisticsCard>
  );
}
