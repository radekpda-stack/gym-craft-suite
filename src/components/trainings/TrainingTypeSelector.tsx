import { TRAINING_TYPES, TrainingType } from '@/hooks/useTrainingProgress';
import { cn } from '@/lib/utils';
import { 
  Dumbbell, 
  Activity, 
  PersonStanding, 
  Leaf, 
  MoreHorizontal,
  Zap,
  Heart,
  Move,
  Expand,
  Target,
  ClipboardCheck
} from 'lucide-react';

interface TrainingTypeSelectorProps {
  value?: string | null;
  onChange: (value: TrainingType) => void;
  disabled?: boolean;
}

const typeIcons: Record<TrainingType, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  conditioning: Activity,
  hiit: Zap,
  cardio: Heart,
  running: PersonStanding,
  mobility: Move,
  flexibility: Expand,
  regeneration: Leaf,
  functional: Target,
  diagnostic: ClipboardCheck,
  other: MoreHorizontal,
};

export function TrainingTypeSelector({ value, onChange, disabled }: TrainingTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(TRAINING_TYPES) as TrainingType[]).map((type) => {
        const config = TRAINING_TYPES[type];
        const Icon = typeIcons[type];
        const isSelected = value === type;

        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              "border",
              isSelected
                ? cn(config.color, "text-white border-transparent")
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TrainingTypeBadge({ type }: { type?: string | null }) {
  const trainingType = (type || 'other') as TrainingType;
  const config = TRAINING_TYPES[trainingType] || TRAINING_TYPES.other;
  const Icon = typeIcons[trainingType] || typeIcons.other;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
      config.color
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
