import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity,
  Zap,
  Heart,
  Smile,
  AlertTriangle,
  Clock,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useFeedbackAnalytics } from '@/hooks/useFeedbackAnalytics';
import { cn } from '@/lib/utils';
import { METRIC_EXPLANATIONS } from '@/lib/feedbackCalculations';
import { SessionFitStatsCard } from './SessionFitStatsCard';
import { SleepRecoveryStatsCard } from './SleepRecoveryStatsCard';
import { DifficultyVsFeelCard } from './DifficultyVsFeelCard';

interface FeedbackTrendsOverviewProps {
  days?: number;
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' | null }) => {
  if (!trend) return null;
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const MetricCard = ({ 
  icon: Icon, 
  label, 
  metricKey,
  value, 
  trend,
  suffix = '/10',
  inverted = false,
}: { 
  icon: typeof Activity;
  label: string;
  metricKey?: keyof typeof METRIC_EXPLANATIONS;
  value: number | null;
  trend: 'up' | 'down' | 'same' | null;
  suffix?: string;
  inverted?: boolean;
}) => {
  // For inverted metrics (soreness, pain), we flip the trend color
  const getTrendColor = () => {
    if (!trend) return '';
    if (inverted) {
      return trend === 'up' ? 'text-destructive' : trend === 'down' ? 'text-success' : '';
    }
    return trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : '';
  };

  const metric = metricKey ? METRIC_EXPLANATIONS[metricKey] : null;

  const content = (
    <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
        {metric && <HelpCircle className="w-3 h-3 text-muted-foreground/50" />}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">
          {value !== null && !isNaN(value) ? value : '—'}
          {value !== null && !isNaN(value) && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
        </span>
        {trend && (
          <span className={cn('flex items-center gap-0.5', getTrendColor())}>
            <TrendIcon trend={inverted ? (trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'same') : trend} />
          </span>
        )}
      </div>
    </div>
  );

  if (metric) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{metric.label}</p>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
              <p className="text-xs text-primary/80 font-mono">{metric.scale}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export function FeedbackTrendsOverview({ days = 30 }: FeedbackTrendsOverviewProps) {
  const { data: trends, isLoading } = useFeedbackAnalytics(days);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!trends) return null;

  return (
    <div className="space-y-4">
      {/* Response Rate & Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Míra odpovědí</span>
            </div>
            <div className="text-2xl font-bold">{trends.responseRate}%</div>
            <p className="text-xs text-muted-foreground">
              {trends.totalCompleted} z {trends.totalSent} odeslaných
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Průměrná doba odpovědi</span>
            </div>
            <div className="text-2xl font-bold">
              {trends.avgResponseTimeHours !== null ? `${trends.avgResponseTimeHours}h` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Od odeslání po vyplnění</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Red Flags</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{trends.redFlagsCount}</span>
              {trends.redFlagsTrend && (
                <Badge className={cn(
                  'text-xs',
                  trends.redFlagsTrend === 'down' ? 'bg-success/20 text-success' : 
                  trends.redFlagsTrend === 'up' ? 'bg-destructive/20 text-destructive' : 
                  'bg-secondary'
                )}>
                  {trends.redFlagsTrend === 'down' ? '↓ Méně' : 
                   trends.redFlagsTrend === 'up' ? '↑ Více' : '= Stejně'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-xs">Časté bolesti</span>
            </div>
            {trends.topPainAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {trends.topPainAreas.slice(0, 3).map(area => (
                  <Badge key={area.area} variant="secondary" className="text-xs">
                    {area.area} ({area.count})
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Žádné</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metric Trends */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Průměry metrik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MetricCard
              icon={Activity}
              label="Pocit těla"
              value={trends.metrics.bodyFeel.current}
              trend={trends.metrics.bodyFeel.trend}
            />
            <MetricCard
              icon={Zap}
              label="Energie"
              value={trends.metrics.energy.current}
              trend={trends.metrics.energy.trend}
            />
            <MetricCard
              icon={Smile}
              label="Zábava"
              value={trends.metrics.fun.current}
              trend={trends.metrics.fun.trend}
            />
            <MetricCard
              icon={Activity}
              label="Svalovka"
              value={trends.metrics.soreness.current}
              trend={trends.metrics.soreness.trend}
              inverted
            />
            <MetricCard
              icon={Heart}
              label="Bolest"
              value={trends.metrics.pain.current}
              trend={trends.metrics.pain.trend}
              inverted
            />
          </div>
        </CardContent>
      </Card>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Rate Over Time */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Odesláno vs Vyplněno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.dailyData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sent" name="Odesláno" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completed" name="Vyplněno" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Body Feel Trend */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vývoj pocitu těla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.dailyData.filter(d => d.avgBodyFeel !== null)}>
                  <defs>
                    <linearGradient id="bodyFeelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground" 
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}/10`, 'Pocit těla']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgBodyFeel" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#bodyFeelGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Red Flags Over Time */}
      {trends.dailyData.some(d => d.redFlags > 0) && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Red Flags v čase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="redFlags" 
                    name="Red Flags" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SessionFitStatsCard days={days} />
        <SleepRecoveryStatsCard days={days} />
        <DifficultyVsFeelCard days={days} />
      </div>
    </div>
  );
}
