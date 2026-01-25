/**
 * ClientFeedbackRecovery
 * 
 * Feedback & Recovery section for client detail page.
 * Shows simplified coaching profile with optional detailed charts.
 */

import { useMemo, useState } from 'react';
import { 
  Activity, 
  Zap, 
  Heart, 
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { SimplifiedCoachingProfile } from '@/components/feedback/SimplifiedCoachingProfile';
import { useClientFeedback, TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { 
  safeAverage, 
  formatMetric, 
  calculateSessionLoad,
  getTopPainLocations,
  responseRate,
} from '@/lib/feedbackCalculations';
import { 
  evaluateFeedback, 
  detectPatterns,
  hasHighSeverityFlag,
} from '@/lib/redFlagRules';
import { LIMITING_FACTOR_LABELS } from '@/lib/coachSuggestions';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FeedbackMetricDetailDialog } from '@/components/feedback/FeedbackMetricDetailDialog';

interface ClientFeedbackRecoveryProps {
  clientId: string;
  days?: number;
}

type PeriodFilter = 7 | 30 | 90 | 365;

type MetricType = 'sessionLoad' | 'readiness' | 'pain' | 'sessionFit';

// Help content for metric cards - simplified Czech labels
const METRIC_HELP = {
  sessionLoad: {
    title: 'Náročnost tréninku',
    description: 'Jak těžký byl trénink podle klienta. Vyšší hodnota = náročnější trénink.',
    calculation: 'Kombinace RPE hodnocení a délky tréninku. Zobrazeno v AU (jednotky zátěže).',
  },
  readiness: {
    title: 'Připravenost',
    description: 'Jak se klient cítil připravený na trénink před jeho začátkem.',
    calculation: 'Škála 1-10. Vyšší hodnota = lepší připravenost.',
  },
  pain: {
    title: 'Bolest',
    description: 'Průměrná úroveň bolesti po tréninku. Nižší hodnota je lepší.',
    calculation: 'Škála 1-10. Pozor: u bolesti je pokles (↓) pozitivní signál.',
  },
  sessionFit: {
    title: 'Jak mu to sedí',
    description: 'Jak dobře trénink odpovídal tomu, co klient očekával nebo potřeboval.',
    calculation: 'Škála 1-10. Vyšší hodnota = lepší shoda s očekáváním.',
  },
};

// Define metric configurations for detail dialog
const getMetricConfig = (type: MetricType) => {
  const configs = {
    sessionLoad: {
      key: 'sessionLoad',
      label: 'Náročnost',
      color: 'hsl(var(--primary))',
      icon: <Zap className="w-4 h-4" />,
      getValue: (f: TrainingFeedback) => calculateSessionLoad(f.rpe_rating, 60),
      suffix: ' AU',
    },
    readiness: {
      key: 'readiness',
      label: 'Připravenost',
      color: 'hsl(142, 76%, 36%)',
      icon: <Activity className="w-4 h-4" />,
      getValue: (f: TrainingFeedback) => (f as any).readiness_level ?? f.body_feel,
    },
    pain: {
      key: 'pain',
      label: 'Bolest',
      color: 'hsl(var(--destructive))',
      icon: <Heart className="w-4 h-4" />,
      inverted: true,
      getValue: (f: TrainingFeedback) => f.pain,
    },
    sessionFit: {
      key: 'sessionFit',
      label: 'Jak mu to sedí',
      color: 'hsl(var(--primary))',
      icon: <Target className="w-4 h-4" />,
      getValue: (f: TrainingFeedback) => (f as any).session_fit ?? f.fun,
    },
  };
  return configs[type];
};

const MiniSparkline = ({ 
  data, 
  dataKey,
  color = 'primary',
  inverted = false,
}: { 
  data: Array<{ date: string; value: number | null }>;
  dataKey: string;
  color?: string;
  inverted?: boolean;
}) => {
  const validData = data.filter(d => d.value != null);
  
  if (validData.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-muted-foreground text-xs">
        Nedostatek dat
      </div>
    );
  }

  return (
    <div className="h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={validData}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`hsl(var(--${color}))`} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={`hsl(var(--${color}))`} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={`hsl(var(--${color}))`}
            fill={`url(#gradient-${dataKey})`}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TrendIndicator = ({ 
  current, 
  previous, 
  inverted = false 
}: { 
  current: number | null; 
  previous: number | null;
  inverted?: boolean;
}) => {
  if (current == null || previous == null) return null;
  
  const diff = current - previous;
  const isUp = diff > 0.5;
  const isDown = diff < -0.5;
  
  if (!isUp && !isDown) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  
  const isPositive = inverted ? isDown : isUp;
  
  return isUp ? (
    <TrendingUp className={cn('w-3 h-3', isPositive ? 'text-success' : 'text-destructive')} />
  ) : (
    <TrendingDown className={cn('w-3 h-3', isPositive ? 'text-success' : 'text-destructive')} />
  );
};

export function ClientFeedbackRecovery({ 
  clientId,
  days: initialDays = 30,
}: ClientFeedbackRecoveryProps) {
  const [period, setPeriod] = useState<PeriodFilter>(initialDays as PeriodFilter);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const { data: allFeedback, isLoading } = useClientFeedback(clientId);

  const analytics = useMemo(() => {
    if (!allFeedback || allFeedback.length === 0) return null;

    const cutoffDate = subDays(new Date(), period);
    const recentFeedback = allFeedback.filter(f => 
      new Date(f.created_at) >= cutoffDate
    );

    if (recentFeedback.length === 0) return null;

    // Calculate time series data - use existing fields with type assertion
    const timeSeriesData = recentFeedback.map(f => {
      const fb = f as any;
      return {
        date: format(new Date(f.created_at), 'd.M', { locale: cs }),
        sessionLoad: calculateSessionLoad(f.rpe_rating, 60),
        readiness: fb.readiness_level ?? f.body_feel, // fallback to body_feel
        pain: f.pain,
        sessionFit: fb.session_fit ?? f.fun, // fallback to fun
      };
    }).reverse();

    // Calculate averages using type assertions for new fields
    const firstHalf = recentFeedback.slice(Math.floor(recentFeedback.length / 2));
    const secondHalf = recentFeedback.slice(0, Math.floor(recentFeedback.length / 2));

    const sessionLoadCurrent = safeAverage(
      secondHalf.map(f => calculateSessionLoad(f.rpe_rating, 60))
    );
    const sessionLoadPrevious = safeAverage(
      firstHalf.map(f => calculateSessionLoad(f.rpe_rating, 60))
    );

    const readinessCurrent = safeAverage(secondHalf.map(f => (f as any).readiness_level ?? f.body_feel));
    const readinessPrevious = safeAverage(firstHalf.map(f => (f as any).readiness_level ?? f.body_feel));

    const painCurrent = safeAverage(secondHalf.map(f => f.pain));
    const painPrevious = safeAverage(firstHalf.map(f => f.pain));

    const sessionFitCurrent = safeAverage(secondHalf.map(f => (f as any).session_fit ?? f.fun));
    const sessionFitPrevious = safeAverage(firstHalf.map(f => (f as any).session_fit ?? f.fun));

    // Evaluate red flags and patterns
    const feedbackForEval = recentFeedback.map(f => {
      const fb = f as any;
      return {
        pain: f.pain,
        body_feel: f.body_feel,
        energy: fb.energy ?? null,
        rpe_rating: f.rpe_rating,
        session_fit: fb.session_fit,
        doms_level: fb.doms_level,
        readiness_level: fb.readiness_level,
        pain_areas: f.pain_area ? [f.pain_area] : null,
        training_date: f.created_at,
      };
    });

    const allRedFlags = feedbackForEval.flatMap(f => evaluateFeedback(f));
    const patterns = detectPatterns(feedbackForEval, period);
    const lastRedFlag = allRedFlags.find(r => r.triggered && r.rule.severity === 'high');

    // Top pain locations
    const topPain = getTopPainLocations(recentFeedback.map(f => ({
      pain_areas: f.pain_area ? [f.pain_area] : null,
    })), 3);

    // Limiting factors frequency
    const limitingFactors = recentFeedback
      .filter(f => (f as any).limiting_factor)
      .reduce((acc, f) => {
        const factor = (f as any).limiting_factor!;
        acc[factor] = (acc[factor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topLimitingFactor = Object.entries(limitingFactors)
      .sort(([, a], [, b]) => b - a)[0];

    // Enjoyment average
    const enjoymentAvg = safeAverage(
      recentFeedback.map(f => (f as any).enjoyment_level).filter((e): e is number => e != null)
    );

    // Response consistency (how many trainings have feedback)
    // This is a simplified version - would need training data for accurate calculation
    const totalFeedback = recentFeedback.length;

    return {
      timeSeriesData,
      metrics: {
        sessionLoad: { current: sessionLoadCurrent, previous: sessionLoadPrevious },
        readiness: { current: readinessCurrent, previous: readinessPrevious },
        pain: { current: painCurrent, previous: painPrevious },
        sessionFit: { current: sessionFitCurrent, previous: sessionFitPrevious },
      },
      riskSignals: {
        lastRedFlag: lastRedFlag ? {
          message: lastRedFlag.message,
          date: recentFeedback.find(f => {
          const fb = f as any;
          const eval_ = evaluateFeedback({
            pain: f.pain,
            body_feel: f.body_feel,
            energy: fb.energy,
            rpe_rating: f.rpe_rating,
            session_fit: fb.session_fit,
            doms_level: fb.doms_level,
            readiness_level: fb.readiness_level,
          });
          return eval_.some(e => e.rule.id === lastRedFlag.rule.id && e.triggered);
        })?.created_at,
      } : null,
      topPain,
      patterns,
    },
    profile: {
      topLimitingFactor: topLimitingFactor ? {
        factor: topLimitingFactor[0],
        count: topLimitingFactor[1],
      } : null,
      enjoymentAvg,
        totalFeedback,
      },
    };
  }, [allFeedback, period]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Zatím žádná feedback data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {([7, 30, 90, 365] as const).map((days) => (
          <Button
            key={days}
            variant={period === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(days)}
          >
            {days === 365 ? '1 rok' : `${days} dní`}
          </Button>
        ))}
      </div>

      {/* Simplified Coaching Profile - Main View */}
      <SimplifiedCoachingProfile
        metrics={{
          sessionFit: analytics.metrics.sessionFit.current,
          pain: analytics.metrics.pain.current,
          readiness: analytics.metrics.readiness.current,
          rpe: analytics.metrics.sessionLoad.current ? analytics.metrics.sessionLoad.current / 60 : null, // Convert back to RPE scale
        }}
        limitingFactor={analytics.profile.topLimitingFactor}
        enjoymentAvg={analytics.profile.enjoymentAvg}
        totalFeedback={analytics.profile.totalFeedback}
        feedbackData={{
          rpe_rating: analytics.metrics.sessionLoad.current ? analytics.metrics.sessionLoad.current / 60 : null,
          session_fit: analytics.metrics.sessionFit.current,
          pain: analytics.metrics.pain.current,
          readiness_level: analytics.metrics.readiness.current,
        }}
        onShowDetails={() => setShowCharts(!showCharts)}
      />

      {/* Detailed Charts - Collapsible */}
      <Collapsible open={showCharts} onOpenChange={setShowCharts}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <BarChart3 className="w-4 h-4" />
            {showCharts ? 'Skrýt podrobné grafy' : 'Zobrazit podrobné grafy'}
            {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-4">
          {/* Mini Charts Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Náročnost Trend */}
            <Card 
              className="glass cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setSelectedMetric('sessionLoad')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Náročnost
                    <StatInfoTooltip
                      title={METRIC_HELP.sessionLoad.title}
                      description={METRIC_HELP.sessionLoad.description}
                      calculation={METRIC_HELP.sessionLoad.calculation}
                    />
                  </span>
                  <TrendIndicator 
                    current={analytics.metrics.sessionLoad.current}
                    previous={analytics.metrics.sessionLoad.previous}
                  />
                </div>
                <div className="text-lg font-bold">
                  {formatMetric(analytics.metrics.sessionLoad.current, { decimals: 0, suffix: ' AU' })}
                </div>
                <MiniSparkline 
                  data={analytics.timeSeriesData.map(d => ({ date: d.date, value: d.sessionLoad }))}
                  dataKey="sessionLoad"
                  color="primary"
                />
              </CardContent>
            </Card>

            {/* Readiness Trend */}
            <Card 
              className="glass cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setSelectedMetric('readiness')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Připravenost
                    <StatInfoTooltip
                      title={METRIC_HELP.readiness.title}
                      description={METRIC_HELP.readiness.description}
                      calculation={METRIC_HELP.readiness.calculation}
                    />
                  </span>
                  <TrendIndicator 
                    current={analytics.metrics.readiness.current}
                    previous={analytics.metrics.readiness.previous}
                  />
                </div>
                <div className="text-lg font-bold">
                  {formatMetric(analytics.metrics.readiness.current, { suffix: '/10' })}
                </div>
                <MiniSparkline 
                  data={analytics.timeSeriesData.map(d => ({ date: d.date, value: d.readiness }))}
                  dataKey="readiness"
                  color="success"
                />
              </CardContent>
            </Card>

            {/* Pain Incidence */}
            <Card 
              className="glass cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setSelectedMetric('pain')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Bolest
                    <StatInfoTooltip
                      title={METRIC_HELP.pain.title}
                      description={METRIC_HELP.pain.description}
                      calculation={METRIC_HELP.pain.calculation}
                    />
                  </span>
                  <TrendIndicator 
                    current={analytics.metrics.pain.current}
                    previous={analytics.metrics.pain.previous}
                    inverted
                  />
                </div>
                <div className="text-lg font-bold">
                  {formatMetric(analytics.metrics.pain.current, { suffix: '/10' })}
                </div>
                <MiniSparkline 
                  data={analytics.timeSeriesData.map(d => ({ date: d.date, value: d.pain }))}
                  dataKey="pain"
                  color="destructive"
                  inverted
                />
              </CardContent>
            </Card>

            {/* Session Fit Trend */}
            <Card 
              className="glass cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setSelectedMetric('sessionFit')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Jak mu to sedí
                    <StatInfoTooltip
                      title={METRIC_HELP.sessionFit.title}
                      description={METRIC_HELP.sessionFit.description}
                      calculation={METRIC_HELP.sessionFit.calculation}
                    />
                  </span>
                  <TrendIndicator 
                    current={analytics.metrics.sessionFit.current}
                    previous={analytics.metrics.sessionFit.previous}
                  />
                </div>
                <div className="text-lg font-bold">
                  {formatMetric(analytics.metrics.sessionFit.current, { suffix: '/10' })}
                </div>
                <MiniSparkline 
                  data={analytics.timeSeriesData.map(d => ({ date: d.date, value: d.sessionFit }))}
                  dataKey="sessionFit"
                  color="primary"
                />
              </CardContent>
            </Card>
          </div>

          {/* Risk Signals */}
          <Card className="glass">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Rizikové signály
                <StatInfoTooltip
                  title="Rizikové signály"
                  description="Automatická detekce varovných signálů z feedbacků klienta."
                  calculation="Red Flag = závažný jednorázový problém. Pattern = opakující se trend. Top bolest = nejčastěji reportované bolestivé oblasti."
                />
              </h4>
              
              <div className="space-y-2">
                {analytics.riskSignals.lastRedFlag && (
                  <div className="flex items-start gap-2 text-sm">
                    <Badge variant="destructive" className="shrink-0">Pozor</Badge>
                    <span>{analytics.riskSignals.lastRedFlag.message}</span>
                    {analytics.riskSignals.lastRedFlag.date && (
                      <span className="text-muted-foreground">
                        ({format(new Date(analytics.riskSignals.lastRedFlag.date), 'd.M.yyyy', { locale: cs })})
                      </span>
                    )}
                  </div>
                )}

                {analytics.riskSignals.topPain.length > 0 && (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground">Nejčastější bolest:</span>
                    {analytics.riskSignals.topPain.map(p => (
                      <Badge key={p.area} variant="secondary">
                        {p.area} ({p.count}×)
                      </Badge>
                    ))}
                  </div>
                )}

                {analytics.riskSignals.patterns.length > 0 && (
                  <div className="space-y-1">
                    {analytics.riskSignals.patterns.map((pattern, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                          Trend
                        </Badge>
                        <span>{pattern.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!analytics.riskSignals.lastRedFlag && 
                 analytics.riskSignals.topPain.length === 0 && 
                 analytics.riskSignals.patterns.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    ✅ Žádné rizikové signály v tomto období
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Detail Dialog */}
      {selectedMetric && allFeedback && (
        <FeedbackMetricDetailDialog
          open={!!selectedMetric}
          onOpenChange={(open) => !open && setSelectedMetric(null)}
          metric={getMetricConfig(selectedMetric)}
          feedback={allFeedback}
          period={period}
        />
      )}
    </div>
  );
}