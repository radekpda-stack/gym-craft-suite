import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, Tag } from '@/hooks/useTags';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
];

export function TagsManagement() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const resetForm = () => {
    setName('');
    setColor('#6366f1');
    setEditingTag(null);
  };

  const handleCreate = async () => {
    if (!name) return;
    
    await createTag.mutateAsync({ name, color });
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingTag || !name) return;

    await updateTag.mutateAsync({
      id: editingTag.id,
      name,
      color,
    });

    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteTag.mutateAsync(id);
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Tagy</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Název</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Název tagu"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Barva</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createTag.isPending} className="w-full">
                Vytvořit tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50"
          >
            {editingTag?.id === tag.id ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-28 h-8"
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      className={`w-5 h-5 rounded-full ${color === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={handleUpdate} disabled={updateTag.isPending}>
                  ✓
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  ✕
                </Button>
              </>
            ) : (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium text-foreground">{tag.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEdit(tag)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => handleDelete(tag.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && !isLoading && (
          <p className="text-muted-foreground">Zatím žádné tagy</p>
        )}
      </div>
    </div>
  );
}
