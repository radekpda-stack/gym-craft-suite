import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, Dumbbell, Activity } from 'lucide-react';
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
  Bar,
  CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ExerciseAnalyticsData } from '@/hooks/useExerciseAnalytics';

interface AnalyticsDetailViewProps {
  data: ExerciseAnalyticsData;
  onClose: () => void;
}

const CATEGORY_COLORS = [
  'hsl(68 100% 50%)',
  'hsl(75 100% 45%)',
  'hsl(50 100% 50%)',
  'hsl(45 100% 55%)',
  'hsl(180 70% 45%)',
  'hsl(200 70% 50%)',
  'hsl(280 70% 60%)',
  'hsl(320 70% 55%)',
];

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function AnalyticsDetailView({ data, onClose }: AnalyticsDetailViewProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Detail analytiky</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Full Category Distribution */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Rozložení svalových skupin
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ category, percentage }) => 
                      percentage > 5 ? `${percentage}%` : ''
                    }
                    labelLine={false}
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

            {/* Legend with percentages */}
            <div className="space-y-2">
              {data.categoryDistribution.map((cat, i) => (
                <div 
                  key={cat.category}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-sm">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{cat.count}×</span>
                    <span className="text-sm font-medium w-12 text-right">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Volume Trend Full */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trend objemu v čase
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volumeTrend}>
                <defs>
                  <linearGradient id="volumeGradientDetail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(68 100% 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(68 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false}
                />
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
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatVolume(value) + ' kg', 'Objem']}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(68 100% 50%)"
                  strokeWidth={2}
                  fill="url(#volumeGradientDetail)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Exercises */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Nejčastější cviky
          </h3>
          <div className="space-y-3">
            {data.topExercises.map((exercise, i) => (
              <div 
                key={exercise.exerciseId}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/20"
              >
                <span className="text-lg font-bold text-primary w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{exercise.exerciseName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {exercise.usageCount}× použito
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {exercise.percentage}% tréninků
                    </span>
                  </div>
                </div>
                {/* Mini sparkline */}
                <div className="w-24 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={exercise.trend.map((v, i) => ({ v, i }))}>
                      <defs>
                        <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(68 100% 50%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(68 100% 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="hsl(68 100% 50%)"
                        strokeWidth={1.5}
                        fill={`url(#spark-${i})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movement Patterns Full */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Pohybové vzorce - kompletní přehled
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.movementPatterns} 
                layout="vertical"
                margin={{ left: 80, right: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  horizontal={false}
                />
                <XAxis 
                  type="number" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
                  fill="hsl(68 100% 50%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
