import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useClientTags, useAddClientTag, useRemoveClientTag } from '@/hooks/useClientTags';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ClientTagsManagerProps {
  clientId: string;
  compact?: boolean;
}

export function ClientTagsManager({ clientId, compact = false }: ClientTagsManagerProps) {
  const { data: clientTags = [], isLoading: tagsLoading } = useClientTags(clientId);
  const { data: allTags = [] } = useTags();
  const addClientTag = useAddClientTag();
  const removeClientTag = useRemoveClientTag();
  const createTag = useCreateTag();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const assignedTagIds = clientTags.map(ct => ct.tag_id);
  const availableTags = allTags.filter(tag => !assignedTagIds.includes(tag.id));

  const handleAddTag = (tagId: string) => {
    addClientTag.mutate({ clientId, tagId });
  };

  const handleRemoveTag = (tagId: string) => {
    removeClientTag.mutate({ clientId, tagId });
  };

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const newTag = await createTag.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
      });
      
      if (newTag) {
        addClientTag.mutate({ clientId, tagId: newTag.id });
      }
      
      setNewTagName('');
      setNewTagColor('#6366f1');
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const colorPresets = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
  ];

  if (tagsLoading) {
    return <div className="h-6 w-20 bg-secondary/50 animate-pulse rounded" />;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1")}>
      {clientTags.map((ct) => ct.tag && (
        <Badge
          key={ct.id}
          style={{ backgroundColor: ct.tag.color + '20', color: ct.tag.color, borderColor: ct.tag.color }}
          className={cn(
            "border font-medium flex items-center gap-1",
            compact ? "text-xs px-1.5 py-0.5" : "text-sm"
          )}
        >
          {ct.tag.name}
          {!compact && (
            <X
              className="w-3 h-3 cursor-pointer hover:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(ct.tag_id);
              }}
            />
          )}
        </Badge>
      ))}
      
      {!compact && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 px-2">
              <Plus className="w-3 h-3" />
              <Tag className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Přidat tag</p>
                
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                        className="border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleAddTag(tag.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {availableTags.length === 0 && clientTags.length === allTags.length && allTags.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Všechny tagy jsou již přiřazeny
                  </p>
                )}
              </div>
              
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Vytvořit nový tag</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Název tagu"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateAndAddTag();
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all",
                          newTagColor === color && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8"
                    disabled={!newTagName.trim() || createTag.isPending}
                    onClick={handleCreateAndAddTag}
                  >
                    Vytvořit a přidat
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
