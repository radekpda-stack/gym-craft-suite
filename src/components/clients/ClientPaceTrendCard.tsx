import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Timer, TrendingUp, TrendingDown, Minus, Trophy, Waves, Mountain, Footprints } from 'lucide-react';
import { useClientPaceTrend, PaceDataPoint } from '@/hooks/useClientPaceTrend';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientPaceTrendCardProps {
  clientId: string;
}

const CHART_COLORS = {
  rower: 'hsl(var(--chart-1))',
  skierg: 'hsl(var(--chart-2))',
  treadmill: 'hsl(var(--chart-3))',
};

const CATEGORY_CONFIG = {
  rower: {
    label: 'Veslo',
    icon: Waves,
    unit: '/500m',
  },
  skierg: {
    label: 'SkiErg',
    icon: Mountain,
    unit: '/500m',
  },
  treadmill: {
    label: 'Běh',
    icon: Footprints,
    unit: '/500m',
  },
};

function formatPaceForAxis(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'stable' | null }) {
  if (!trend) return null;
  
  if (trend === 'improving') {
    return (
      <Badge className="bg-success/10 text-success border-success/20 gap-1">
        <TrendingDown className="w-3 h-3" />
        Zlepšuje se
      </Badge>
    );
  }
  if (trend === 'declining') {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
        <TrendingUp className="w-3 h-3" />
        Zhoršuje se
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="w-3 h-3" />
      Stabilní
    </Badge>
  );
}

function PaceChart({ 
  data, 
  category, 
  bestPace 
}: { 
  data: PaceDataPoint[]; 
  category: 'rower' | 'skierg' | 'treadmill';
  bestPace: PaceDataPoint | null;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Žádná data pro {CATEGORY_CONFIG[category].label}
      </div>
    );
  }

  // Sort by date and prepare chart data
  const chartData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(point => ({
      ...point,
      dateLabel: format(new Date(point.date), 'd.M', { locale: cs }),
      fullDate: format(new Date(point.date), 'd. MMMM yyyy', { locale: cs }),
    }));

  const config = CATEGORY_CONFIG[category];
  const color = CHART_COLORS[category];

  // Calculate Y axis domain with padding
  const paces = chartData.map(d => d.paceNormalized);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const padding = (maxPace - minPace) * 0.1 || 10;

  return (
    <div className="space-y-3">
      {/* Best pace highlight */}
      {bestPace && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Nejlepší tempo</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-primary">{bestPace.paceDisplay}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({format(new Date(bestPace.date), 'd.M.yyyy', { locale: cs })})
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${category}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPaceForAxis}
              domain={[minPace - padding, maxPace + padding]}
              reversed // Lower pace (faster) at top
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              formatter={(value: number, name: string, props: any) => [
                props.payload.paceDisplay,
                `Tempo ${config.unit}`
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const point = payload[0].payload;
                  return (
                    <div>
                      <div className="font-medium">{point.fullDate}</div>
                      <div className="text-xs text-muted-foreground">
                        {point.exerciseName} • {point.distanceMeters}m
                      </div>
                    </div>
                  );
                }
                return label;
              }}
            />
            {bestPace && (
              <ReferenceLine 
                y={bestPace.paceNormalized} 
                stroke={color}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="paceNormalized"
              stroke={`url(#gradient-${category})`}
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                const isPR = payload.isPR;
                const isBest = bestPace && payload.paceNormalized === bestPace.paceNormalized;
                
                if (isBest || isPR) {
                  return (
                    <circle 
                      key={`dot-${index}`}
                      cx={cx} 
                      cy={cy} 
                      r={6} 
                      fill={color}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle 
                    key={`dot-${index}`}
                    cx={cx} 
                    cy={cy} 
                    r={3} 
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 5, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-secondary/30">
          <p className="text-[10px] text-muted-foreground">Záznamů</p>
          <p className="text-sm font-bold">{data.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/30">
          <p className="text-[10px] text-muted-foreground">Průměr</p>
          <p className="text-sm font-bold">
            {formatPaceForAxis(data.reduce((sum, d) => sum + d.paceNormalized, 0) / data.length)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/30">
          <p className="text-[10px] text-muted-foreground">Vzdálenosti</p>
          <p className="text-sm font-bold">
            {[...new Set(data.map(d => d.distanceMeters))].join(', ')}m
          </p>
        </div>
      </div>
    </div>
  );
}

export function ClientPaceTrendCard({ clientId }: ClientPaceTrendCardProps) {
  const { data, isLoading } = useClientPaceTrend(clientId);
  const [activeTab, setActiveTab] = useState<'rower' | 'skierg' | 'treadmill'>('rower');

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Check if we have any data at all
  const hasAnyData = data.rower.length > 0 || data.skierg.length > 0 || data.treadmill.length > 0;

  if (!hasAnyData) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="w-4 h-4 text-primary" />
            Vývoj tempa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Žádná kardio data k zobrazení. Přidejte záznamy vesla, SkiErgu nebo běhu.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine which tabs have data
  const availableTabs = [
    { key: 'rower' as const, count: data.rower.length },
    { key: 'skierg' as const, count: data.skierg.length },
    { key: 'treadmill' as const, count: data.treadmill.length },
  ].filter(t => t.count > 0);

  // Set initial tab to first available
  if (!availableTabs.find(t => t.key === activeTab)) {
    setActiveTab(availableTabs[0]?.key || 'rower');
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="w-4 h-4 text-primary" />
            Vývoj tempa
          </CardTitle>
          <TrendBadge trend={data.trends[activeTab]} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
            {availableTabs.map(tab => {
              const config = CATEGORY_CONFIG[tab.key];
              const Icon = config.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="rower" className="mt-4">
            <PaceChart 
              data={data.rower} 
              category="rower" 
              bestPace={data.bestPaces.rower}
            />
          </TabsContent>

          <TabsContent value="skierg" className="mt-4">
            <PaceChart 
              data={data.skierg} 
              category="skierg" 
              bestPace={data.bestPaces.skierg}
            />
          </TabsContent>

          <TabsContent value="treadmill" className="mt-4">
            <PaceChart 
              data={data.treadmill} 
              category="treadmill" 
              bestPace={data.bestPaces.treadmill}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
