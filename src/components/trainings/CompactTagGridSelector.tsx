import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { TagDropdownSelect, TagOption } from './TagDropdownSelect';
import { BodyPartDropdownSelect } from './BodyPartDropdownSelect';
import { InlineRPESelector } from './InlineRPESelector';
import { ExpandedTagModal } from './ExpandedTagModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Typ tréninku - předdefinované hodnoty
const TRAINING_TYPES: TagOption[] = [
  { id: 'strength', label: 'Silový', icon: '💪' },
  { id: 'hiit', label: 'HIIT', icon: '🔥' },
  { id: 'cardio', label: 'Kardio', icon: '❤️' },
  { id: 'functional', label: 'Funkční', icon: '⚡' },
  { id: 'mobility', label: 'Mobilita', icon: '🧘' },
  { id: 'regeneration', label: 'Regenerace', icon: '🌿' },
  { id: 'diagnostic', label: 'Diagnostický', icon: '📊' },
];

// Konfigurace viditelnosti sekcí podle typu tréninku
type TagVisibility = {
  showFocus: boolean;
  showIntensity: boolean;
  bodyPartsMode: 'full' | 'only-full-body' | 'hidden';
};

const TAG_VISIBILITY_BY_TYPE: Record<string, TagVisibility> = {
  strength: { showFocus: true, showIntensity: true, bodyPartsMode: 'full' },
  functional: { showFocus: true, showIntensity: true, bodyPartsMode: 'full' },
  hiit: { showFocus: false, showIntensity: true, bodyPartsMode: 'only-full-body' },
  cardio: { showFocus: false, showIntensity: true, bodyPartsMode: 'only-full-body' },
  regeneration: { showFocus: false, showIntensity: true, bodyPartsMode: 'hidden' },
  mobility: { showFocus: false, showIntensity: false, bodyPartsMode: 'full' },
  diagnostic: { showFocus: false, showIntensity: false, bodyPartsMode: 'full' },
};

// Body part category mapping
const BODY_PART_CATEGORY_NAMES = ['Celé tělo', 'Horní část', 'Dolní část', 'Břicho'];

interface CompactTagGridSelectorProps {
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
  className?: string;
}

