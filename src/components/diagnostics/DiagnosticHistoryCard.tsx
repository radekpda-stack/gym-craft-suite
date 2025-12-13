import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  ChevronRight, Sparkles, AlertTriangle, CheckCircle, 
  Activity, Heart, Brain 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DiagnosticWithAssessment } from '@/hooks/useDiagnosticAssessments';

interface DiagnosticHistoryCardProps {
  diagnostic: DiagnosticWithAssessment;
  isSelected?: boolean;
  onSelect?: () => void;
  onCompareToggle?: () => void;
  isComparing?: boolean;
}

export function DiagnosticHistoryCard({
  diagnostic,
  isSelected,
  onSelect,
  onCompareToggle,
  isComparing,
}: DiagnosticHistoryCardProps) {
  const assessment = diagnostic.assessment;
  const hasAIAnalysis = assessment?.ai_analysis || assessment?.ai_risk_factors?.length;

  return (
    <div
      className={cn(
        'glass rounded-xl p-4 transition-all cursor-pointer',
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-secondary/50',
        isComparing && 'ring-2 ring-warning bg-warning/5'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground">
              {format(new Date(diagnostic.date), 'd. MMMM yyyy', { locale: cs })}
            </p>
            {hasAIAnalysis && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                <Sparkles className="w-3 h-3" />
                AI
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-1">
            {diagnostic.area_name} • {diagnostic.area_type === 'joint' ? 'Kloub' : 'Sval'}
          </p>

          {/* Quick stats from assessment */}
          {assessment && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {assessment.pain_areas && assessment.pain_areas.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  {assessment.pain_areas.length} bolestivých oblastí
                </span>
              )}
              {assessment.ai_risk_factors && assessment.ai_risk_factors.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <Heart className="w-3 h-3" />
                  {assessment.ai_risk_factors.length} rizikových faktorů
                </span>
              )}
              {assessment.ai_strengths && assessment.ai_strengths.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="w-3 h-3" />
                  {assessment.ai_strengths.length} silných stránek
                </span>
              )}
            </div>
          )}

          {/* Findings preview */}
          {diagnostic.findings && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {diagnostic.findings}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCompareToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompareToggle();
              }}
              className={cn(
                'p-2 rounded-lg text-xs font-medium transition-colors',
                isComparing 
                  ? 'bg-warning text-warning-foreground' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {isComparing ? 'Porovnávám' : 'Porovnat'}
            </button>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
