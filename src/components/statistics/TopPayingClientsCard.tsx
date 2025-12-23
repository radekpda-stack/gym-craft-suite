import { useAnnualStats } from '@/hooks/useAnnualStats';
import { StatisticsCard } from './StatisticsGrid';
import { formatCurrency } from '@/lib/formatters';
import { Crown, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--primary))',
  'hsl(var(--secondary-foreground))',
  'hsl(var(--muted-foreground))',
];

const MEDAL_ICONS = [Crown, Medal, Award];

export function TopPayingClientsCard() {
  const { data, isLoading } = useAnnualStats('year');

  const clients = data?.topClientsBySpent || [];
  const chartData = clients.slice(0, 5).map((c, i) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
    fullName: c.name,
    amount: c.amount,
    rank: i + 1,
  }));

  const expandedContent = (
    <div className="space-y-4 sm:space-y-6">
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 60, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Utraceno']}
              labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {clients.map((client, i) => {
          const Icon = MEDAL_ICONS[i] || Award;
          return (
            <div
              key={client.name}
              className={cn(
                'flex items-center justify-between p-2.5 sm:p-3 rounded-lg gap-2',
                i === 0 && 'bg-warning/10 border border-warning/20',
                i > 0 && 'bg-secondary/30'
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    i === 0 && 'bg-warning/20 text-warning',
                    i === 1 && 'bg-muted text-muted-foreground',
                    i > 1 && 'bg-secondary text-muted-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="font-medium text-sm truncate">{client.name}</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-success flex-shrink-0">
                {formatCurrency(client.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Top platící klienti"
      icon={<Crown className="h-4 w-4 text-warning" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="space-y-2">
        {clients.slice(0, 5).map((client, i) => {
          const Icon = MEDAL_ICONS[i] || Award;
          return (
            <div key={client.name} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  i === 0 && 'bg-warning/20 text-warning',
                  i === 1 && 'bg-muted text-muted-foreground',
                  i > 1 && 'bg-secondary text-muted-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              <span className="text-xs truncate flex-1">{client.name}</span>
              <span className="text-xs font-medium text-success">
                {formatCurrency(client.amount)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Tento rok
      </p>
    </StatisticsCard>
  );
}
