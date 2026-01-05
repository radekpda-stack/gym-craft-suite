import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPaceTrend, PaceDataPoint } from '@/hooks/useClientPaceTrend';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Trophy, Waves, Wind, Footprints, Info, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type CardioCategory = 'rower' | 'skierg' | 'treadmill';

const CATEGORY_CONFIG: Record<CardioCategory, {
  label: string;
  icon: React.ReactNode;
  unit: string;
  color: string;
  gradient: string;
}> = {
  rower: {
    label: 'Veslo',
    icon: <Waves className="h-4 w-4" />,
    unit: '/500m',
    color: 'hsl(var(--chart-1))',
    gradient: 'from-[hsl(var(--chart-1))] to-[hsl(var(--chart-1)/0.1)]',
  },
  skierg: {
    label: 'SkiErg',
    icon: <Wind className="h-4 w-4" />,
    unit: '/500m',
    color: 'hsl(var(--chart-2))',
    gradient: 'from-[hsl(var(--chart-2))] to-[hsl(var(--chart-2)/0.1)]',
  },
  treadmill: {
    label: 'Běh',
    icon: <Footprints className="h-4 w-4" />,
    unit: '/km',
    color: 'hsl(var(--chart-3))',
    gradient: 'from-[hsl(var(--chart-3))] to-[hsl(var(--chart-3)/0.1)]',
  },
};

function formatPaceDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTrendInfo(trend: 'improving' | 'declining' | 'stable' | null) {
  switch (trend) {
    case 'improving':
      return {
        icon: <TrendingDown className="h-4 w-4" />,
        label: 'Zrychluje se',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        description: 'Tempo klesá = zlepšuješ se!',
      };
    case 'declining':
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        label: 'Zpomaluje se',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        description: 'Tempo roste = je třeba potrénovat',
      };
    case 'stable':
      return {
        icon: <Minus className="h-4 w-4" />,
        label: 'Stabilní',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        description: 'Tempo se drží na stejné úrovni',
      };
    default:
      return null;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  category: CardioCategory;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, category }) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const config = CATEGORY_CONFIG[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[160px]"
    >
      <p className="text-xs text-muted-foreground mb-1">
        {format(parseISO(data.date), 'd. MMMM yyyy', { locale: cs })}
      </p>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        <span className="font-semibold text-foreground">
          {formatPaceDisplay(data.paceNormalized)} {config.unit}
        </span>
      </div>
      {data.isPR && (
        <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs">
          <Trophy className="h-3 w-3" />
          <span>Osobní rekord!</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <Info className="h-3 w-3" />
        Vzdálenost: {data.distanceMeters}m
      </p>
    </motion.div>
  );
};

export function ClientPortalPaceTrendCard() {
  const { clientId } = useClientPortal();
  const { data: paceTrend, isLoading } = useClientPaceTrend(clientId ?? undefined);
  const [activeCategory, setActiveCategory] = useState<CardioCategory>('rower');

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!paceTrend) return null;

  const availableCategories = (['rower', 'skierg', 'treadmill'] as CardioCategory[]).filter(
    cat => paceTrend[cat].length > 0
  );

  if (availableCategories.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Vývoj tempa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Waves className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Zatím nemáš žádné kardio záznamy
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Jakmile začneš trénovat na vesle, SkiErgu nebo běžeckém páse, uvidíš zde svůj pokrok.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure active category is valid
  if (!availableCategories.includes(activeCategory)) {
    setActiveCategory(availableCategories[0]);
  }

  const currentData = paceTrend[activeCategory];
  const currentTrend = paceTrend.trends[activeCategory];
  const bestPace = paceTrend.bestPaces[activeCategory];
  const config = CATEGORY_CONFIG[activeCategory];
  const trendInfo = getTrendInfo(currentTrend);

  // Prepare chart data with sorted dates
  const chartData = [...currentData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Find min/max for Y axis (inverted - lower is better)
  const paceValues = chartData.map(d => d.paceNormalized);
  const minPace = Math.min(...paceValues);
  const maxPace = Math.max(...paceValues);
  const padding = (maxPace - minPace) * 0.15 || 10;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Vývoj tempa
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sleduj, jak se zlepšuješ v čase
            </p>
          </div>
          
          {availableCategories.length > 1 && (
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CardioCategory)}>
              <TabsList className="grid grid-cols-3 h-9">
                {availableCategories.map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="flex items-center gap-1.5 text-xs px-2"
                  >
                    {CATEGORY_CONFIG[cat].icon}
                    <span className="hidden sm:inline">{CATEGORY_CONFIG[cat].label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Info banner for non-athletes */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4"
            >
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tip:</span> Nižší tempo znamená rychlejší výkon. 
                Když čára klesá, zlepšuješ se! 🎯
              </p>
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Best pace */}
              {bestPace && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20"
                >
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nejlepší tempo</p>
                    <p className="font-bold text-foreground">
                      {formatPaceDisplay(bestPace.paceNormalized)} {config.unit}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Trend */}
              {trendInfo && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${trendInfo.bgColor} border border-current/10`}
                >
                  <div className={`p-2 rounded-full ${trendInfo.bgColor} ${trendInfo.color}`}>
                    {trendInfo.icon}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trend</p>
                    <p className={`font-bold ${trendInfo.color}`}>
                      {trendInfo.label}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chart */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="h-[280px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${activeCategory}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(parseISO(value), 'd.M.', { locale: cs })}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    reversed
                    domain={[minPace - padding, maxPace + padding]}
                    tickFormatter={(value) => formatPaceDisplay(value)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip category={activeCategory} />} />
                  <Area
                    type="monotone"
                    dataKey="paceNormalized"
                    stroke={config.color}
                    strokeWidth={2.5}
                    fill={`url(#gradient-${activeCategory})`}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isPR) {
                        return (
                          <g key={`dot-${payload.date}`}>
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={6} 
                              fill="hsl(var(--background))" 
                              stroke={config.color}
                              strokeWidth={2}
                            />
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={3} 
                              fill="#f59e0b"
                            />
                          </g>
                        );
                      }
                      return (
                        <circle 
                          key={`dot-${payload.date}`}
                          cx={cx} 
                          cy={cy} 
                          r={4} 
                          fill="hsl(var(--background))" 
                          stroke={config.color}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6,
                      stroke: config.color,
                      strokeWidth: 2,
                      fill: 'hsl(var(--background))',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border-2"
                  style={{ borderColor: config.color }}
                />
                <span>Tempo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Osobní rekord</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
