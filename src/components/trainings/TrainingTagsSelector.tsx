/**
 * Training Tags Selector Component with Presets
 * 
 * A popover-based component for selecting and creating tags for training sessions.
 * Features:
 * - Display of currently selected tags with removal option
 * - Quick preset tag combinations (Silový, Regenerační, Kondiční)
 * - Category-grouped tag selection
 * - Validation feedback for missing required tags
 */

import { useState, useMemo } from "react";
import { X, Plus, Check, ChevronDown, Zap, Heart, Dumbbell, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTags, useCreateTag, Tag, TagType, TAG_TYPE_LABELS, TAG_TYPE_COLORS } from "@/hooks/useTags";
import { validateTrainingTags } from "@/hooks/useTrainingTagValidation";
import { TagValidationInline } from "@/components/trainings/TagValidationAlert";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface TrainingTagsSelectorProps {
  /** Array of currently selected tag IDs */
  selectedTagIds: string[];
  /** Callback when selection changes */
  onChange: (tagIds: string[]) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Show validation errors */
  showValidation?: boolean;
  /** Training type for conditional validation (hiit, cardio skip focus requirement) */
  trainingType?: string | null;
}

interface TagPreset {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  tagNames: { type: TagType; name: string }[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Quick preset combinations for common training types
 */
const TAG_PRESETS: TagPreset[] = [
  {
    name: "Silový trénink",
    icon: <Dumbbell className="w-4 h-4" />,
    color: "#ef4444",
    description: "Síla + Těžký + Celé tělo",
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Těžký" },
      { type: "body_part", name: "Horní část" },
    ],
  },
  {
    name: "Regenerační trénink",
    icon: <Heart className="w-4 h-4" />,
    color: "#22c55e",
    description: "Mobilita + Lehký + Celé tělo",
    tagNames: [
      { type: "focus", name: "Mobilita" },
      { type: "intensity", name: "Lehký" },
      { type: "body_part", name: "Core" },
    ],
  },
  {
    name: "Kondiční trénink",
    icon: <Wind className="w-4 h-4" />,
    color: "#0ea5e9",
    description: "Kardio + Střední + Celé tělo",
    tagNames: [
      { type: "focus", name: "Kardio" },
      { type: "intensity", name: "Střední" },
      { type: "body_part", name: "Dolní část" },
    ],
  },
  {
    name: "Horní síla",
    icon: <Zap className="w-4 h-4" />,
    color: "#8b5cf6",
    description: "Síla + Střední + Horní část",
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Střední" },
      { type: "body_part", name: "Horní část" },
    ],
  },
];

const TAG_TYPE_ORDER: TagType[] = ["focus", "intensity", "body_part", "goal", "health", "status", "business"];

/**
 * Generates a random hex color
 */
const generateRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

// ============================================================================
// Component
// ============================================================================

export function TrainingTagsSelector({
  selectedTagIds,
  onChange,
  className,
  showValidation = false,
  trainingType,
}: TrainingTagsSelectorProps) {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<TagType>("focus");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<TagType>>(
    new Set(["focus", "intensity", "body_part"])
  );

  // Derived state
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const validation = useMemo(() => 
    validateTrainingTags(selectedTagIds, tags, trainingType), 
    [selectedTagIds, tags, trainingType]
  );

  // Group tags by type
  const tagsByType = useMemo(() => {
    return TAG_TYPE_ORDER.reduce((acc, type) => {
      acc[type] = tags.filter(t => t.tag_type === type);
      return acc;
    }, {} as Record<TagType, Tag[]>);
  }, [tags]);

  // ========================================
  // Event Handlers
  // ========================================

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    
    const result = await createTag.mutateAsync({ 
      name: trimmedName, 
      color: TAG_TYPE_COLORS[newTagType] || generateRandomColor(),
      tag_type: newTagType,
    });
    
    if (result) {
      onChange([...selectedTagIds, result.id]);
      setNewTagName("");
    }
  };

  const handleApplyPreset = async (preset: TagPreset) => {
    const newTagIds: string[] = [];
    
    for (const tagDef of preset.tagNames) {
      // Find existing tag or skip
      const existingTag = tags.find(
        t => t.name.toLowerCase() === tagDef.name.toLowerCase() && t.tag_type === tagDef.type
      );
      
      if (existingTag) {
        newTagIds.push(existingTag.id);
      } else {
        // Create new tag
        const result = await createTag.mutateAsync({
          name: tagDef.name,
          color: TAG_TYPE_COLORS[tagDef.type],
          tag_type: tagDef.type,
        });
        if (result) {
          newTagIds.push(result.id);
        }
      }
    }
    
    // Replace current selection with preset
    onChange(newTagIds);
  };

  const toggleTypeExpanded = (type: TagType) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTag();
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedTags.map(tag => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{ 
              backgroundColor: `${tag.color}20`,
              borderColor: tag.color,
              color: tag.color 
            }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleToggleTag(tag.id)}
              className="ml-1 p-0.5 rounded-full hover:bg-background/50 transition-colors"
              aria-label={`Odebrat štítek ${tag.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        {/* Add tag popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
            >
              <Plus className="w-3 h-3" />
              Přidat štítek
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              {/* Quick presets */}
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Rychlé sady
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TAG_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleApplyPreset(preset);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    style={{ borderColor: `${preset.color}40` }}
                  >
                    <div 
                      className="p-1.5 rounded-md"
                      style={{ backgroundColor: `${preset.color}20`, color: preset.color }}
                    >
                      {preset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{preset.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
              {/* Tags by category */}
              {TAG_TYPE_ORDER.map((type) => {
                const typeTags = tagsByType[type] || [];
                if (typeTags.length === 0 && !["focus", "intensity", "body_part"].includes(type)) {
                  return null;
                }

                return (
                  <Collapsible
                    key={type}
                    open={expandedTypes.has(type)}
                    onOpenChange={() => toggleTypeExpanded(type)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: TAG_TYPE_COLORS[type] }} 
                        />
                        <span className="text-xs font-medium">{TAG_TYPE_LABELS[type]}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {typeTags.length}
                        </Badge>
                      </div>
                      <ChevronDown className={cn(
                        "w-3 h-3 text-muted-foreground transition-transform",
                        expandedTypes.has(type) && "rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {typeTags.map(tag => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleTag(tag.id);
                              }}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-all",
                                isSelected && "ring-2 ring-offset-1 ring-offset-background"
                              )}
                              style={{ 
                                backgroundColor: isSelected ? `${tag.color}30` : `${tag.color}10`,
                                borderColor: tag.color,
                                color: tag.color,
                                // @ts-ignore
                                "--tw-ring-color": tag.color,
                              }}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {tag.name}
                            </button>
                          );
                        })}
                        {typeTags.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Žádné tagy
                          </span>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Create new tag */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Vytvořit nový</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Název..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || createTag.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Načítám štítky...
              </p>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Validation feedback */}
      {showValidation && (
        <TagValidationInline missingTypes={validation.missingTypes} />
      )}
    </div>
  );
}
