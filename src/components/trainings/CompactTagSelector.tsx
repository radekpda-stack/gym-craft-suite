/**
 * Compact Tag Selector for Complete Training Dialog
 * 
 * Redesigned with 2x2 preset grid, 3-column dropdown selectors,
 * and removable tag chips for better mobile UX.
 */

import { useMemo } from "react";
import { X, Dumbbell, Heart, Wind, Zap, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTags, useCreateTag, Tag, TagType, TAG_TYPE_COLORS } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { TagDropdownSelect } from "./TagDropdownSelect";

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
    icon: <Dumbbell className="w-4 h-4" />,
    color: "#ef4444",
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Těžký" },
      { type: "body_part", name: "Horní část" },
    ],
  },
  {
    name: "Regenerace",
    icon: <Heart className="w-4 h-4" />,
    color: "#22c55e",
    tagNames: [
      { type: "focus", name: "Mobilita" },
      { type: "intensity", name: "Lehký" },
      { type: "body_part", name: "Core" },
    ],
  },
  {
    name: "Kondice",
    icon: <Wind className="w-4 h-4" />,
    color: "#0ea5e9",
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
    tagNames: [
      { type: "focus", name: "Síla" },
      { type: "intensity", name: "Střední" },
      { type: "body_part", name: "Horní část" },
    ],
  },
];

// Main body part categories for dropdown
const BODY_PART_CATEGORIES = ["Celé tělo", "Horní část", "Dolní část", "Core"];

export function CompactTagSelector({
  selectedTagIds,
  onChange,
  trainingType,
  missingTypes = [],
}: CompactTagSelectorProps) {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Group tags by type
  const focusTags = useMemo(() => tags.filter(t => t.tag_type === 'focus'), [tags]);
  const intensityTags = useMemo(() => tags.filter(t => t.tag_type === 'intensity'), [tags]);
  const bodyPartTags = useMemo(() => 
    tags.filter(t => t.tag_type === 'body_part' && BODY_PART_CATEGORIES.includes(t.name)), 
    [tags]
  );

  // Get currently selected tag for each type
  const selectedFocusId = selectedTagIds.find(id => focusTags.some(t => t.id === id)) || null;
  const selectedIntensityId = selectedTagIds.find(id => intensityTags.some(t => t.id === id)) || null;
  const selectedBodyPartId = selectedTagIds.find(id => bodyPartTags.some(t => t.id === id)) || null;

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

  const handleTagTypeSelect = (type: TagType, newTagId: string | null) => {
    // Remove any existing tag of this type
    const otherTags = selectedTagIds.filter(id => {
      const tag = tags.find(t => t.id === id);
      return tag?.tag_type !== type;
    });
    
    if (newTagId) {
      onChange([...otherTags, newTagId]);
    } else {
      onChange(otherTags);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Načítám...</div>;
  }

  return (
    <div className="space-y-3">
      {/* 2x2 Preset Grid */}
      <div className="grid grid-cols-2 gap-2">
        {TAG_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
              "bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-md hover:-translate-y-0.5",
              "border-border/50"
            )}
          >
            <div 
              className="p-1.5 rounded-lg shrink-0"
              style={{ backgroundColor: `${preset.color}20`, color: preset.color }}
            >
              {preset.icon}
            </div>
            <span className="text-sm font-medium truncate">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            nebo vyberte
          </span>
        </div>
      </div>

      {/* 3-Column Dropdown Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        <TagDropdownSelect
          label={
            <span className="flex items-center gap-1">
              Zaměření
              {missingTypes.includes('focus') && (
                <AlertCircle className="w-3 h-3 text-warning" />
              )}
            </span>
          }
          options={focusTags.map(t => ({ id: t.id, label: t.name }))}
          value={selectedFocusId}
          onChange={(id) => handleTagTypeSelect('focus', id)}
          placeholder="Vybrat"
          className={missingTypes.includes('focus') ? "ring-1 ring-warning/50 rounded-lg" : ""}
          allowClear
        />
        <TagDropdownSelect
          label={
            <span className="flex items-center gap-1">
              Intenzita
              {missingTypes.includes('intensity') && (
                <AlertCircle className="w-3 h-3 text-warning" />
              )}
            </span>
          }
          options={intensityTags.map(t => ({ id: t.id, label: t.name }))}
          value={selectedIntensityId}
          onChange={(id) => handleTagTypeSelect('intensity', id)}
          placeholder="Vybrat"
          className={missingTypes.includes('intensity') ? "ring-1 ring-warning/50 rounded-lg" : ""}
          allowClear
        />
        <TagDropdownSelect
          label={
            <span className="flex items-center gap-1">
              Partie
              {missingTypes.includes('body_part') && (
                <AlertCircle className="w-3 h-3 text-warning" />
              )}
            </span>
          }
          options={bodyPartTags.map(t => ({ id: t.id, label: t.name }))}
          value={selectedBodyPartId}
          onChange={(id) => handleTagTypeSelect('body_part', id)}
          placeholder="Vybrat"
          className={missingTypes.includes('body_part') ? "ring-1 ring-warning/50 rounded-lg" : ""}
          allowClear
        />
      </div>

      {/* Selected Tags as Removable Chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
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
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-background/50 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
