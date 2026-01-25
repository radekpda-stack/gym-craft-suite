/**
 * SimplifiedCoachingProfile
 * 
 * Human-readable coaching insights for trainers.
 * Shows status-based interpretations instead of raw numbers.
 */

import { useState } from 'react';
import { Target, Lightbulb, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  interpretSessionFit,
  interpretPain,
  interpretReadiness,
  interpretIntensity,
  SIMPLE_METRIC_LABELS,
  MetricInterpretation,
} from '@/lib/feedbackCalculations';
import { getCoachSuggestions, LIMITING_FACTOR_LABELS, type FeedbackData } from '@/lib/coachSuggestions';

interface MetricRowProps {
  label: string;
  interpretation: MetricInterpretation | null;
  rawValue?: number | null;
  showRaw?: boolean;
}

function MetricRow({ label, interpretation, rawValue, showRaw = true }: MetricRowProps) {
  if (!interpretation) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">Málo dat</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn('text-sm font-medium', interpretation.colorClass)}>
          {interpretation.emoji} {interpretation.label}
        </span>
        {showRaw && rawValue != null && (
          <span className="text-xs text-muted-foreground ml-2">
            ({rawValue.toFixed(1)}/10)
          </span>
        )}
      </div>
    </div>
  );
}

interface SimplifiedCoachingProfileProps {
  metrics: {
    sessionFit: number | null;
    pain: number | null;
    readiness: number | null;
    rpe: number | null;
  };
  limitingFactor?: { factor: string; count: number } | null;
  enjoymentAvg?: number | null;
  totalFeedback: number;
  feedbackData?: FeedbackData;
  onShowDetails?: () => void;
  children?: React.ReactNode;
}

export function SimplifiedCoachingProfile({
  metrics,
  limitingFactor,
  enjoymentAvg,
  totalFeedback,
  feedbackData,
  onShowDetails,
  children,
}: SimplifiedCoachingProfileProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Interpret all metrics
  const sessionFitStatus = interpretSessionFit(metrics.sessionFit);
  const painStatus = interpretPain(metrics.pain);
  const readinessStatus = interpretReadiness(metrics.readiness);
  const intensityStatus = interpretIntensity(metrics.rpe);

  // Get coach suggestions if we have feedback data
  const suggestions = feedbackData 
    ? getCoachSuggestions(feedbackData) 
    : [];

  // Generate default tip based on metrics
  const getDefaultTip = () => {
    if (!sessionFitStatus && !painStatus) {
      return null;
    }

    // If everything is good
    if (sessionFitStatus?.status === 'excellent' && 
        (!painStatus || painStatus.status === 'excellent')) {
      return {
        type: 'success' as const,
        message: 'Pokračuj stejným stylem',
        detail: 'Trénink mu sedí a bolest je minimální.',
      };
    }

    // If pain is concerning
    if (painStatus?.status === 'poor' || painStatus?.status === 'fair') {
      return {
        type: 'warning' as const,
        message: 'Sleduj bolest',
        detail: 'Vyšší bolest po trénincích - zvaž intenzitu.',
      };
    }

    // If session fit is low
    if (sessionFitStatus?.status === 'poor' || sessionFitStatus?.status === 'fair') {
      return {
        type: 'warning' as const,
        message: 'Uprav tréninkový plán',
        detail: 'Trénink neodpovídá očekáváním klienta.',
      };
    }

    return {
      type: 'info' as const,
      message: 'Sleduj trendy',
      detail: 'Data zatím OK, sleduj vývoj.',
    };
  };

  const defaultTip = getDefaultTip();
  const displayTip = suggestions.length > 0 ? suggestions[0] : null;

  return (
    <Card className="glass">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Jak na klienta
          </h4>
          {onShowDetails && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1"
              onClick={onShowDetails}
            >
              <BarChart3 className="w-3 h-3" />
              Detaily
            </Button>
          )}
        </div>

        {/* Simplified Metrics */}
        <div className="divide-y divide-border">
          <MetricRow
            label={SIMPLE_METRIC_LABELS.sessionFit}
            interpretation={sessionFitStatus}
            rawValue={metrics.sessionFit}
          />
          <MetricRow
            label={SIMPLE_METRIC_LABELS.pain}
            interpretation={painStatus}
            rawValue={metrics.pain}
          />
          <MetricRow
            label={SIMPLE_METRIC_LABELS.readiness}
            interpretation={readinessStatus}
            rawValue={metrics.readiness}
          />
          <MetricRow
            label={SIMPLE_METRIC_LABELS.intensity}
            interpretation={intensityStatus}
            rawValue={metrics.rpe}
          />
          
          {/* Limiting Factor */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">{SIMPLE_METRIC_LABELS.limitingFactor}</span>
            <div className="text-right">
              {limitingFactor ? (
                <Badge variant="secondary" className="text-xs">
                  {LIMITING_FACTOR_LABELS[limitingFactor.factor] || limitingFactor.factor}
                  <span className="ml-1 opacity-70">({limitingFactor.count}×)</span>
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Málo dat</span>
              )}
            </div>
          </div>

          {/* Enjoyment */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">{SIMPLE_METRIC_LABELS.enjoyment}</span>
            <div className="text-right">
              {enjoymentAvg != null && !isNaN(enjoymentAvg) ? (
                <span className={cn(
                  'text-sm font-medium',
                  enjoymentAvg >= 7 ? 'text-success' : 
                  enjoymentAvg >= 5 ? 'text-warning' : 'text-destructive'
                )}>
                  {enjoymentAvg >= 7 ? '🟢' : enjoymentAvg >= 5 ? '🟡' : '🔴'} 
                  {enjoymentAvg >= 7 ? ' Ano' : enjoymentAvg >= 5 ? ' Celkem' : ' Ne moc'}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({enjoymentAvg.toFixed(1)}/10)
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Málo dat</span>
              )}
            </div>
          </div>
        </div>

        {/* Tip Section */}
        {(displayTip || defaultTip) && (
          <div className={cn(
            'mt-4 p-3 rounded-lg border',
            displayTip?.priority === 'high' 
              ? 'bg-destructive/5 border-destructive/20' 
              : 'bg-primary/5 border-primary/20'
          )}>
            <div className="flex items-start gap-2">
              <Lightbulb className={cn(
                'w-4 h-4 mt-0.5 shrink-0',
                displayTip?.priority === 'high' ? 'text-destructive' : 'text-primary'
              )} />
              <div className="text-sm">
                <span className="font-medium">
                  {displayTip ? displayTip.message : defaultTip?.message}
                </span>
                {defaultTip?.detail && !displayTip && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {defaultTip.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with feedback count */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Na základě {totalFeedback} {totalFeedback === 1 ? 'feedbacku' : 
              totalFeedback < 5 ? 'feedbacků' : 'feedbacků'}
          </p>
        </div>

        {/* Optional Details Toggle */}
        {children && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-1 text-xs">
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? 'Skrýt grafy' : 'Zobrazit grafy'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              {children}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
