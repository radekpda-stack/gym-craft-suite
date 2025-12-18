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

interface ClientEvaluationBlockProps {
  clientId: string;
  onViewFeedback?: () => void;
  onViewNutrition?: () => void;
}

const STATUS_CONFIG: Record<FeedbackStatus | NutritionStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  ok: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10 border-green-500/30' 
  },
  good: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10 border-green-500/30' 
  },
  fatigue: { 
    icon: <AlertCircle className="w-4 h-4" />, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10 border-orange-500/30' 
  },
  moderate: { 
    icon: <AlertCircle className="w-4 h-4" />, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10 border-orange-500/30' 
  },
  overload: { 
    icon: <AlertTriangle className="w-4 h-4" />, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/30' 
  },
  poor: { 
    icon: <AlertTriangle className="w-4 h-4" />, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/30' 
  },
  unknown: { 
    icon: <Minus className="w-4 h-4" />, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-secondary/50 border-border' 
  },
};

const TrendIcon = ({ trend }: { trend: FeedbackTrend | NutritionTrend }) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
    case 'declining':
      return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    default:
      return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  }
};

const StatusLabel = ({ status }: { status: FeedbackStatus | NutritionStatus }) => {
  const labels: Record<string, string> = {
    ok: 'OK',
    good: 'OK',
    fatigue: 'Únava',
    moderate: 'Kolísavé',
    overload: 'Přetížení',
    poor: 'Problém',
    unknown: '–',
  };
  
  const config = STATUS_CONFIG[status];
  
  return (
    <span className={cn('text-xs font-medium', config.color)}>
      {labels[status]}
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

  const feedbackConfig = STATUS_CONFIG[feedbackEval.status];
  const nutritionConfig = STATUS_CONFIG[nutritionEval?.status || 'unknown'];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Feedback Card */}
      <button
        onClick={onViewFeedback}
        className={cn(
          'p-4 rounded-xl text-left transition-all border hover:scale-[1.02]',
          feedbackConfig.bgColor
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn('w-5 h-5', feedbackConfig.color)} />
            <span className="font-semibold text-sm">Feedback</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusLabel status={feedbackEval.status} />
            <TrendIcon trend={feedbackEval.trend} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className={feedbackConfig.color}>{feedbackConfig.icon}</span>
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
          'p-4 rounded-xl text-left transition-all border hover:scale-[1.02]',
          nutritionConfig.bgColor
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils className={cn('w-5 h-5', nutritionConfig.color)} />
            <span className="font-semibold text-sm">Strava</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusLabel status={nutritionEval?.status || 'unknown'} />
            <TrendIcon trend={nutritionEval?.trend || 'unknown'} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className={nutritionConfig.color}>{nutritionConfig.icon}</span>
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
              nutritionEval.hydrationScore < 50 && 'bg-orange-500/20 text-orange-600'
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
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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
