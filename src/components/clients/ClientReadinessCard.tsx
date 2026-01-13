/**
 * ClientReadinessCard Component
 * 
 * Shows pre-training readiness check with:
 * - Overall readiness score
 * - Days since last training
 * - Training streak
 * - Warnings from feedback
 * - Intensity recommendation
 * - Collapsible details with score breakdown
 */
import { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Battery, 
  Calendar, 
  ChevronDown,
  Flame, 
  TrendingDown, 
  TrendingUp,
  Zap,
  Clock,
  Info,
  Check,
  Minus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useClientReadiness } from '@/hooks/useClientReadiness';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientReadinessCardProps {
  clientId: string;
}

export function ClientReadinessCard({ clientId }: ClientReadinessCardProps) {
  const { data, isLoading } = useClientReadiness(clientId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (!data) {
    return null;
  }

  const getReadinessColor = () => {
    switch (data.readinessLevel) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      case 'low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getReadinessBg = () => {
    switch (data.readinessLevel) {
      case 'high': return 'bg-success/10 border-success/30';
      case 'medium': return 'bg-warning/10 border-warning/30';
      case 'low': return 'bg-destructive/10 border-destructive/30';
      default: return 'bg-secondary/50 border-border';
    }
  };

  const getIntensityBadge = () => {
    switch (data.intensityRecommendation) {
      case 'increase':
        return <Badge className="bg-success/20 text-success border-success/30 gap-1"><TrendingUp className="w-3 h-3" />Zvýšit</Badge>;
      case 'reduce':
        return <Badge className="bg-warning/20 text-warning border-warning/30 gap-1"><TrendingDown className="w-3 h-3" />Snížit</Badge>;
      case 'deload':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1"><Battery className="w-3 h-3" />Deload</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Activity className="w-3 h-3" />Normální</Badge>;
    }
  };

  const getFeedbackValueColor = (value: number, isInverted = false) => {
    const threshold = isInverted ? 10 - value : value;
    if (threshold >= 7) return 'text-success';
    if (threshold >= 4) return 'text-warning';
    return 'text-destructive';
  };

  const renderValueBar = (value: number, max: number = 10) => {
    const filled = Math.round((value / max) * 10);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full',
              i < filled ? 'bg-current' : 'bg-muted'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn('rounded-2xl border transition-all', getReadinessBg())}>
        {/* Main content - always visible */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className={cn('w-5 h-5', getReadinessColor())} />
              <span className="font-semibold text-foreground">Připravenost</span>
            </div>
            {getIntensityBadge()}
          </div>

          {/* Main score */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-3xl font-bold', getReadinessColor())}>
                  {data.readinessScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress 
                value={data.readinessScore} 
                className="h-2"
              />
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Days since training */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className={cn(
                      'font-bold',
                      data.daysSinceLastTraining !== null && data.daysSinceLastTraining >= 7 
                        ? 'text-warning' 
                        : 'text-foreground'
                    )}>
                      {data.daysSinceLastTraining ?? '—'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">dní od tr.</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dní od posledního tréninku</p>
              </TooltipContent>
            </Tooltip>

            {/* Training streak */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-1">
                    <Flame className={cn(
                      'w-3 h-3',
                      data.trainingStreak >= 4 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                    <span className="font-bold text-foreground">
                      {data.trainingStreak}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">týdnů</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Týdnů v řadě s tréninkem</p>
              </TooltipContent>
            </Tooltip>

            {/* Adherence */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={cn(
                      'font-bold',
                      data.adherenceRate < 80 ? 'text-warning' : 'text-foreground'
                    )}>
                      {data.adherenceRate}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">docházka</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Docházka vs. minulý měsíc</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div className="space-y-1 mb-3">
              {data.warnings.map((warning, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-2 py-1 rounded"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Expand trigger */}
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              <Info className="w-3 h-3" />
              <span>{isExpanded ? 'Skrýt detail' : 'Jak to počítáme?'}</span>
              <ChevronDown className={cn(
                'w-3 h-3 transition-transform',
                isExpanded && 'rotate-180'
              )} />
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsible content */}
        <CollapsibleContent>
          <div className="border-t border-border/50 p-4 space-y-4">
            {/* Score breakdown */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                Výpočet skóre
              </h4>
              <div className="space-y-1.5 text-sm">
                {data.scoreBreakdown.map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {item.type === 'base' && <Minus className="w-3 h-3 text-muted-foreground" />}
                      {item.type === 'positive' && <Check className="w-3 h-3 text-success" />}
                      {item.type === 'negative' && <AlertTriangle className="w-3 h-3 text-destructive" />}
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className={cn(
                      'font-medium tabular-nums',
                      item.type === 'positive' && 'text-success',
                      item.type === 'negative' && 'text-destructive',
                      item.type === 'base' && 'text-foreground'
                    )}>
                      {item.type !== 'base' && item.value > 0 ? '+' : ''}{item.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                  <span className="font-medium text-foreground">Celkem</span>
                  <span className={cn('font-bold tabular-nums', getReadinessColor())}>
                    {data.readinessScore} bodů
                  </span>
                </div>
              </div>
            </div>

            {/* Last feedback details */}
            {data.lastFeedback && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Poslední zpětná vazba
                  <span className="text-xs text-muted-foreground font-normal">
                    ({format(new Date(data.lastFeedback.date), 'd. M. yyyy', { locale: cs })})
                  </span>
                </h4>
                <div className="space-y-2 text-sm">
                  {/* Pain */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bolest</span>
                    <div className={cn('flex items-center gap-2', getFeedbackValueColor(data.lastFeedback.pain, true))}>
                      {renderValueBar(data.lastFeedback.pain)}
                      <span className="font-medium tabular-nums w-8 text-right">{data.lastFeedback.pain}/10</span>
                    </div>
                  </div>
                  {/* Fatigue */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Únava</span>
                    <div className={cn('flex items-center gap-2', getFeedbackValueColor(data.lastFeedback.fatigue, true))}>
                      {renderValueBar(data.lastFeedback.fatigue)}
                      <span className="font-medium tabular-nums w-8 text-right">{data.lastFeedback.fatigue}/10</span>
                    </div>
                  </div>
                  {/* Soreness */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Svalovka</span>
                    <div className={cn('flex items-center gap-2', getFeedbackValueColor(data.lastFeedback.soreness, true))}>
                      {renderValueBar(data.lastFeedback.soreness)}
                      <span className="font-medium tabular-nums w-8 text-right">{data.lastFeedback.soreness}/10</span>
                    </div>
                  </div>
                  {/* Body feel */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pocit z těla</span>
                    <div className={cn('flex items-center gap-2', getFeedbackValueColor(data.lastFeedback.bodyFeel))}>
                      {renderValueBar(data.lastFeedback.bodyFeel)}
                      <span className="font-medium tabular-nums w-8 text-right">{data.lastFeedback.bodyFeel}/10</span>
                    </div>
                  </div>
                  {/* Red flag indicator */}
                  {data.lastFeedback.isRedFlag && (
                    <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-2 py-1 rounded mt-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs font-medium">Red flag zaznamenán</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!data.lastFeedback && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Zatím žádná zpětná vazba
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
