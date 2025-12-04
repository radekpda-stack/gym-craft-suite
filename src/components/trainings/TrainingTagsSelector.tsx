/**
 * Training Tags Selector Component
 * 
 * A popover-based component for selecting and creating tags for training sessions.
 * Features:
 * - Display of currently selected tags with removal option
 * - Quick-add for suggested default training tags
 * - Search and selection from existing tags
 * - Create new custom tags on the fly
 */

import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags, useCreateTag, Tag } from "@/hooks/useTags";
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
}

interface DefaultTag {
  name: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default training tag suggestions with predefined colors
 * These are shown as quick-add options when not yet created
 */
const DEFAULT_TRAINING_TAGS: DefaultTag[] = [
  { name: "Horní část", color: "#ef4444" },
  { name: "Dolní část", color: "#3b82f6" },
  { name: "Střed těla", color: "#22c55e" },
  { name: "Mobilita", color: "#a855f7" },
  { name: "Síla", color: "#f97316" },
  { name: "Kondice", color: "#06b6d4" },
  { name: "Kardio", color: "#ec4899" },
  { name: "Regenerace", color: "#84cc16" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a random hex color
 * @returns Random color in #RRGGBB format
 */
const generateRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

/**
 * Finds a matching default tag color or generates a random one
 * @param tagName - Name of the tag to find color for
 * @returns Hex color string
 */
const getTagColor = (tagName: string): string => {
  const defaultTag = DEFAULT_TRAINING_TAGS.find(
    t => t.name.toLowerCase() === tagName.toLowerCase()
  );
  return defaultTag?.color || generateRandomColor();
};

// ============================================================================
// Component
// ============================================================================

export function TrainingTagsSelector({
  selectedTagIds,
  onChange,
  className,
}: TrainingTagsSelectorProps) {
  // Data fetching
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  
  // Local state
  const [newTagName, setNewTagName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Derived state
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const existingTagNames = tags.map(t => t.name.toLowerCase());
  const suggestedTags = DEFAULT_TRAINING_TAGS.filter(
    dt => !existingTagNames.includes(dt.name.toLowerCase())
  );

  // ========================================
  // Event Handlers
  // ========================================

  /** Toggles a tag's selection state */
  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  /** Creates a new tag from user input */
  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    
    const color = getTagColor(trimmedName);
    const result = await createTag.mutateAsync({ name: trimmedName, color });
    
    if (result) {
      onChange([...selectedTagIds, result.id]);
      setNewTagName("");
    }
  };

  /** Creates a default tag and adds it to selection */
  const handleCreateDefaultTag = async (defaultTag: DefaultTag) => {
    const result = await createTag.mutateAsync(defaultTag);
    if (result) {
      onChange([...selectedTagIds, result.id]);
    }
  };

  /** Handles Enter key press in the input field */
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
          
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              {/* New tag input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nový štítek..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || createTag.isPending}
                  aria-label="Vytvořit štítek"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggested default tags */}
              {suggestedTags.length > 0 && (
                <section>
                  <p className="text-xs text-muted-foreground mb-2">
                    Doporučené štítky
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.map(dt => (
                      <button
                        key={dt.name}
                        type="button"
                        onClick={() => handleCreateDefaultTag(dt)}
                        className="px-2 py-1 text-xs rounded-full border border-dashed hover:border-solid transition-all"
                        style={{ borderColor: dt.color, color: dt.color }}
                      >
                        + {dt.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Existing tags list */}
              {tags.length > 0 && (
                <section>
                  <p className="text-xs text-muted-foreground mb-2">
                    Existující štítky
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                    {tags.map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-all",
                            isSelected && "ring-2 ring-offset-1"
                          )}
                          style={{ 
                            backgroundColor: isSelected ? `${tag.color}30` : `${tag.color}10`,
                            borderColor: tag.color,
                            color: tag.color 
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Loading state */}
              {isLoading && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Načítám štítky...
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
