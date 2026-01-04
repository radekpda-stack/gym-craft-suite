import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, RefreshCw, Zap, Clock, RotateCcw } from 'lucide-react';
import { WorkoutFormat } from './CircuitFormatSelector';
import { CircuitParameters } from './CircuitParametersForm';
import { CircuitExercise } from './CircuitExerciseItem';

interface CircuitPreviewProps {
  name: string;
  format: WorkoutFormat;
  parameters: CircuitParameters;
  exercises: CircuitExercise[];
}

const formatLabels: Record<WorkoutFormat, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  for_time: 'For Time',
  tabata: 'Tabata',
  circuit: 'Circuit',
};

const formatIcons: Record<WorkoutFormat, React.ReactNode> = {
  amrap: <Timer className="w-4 h-4" />,
  emom: <Clock className="w-4 h-4" />,
  for_time: <Zap className="w-4 h-4" />,
  tabata: <RefreshCw className="w-4 h-4" />,
  circuit: <RotateCcw className="w-4 h-4" />,
};

function formatExercise(exercise: CircuitExercise): string {
  const parts: string[] = [];
  
  if (exercise.reps) {
    parts.push(`${exercise.reps}x`);
  }
  if (exercise.time_seconds) {
    const minutes = Math.floor(exercise.time_seconds / 60);
    const seconds = exercise.time_seconds % 60;
    if (minutes > 0) {
      parts.push(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else {
      parts.push(`${seconds}s`);
    }
  }
  if (exercise.distance_meters) {
    if (exercise.distance_meters >= 1000) {
      parts.push(`${(exercise.distance_meters / 1000).toFixed(1)}km`);
    } else {
      parts.push(`${exercise.distance_meters}m`);
    }
  }
  
  parts.push(exercise.exercise_name);
  
  if (exercise.weight_kg) {
    parts.push(`(${exercise.weight_kg}kg)`);
  }
  
  return parts.join(' ');
}

function formatHeader(format: WorkoutFormat, parameters: CircuitParameters): string {
  switch (format) {
    case 'amrap':
      return parameters.timeCap ? `${parameters.timeCap} min` : '';
    case 'emom':
      return parameters.timeCap ? `${parameters.timeCap} min` : '';
    case 'for_time':
      const parts = [];
      if (parameters.rounds) parts.push(`${parameters.rounds} kol`);
      if (parameters.timeCap) parts.push(`TC: ${parameters.timeCap} min`);
      return parts.join(' | ');
    case 'tabata':
      return `${parameters.rounds || 8} kol (${parameters.workInterval || 20}s/${parameters.restInterval || 10}s)`;
    case 'circuit':
      const circuitParts = [];
      if (parameters.rounds) circuitParts.push(`${parameters.rounds} kol`);
      if (parameters.workInterval && parameters.restInterval) {
        circuitParts.push(`${parameters.workInterval}s/${parameters.restInterval}s`);
      }
      return circuitParts.join(' | ');
    default:
      return '';
  }
}

export function CircuitPreview({ name, format, parameters, exercises }: CircuitPreviewProps) {
  if (exercises.length === 0) {
    return null;
  }

  const headerText = formatHeader(format, parameters);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name || 'Náhled WOD'}</CardTitle>
          <Badge variant="secondary" className="gap-1">
            {formatIcons[format]}
            {formatLabels[format]}
          </Badge>
        </div>
        {headerText && (
          <p className="text-sm font-medium text-primary">{headerText}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5 font-mono text-sm">
          {exercises.map((exercise, index) => (
            <div key={exercise.tempId} className="flex items-baseline gap-2">
              <span className="text-muted-foreground w-4 text-right shrink-0">
                {index + 1}.
              </span>
              <span>{formatExercise(exercise)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
