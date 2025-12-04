import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { toast } from '@/hooks/use-toast';

const DEFAULT_PAYMENT_TAGS = ['hotovost', 'účet 1', 'účet 2'];

export function PaymentTagsManagement() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  const savedTags = settings?.payment_tags;
  
  const [tags, setTags] = useState<string[]>(DEFAULT_PAYMENT_TAGS);
  const [newTag, setNewTag] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    if (savedTags && Array.isArray(savedTags)) {
      setTags(savedTags as string[]);
    }
  }, [savedTags]);

  const saveTags = async (newTags: string[]) => {
    try {
      await updateSetting.mutateAsync({
        key: 'payment_tags',
        value: newTags,
      });
      setTags(newTags);
    } catch (error) {
      console.error('Error saving payment tags:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se uložit platební tagy.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast({
        title: 'Tag již existuje',
        description: 'Tento platební tag již máte vytvořený.',
        variant: 'destructive',
      });
      return;
    }
    
    await saveTags([...tags, trimmed]);
    setNewTag('');
    toast({
      title: 'Tag přidán',
      description: `Platební tag "${trimmed}" byl přidán.`,
    });
  };

  const handleUpdateTag = async () => {
    if (editingIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    
    const otherTags = tags.filter((_, i) => i !== editingIndex);
    if (otherTags.includes(trimmed)) {
      toast({
        title: 'Tag již existuje',
        description: 'Tento platební tag již máte vytvořený.',
        variant: 'destructive',
      });
      return;
    }

    const newTags = [...tags];
    newTags[editingIndex] = trimmed;
    await saveTags(newTags);
    setEditingIndex(null);
    setEditValue('');
    toast({
      title: 'Tag upraven',
      description: 'Platební tag byl úspěšně přejmenován.',
    });
  };

  const handleDeleteTag = async () => {
    if (deleteIndex === null) return;
    const tagName = tags[deleteIndex];
    const newTags = tags.filter((_, i) => i !== deleteIndex);
    await saveTags(newTags);
    setDeleteIndex(null);
    toast({
      title: 'Tag smazán',
      description: `Platební tag "${tagName}" byl odstraněn.`,
    });
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(tags[index]);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="space-y-4">
      {/* Add new tag */}
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Nový platební tag..."
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <Button 
          onClick={handleAddTag} 
          disabled={!newTag.trim() || updateSetting.isPending}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Přidat
        </Button>
      </div>

      {/* Tags list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : tags.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Zatím žádné platební tagy. Přidejte první tag výše.
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag, index) => (
            <div
              key={`${tag}-${index}`}
              className="flex items-center gap-3 p-3 rounded-xl glass-subtle group"
            >
              {editingIndex === index ? (
                <>
                  <Wallet className="w-4 h-4 text-primary shrink-0" />
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateTag();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={handleUpdateTag} 
                    disabled={updateSetting.isPending || !editValue.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8"
                    onClick={cancelEdit}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 text-sm font-medium text-foreground">{tag}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(index)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteIndex(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat platební tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat platební tag "{deleteIndex !== null ? tags[deleteIndex] : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
