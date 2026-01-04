import { Card, CardContent } from '@/components/ui/card';
import { Timer, RefreshCw, Zap, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkoutFormat = 'amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit';

interface CircuitFormatSelectorProps {
  value: WorkoutFormat;
  onChange: (format: WorkoutFormat) => void;
}

const formats: { value: WorkoutFormat; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'amrap',
    label: 'AMRAP',
    description: 'Max kol za určitý čas',
    icon: <Timer className="w-6 h-6" />,
  },
  {
    value: 'emom',
    label: 'EMOM',
    description: 'Každou minutu nový cvik',
    icon: <Clock className="w-6 h-6" />,
  },
  {
    value: 'for_time',
    label: 'For Time',
    description: 'Co nejrychleji X kol',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    value: 'tabata',
    label: 'Tabata',
    description: '20s práce / 10s odpočinek',
    icon: <RefreshCw className="w-6 h-6" />,
  },
  {
    value: 'circuit',
    label: 'Circuit',
    description: 'Klasický kruhový trénink',
    icon: <RotateCcw className="w-6 h-6" />,
  },
];

export function CircuitFormatSelector({ value, onChange }: CircuitFormatSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {formats.map((format) => (
        <Card
          key={format.value}
          className={cn(
            'cursor-pointer transition-all hover:border-primary/50',
            value === format.value && 'border-primary bg-primary/5 ring-2 ring-primary/20'
          )}
          onClick={() => onChange(format.value)}
        >
          <CardContent className="p-4 text-center space-y-2">
            <div className={cn(
              'mx-auto w-12 h-12 rounded-full flex items-center justify-center',
              value === format.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {format.icon}
            </div>
            <div className="font-bold text-sm">{format.label}</div>
            <div className="text-xs text-muted-foreground leading-tight">{format.description}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
