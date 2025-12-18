import { useWeeklySummary, TRAINING_TYPES, TrainingType } from '@/hooks/useTrainingProgress';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Calendar, Dumbbell, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklySummaryCardProps {
  clientId?: string;
  className?: string;
}

export function WeeklySummaryCard({ clientId, className }: WeeklySummaryCardProps) {
  const summary = useWeeklySummary(clientId);

  if (!summary) {
    return (
      <div className={cn("glass rounded-2xl p-5", className)}>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Týdenní shrnutí</h3>
        <p className="text-sm text-muted-foreground">Tento týden zatím žádné dokončené tréninky.</p>
      </div>
    );
  }

  const isHighIntensity = (summary.avgRPE || 0) >= 8;
  const isLowActivity = summary.trainingCount < 2;

  return (
    <div className={cn("glass rounded-2xl p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Týdenní shrnutí
        </h3>
        <span className="text-xs text-muted-foreground">
          {format(summary.weekStart, 'd.M.', { locale: cs })} - {format(summary.weekEnd, 'd.M.', { locale: cs })}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{summary.trainingCount}</div>
          <div className="text-xs text-muted-foreground">tréninků</div>
        </div>
        {summary.totalVolume > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{summary.totalVolume}</div>
            <div className="text-xs text-muted-foreground">objem</div>
          </div>
        )}
        {summary.avgRPE !== null && (
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              isHighIntensity ? "text-warning" : "text-foreground"
            )}>
              {summary.avgRPE.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">ø RPE</div>
          </div>
        )}
        {summary.avgDifficulty !== null && !summary.avgRPE && (
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{summary.avgDifficulty.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">ø náročnost</div>
          </div>
        )}
      </div>

      {/* Training types distribution */}
      {Object.keys(summary.trainingTypes).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.trainingTypes).map(([type, count]) => (
            <span 
              key={type}
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium text-white",
                TRAINING_TYPES[type as TrainingType]?.color || 'bg-muted'
              )}
            >
              {TRAINING_TYPES[type as TrainingType]?.label || type} ({count})
            </span>
          ))}
        </div>
      )}

      {/* Evaluation */}
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-xl text-sm",
        isHighIntensity ? "bg-warning/10 text-warning" : 
        isLowActivity ? "bg-muted text-muted-foreground" :
        "bg-success/10 text-success"
      )}>
        {isHighIntensity ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <TrendingUp className="w-4 h-4 flex-shrink-0" />
        )}
        <span>{summary.evaluation}</span>
      </div>
    </div>
  );
}
