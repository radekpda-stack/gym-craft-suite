import { TrainingTemplate, WorkoutFormat } from '@/hooks/useTrainingTemplates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Clock, 
  Target, 
  Zap, 
  Timer, 
  RotateCcw,
  Dumbbell,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplatePreviewCardProps {
  template: TrainingTemplate;
  onSelect?: () => void;
  selected?: boolean;
  compact?: boolean;
}

const formatLabels: Record<WorkoutFormat, { label: string; icon: React.ReactNode; color: string }> = {
  standard: { label: 'Klasický', icon: <Dumbbell className="h-4 w-4" />, color: 'bg-muted' },
  amrap: { label: 'AMRAP', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-warning/10 text-warning' },
  emom: { label: 'EMOM', icon: <Clock className="h-4 w-4" />, color: 'bg-accent/10 text-accent' },
  for_time: { label: 'For Time', icon: <Target className="h-4 w-4" />, color: 'bg-success/10 text-success' },
  tabata: { label: 'Tabata', icon: <Zap className="h-4 w-4" />, color: 'bg-destructive/10 text-destructive' },
  circuit: { label: 'Circuit', icon: <RotateCcw className="h-4 w-4" />, color: 'bg-primary/10 text-primary' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TemplatePreviewCard({ 
  template, 
  onSelect, 
  selected = false,
  compact = false 
}: TemplatePreviewCardProps) {
  const format = formatLabels[template.workout_format || 'standard'];
  const exercises = template.exercises || [];

  // Parse exercises from JSON if stored directly on template
  const exerciseList = exercises.length > 0 
    ? exercises 
    : (typeof (template as any).exercises === 'string' 
        ? JSON.parse((template as any).exercises) 
        : (template as any).exercises || []);

  const getParameterText = () => {
    const parts: string[] = [];
    
    if (template.time_cap_seconds) {
      parts.push(formatTime(template.time_cap_seconds));
    }
    if (template.rounds) {
      parts.push(`${template.rounds} kol`);
    }
    if (template.work_interval_seconds && template.workout_format === 'tabata') {
      parts.push(`${template.work_interval_seconds}s / ${template.rest_interval_seconds || 10}s`);
    }
    
    return parts.join(' • ');
  };

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left p-3 rounded-lg border transition-all",
          selected 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className={cn("shrink-0", format.color)}>
              {format.icon}
              <span className="ml-1">{format.label}</span>
            </Badge>
            <span className="font-medium truncate">{template.name}</span>
          </div>
          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
        {getParameterText() && (
          <p className="text-xs text-muted-foreground mt-1">{getParameterText()}</p>
        )}
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all",
        selected 
          ? "border-primary bg-primary/5" 
          : "border-border",
        onSelect && "cursor-pointer hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="font-semibold">{template.name}</h4>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{template.description}</p>
          )}
        </div>
        <Badge variant="secondary" className={format.color}>
          {format.icon}
          <span className="ml-1">{format.label}</span>
        </Badge>
      </div>

      {/* Parameters */}
      {getParameterText() && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Timer className="h-4 w-4" />
          <span>{getParameterText()}</span>
        </div>
      )}

      {/* Exercise list */}
      {exerciseList.length > 0 && (
        <div className="space-y-1 text-sm">
          {exerciseList.slice(0, 5).map((ex: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-muted-foreground w-4">{idx + 1}.</span>
              <span>
                {ex.reps && `${ex.reps}x `}
                {ex.time_seconds && `${ex.time_seconds}s `}
                {ex.distance_meters && `${ex.distance_meters}m `}
                {ex.exercise_name}
                {ex.weight_kg && ` (${ex.weight_kg}kg)`}
              </span>
            </div>
          ))}
          {exerciseList.length > 5 && (
            <p className="text-muted-foreground text-xs">
              +{exerciseList.length - 5} dalších cviků
            </p>
          )}
        </div>
      )}

      {onSelect && (
        <Button 
          variant={selected ? "default" : "outline"} 
          size="sm" 
          className="w-full mt-3"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {selected ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Vybráno
            </>
          ) : (
            'Použít jako výzvu'
          )}
        </Button>
      )}
    </div>
  );
}
