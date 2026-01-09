import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { RPEInputField } from './RPEInputField';
import { Badge } from '@/components/ui/badge';

// Typ tréninku - předdefinované hodnoty (bez duplicit se Zaměřením)
const TRAINING_TYPES = [
  { value: 'strength', label: 'Silový', icon: '💪' },
  { value: 'hiit', label: 'HIIT', icon: '🔥' },
  { value: 'cardio', label: 'Kardio', icon: '❤️' },
  { value: 'running', label: 'Běh', icon: '🏃' },
  { value: 'functional', label: 'Funkční', icon: '⚡' },
  { value: 'mobility', label: 'Mobilita', icon: '🧘' },
  { value: 'regeneration', label: 'Regenerace', icon: '🌿' },
  { value: 'diagnostic', label: 'Diagnostický', icon: '📊' },
  { value: 'other', label: 'Jiný', icon: '➕' },
] as const;

interface TrainingTagStepperProps {
  // Typ tréninku
  trainingType: string | null;
  onTrainingTypeChange: (type: string) => void;
  // Tagy zaměření (focus)
  focusTagIds: string[];
  onFocusTagsChange: (ids: string[]) => void;
  // Tag intenzity
  intensityTagId: string | null;
  onIntensityTagChange: (id: string | null) => void;
  // Tagy partií těla
  bodyPartTagIds: string[];
  onBodyPartTagsChange: (ids: string[]) => void;
  // Coach RPE
  coachRPE: number | null;
  onCoachRPEChange: (rpe: number) => void;
  // Stav tréninku pro validaci
  trainingStatus?: 'scheduled' | 'completed' | 'canceled';
  // Kompaktní mód pro menší obrazovky
  compact?: boolean;
  className?: string;
}

export function TrainingTagStepper({
  trainingType,
  onTrainingTypeChange,
  focusTagIds,
  onFocusTagsChange,
  intensityTagId,
  onIntensityTagChange,
  bodyPartTagIds,
  onBodyPartTagsChange,
  coachRPE,
  onCoachRPEChange,
  trainingStatus = 'scheduled',
  compact = false,
  className,
}: TrainingTagStepperProps) {
  const { data: tags = [] } = useTags();

  // Rozdělit tagy podle typu
  const tagsByType = useMemo(() => {
    const focus = tags.filter((t) => t.tag_type === 'focus');
    const intensity = tags.filter((t) => t.tag_type === 'intensity');
    const bodyPart = tags.filter((t) => t.tag_type === 'body_part');
    return { focus, intensity, bodyPart };
  }, [tags]);

  // Helper pro toggle tagu v multi-select
  const toggleTag = (
    tagId: string,
    currentIds: string[],
    onChange: (ids: string[]) => void
  ) => {
    if (currentIds.includes(tagId)) {
      onChange(currentIds.filter((id) => id !== tagId));
    } else {
      onChange([...currentIds, tagId]);
    }
  };

  // Získat název tagu podle ID
  const getTagName = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    return tag?.name || '';
  };

  // Vybrané hodnoty pro shrnutí
  const selectedType = TRAINING_TYPES.find((t) => t.value === trainingType);
  const selectedFocusNames = focusTagIds.map(getTagName).filter(Boolean);
  const selectedIntensityName = intensityTagId ? getTagName(intensityTagId) : null;
  const selectedBodyPartNames = bodyPartTagIds.map(getTagName).filter(Boolean);

  const hasAnySelection = selectedType || selectedFocusNames.length > 0 || selectedIntensityName || selectedBodyPartNames.length > 0 || coachRPE;

  // Kompaktní shrnutí - jedna řádka badges
  const renderCompactSummary = () => {
    if (!hasAnySelection) return null;
    
    return (
      <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-3 border-b border-border/50">
        {selectedType && (
          <Badge variant="default" className="text-xs font-medium">
            {selectedType.icon} {selectedType.label}
          </Badge>
        )}
        {selectedFocusNames.map((name) => (
          <Badge key={name} variant="secondary" className="text-xs bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">
            {name}
          </Badge>
        ))}
        {selectedIntensityName && (
          <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">
            {selectedIntensityName}
          </Badge>
        )}
        {selectedBodyPartNames.map((name) => (
          <Badge key={name} variant="secondary" className="text-xs bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0">
            {name}
          </Badge>
        ))}
        {coachRPE && (
          <Badge variant="secondary" className="text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border-0">
            RPE {coachRPE}
          </Badge>
        )}
      </div>
    );
  };

  // Inline sekce label
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
      {children}
    </div>
  );

  // Moderní chip komponenta
  const TagChip = ({
    label,
    selected,
    onClick,
    variant = 'default',
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    variant?: 'type' | 'focus' | 'intensity' | 'bodyPart' | 'default';
  }) => {
    const variantStyles = {
      type: selected 
        ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20' 
        : 'bg-muted/60 hover:bg-muted text-foreground',
      focus: selected 
        ? 'bg-blue-500 text-white shadow-sm ring-2 ring-blue-500/20' 
        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300',
      intensity: selected 
        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20' 
        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300',
      bodyPart: selected 
        ? 'bg-purple-500 text-white shadow-sm ring-2 ring-purple-500/20' 
        : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300',
      default: selected 
        ? 'bg-primary text-primary-foreground shadow-sm' 
        : 'bg-muted hover:bg-muted/80 text-foreground',
    };

    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'min-h-[40px] active:scale-[0.98]',
          variantStyles[variant]
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Kompaktní shrnutí */}
      {renderCompactSummary()}

      {/* Typ tréninku */}
      <div>
        <SectionLabel>Typ tréninku</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TRAINING_TYPES.map((type) => (
            <TagChip
              key={type.value}
              label={`${type.icon} ${type.label}`}
              selected={trainingType === type.value}
              onClick={() => onTrainingTypeChange(type.value)}
              variant="type"
            />
          ))}
        </div>
      </div>

      {/* Zaměření (multi-select) */}
      {tagsByType.focus.length > 0 && (
        <div>
          <SectionLabel>Zaměření</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {tagsByType.focus.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.name}
                selected={focusTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id, focusTagIds, onFocusTagsChange)}
                variant="focus"
              />
            ))}
          </div>
        </div>
      )}

      {/* Intenzita (single-select) */}
      {tagsByType.intensity.length > 0 && (
        <div>
          <SectionLabel>Intenzita</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {tagsByType.intensity.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.name}
                selected={intensityTagId === tag.id}
                onClick={() => onIntensityTagChange(intensityTagId === tag.id ? null : tag.id)}
                variant="intensity"
              />
            ))}
          </div>
        </div>
      )}

      {/* Partie těla (multi-select) */}
      {tagsByType.bodyPart.length > 0 && (
        <div>
          <SectionLabel>Partie těla</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {tagsByType.bodyPart.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.name}
                selected={bodyPartTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id, bodyPartTagIds, onBodyPartTagsChange)}
                variant="bodyPart"
              />
            ))}
          </div>
        </div>
      )}

      {/* RPE trenéra */}
      <div>
        <SectionLabel>RPE trenéra</SectionLabel>
        <RPEInputField
          value={coachRPE}
          onChange={onCoachRPEChange}
          size={compact ? 'sm' : 'md'}
          showHelp={false}
        />
        {/* Validační upozornění */}
        {trainingStatus === 'completed' && !coachRPE && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-700 dark:text-amber-400">
            ⚠️ RPE je povinné pro dokončené tréninky
          </div>
        )}
      </div>
    </div>
  );
}
