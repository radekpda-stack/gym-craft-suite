import { useAverageTrainingPrice } from '@/hooks/useAverageTrainingPrice';
import { StatisticsCard } from './StatisticsGrid';
import { formatCurrency } from '@/lib/formatters';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

export function AverageTrainingPriceCard() {
  const { data, isLoading } = useAverageTrainingPrice();

  const avgPrice = data?.avgPrice || 0;
  const totalTrainings = data?.totalTrainings || 0;
  const monthlyData = data?.monthlyData || [];
  const trend = data?.trend || 0;

  const expandedContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Průměrná cena</p>
          <p className="text-3xl font-bold">{formatCurrency(avgPrice)}</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground mb-1">Počet tréninků</p>
          <p className="text-3xl font-bold">{totalTrainings}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Vývoj průměrné ceny</h4>
        <div className="h-48">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v} Kč`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Průměr']}
                />
                <ReferenceLine
                  y={avgPrice}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Zatím nedostatek dat pro graf
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Kalkulace</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Průměrná cena je vypočítána z celkového příjmu z tréninků (
          {formatCurrency(data?.totalIncome || 0)}) děleno počtem
          dokončených tréninků ({totalTrainings}) za celou historii.
        </p>
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Průměrná cena tréninku"
      icon={<Calculator className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="flex flex-col items-center justify-center py-4">
        <p className="text-4xl font-bold">{formatCurrency(avgPrice)}</p>
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? (
            <>
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-success">Stoupá</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive">Klesá</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Stabilní</span>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Z {totalTrainings} tréninků (celkem)
      </p>
    </StatisticsCard>
  );
}
