import { 
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Utensils,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useFeedbackEvaluation, type FeedbackStatus, type FeedbackTrend } from '@/hooks/useFeedbackEvaluation';
import { useNutritionEvaluation, type NutritionStatus, type NutritionTrend } from '@/hooks/useNutritionEvaluation';
import { STATUS_CONFIG, TREND_CONFIG, type Status, type Trend } from '@/lib/statusUtils';

interface ClientEvaluationBlockProps {
  clientId: string;
  onViewFeedback?: () => void;
  onViewNutrition?: () => void;
}

// Map evaluation status to unified status system
function mapFeedbackStatus(status: FeedbackStatus): Status {
  switch (status) {
    case 'ok': return 'ok';
    case 'fatigue': return 'warning';
    case 'overload': return 'error';
    default: return 'warning';
  }
}

function mapNutritionStatus(status: NutritionStatus | undefined): Status {
  switch (status) {
    case 'good': return 'ok';
    case 'moderate': return 'warning';
    case 'poor': return 'error';
    default: return 'warning';
  }
}

function mapTrend(trend: FeedbackTrend | NutritionTrend | undefined): Trend {
  switch (trend) {
    case 'improving': return 'improving';
    case 'declining': return 'declining';
    default: return 'stable';
  }
}

const TrendIcon = ({ trend }: { trend: Trend }) => {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;
  return <Icon className={cn('w-3.5 h-3.5', config.textClass)} />;
};

const StatusLabel = ({ status, label }: { status: Status; label: string }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('text-xs font-medium', config.textClass)}>
      {label}
    </span>
  );
};

