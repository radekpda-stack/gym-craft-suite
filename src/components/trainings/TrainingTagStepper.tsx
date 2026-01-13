import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTags, Tag } from '@/hooks/useTags';
import { RPEInputField } from './RPEInputField';
import { Badge } from '@/components/ui/badge';

// Typ tréninku - předdefinované hodnoty (bez duplicit se Zaměřením)
const TRAINING_TYPES = [
  { value: 'strength', label: 'Silový', icon: '💪' },
  { value: 'hiit', label: 'HIIT', icon: '🔥' },
  { value: 'cardio', label: 'Kardio', icon: '❤️' },
  { value: 'functional', label: 'Funkční', icon: '⚡' },
  { value: 'mobility', label: 'Mobilita', icon: '🧘' },
  { value: 'regeneration', label: 'Regenerace', icon: '🌿' },
  { value: 'diagnostic', label: 'Diagnostický', icon: '📊' },
] as const;

// Hierarchie partií těla - mapování kategorií na podřazené tagy
const BODY_PART_CATEGORIES = [
  { key: 'full', name: 'Celé tělo', tagName: 'Celé tělo', hasChildren: false },
  { key: 'upper', name: 'Horní část', tagName: 'Horní část', hasChildren: true },
  { key: 'lower', name: 'Dolní část', tagName: 'Dolní část', hasChildren: true },
  { key: 'core', name: 'Břicho', tagName: 'Břicho', hasChildren: true },
] as const;

