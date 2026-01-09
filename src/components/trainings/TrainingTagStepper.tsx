import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { RPEInputField } from './RPEInputField';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Typ tréninku - předdefinované hodnoty
const TRAINING_TYPES = [
  { value: 'strength', label: 'Silový', icon: '💪' },
  { value: 'conditioning', label: 'Kondiční', icon: '🏃' },
  { value: 'hiit', label: 'HIIT', icon: '🔥' },
  { value: 'cardio', label: 'Kardio', icon: '❤️' },
  { value: 'running', label: 'Běh', icon: '🏃‍♂️' },
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
  // Client RPE (read-only, z feedbacku)
  clientRPE?: number | null;
  // Training load (computed)
  trainingLoad?: number | null;
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
  clientRPE,
  trainingLoad,
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

  // Stav otevřených sekcí
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true,
    focus: true,
    intensity: true,
    bodyPart: true,
    rpe: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
  const selectedTypeName = TRAINING_TYPES.find((t) => t.value === trainingType)?.label;
  const selectedFocusNames = focusTagIds.map(getTagName).filter(Boolean);
  const selectedIntensityName = intensityTagId ? getTagName(intensityTagId) : null;
  const selectedBodyPartNames = bodyPartTagIds.map(getTagName).filter(Boolean);

  // Shrnutí nahoře
  const renderSummary = () => (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
      {selectedTypeName && (
        <Badge variant="secondary" className="font-medium">
          {selectedTypeName}
        </Badge>
      )}
      {selectedFocusNames.map((name) => (
        <Badge key={name} variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
          {name}
        </Badge>
      ))}
      {selectedIntensityName && (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-200">
          {selectedIntensityName}
        </Badge>
      )}
      {selectedBodyPartNames.map((name) => (
        <Badge key={name} variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-200">
          {name}
        </Badge>
      ))}
      {coachRPE && (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
          RPE {coachRPE}
        </Badge>
      )}
      {trainingLoad && (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
          Load {trainingLoad}
        </Badge>
      )}
      {!selectedTypeName && !selectedFocusNames.length && !coachRPE && (
        <span className="text-sm text-muted-foreground">Vyberte parametry tréninku...</span>
      )}
    </div>
  );

  // Sekce s collapsible
  const renderSection = (
    id: string,
    title: string,
    stepNumber: number,
    isComplete: boolean,
    content: React.ReactNode
  ) => (
    <Collapsible
      open={openSections[id]}
      onOpenChange={() => toggleSection(id)}
      className="border rounded-lg"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium',
              isComplete
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
          </div>
          <span className="font-medium text-sm">{title}</span>
        </div>
        {openSections[id] ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">{content}</CollapsibleContent>
    </Collapsible>
  );

  // Chip komponenta
  const Chip = ({
    label,
    selected,
    onClick,
    onRemove,
    color,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    onRemove?: () => void;
    color?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        'min-h-[44px]', // Touch-friendly
        selected
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted hover:bg-muted/80 text-foreground'
      )}
      style={selected && color ? { backgroundColor: color } : undefined}
    >
      {label}
      {selected && onRemove && (
        <X
          className="h-3 w-3 ml-1 hover:scale-125 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Shrnutí nahoře */}
      {renderSummary()}

      {/* Krok 1: Typ tréninku */}
      {renderSection(
        'type',
        'Typ tréninku',
        1,
        !!trainingType,
        <div className="flex flex-wrap gap-2 pt-2">
          {TRAINING_TYPES.map((type) => (
            <Chip
              key={type.value}
              label={`${type.icon} ${type.label}`}
              selected={trainingType === type.value}
              onClick={() => onTrainingTypeChange(type.value)}
            />
          ))}
        </div>
      )}

      {/* Krok 2: Zaměření (multi-select) */}
      {renderSection(
        'focus',
        'Zaměření',
        2,
        focusTagIds.length > 0,
        <div className="space-y-2 pt-2">
          {focusTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-2 border-b">
              <span className="text-xs text-muted-foreground mr-2">Vybrané:</span>
              {focusTagIds.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => toggleTag(id, focusTagIds, onFocusTagsChange)}
                >
                  {getTagName(id)} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tagsByType.focus.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                selected={focusTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id, focusTagIds, onFocusTagsChange)}
                color={focusTagIds.includes(tag.id) ? tag.color || undefined : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Krok 3: Intenzita (single-select) */}
      {renderSection(
        'intensity',
        'Intenzita',
        3,
        !!intensityTagId,
        <div className="flex flex-wrap gap-2 pt-2">
          {tagsByType.intensity.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              selected={intensityTagId === tag.id}
              onClick={() =>
                onIntensityTagChange(intensityTagId === tag.id ? null : tag.id)
              }
              color={intensityTagId === tag.id ? tag.color || undefined : undefined}
            />
          ))}
        </div>
      )}

      {/* Krok 4: Partie těla (multi-select) */}
      {renderSection(
        'bodyPart',
        'Partie těla',
        4,
        bodyPartTagIds.length > 0,
        <div className="space-y-2 pt-2">
          {bodyPartTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-2 border-b">
              <span className="text-xs text-muted-foreground mr-2">Vybrané:</span>
              {bodyPartTagIds.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => toggleTag(id, bodyPartTagIds, onBodyPartTagsChange)}
                >
                  {getTagName(id)} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tagsByType.bodyPart.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                selected={bodyPartTagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id, bodyPartTagIds, onBodyPartTagsChange)}
                color={bodyPartTagIds.includes(tag.id) ? tag.color || undefined : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Krok 5: RPE */}
      {renderSection(
        'rpe',
        'RPE (náročnost)',
        5,
        !!coachRPE,
        <div className="space-y-4 pt-2">
          <RPEInputField
            value={coachRPE}
            onChange={onCoachRPEChange}
            label="RPE trenéra"
            size={compact ? 'sm' : 'md'}
          />

          {/* Client RPE - read-only */}
          {clientRPE !== undefined && (
            <div className="pt-2 border-t">
              <RPEInputField
                value={clientRPE}
                onChange={() => {}}
                label="RPE klienta (z dotazníku)"
                readOnly
                showHelp={false}
                size="sm"
              />
              {coachRPE && clientRPE && (
                <div className="mt-2 text-sm">
                  {Math.abs(coachRPE - clientRPE) >= 3 ? (
                    <span className="text-amber-600">
                      ⚠️ Velký rozdíl: {coachRPE > clientRPE ? '+' : ''}
                      {coachRPE - clientRPE} (trenér vs klient)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Rozdíl: {coachRPE > clientRPE ? '+' : ''}
                      {coachRPE - clientRPE}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Validační upozornění */}
          {trainingStatus === 'completed' && !coachRPE && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-700">
              ⚠️ RPE je povinné pro dokončené tréninky
            </div>
          )}
        </div>
      )}
    </div>
  );
}