export function ClientEvaluationBlock({ 
  clientId, 
  onViewFeedback, 
  onViewNutrition 
}: ClientEvaluationBlockProps) {
  const { evaluation: feedbackEval, isLoading: feedbackLoading } = useFeedbackEvaluation(clientId);
  const { data: nutritionEval, isLoading: nutritionLoading } = useNutritionEvaluation(clientId);

  if (feedbackLoading || nutritionLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const feedbackStatus = mapFeedbackStatus(feedbackEval.status);
  const feedbackTrend = mapTrend(feedbackEval.trend);
  const nutritionStatus = mapNutritionStatus(nutritionEval?.status);
  const nutritionTrend = mapTrend(nutritionEval?.trend);

  const feedbackConfig = STATUS_CONFIG[feedbackStatus];
  const nutritionConfig = STATUS_CONFIG[nutritionStatus];

  const statusLabels: Record<FeedbackStatus, string> = {
    ok: 'OK',
    fatigue: 'Únava',
    overload: 'Přetížení',
    unknown: '–',
  };

  const nutritionLabels: Record<NutritionStatus, string> = {
    good: 'OK',
    moderate: 'Kolísavé',
    poor: 'Problém',
    unknown: '–',
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Feedback Card */}
      <button
        onClick={onViewFeedback}
        className={cn(
          'p-4 rounded-xl text-left transition-all border-2 hover:scale-[1.02] active:scale-[0.98] touch-target',
          feedbackConfig.bgClass,
          feedbackConfig.borderClass,
          feedbackConfig.hoverBorderClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn('w-5 h-5', feedbackConfig.textClass)} />
            <span className="font-semibold text-sm">Feedback</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusLabel status={feedbackStatus} label={statusLabels[feedbackEval.status]} />
            <TrendIcon trend={feedbackTrend} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-2">
          {feedbackStatus === 'ok' && <CheckCircle className={cn('w-4 h-4', feedbackConfig.textClass)} />}
          {feedbackStatus === 'warning' && <AlertCircle className={cn('w-4 h-4', feedbackConfig.textClass)} />}
          {feedbackStatus === 'error' && <AlertTriangle className={cn('w-4 h-4', feedbackConfig.textClass)} />}
          <span className="text-sm font-medium">{feedbackEval.summary}</span>
        </div>

        {/* Metrics row */}
        {feedbackEval.hasRecent && (
          <div className="flex flex-wrap gap-2 mb-2">
            {feedbackEval.avgBodyFeel && (
              <Badge variant="secondary" className="text-xs">
                Pocit: {feedbackEval.avgBodyFeel.toFixed(1)}
              </Badge>
            )}
            {feedbackEval.avgEnergy && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {feedbackEval.avgEnergy.toFixed(1)}
              </Badge>
            )}
            {feedbackEval.avgPain && feedbackEval.avgPain > 1 && (
              <Badge variant="secondary" className={cn(
                'text-xs',
                feedbackEval.avgPain >= 6 && 'bg-destructive/20 text-destructive'
              )}>
                Bolest: {feedbackEval.avgPain.toFixed(1)}
              </Badge>
            )}
          </div>
        )}

        {/* Warning signals */}
        {feedbackEval.warningSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {feedbackEval.warningSignals.slice(0, 2).map((signal, i) => (
              <span key={i} className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {signal}
              </span>
            ))}
          </div>
        )}

        {/* Last feedback date */}
        {feedbackEval.lastFeedbackDate && (
          <p className="text-xs text-muted-foreground mt-2">
            Poslední: {format(new Date(feedbackEval.lastFeedbackDate), 'd.M.yyyy', { locale: cs })}
          </p>
        )}
      </button>

      {/* Nutrition Card */}
      <button
        onClick={onViewNutrition}
        className={cn(
          'p-4 rounded-xl text-left transition-all border-2 hover:scale-[1.02] active:scale-[0.98] touch-target',
          nutritionConfig.bgClass,
          nutritionConfig.borderClass,
          nutritionConfig.hoverBorderClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils className={cn('w-5 h-5', nutritionConfig.textClass)} />
            <span className="font-semibold text-sm">Strava</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusLabel status={nutritionStatus} label={nutritionLabels[nutritionEval?.status || 'unknown']} />
            <TrendIcon trend={nutritionTrend} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-2">
          {nutritionStatus === 'ok' && <CheckCircle className={cn('w-4 h-4', nutritionConfig.textClass)} />}
          {nutritionStatus === 'warning' && <AlertCircle className={cn('w-4 h-4', nutritionConfig.textClass)} />}
          {nutritionStatus === 'error' && <AlertTriangle className={cn('w-4 h-4', nutritionConfig.textClass)} />}
          <span className="text-sm font-medium">{nutritionEval?.summary || 'Zatím žádné záznamy'}</span>
        </div>

        {/* Metrics row */}
        {nutritionEval && nutritionEval.entriesCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              Pravidelnost: {nutritionEval.regularityScore}%
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Kvalita: {nutritionEval.qualityScore}%
            </Badge>
            <Badge variant="secondary" className={cn(
              'text-xs',
              nutritionEval.hydrationScore < 50 && 'bg-[hsl(38_92%_50%/0.2)] text-[hsl(38_92%_50%)]'
            )}>
              Hydratace: {nutritionEval.hydrationScore}%
            </Badge>
          </div>
        )}

        {/* Warning signals */}
        {nutritionEval && nutritionEval.warningSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {nutritionEval.warningSignals.slice(0, 2).map((signal, i) => (
              <span key={i} className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {signal}
              </span>
            ))}
          </div>
        )}

        {/* Active session indicator */}
        {nutritionEval?.hasActive && (
          <p className={cn('text-xs mt-2 flex items-center gap-1', STATUS_CONFIG.ok.textClass)}>
            <span className="w-2 h-2 rounded-full bg-[hsl(142_76%_36%)] animate-pulse" />
            Aktivní sezení
          </p>
        )}
        {nutritionEval?.sessionEndDate && !nutritionEval.hasActive && (
          <p className="text-xs text-muted-foreground mt-2">
            Ukončeno: {format(new Date(nutritionEval.sessionEndDate), 'd.M.yyyy', { locale: cs })}
          </p>
        )}
      </button>
    </div>
  );
}
