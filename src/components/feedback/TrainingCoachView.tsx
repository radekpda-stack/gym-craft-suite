/**
 * TrainingCoachView
 * 
 * Coach-focused feedback summary for training detail view.
 * Shows core metrics, rule-based suggestions, and action CTAs.
 */

import { useMemo } from 'react';
import { 
  Activity, 
  Target, 
  Zap, 
  Heart, 
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  StickyNote,
  Tag,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  formatMetric, 
  calculateSessionLoad 
} from '@/lib/feedbackCalculations';
import { 
  getCoachSuggestions, 
  LIMITING_FACTOR_LABELS,
  CoachSuggestion,
} from '@/lib/coachSuggestions';
import { 
  evaluateFeedback, 
  hasHighSeverityFlag, 
  getRedFlagReasons 
} from '@/lib/redFlagRules';

interface TrainingFeedbackData {
  rpe_rating?: number | null;
  session_fit?: number | null;
  pain?: number | null;
  pain_areas?: string[] | null;
  limiting_factor?: string | null;
  doms_level?: number | null;
  readiness_level?: number | null;
  enjoyment_level?: number | null;
  note?: string | null;
  body_feel?: number | null;
  energy?: number | null;
}

interface TrainingData {
  duration_minutes?: number | null;
  trainer_internal_note?: string | null;
}

interface TrainingCoachViewProps {
  feedback: TrainingFeedbackData;
  training: TrainingData;
  historicalLoads?: (number | null | undefined)[];
  onSaveNote?: (note: string) => void;
  onMarkRisk?: () => void;
  onRequestMorningAfter?: () => void;
  hasMorningAfter?: boolean;
  isLoading?: boolean;
}

const MetricBadge = ({ 
  label, 
  value, 
  max = 10,
  inverted = false,
  icon: Icon,
}: { 
  label: string;
  value: number | null | undefined;
  max?: number;
  inverted?: boolean;
  icon?: typeof Activity;
}) => {
  const getColor = () => {
    if (value == null) return 'bg-muted text-muted-foreground';
    
    const ratio = value / max;
    
    if (inverted) {
      // For pain: low is good, high is bad
      if (ratio >= 0.7) return 'bg-destructive/20 text-destructive';
      if (ratio >= 0.5) return 'bg-warning/20 text-warning';
      return 'bg-success/20 text-success';
    } else {
      // For positive metrics: high is good
      if (ratio >= 0.7) return 'bg-success/20 text-success';
      if (ratio >= 0.4) return 'bg-warning/20 text-warning';
      return 'bg-destructive/20 text-destructive';
    }
  };

  return (
    <div className={cn(
      'flex flex-col items-center p-3 rounded-xl',
      getColor()
    )}>
      {Icon && <Icon className="w-4 h-4 mb-1 opacity-70" />}
      <span className="text-2xl font-bold">
        {value != null ? value : '—'}
      </span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
};

const SuggestionCard = ({ suggestion }: { suggestion: CoachSuggestion }) => {
  const priorityColors = {
    high: 'border-destructive/50 bg-destructive/5',
    medium: 'border-warning/50 bg-warning/5',
    low: 'border-primary/50 bg-primary/5',
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      priorityColors[suggestion.priority]
    )}>
      <Lightbulb className={cn(
        'w-4 h-4 mt-0.5 shrink-0',
        suggestion.priority === 'high' ? 'text-destructive' :
        suggestion.priority === 'medium' ? 'text-warning' : 'text-primary'
      )} />
      <p className="text-sm">{suggestion.message}</p>
    </div>
  );
};