// Mapování kategorií na podřazené svaly
const BODY_PART_CHILDREN: Record<string, string[]> = {
  upper: [
    // Ramena a rotátory
    'Ramena', 'Deltový sval přední', 'Deltový sval střední', 'Deltový sval zadní', 'Rotátorová manžeta',
    // Paže
    'Biceps', 'Triceps', 'Předloktí',
    // Hrudník
    'Hrudník', 'Prsní sval velký', 'Prsní sval malý',
    // Záda
    'Záda', 'Latissimus', 'Trapézy', 'Rhomboidy', 'Vzpřimovače páteře',
    // Krk
    'Krk',
  ],
  lower: [
    // Stehna
    'Přední stehna', 'Čtyřhlavý sval stehenní', 'Zadní stehna', 'Hamstringy',
    // Hýždě
    'Hýždě', 'Gluteus maximus', 'Gluteus medius',
    // Lýtka
    'Lýtka', 'Gastrocnemius', 'Soleus',
    // Kyčle a ostatní
    'Iliopsoas', 'Abduktory', 'Addukty',
  ],
  core: ['Přímé břišní svalstvo', 'Šikmé břišní svalstvo', 'Hluboké břišní svalstvo', 'Střed těla'],
};

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Rozdělit tagy podle typu
  const tagsByType = useMemo(() => {
    const focus = tags.filter((t) => t.tag_type === 'focus');
    const intensity = tags.filter((t) => t.tag_type === 'intensity');
    const bodyPart = tags.filter((t) => t.tag_type === 'body_part');
    return { focus, intensity, bodyPart };
  }, [tags]);

  // Získat tag podle jména
  const getTagByName = (name: string): Tag | undefined => {
    return tags.find((t) => t.name === name && t.tag_type === 'body_part');
  };

  // Získat kategorie které mají vybrané tagy
  const getCategorySelectedCount = (categoryKey: string): number => {
    const childNames = BODY_PART_CHILDREN[categoryKey] || [];
    return childNames.filter(name => {
      const tag = getTagByName(name);
      return tag && bodyPartTagIds.includes(tag.id);
    }).length;
  };

  // Toggle kategorie rozbalení
  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
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
          <Badge key={name} variant="secondary" className="text-xs bg-accent/15 text-accent border-0">
            {name}
          </Badge>
        ))}
        {selectedIntensityName && (
          <Badge variant="secondary" className="text-xs bg-warning/15 text-warning border-0">
            {selectedIntensityName}
          </Badge>
        )}
        {selectedBodyPartNames.map((name) => (
          <Badge key={name} variant="secondary" className="text-xs bg-primary/15 text-primary border-0">
            {name}
          </Badge>
        ))}
        {coachRPE && (
          <Badge variant="secondary" className="text-xs bg-destructive/15 text-destructive border-0">
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
    suffix,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    variant?: 'type' | 'focus' | 'intensity' | 'bodyPart' | 'category' | 'default';
    suffix?: React.ReactNode;
  }) => {
    const variantStyles = {
      type: selected 
        ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20' 
        : 'bg-muted/60 hover:bg-muted text-foreground',
      focus: selected 
        ? 'bg-accent text-accent-foreground shadow-sm ring-2 ring-accent/20' 
        : 'bg-accent/10 hover:bg-accent/20 text-accent',
      intensity: selected 
        ? 'bg-warning text-warning-foreground shadow-sm ring-2 ring-warning/20' 
        : 'bg-warning/10 hover:bg-warning/20 text-warning',
      bodyPart: selected 
        ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20' 
        : 'bg-primary/10 hover:bg-primary/20 text-primary',
      category: selected 
        ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30' 
        : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30',
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
        {suffix}
      </button>
    );
  };

  // Renderování hierarchických partií těla
  const renderBodyPartSection = () => {
    return (
      <div className="space-y-3">
        {/* Kategorie - první úroveň */}
        <div className="flex flex-wrap gap-2">
          {BODY_PART_CATEGORIES.map((category) => {
            const categoryTag = getTagByName(category.tagName);
            const isSelected = categoryTag && bodyPartTagIds.includes(categoryTag.id);
            const isExpanded = expandedCategories.has(category.key);
            const selectedCount = getCategorySelectedCount(category.key);
            
            if (!category.hasChildren) {
              // Celé tělo - přímá volba bez podkategorií
              return (
                <TagChip
                  key={category.key}
                  label={category.name}
                  selected={!!isSelected}
                  onClick={() => {
                    if (categoryTag) {
                      toggleTag(categoryTag.id, bodyPartTagIds, onBodyPartTagsChange);
                    }
                  }}
                  variant="bodyPart"
                />
              );
            }

            // Kategorie s podkategoriemi
            return (
              <TagChip
                key={category.key}
                label={category.name}
                selected={isExpanded || selectedCount > 0}
                onClick={() => toggleCategory(category.key)}
                variant="category"
                suffix={
                  <span className="flex items-center gap-1">
                    {selectedCount > 0 && (
                      <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </span>
                }
              />
            );
          })}
        </div>

        {/* Podkategorie - druhá úroveň */}
        {Array.from(expandedCategories).map((categoryKey) => {
          const childNames = BODY_PART_CHILDREN[categoryKey] || [];
          if (childNames.length === 0) return null;

          return (
            <div 
              key={categoryKey} 
              className="pl-2 pt-2 border-l-2 border-primary/30 ml-2"
            >
              <div className="flex flex-wrap gap-2">
                {childNames.map((childName) => {
                  const childTag = getTagByName(childName);
                  if (!childTag) return null;
                  
                  return (
                    <TagChip
                      key={childTag.id}
                      label={childTag.name}
                      selected={bodyPartTagIds.includes(childTag.id)}
                      onClick={() => toggleTag(childTag.id, bodyPartTagIds, onBodyPartTagsChange)}
                      variant="bodyPart"
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
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

      {/* Partie těla (hierarchický multi-select) */}
      {tagsByType.bodyPart.length > 0 && (
        <div>
          <SectionLabel>Partie těla</SectionLabel>
          {renderBodyPartSection()}
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
          <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-md text-xs text-warning">
            ⚠️ RPE je povinné pro dokončené tréninky
          </div>
        )}
      </div>
    </div>
  );
}
