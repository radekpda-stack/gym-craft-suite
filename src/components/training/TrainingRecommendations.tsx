import { AlertTriangle, Info, Lightbulb, Dumbbell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MUSCLE_GROUPS } from '@/hooks/useTrainingAnalytics';

interface TrainingRecommendation {
  type: 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  muscleGroup?: string;
  exercise?: string;
}

interface TrainingRecommendationsProps {
  recommendations: TrainingRecommendation[];
}

export function TrainingRecommendations({ recommendations }: TrainingRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Trénink je vyvážený — žádná doporučení</p>
        </div>
      </div>
    );
  }

  const getIcon = (type: TrainingRecommendation['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
    }
  };

  const getStyles = (type: TrainingRecommendation['type']) => {
    switch (type) {
      case 'warning':
        return 'border-l-warning bg-warning/5';
      case 'info':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'suggestion':
        return 'border-l-amber-500 bg-amber-500/5';
    }
  };

  const getMuscleLabel = (value?: string) => {
    if (!value) return null;
    return MUSCLE_GROUPS.find((mg) => mg.value === value)?.label || value;
  };

  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className={cn(
            'p-4 rounded-xl border-l-4 transition-all hover:scale-[1.01]',
            getStyles(rec.type)
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon(rec.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-foreground">{rec.title}</h4>
                {rec.muscleGroup && (
                  <Badge variant="outline" className="text-xs">
                    {getMuscleLabel(rec.muscleGroup)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