export function TrainingCoachView({
  feedback,
  training,
  historicalLoads,
  onSaveNote,
  onMarkRisk,
  onRequestMorningAfter,
  hasMorningAfter = false,
  isLoading = false,
}: TrainingCoachViewProps) {
  // Calculate session load
  const sessionLoad = useMemo(() => {
    return calculateSessionLoad(
      feedback.rpe_rating,
      training.duration_minutes
    );
  }, [feedback.rpe_rating, training.duration_minutes]);

  // Get coach suggestions
  const suggestions = useMemo(() => {
    return getCoachSuggestions(
      {
        rpe_rating: feedback.rpe_rating,
        session_fit: feedback.session_fit,
        pain: feedback.pain,
        pain_areas: feedback.pain_areas,
        limiting_factor: feedback.limiting_factor,
        doms_level: feedback.doms_level,
        readiness_level: feedback.readiness_level,
      },
      { duration_minutes: training.duration_minutes },
      historicalLoads
    );
  }, [feedback, training, historicalLoads]);

  // Evaluate red flags
  const redFlagResults = useMemo(() => {
    return evaluateFeedback(
      {
        pain: feedback.pain,
        body_feel: feedback.body_feel,
        energy: feedback.energy,
        rpe_rating: feedback.rpe_rating,
        session_fit: feedback.session_fit,
        doms_level: feedback.doms_level,
        readiness_level: feedback.readiness_level,
        pain_areas: feedback.pain_areas,
      },
      undefined,
      historicalLoads,
      training.duration_minutes ?? undefined
    );
  }, [feedback, training, historicalLoads]);

  const hasRedFlags = hasHighSeverityFlag(redFlagResults);
  const redFlagReasons = getRedFlagReasons(redFlagResults);

  return (
    <Card className={cn(
      'glass overflow-hidden',
      hasRedFlags && 'ring-2 ring-destructive/50'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Feedback Summary
          </CardTitle>
          {hasRedFlags && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Red Flag
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-4 gap-2">
          <MetricBadge
            label="Session Fit"
            value={feedback.session_fit}
            icon={Target}
          />
          <MetricBadge
            label="RPE"
            value={feedback.rpe_rating}
            icon={Zap}
          />
          <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/30">
            <Zap className="w-4 h-4 mb-1 opacity-70" />
            <span className="text-2xl font-bold">
              {sessionLoad != null ? sessionLoad : '—'}
            </span>
            <span className="text-xs opacity-70">Load (AU)</span>
          </div>
          <MetricBadge
            label="Bolest"
            value={feedback.pain}
            inverted
            icon={Heart}
          />
        </div>

        {/* Pain Areas & Limiting Factor */}
        <div className="flex flex-wrap gap-2">
          {feedback.pain_areas && feedback.pain_areas.length > 0 && (
            feedback.pain_areas.map(area => (
              <Badge key={area} variant="outline" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                {area}
              </Badge>
            ))
          )}
          {feedback.limiting_factor && (
            <Badge variant="secondary" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              {LIMITING_FACTOR_LABELS[feedback.limiting_factor] || feedback.limiting_factor}
            </Badge>
          )}
        </div>

        {/* Morning After Metrics (if available) */}
        {(feedback.doms_level != null || feedback.readiness_level != null) && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Následující den
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MetricBadge
                  label="DOMS"
                  value={feedback.doms_level}
                  inverted
                />
                <MetricBadge
                  label="Připravenost"
                  value={feedback.readiness_level}
                />
              </div>
            </div>
          </>
        )}

        {/* Coach Suggestions */}
        {suggestions.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Lightbulb className="w-4 h-4 text-primary" />
                Doporučení pro trenéra
              </p>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Client Note */}
        {feedback.note && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Poznámka klienta
              </p>
              <p className="text-sm bg-secondary/30 p-3 rounded-lg">
                {feedback.note}
              </p>
            </div>
          </>
        )}

        {/* Trainer Internal Note */}
        <Separator />
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            Interní poznámka trenéra
          </p>
          <Textarea
            placeholder="Poznámka k tréninku (viditelná pouze pro trenéra)..."
            defaultValue={training.trainer_internal_note || ''}
            className="min-h-[60px] text-sm"
            onBlur={(e) => onSaveNote?.(e.target.value)}
          />
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!hasMorningAfter && onRequestMorningAfter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestMorningAfter}
              disabled={isLoading}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Morning-after
            </Button>
          )}
          {onMarkRisk && (
            <Button
              variant={hasRedFlags ? 'destructive' : 'outline'}
              size="sm"
              onClick={onMarkRisk}
              disabled={isLoading}
            >
              <Tag className="w-4 h-4 mr-1" />
              {hasRedFlags ? 'Riziko označeno' : 'Označit riziko'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}