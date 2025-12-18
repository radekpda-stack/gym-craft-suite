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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';

interface FeedbackDetailDialogProps {
  feedback: TrainingFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  trainingDate?: string;
}

const PAIN_AREA_LABELS: Record<string, string> = {
  knee: 'Koleno',
  back: 'Záda',
  shoulder: 'Rameno',
  hip: 'Kyčel',
  ankle: 'Kotník',
  wrist: 'Zápěstí',
  neck: 'Krk',
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
      // Higher = worse (e.g., pain)
      if (percentage <= 30) return 'bg-green-500';
      if (percentage <= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    } else {
      // Higher = better (e.g., fun)
      if (percentage >= 70) return 'bg-green-500';
      if (percentage >= 40) return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </div>
        <span className={cn('text-lg font-bold', getColor().replace('bg-', 'text-'))}>
          {value}/{max}
        </span>
      </div>
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn('absolute h-full rounded-full transition-all', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Zpětná vazba - Detail
          </DialogTitle>
        </DialogHeader>

        {!feedback ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
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
            {feedback.is_red_flag && (
              <Badge className="bg-red-500/20 text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Red Flag
              </Badge>
            )}
          </div>

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
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Hodnocení (D+1)
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
                label="Celkový pocit v těle"
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
                label="Obtížnost tréninku"
                value={feedback.difficulty}
                icon={Dumbbell}
                lowLabel="Lehký"
                highLabel="Velmi těžký"
              />

              <ScaleBar
                label="Jak moc to bavilo"
                value={feedback.fun}
                icon={Smile}
                lowLabel="Vůbec"
                highLabel="Maximálně"
              />
            </div>
          )}

          {/* Pain Area */}
          {feedback.pain && feedback.pain >= 4 && feedback.pain_area && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm font-medium text-orange-700">
                Místo bolesti: {PAIN_AREA_LABELS[feedback.pain_area] || feedback.pain_area}
                {feedback.pain_area === 'other' && feedback.pain_area_other && (
                  <span className="font-normal"> - {feedback.pain_area_other}</span>
                )}
              </p>
            </div>
          )}

          {/* Legacy Feedback Fields (if not D+1) */}
          {!isD1Feedback && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Hodnocení
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">RPE</p>
                  <p className="text-2xl font-bold">{feedback.rpe_rating}/10</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Únava</p>
                  <p className="text-2xl font-bold">{feedback.fatigue_level}/5</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Nálada</p>
                  <p className="text-2xl font-bold">{feedback.mood_rating}/5</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Technika</p>
                  <p className="text-2xl font-bold">{feedback.technique_rating}/5</p>
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
                <p className="text-lg font-semibold">
                  {feedback.energy_level === 'stable' && 'Stabilní'}
                  {feedback.energy_level === 'better_end' && 'Lepší ke konci'}
                  {feedback.energy_level === 'low_entire' && 'Nízká celý trénink'}
                  {feedback.energy_level === 'good_start_only' && 'Dobrá jen na začátku'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Relevance k cílům</p>
                <p className="text-lg font-semibold">
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
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Poznámka od klienta
              </h4>
              <div className="p-3 rounded-lg bg-secondary/50 border">
                <p className="text-sm whitespace-pre-wrap">{feedback.comment}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
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
