import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NavActionData {
  type: 'navigation' | 'action';
  label: string;
  count: number;
  percentage: number;
}

interface NavigationVsActionsChartProps {
  data: NavActionData[];
}

export function NavigationVsActionsChart({ data }: NavigationVsActionsChartProps) {
  const chartData = data.map(item => ({
    name: item.type === 'navigation' ? 'Navigace' : 'Akce',
    fullLabel: item.label,
    value: item.count,
    percentage: item.percentage,
    fill: item.type === 'navigation' 
      ? 'hsl(var(--muted-foreground))' 
      : 'hsl(var(--primary))'
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="font-medium text-foreground">{data.fullLabel}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toLocaleString('cs-CZ')} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Navigace vs Akce</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} layout="vertical" barSize={32}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                width={70}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            {data.map((item) => (
              <div key={item.type} className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {item.percentage}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.type === 'navigation' ? 'Navigace' : 'Akce'}
                </p>
              </div>
            ))}
          </div>

          {data[1]?.percentage < 30 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
              💡 Nízký podíl akcí může značit složité workflow nebo nejasné UX
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
