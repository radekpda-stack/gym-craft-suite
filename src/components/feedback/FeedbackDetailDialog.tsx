import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  AlertTriangle,
  Activity,
  Brain,
  Zap,
  Target,
  Dumbbell,
  Smile,
  MessageSquare,
  Moon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackRecommendation } from '@/hooks/useFeedbackRecommendation';
import { FeedbackRecommendationBadge } from './FeedbackRecommendationBadge';

interface FeedbackDetailDialogProps {
  feedback: TrainingFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  trainingDate?: string;
}

const PAIN_AREA_LABELS: Record<string, string> = {
  knee: 'Koleno',
  knee_left: 'Koleno (L)',
  knee_right: 'Koleno (P)',
  back: 'Záda',
  shoulder: 'Rameno',
  shoulder_left: 'Rameno (L)',
  shoulder_right: 'Rameno (P)',
  hip: 'Kyčel',
  hip_left: 'Kyčel (L)',
  hip_right: 'Kyčel (P)',
  ankle: 'Kotník',
  ankle_left: 'Kotník (L)',
  ankle_right: 'Kotník (P)',
  wrist: 'Zápěstí',
  wrist_left: 'Zápěstí (L)',
  wrist_right: 'Zápěstí (P)',
  neck: 'Krk',
  muscle: 'Svaly',
  other: 'Jiné',
};

