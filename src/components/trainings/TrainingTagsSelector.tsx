import { useState } from "react";
import { X, Plus, Tag as TagIcon, Check } from "lucide-react";
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

interface TrainingTagsSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

const DEFAULT_TRAINING_TAGS = [
  { name: "Horní část", color: "#ef4444" },
  { name: "Dolní část", color: "#3b82f6" },
  { name: "Střed těla", color: "#22c55e" },
  { name: "Mobilita", color: "#a855f7" },
  { name: "Síla", color: "#f97316" },
  { name: "Kondice", color: "#06b6d4" },
  { name: "Kardio", color: "#ec4899" },
  { name: "Regenerace", color: "#84cc16" },
];

export function TrainingTagsSelector({
  selectedTagIds,
  onChange,
  className,
}: TrainingTagsSelectorProps) {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    // Find matching default color or use random
    const defaultTag = DEFAULT_TRAINING_TAGS.find(
      t => t.name.toLowerCase() === newTagName.toLowerCase()
    );
    const color = defaultTag?.color || 
      `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    const result = await createTag.mutateAsync({ name: newTagName.trim(), color });
    if (result) {
      onChange([...selectedTagIds, result.id]);
      setNewTagName("");
    }
  };

  const handleCreateDefaultTag = async (defaultTag: { name: string; color: string }) => {
    const result = await createTag.mutateAsync(defaultTag);
    if (result) {
      onChange([...selectedTagIds, result.id]);
    }
  };

  // Find suggested tags that don't exist yet
  const existingTagNames = tags.map(t => t.name.toLowerCase());
  const suggestedTags = DEFAULT_TRAINING_TAGS.filter(
    dt => !existingTagNames.includes(dt.name.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags */}
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
              onClick={() => toggleTag(tag.id)}
              className="ml-1 p-0.5 rounded-full hover:bg-background/50"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
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
              {/* Create new tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nový štítek..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="h-8 text-sm"
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

              {/* Suggested tags */}
              {suggestedTags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Doporučené štítky</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.map(dt => (
                      <button
                        key={dt.name}
                        type="button"
                        onClick={() => handleCreateDefaultTag(dt)}
                        className="px-2 py-1 text-xs rounded-full border border-dashed hover:border-solid transition-all"
                        style={{ 
                          borderColor: dt.color,
                          color: dt.color 
                        }}
                      >
                        + {dt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing tags */}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Existující štítky</p>
                  <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                    {tags.map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
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
                </div>
              )}

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
