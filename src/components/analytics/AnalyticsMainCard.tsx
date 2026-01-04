import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ExerciseAnalyticsData } from '@/hooks/useExerciseAnalytics';

interface AnalyticsMainCardProps {
  data: ExerciseAnalyticsData;
  onShowDetail: () => void;
}

const CATEGORY_COLORS = [
  'hsl(68 100% 50%)',    // Primary volt
  'hsl(75 100% 45%)',    // Lighter green
  'hsl(50 100% 50%)',    // Yellow
  'hsl(45 100% 55%)',    // Orange yellow
  'hsl(180 70% 45%)',    // Cyan
  'hsl(200 70% 50%)',    // Blue
  'hsl(280 70% 60%)',    // Purple
  'hsl(320 70% 55%)',    // Pink
];

const PATTERN_COLORS = [
  'hsl(68 100% 50%)',
  'hsl(68 80% 45%)',
  'hsl(68 60% 40%)',
  'hsl(68 40% 35%)',
  'hsl(68 30% 30%)',
];

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function AnalyticsMainCard({ data, onShowDetail }: AnalyticsMainCardProps) {
  // Sample data for area chart (aggregate by week for cleaner view)
  const volumeData = data.volumeTrend.filter((_, i) => i % 3 === 0); // Show every 3rd day

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Header glow effect */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Přehled období
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onShowDetail}>
            Detail
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {formatVolume(data.totalVolume)}
            </p>
            <p className="text-xs text-muted-foreground">Celkový objem (kg)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {data.totalSessions}
            </p>
            <p className="text-xs text-muted-foreground">Tréninků</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold text-foreground">
              {formatVolume(data.avgVolumePerSession)}
            </p>
            <p className="text-xs text-muted-foreground">Průměr/trénink</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Volume Trend - Area Chart */}
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trend objemu
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(68 100% 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(68 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    tickFormatter={formatVolume}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatVolume(value) + ' kg', 'Objem']}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(68 100% 50%)"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution - Donut */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Rozložení zátěže
            </p>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell 
                        key={entry.category} 
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
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
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {data.categoryDistribution.slice(0, 4).map((cat, i) => (
                <Badge 
                  key={cat.category}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{ borderColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                >
                  {cat.category.slice(0, 10)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Movement Patterns - Horizontal Bar */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Pohybové vzorce
            <span className="text-xs text-muted-foreground/70 ml-auto">
              {data.movementPatterns.length} vzorců
            </span>
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.movementPatterns.slice(0, 8)} 
                layout="vertical"
                margin={{ left: 80, right: 30, top: 5, bottom: 5 }}
              >
                <XAxis 
                  type="number" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 'auto']}
                />
                <YAxis 
                  type="category" 
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.count}×)`, 
                    'Podíl'
                  ]}
                />
                <Bar 
                  dataKey="percentage" 
                  radius={[0, 4, 4, 0]}
                >
                  {data.movementPatterns.slice(0, 8).map((entry, index) => (
                    <Cell 
                      key={entry.pattern} 
                      fill={PATTERN_COLORS[index % PATTERN_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
