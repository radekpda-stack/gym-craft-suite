/**
 * Compact Tag Selector for Complete Training Dialog
 * 
 * A simplified, inline tag selector designed for mobile-friendly dialogs.
 * Uses collapsible sections instead of popovers to work well with scrolling.
 */

import { useState, useMemo } from "react";
import { X, Check, ChevronDown, Dumbbell, Heart, Wind, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTags, useCreateTag, Tag, TagType, TAG_TYPE_LABELS, TAG_TYPE_COLORS } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface CompactTagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  trainingType?: string | null;
  missingTypes?: TagType[];
}

interface TagPreset {
  name: string;
  icon: React.ReactNode;
  color: string;
  tagNames: { type: TagType; name: string }[];
}

const TAG_PRESETS: TagPreset[] = [
  {
    name: "Silový",
    icon: <Dumbbell className="w-3.5 h-3.5" />,
    color: "#ef4444",
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Těžký" },
      { type: "body_part", name: "Horní část" },
    ],
  },
  {
    name: "Regenerace",
    icon: <Heart className="w-3.5 h-3.5" />,
    color: "#22c55e",
    tagNames: [
      { type: "focus", name: "Mobilita" },
      { type: "intensity", name: "Lehký" },
      { type: "body_part", name: "Core" },
    ],
  },
  {
    name: "Kondice",
    icon: <Wind className="w-3.5 h-3.5" />,
    color: "#0ea5e9",
    tagNames: [
      { type: "focus", name: "Kardio" },
      { type: "intensity", name: "Střední" },
      { type: "body_part", name: "Dolní část" },
    ],
  },
  {
    name: "Horní síla",
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "#8b5cf6",
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Střední" },
      { type: "body_part", name: "Horní část" },
    ],
  },
];

// Only show essential tag types in the compact view
const ESSENTIAL_TAG_TYPES: TagType[] = ["focus", "intensity", "body_part"];

export function CompactTagSelector({
  selectedTagIds,
  onChange,
  trainingType,
  missingTypes = [],
}: CompactTagSelectorProps) {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  
  // Start with missing types expanded
  const [expandedTypes, setExpandedTypes] = useState<Set<TagType>>(
    new Set(missingTypes.length > 0 ? missingTypes : ["focus"])
  );

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Group tags by type
  const tagsByType = useMemo(() => {
    return ESSENTIAL_TAG_TYPES.reduce((acc, type) => {
      acc[type] = tags.filter(t => t.tag_type === type);
      return acc;
    }, {} as Record<TagType, Tag[]>);
  }, [tags]);

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleApplyPreset = async (preset: TagPreset) => {
    const newTagIds: string[] = [];
    
    for (const tagDef of preset.tagNames) {
      const existingTag = tags.find(
        t => t.name.toLowerCase() === tagDef.name.toLowerCase() && t.tag_type === tagDef.type
      );
      
      if (existingTag) {
        newTagIds.push(existingTag.id);
      } else {
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

  // Check if a type is fulfilled
  const isTypeFulfilled = (type: TagType) => {
    return selectedTags.some(t => t.tag_type === type);
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Načítám...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Quick presets - horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TAG_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 text-xs font-medium transition-colors hover:bg-muted/50"
            style={{ 
              borderColor: `${preset.color}50`,
              color: preset.color 
            }}
          >
            {preset.icon}
            {preset.name}
          </button>
        ))}
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
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
                className="ml-0.5 p-0.5 rounded-full hover:bg-background/50 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag categories - collapsible */}
      <div className="space-y-1">
        {ESSENTIAL_TAG_TYPES.map((type) => {
          const typeTags = tagsByType[type] || [];
          const isMissing = missingTypes.includes(type);
          const isFulfilled = isTypeFulfilled(type);
          
          return (
            <Collapsible
              key={type}
              open={expandedTypes.has(type)}
              onOpenChange={() => toggleTypeExpanded(type)}
            >
              <CollapsibleTrigger className={cn(
                "flex items-center justify-between w-full text-left py-1.5 px-2 rounded-lg transition-colors",
                isMissing && !isFulfilled && "bg-warning/10",
                isFulfilled && "bg-success/10"
              )}>
                <div className="flex items-center gap-2">
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isFulfilled && "ring-2 ring-success ring-offset-1 ring-offset-background"
                    )}
                    style={{ backgroundColor: TAG_TYPE_COLORS[type] }} 
                  />
                  <span className="text-xs font-medium">{TAG_TYPE_LABELS[type]}</span>
                  {isMissing && !isFulfilled && (
                    <span className="text-[10px] text-warning font-medium">povinné</span>
                  )}
                  {isFulfilled && (
                    <Check className="w-3 h-3 text-success" />
                  )}
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform",
                  expandedTypes.has(type) && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1.5 pb-1">
                <div className="flex flex-wrap gap-1 pl-4">
                  {typeTags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-0.5 px-2 py-0.5 text-[11px] rounded-full border transition-all",
                          isSelected && "ring-1 ring-offset-1 ring-offset-background"
                        )}
                        style={{ 
                          backgroundColor: isSelected ? `${tag.color}30` : `${tag.color}10`,
                          borderColor: tag.color,
                          color: tag.color,
                          // @ts-ignore
                          "--tw-ring-color": tag.color,
                        }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
