import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getCategoryInfo, type ExpenseCategory } from '@/hooks/useBusinessExpenses';
import type { ExpenseStatsByCategory } from '@/hooks/useExpenseStats';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 40%, 50%)',
  'hsl(280, 40%, 50%)',
  'hsl(var(--muted-foreground))',
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

interface ExpenseCategoryChartProps {
  data: ExpenseStatsByCategory[];
}

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Žádná data k zobrazení
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    name: getCategoryInfo(item.category).label,
    icon: getCategoryInfo(item.category).icon,
    fill: COLORS[index % COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="amount"
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.category} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {chartData.map((item) => (
          <div key={item.category} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: item.fill }}
            />
            <span className="truncate">{item.icon} {item.name}</span>
            <span className="text-muted-foreground ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>

      <div className="text-center pt-2 border-t">
        <span className="text-sm text-muted-foreground">Celkem: </span>
        <span className="font-semibold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