export function CompactTagGridSelector({
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
  className,
}: CompactTagGridSelectorProps) {
  const { data: tags = [] } = useTags();
  const [showExpandedModal, setShowExpandedModal] = useState(false);

  // Rozdělit tagy podle typu a převést na dropdown options
  const tagOptions = useMemo(() => {
    const focus: TagOption[] = tags
      .filter((t) => t.tag_type === 'focus')
      .map((t) => ({ id: t.id, label: t.name }));
    
    const intensity: TagOption[] = tags
      .filter((t) => t.tag_type === 'intensity')
      .map((t) => ({ id: t.id, label: t.name }));
    
    // Body parts - only show top-level categories in compact view
    const bodyPart: TagOption[] = tags
      .filter((t) => t.tag_type === 'body_part' && BODY_PART_CATEGORY_NAMES.includes(t.name))
      .map((t) => ({ id: t.id, label: t.name }));
    
    return { focus, intensity, bodyPart };
  }, [tags]);

  // Získat aktuální nastavení viditelnosti podle typu tréninku
  const visibility = useMemo<TagVisibility>(() => {
    return TAG_VISIBILITY_BY_TYPE[trainingType || 'strength'] || TAG_VISIBILITY_BY_TYPE.strength;
  }, [trainingType]);

  // Get names for additional selections badge
  const getTagName = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    return tag?.name || '';
  };

  // Count additional selections that aren't shown in dropdowns
  const additionalFocusCount = focusTagIds.length > 1 ? focusTagIds.length - 1 : 0;
  const additionalBodyPartCount = bodyPartTagIds.length > 1 ? bodyPartTagIds.length - 1 : 0;

  // Primary selected value (first in array for multi-select)
  const primaryFocusId = focusTagIds[0] || null;
  const primaryBodyPartId = bodyPartTagIds[0] || null;

  // Handle single selection change for focus (compact mode shows first only)
  const handleFocusChange = (id: string | null) => {
    if (id) {
      // If selecting new, replace first but keep others
      if (focusTagIds.length > 1) {
        onFocusTagsChange([id, ...focusTagIds.slice(1)]);
      } else {
        onFocusTagsChange([id]);
      }
    } else {
      // Remove first, keep others
      onFocusTagsChange(focusTagIds.slice(1));
    }
  };

  // Handle single selection change for body part (compact mode shows first only)
  const handleBodyPartChange = (id: string | null) => {
    if (id) {
      if (bodyPartTagIds.length > 1) {
        onBodyPartTagsChange([id, ...bodyPartTagIds.slice(1)]);
      } else {
        onBodyPartTagsChange([id]);
      }
    } else {
      onBodyPartTagsChange(bodyPartTagIds.slice(1));
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with "Více" button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Klasifikace</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExpandedModal(true)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80"
        >
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          Více
        </Button>
      </div>

      {/* 4-dropdown grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Typ tréninku - always visible */}
        <TagDropdownSelect
          label="Typ"
          options={TRAINING_TYPES}
          value={trainingType}
          onChange={(val) => val && onTrainingTypeChange(val)}
          placeholder="Typ..."
          allowClear={false}
        />

        {/* Zaměření - conditional */}
        {visibility.showFocus ? (
          <div className="relative">
            <TagDropdownSelect
              label="Zaměření"
              options={tagOptions.focus}
              value={primaryFocusId}
              onChange={handleFocusChange}
              placeholder="Zaměření..."
            />
            {additionalFocusCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-accent text-accent-foreground"
              >
                +{additionalFocusCount}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Zaměření
            </span>
            <div className="h-9 flex items-center px-2 bg-muted/30 rounded-xl text-xs text-muted-foreground">
              —
            </div>
          </div>
        )}

        {/* Intenzita - conditional */}
        {visibility.showIntensity ? (
          <TagDropdownSelect
            label="Intenzita"
            options={tagOptions.intensity}
            value={intensityTagId}
            onChange={onIntensityTagChange}
            placeholder="Intenzita..."
          />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Intenzita
            </span>
            <div className="h-9 flex items-center px-2 bg-muted/30 rounded-xl text-xs text-muted-foreground">
              —
            </div>
          </div>
        )}

        {/* Partie těla - conditional */}
        {visibility.bodyPartsMode === 'full' ? (
          <BodyPartDropdownSelect
            bodyPartTagIds={bodyPartTagIds}
            onBodyPartTagsChange={onBodyPartTagsChange}
          />
        ) : visibility.bodyPartsMode === 'only-full-body' ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Partie
            </span>
            <div className="h-9 flex items-center px-2 bg-primary/10 rounded-xl text-xs text-primary font-medium">
              ✓ Celé tělo
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Partie
            </span>
            <div className="h-9 flex items-center px-2 bg-muted/30 rounded-xl text-xs text-muted-foreground">
              —
            </div>
          </div>
        )}
      </div>

      {/* Inline RPE selector */}
      <InlineRPESelector
        value={coachRPE}
        onChange={onCoachRPEChange}
        showDescription={true}
      />

      {/* Validation warning */}
      {trainingStatus === 'completed' && !coachRPE && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning flex items-center gap-2 animate-pulse">
          <span className="text-base">⚠️</span>
          <span>RPE je povinné pro dokončené tréninky</span>
        </div>
      )}

      {/* Expanded modal */}
      <ExpandedTagModal
        open={showExpandedModal}
        onOpenChange={setShowExpandedModal}
        trainingType={trainingType}
        focusTagIds={focusTagIds}
        intensityTagId={intensityTagId}
        bodyPartTagIds={bodyPartTagIds}
        coachRPE={coachRPE}
        onTrainingTypeChange={onTrainingTypeChange}
        onFocusTagsChange={onFocusTagsChange}
        onIntensityTagChange={onIntensityTagChange}
        onBodyPartTagsChange={onBodyPartTagsChange}
        onCoachRPEChange={onCoachRPEChange}
      />
    </div>
  );
}
