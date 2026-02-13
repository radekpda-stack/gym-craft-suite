import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Layers } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const CATEGORY_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
];

interface CategoryTrendChartProps {
  data: Array<Record<string, any>>;
  categories: string[];
}

export function CategoryTrendChart({ data, categories }: CategoryTrendChartProps) {
  if (data.length === 0 || categories.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">Kategorie v čase</h3>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="period"
            className="text-xs fill-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                    <p className="font-medium text-sm mb-1">{label}</p>
                    {payload.map((p: any) => (
                      <p key={p.dataKey} className="text-xs">
                        <span style={{ color: p.color }}>●</span> {p.dataKey}: {formatCurrency(p.value)}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
          />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
