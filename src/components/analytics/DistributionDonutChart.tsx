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
  'hsl(68 100% 50%)',    // Primary volt
  'hsl(75 100% 45%)',    // Lighter green
  'hsl(50 100% 50%)',    // Yellow
  'hsl(45 100% 55%)',    // Orange yellow
  'hsl(180 70% 45%)',    // Cyan
  'hsl(200 70% 50%)',    // Blue
  'hsl(280 70% 60%)',    // Purple
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
      <div style={{ height }}>
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
              }}
              formatter={(value: number, name: string) => {
                const item = data.find(d => d.name === name);
                return [`${item?.percentage || value}%`, name];
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
