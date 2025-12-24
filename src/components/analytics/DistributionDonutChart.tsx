import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip
} from 'recharts';
import { Badge } from '@/components/ui/badge';

interface DistributionDonutChartProps {
  data: Array<{ name: string; value: number; percentage?: number }>;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  showLegend?: boolean;
  legendLimit?: number;
}

const DEFAULT_COLORS = [
  'hsl(68 100% 50%)',    // Primary volt (chart-1)
  'hsl(260 90% 65%)',    // Violet (chart-2)
  'hsl(140 70% 55%)',    // Green (chart-3)
  'hsl(35 90% 60%)',     // Amber (chart-4)
  'hsl(10 80% 60%)',     // Coral (chart-5)
  'hsl(180 70% 45%)',    // Cyan
  'hsl(200 70% 50%)',    // Blue
  'hsl(320 70% 55%)',    // Pink
];

export function DistributionDonutChart({ 
  data, 
  height = 200,
  innerRadius = 50,
  outerRadius = 80,
  colors = DEFAULT_COLORS,
  showLegend = true,
  legendLimit = 4
}: DistributionDonutChartProps) {
  return (
    <div>
      <div className="analytics-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={entry.name} 
                  fill={colors[index % colors.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px hsl(0 0% 0% / 0.3)',
              }}
              formatter={(value: number, name: string) => {
                const item = data.find(d => d.name === name);
                return [`${item?.percentage ?? Math.round(value)}%`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {showLegend && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {data.slice(0, legendLimit).map((item, i) => (
            <Badge 
              key={item.name}
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{ borderColor: colors[i % colors.length] }}
            >
              {item.name.length > 12 ? item.name.slice(0, 12) + '...' : item.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
