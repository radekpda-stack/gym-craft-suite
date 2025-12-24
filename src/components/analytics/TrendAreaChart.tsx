import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';

interface TrendAreaChartProps {
  data: Array<{ label: string; value: number; [key: string]: any }>;
  dataKey?: string;
  height?: number;
  showGrid?: boolean;
  gradient?: {
    id: string;
    color: string;
  };
  formatValue?: (value: number) => string;
}

function defaultFormat(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function TrendAreaChart({ 
  data, 
  dataKey = 'value',
  height = 200,
  showGrid = false,
  gradient = { id: 'defaultGradient', color: 'hsl(68 100% 50%)' },
  formatValue = defaultFormat
}: TrendAreaChartProps) {
  return (
    <div className="analytics-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradient.id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradient.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={gradient.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
            />
          )}
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={formatValue}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px hsl(0 0% 0% / 0.3)',
            }}
            formatter={(value: number) => [formatValue(value), '']}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={gradient.color}
            strokeWidth={2}
            fill={`url(#${gradient.id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
