import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Brain,
  Zap,
  AlertTriangle,
  Smile,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { FeedbackDetailDialog } from './FeedbackDetailDialog';

interface FeedbackSummaryCardProps {
  feedback: TrainingFeedback;
  clientName?: string;
  trainingDate?: string;
}

function MetricBadge({
  label,
  value,
  max = 10,
  icon: Icon,
  invertColor = false,
}: {
  label: string;
  value: number | null;
  max?: number;
  icon: React.ElementType;
  invertColor?: boolean;
}) {
  if (value === null) return null;

  const percentage = (value / max) * 100;
  const getColorClass = () => {
    if (invertColor) {
      if (percentage <= 30) return 'bg-green-500/20 text-green-600 border-green-500/30';
      if (percentage <= 60) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      return 'bg-red-500/20 text-red-600 border-red-500/30';
    } else {
      if (percentage >= 70) return 'bg-green-500/20 text-green-600 border-green-500/30';
      if (percentage >= 40) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      return 'bg-red-500/20 text-red-600 border-red-500/30';
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium', getColorClass())}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      <span className="font-bold">{value}/{max}</span>
    </div>
  );
}

export function FeedbackSummaryCard({
  feedback,
  clientName,
  trainingDate,
}: FeedbackSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const isD1Feedback = feedback.soreness !== null || feedback.body_feel !== null;

  return (
    <>
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
              Feedback vyplněn
            </Badge>
            {feedback.is_red_flag && (
              <Badge className="bg-red-500/20 text-red-600 border-red-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Red Flag
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailDialog(true)}
              className="h-7 text-xs gap-1"
            >
              <Eye className="w-3 h-3" />
              Detail
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Metrics - Always visible */}
        {isD1Feedback && (
          <div className="flex flex-wrap gap-2">
            <MetricBadge
              label="Svalovka"
              value={feedback.soreness}
              icon={Activity}
              invertColor
            />
            <MetricBadge
              label="Pocit"
              value={feedback.body_feel}
              icon={Brain}
            />
            <MetricBadge
              label="Energie"
              value={feedback.energy_rating}
              icon={Zap}
            />
            {feedback.pain && feedback.pain >= 4 && (
              <MetricBadge
                label="Bolest"
                value={feedback.pain}
                icon={AlertTriangle}
                invertColor
              />
            )}
            <MetricBadge
              label="Zábava"
              value={feedback.fun}
              icon={Smile}
            />
          </div>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="pt-2 border-t border-green-500/20 space-y-2">
            {/* Red Flag Reasons */}
            {feedback.is_red_flag && feedback.red_flag_reasons && (
              <div className="p-2 rounded bg-red-500/10 text-sm">
                <p className="font-medium text-red-600 mb-1">Důvody upozornění:</p>
                <ul className="text-red-600/80 list-disc list-inside text-xs">
                  {feedback.red_flag_reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pain Area */}
            {feedback.pain && feedback.pain >= 4 && feedback.pain_area && (
              <p className="text-sm text-orange-600">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Bolest: {feedback.pain_area}
                {feedback.pain_area_other && ` - ${feedback.pain_area_other}`}
              </p>
            )}

            {/* Comment */}
            {feedback.comment && (
              <div className="p-2 rounded bg-secondary/50 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Poznámka klienta:</p>
                <p className="text-foreground whitespace-pre-wrap">{feedback.comment}</p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground">
              Vyplněno: {format(new Date(feedback.created_at), 'd.M.yyyy HH:mm', { locale: cs })}
            </p>
          </div>
        )}
      </div>

      <FeedbackDetailDialog
        feedback={feedback}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        clientName={clientName}
        trainingDate={trainingDate}
      />
    </>
  );
}