function ScaleBar({
  label,
  value,
  max = 10,
  icon: Icon,
  lowLabel,
  highLabel,
  invertColor = false,
}: {
  label: string;
  value: number | null;
  max?: number;
  icon: React.ElementType;
  lowLabel: string;
  highLabel: string;
  invertColor?: boolean;
}) {
  if (value === null) return null;

  const percentage = (value / max) * 100;
  const getColor = () => {
    if (invertColor) {
      if (percentage <= 30) return 'bg-green-500';
      if (percentage <= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    } else {
      if (percentage >= 70) return 'bg-green-500';
      if (percentage >= 40) return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </div>
        <span className={cn('text-sm font-semibold', getColor().replace('bg-', 'text-'))}>
          {value}/{max}
        </span>
      </div>
      <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn('absolute h-full rounded-full transition-all', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
  clientName,
  trainingDate,
}: FeedbackDetailDialogProps) {
  const isD1Feedback = feedback?.soreness !== null || feedback?.body_feel !== null;
  
  // Calculate recommendation
  const recommendation = useFeedbackRecommendation(feedback ? {
    pain: feedback.pain,
    pain_type: (feedback as any).pain_type,
    energy_rating: feedback.energy_rating,
    body_feel: feedback.body_feel,
    soreness: feedback.soreness,
    difficulty: feedback.difficulty,
    sleep_after: (feedback as any).sleep_after,
    is_red_flag: feedback.is_red_flag,
  } : null);

  // Parse pain area intensities
  const painAreaIntensities = feedback?.pain_area_intensities as Record<string, number | { intensity: number; isNew?: boolean }> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Zpětná vazba
          </DialogTitle>
        </DialogHeader>

        {!feedback ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Info */}
            <div className="flex flex-wrap gap-2">
              {clientName && (
                <Badge variant="secondary">{clientName}</Badge>
              )}
              {trainingDate && (
                <Badge variant="outline">
                  {format(new Date(trainingDate), 'd.M.yyyy HH:mm', { locale: cs })}
                </Badge>
              )}
            </div>

            {/* Recommendation Badge - Top Priority */}
            {recommendation && (
              <FeedbackRecommendationBadge 
                recommendation={recommendation} 
                showReasons={true}
                size="md"
              />
            )}

            {/* Red Flag Reasons */}
            {feedback.is_red_flag && feedback.red_flag_reasons && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm font-medium text-red-700 mb-1">Důvody upozornění:</p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {feedback.red_flag_reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* D+1 Feedback Scales */}
            {isD1Feedback && (
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Hodnocení
                </h4>

                <ScaleBar
                  label="Svalovka"
                  value={feedback.soreness}
                  icon={Activity}
                  lowLabel="Žádná"
                  highLabel="Extrémní"
                  invertColor
                />

                <ScaleBar
                  label="Pocit v těle"
                  value={feedback.body_feel}
                  icon={Brain}
                  lowLabel="Špatně"
                  highLabel="Výborně"
                />

                <ScaleBar
                  label="Energie"
                  value={feedback.energy_rating}
                  icon={Zap}
                  lowLabel="Vyčerpaný"
                  highLabel="Plný energie"
                />

                <ScaleBar
                  label="Bolest"
                  value={feedback.pain}
                  icon={AlertTriangle}
                  lowLabel="Žádná"
                  highLabel="Silná"
                  invertColor
                />

                <ScaleBar
                  label="Jak sedl trénink"
                  value={feedback.session_fit}
                  icon={Target}
                  lowLabel="Vůbec"
                  highLabel="Perfektně"
                />

                <ScaleBar
                  label="Obtížnost"
                  value={feedback.difficulty}
                  icon={Dumbbell}
                  lowLabel="Lehký"
                  highLabel="Velmi těžký"
                />

                <ScaleBar
                  label="Zábava"
                  value={feedback.fun}
                  icon={Smile}
                  lowLabel="Vůbec"
                  highLabel="Maximálně"
                />
              </div>
            )}

            {/* Sleep After */}
            {(feedback as any).sleep_after && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Spánek po tréninku:</span>
                <Badge variant={
                  (feedback as any).sleep_after === 'poor' ? 'destructive' :
                  (feedback as any).sleep_after === 'average' ? 'secondary' : 'default'
                }>
                  {(feedback as any).sleep_after === 'poor' ? 'Špatný' :
                   (feedback as any).sleep_after === 'average' ? 'Průměrný' : 'Dobrý'}
                </Badge>
              </div>
            )}

            {/* Pain Details */}
            {feedback.pain && feedback.pain >= 4 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Detail bolesti
                </h4>
                
                {/* Pain Type */}
                {(feedback as any).pain_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Typ:</span>
                    <Badge variant={(feedback as any).pain_type === 'joint' ? 'destructive' : 'secondary'}>
                      {(feedback as any).pain_type === 'muscle' ? '💪 Svalová/únava' : '🦴 Kloub/šlacha'}
                    </Badge>
                  </div>
                )}

                {/* Pain Areas with Intensities */}
                {painAreaIntensities && Object.keys(painAreaIntensities).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(painAreaIntensities).map(([area, data]) => {
                      const intensity = typeof data === 'number' ? data : data.intensity;
                      const isNew = typeof data === 'object' ? data.isNew : undefined;
                      const areaLabel = PAIN_AREA_LABELS[area] || area;
                      
                      return (
                        <div 
                          key={area}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border",
                            intensity >= 7 ? "bg-red-500/10 border-red-500/30" :
                            intensity >= 4 ? "bg-orange-500/10 border-orange-500/30" :
                            "bg-yellow-500/10 border-yellow-500/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{areaLabel}</span>
                            {isNew !== undefined && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5 py-0",
                                isNew ? "border-orange-500 text-orange-600" : "border-blue-500 text-blue-600"
                              )}>
                                {isNew ? 'Nová' : 'Známá'}
                              </Badge>
                            )}
                          </div>
                          <span className={cn(
                            "text-sm font-bold",
                            intensity >= 7 ? "text-red-600" :
                            intensity >= 4 ? "text-orange-600" :
                            "text-yellow-600"
                          )}>
                            {intensity}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Other pain area description */}
                {feedback.pain_area === 'other' && feedback.pain_area_other && (
                  <p className="text-sm text-muted-foreground">
                    Další: {feedback.pain_area_other}
                  </p>
                )}
              </div>
            )}

            {/* Legacy Feedback Fields (if not D+1) */}
            {!isD1Feedback && (
              <div className="space-y-4">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Hodnocení
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">RPE</p>
                    <p className="text-xl font-bold">{feedback.rpe_rating}/10</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Únava</p>
                    <p className="text-xl font-bold">{feedback.fatigue_level}/5</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Nálada</p>
                    <p className="text-xl font-bold">{feedback.mood_rating}/5</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Technika</p>
                    <p className="text-xl font-bold">{feedback.technique_rating}/5</p>
                  </div>
                </div>

                {feedback.sleep_hours && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Spánek</p>
                    <p className="text-lg font-semibold">
                      {feedback.sleep_hours} hodin
                      {feedback.sleep_quality && ` (kvalita: ${feedback.sleep_quality}/5)`}
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Energie během tréninku</p>
                  <p className="text-sm font-medium">
                    {feedback.energy_level === 'stable' && 'Stabilní'}
                    {feedback.energy_level === 'better_end' && 'Lepší ke konci'}
                    {feedback.energy_level === 'low_entire' && 'Nízká celý trénink'}
                    {feedback.energy_level === 'good_start_only' && 'Dobrá jen na začátku'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Relevance k cílům</p>
                  <p className="text-sm font-medium">
                    {feedback.goal_relevance === 'yes' && '✅ Ano'}
                    {feedback.goal_relevance === 'partially' && '⚠️ Částečně'}
                    {feedback.goal_relevance === 'no' && '❌ Ne'}
                  </p>
                </div>
              </div>
            )}

            {/* Comment */}
            {feedback.comment && (
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Poznámka
                </h4>
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <p className="text-sm whitespace-pre-wrap">{feedback.comment}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-3 border-t text-[10px] text-muted-foreground space-y-0.5">
              <p>
                Vyplněno: {format(new Date(feedback.created_at), 'd.M.yyyy HH:mm', { locale: cs })}
              </p>
              <p>
                Zdroj: {feedback.source === 'link' ? 'Veřejný odkaz' : feedback.source === 'email' ? 'E-mail' : 'Manuální'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
