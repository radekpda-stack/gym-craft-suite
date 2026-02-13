import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ClientStat {
  name: string;
  orderCount: number;
  totalSpent: number;
}

interface TopClientsChartProps {
  data: ClientStat[];
}

export function TopClientsChart({ data }: TopClientsChartProps) {
  if (data.length === 0) return null;

  const chartData = data.slice(0, 10).map(c => ({
    name: c.name.length > 18 ? c.name.substring(0, 18) + '…' : c.name,
    fullName: c.name,
    spent: c.totalSpent,
    orders: c.orderCount,
  }));

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">Top klienti podle útrat</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            className="text-xs fill-muted-foreground"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs fill-muted-foreground"
            axisLine={false}
            tickLine={false}
            width={130}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                    <p className="text-sm font-medium">{d.fullName}</p>
                    <p className="text-xs">{formatCurrency(d.spent)}</p>
                    <p className="text-xs text-muted-foreground">{d.orders} objednávek</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="spent" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
