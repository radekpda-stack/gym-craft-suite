import { ThumbsUp, AlertCircle, Lightbulb, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface TrainerSummarySectionProps {
  wentWell?: string | null;
  problems?: string | null;
  recommendations?: string | null;
  isEditMode?: boolean;
  onUpdate?: (field: string, value: string) => void;
}

export function TrainerSummarySection({
  wentWell,
  problems,
  recommendations,
  isEditMode,
  onUpdate,
}: TrainerSummarySectionProps) {
  const hasData = wentWell || problems || recommendations;

  if (!hasData && !isEditMode) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Shrnutí trenéra
      </h3>

      <div className="space-y-4">
        {/* What went well */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-success">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">Co šlo dobře</span>
          </div>
          {isEditMode ? (
            <Textarea
              value={wentWell || ''}
              onChange={(e) => onUpdate?.('trainer_went_well', e.target.value)}
              className="bg-secondary border-border min-h-[60px]"
              placeholder="Pozitivní aspekty tréninku..."
            />
          ) : wentWell ? (
            <p className="text-sm text-foreground pl-6">{wentWell}</p>
          ) : null}
        </div>

        {/* Problems */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Problémy</span>
          </div>
          {isEditMode ? (
            <Textarea
              value={problems || ''}
              onChange={(e) => onUpdate?.('trainer_problems', e.target.value)}
              className="bg-secondary border-border min-h-[60px]"
              placeholder="Co bylo problematické..."
            />
          ) : problems ? (
            <p className="text-sm text-foreground pl-6">{problems}</p>
          ) : null}
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">Doporučení</span>
          </div>
          {isEditMode ? (
            <Textarea
              value={recommendations || ''}
              onChange={(e) => onUpdate?.('trainer_recommendations', e.target.value)}
              className="bg-secondary border-border min-h-[60px]"
              placeholder="Doporučení pro další trénink..."
            />
          ) : recommendations ? (
            <p className="text-sm text-foreground pl-6">{recommendations}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
