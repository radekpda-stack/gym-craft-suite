import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useTags, Tag } from '@/hooks/useTags';
import { RPEInputField } from './RPEInputField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Typ tréninku - předdefinované hodnoty
const TRAINING_TYPES = [
  { value: 'strength', label: 'Silový', icon: '💪' },
  { value: 'hiit', label: 'HIIT', icon: '🔥' },
  { value: 'cardio', label: 'Kardio', icon: '❤️' },
  { value: 'functional', label: 'Funkční', icon: '⚡' },
  { value: 'mobility', label: 'Mobilita', icon: '🧘' },
  { value: 'regeneration', label: 'Regenerace', icon: '🌿' },
  { value: 'diagnostic', label: 'Diagnostický', icon: '📊' },
] as const;

// Hierarchie partií těla
const BODY_PART_CATEGORIES = [
  { key: 'full', name: 'Celé tělo', tagName: 'Celé tělo', hasChildren: false },
  { key: 'upper', name: 'Horní část', tagName: 'Horní část', hasChildren: true },
  { key: 'lower', name: 'Dolní část', tagName: 'Dolní část', hasChildren: true },
  { key: 'core', name: 'Břicho', tagName: 'Břicho', hasChildren: true },
] as const;

const BODY_PART_CHILDREN: Record<string, string[]> = {
  upper: [
    'Ramena', 'Deltový sval přední', 'Deltový sval střední', 'Deltový sval zadní', 'Rotátorová manžeta',
    'Biceps', 'Triceps', 'Předloktí',
    'Hrudník', 'Prsní sval velký', 'Prsní sval malý',
    'Záda', 'Latissimus', 'Trapézy', 'Rhomboidy', 'Vzpřimovače páteře',
    'Krk',
  ],
  lower: [
    'Přední stehna', 'Čtyřhlavý sval stehenní', 'Zadní stehna', 'Hamstringy',
    'Hýždě', 'Gluteus maximus', 'Gluteus medius',
    'Lýtka', 'Gastrocnemius', 'Soleus',
    'Iliopsoas', 'Abduktory', 'Addukty',
  ],
  core: ['Přímé břišní svalstvo', 'Šikmé břišní svalstvo', 'Hluboké břišní svalstvo', 'Střed těla'],
};

interface ExpandedTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Current values
  trainingType: string | null;
  focusTagIds: string[];
  intensityTagId: string | null;
  bodyPartTagIds: string[];
  coachRPE: number | null;
  // Callbacks
  onTrainingTypeChange: (type: string) => void;
  onFocusTagsChange: (ids: string[]) => void;
  onIntensityTagChange: (id: string | null) => void;
  onBodyPartTagsChange: (ids: string[]) => void;
  onCoachRPEChange: (rpe: number) => void;
}

export function ExpandedTagModal({
  open,
  onOpenChange,
  trainingType,
  focusTagIds,
  intensityTagId,
  bodyPartTagIds,
  coachRPE,
  onTrainingTypeChange,
  onFocusTagsChange,
  onIntensityTagChange,
  onBodyPartTagsChange,
  onCoachRPEChange,
}: ExpandedTagModalProps) {
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

  // Sekce label
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
      {children}
    </div>
  );

  // Chip komponenta
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
          'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'min-h-[36px] active:scale-[0.98]',
          variantStyles[variant]
        )}
      >
        {selected && <Check className="h-3 w-3" />}
        <span>{label}</span>
        {suffix}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Detailní nastavení tréninku
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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
              <SectionLabel>Zaměření (vyberte více)</SectionLabel>
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

          {/* Partie těla s hierarchií */}
          {tagsByType.bodyPart.length > 0 && (
            <div>
              <SectionLabel>Partie těla</SectionLabel>
              <div className="space-y-3">
                {/* Kategorie - první úroveň */}
                <div className="flex flex-wrap gap-2">
                  {BODY_PART_CATEGORIES.map((category) => {
                    const categoryTag = getTagByName(category.tagName);
                    const isSelected = categoryTag && bodyPartTagIds.includes(categoryTag.id);
                    const isExpanded = expandedCategories.has(category.key);
                    const selectedCount = getCategorySelectedCount(category.key);
                    
                    if (!category.hasChildren) {
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
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
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
                      className="pl-3 pt-2 border-l-2 border-primary/30 ml-2"
                    >
                      <div className="flex flex-wrap gap-1.5">
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
            </div>
          )}

          {/* RPE */}
          <div>
            <SectionLabel>RPE trenéra</SectionLabel>
            <RPEInputField
              value={coachRPE}
              onChange={onCoachRPEChange}
              size="sm"
              showHelp={true}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
