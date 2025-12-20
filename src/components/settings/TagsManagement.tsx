import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Shield, Zap, CreditCard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, Tag, TagType, TAG_TYPE_LABELS, TAG_TYPE_COLORS } from '@/hooks/useTags';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
];

const TAG_TYPES: TagType[] = ['focus', 'body_part', 'intensity', 'goal', 'health', 'status', 'business'];

export function TagsManagement() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [tagType, setTagType] = useState<TagType>('focus');
  const [affectsLoad, setAffectsLoad] = useState(true);
  const [affectsCredit, setAffectsCredit] = useState(true);

  // Collapsed sections state
  const [expandedTypes, setExpandedTypes] = useState<Set<TagType>>(new Set(['focus', 'body_part', 'intensity']));

  const resetForm = () => {
    setName('');
    setColor('#6366f1');
    setTagType('focus');
    setAffectsLoad(true);
    setAffectsCredit(true);
    setEditingTag(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    await createTag.mutateAsync({ 
      name: name.trim(), 
      color,
      tag_type: tagType,
      affects_load: affectsLoad,
      affects_credit: affectsCredit,
    });
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingTag || !name.trim()) return;

    await updateTag.mutateAsync({
      id: editingTag.id,
      name: name.trim(),
      color,
      tag_type: tagType,
      affects_load: affectsLoad,
      affects_credit: affectsCredit,
    });

    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteTagId) return;
    await deleteTag.mutateAsync(deleteTagId);
    setDeleteTagId(null);
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setTagType(tag.tag_type);
    setAffectsLoad(tag.affects_load);
    setAffectsCredit(tag.affects_credit);
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

  // Group tags by type
  const tagsByType = TAG_TYPES.reduce((acc, type) => {
    acc[type] = tags.filter(t => t.tag_type === type);
    return acc;
  }, {} as Record<TagType, Tag[]>);

  const tagToDelete = tags.find(t => t.id === deleteTagId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Tagy</h3>
          <p className="text-sm text-muted-foreground">
            Spravujte tagy pro tréninky, klienty a transakce
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nový tag</DialogTitle>
              <DialogDescription>
                Vytvořte nový tag pro kategorizaci tréninků a klientů.
              </DialogDescription>
            </DialogHeader>
            <TagForm
              name={name}
              setName={setName}
              color={color}
              setColor={setColor}
              tagType={tagType}
              setTagType={setTagType}
              affectsLoad={affectsLoad}
              setAffectsLoad={setAffectsLoad}
              affectsCredit={affectsCredit}
              setAffectsCredit={setAffectsCredit}
              onSubmit={handleCreate}
              isPending={createTag.isPending}
              submitLabel="Vytvořit tag"
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {TAG_TYPES.map((type) => {
            const typeTags = tagsByType[type];
            if (typeTags.length === 0 && !['focus', 'body_part', 'intensity'].includes(type)) return null;
            
            return (
              <Collapsible
                key={type}
                open={expandedTypes.has(type)}
                onOpenChange={() => toggleTypeExpanded(type)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-3 rounded-lg glass-subtle hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: TAG_TYPE_COLORS[type] }} 
                      />
                      <span className="font-medium text-sm">{TAG_TYPE_LABELS[type]}</span>
                      <Badge variant="secondary" className="text-xs">
                        {typeTags.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedTypes.has(type) && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1 pl-2">
                  {typeTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 pl-4">
                      Žádné tagy v této kategorii
                    </p>
                  ) : (
                    typeTags.map((tag) => (
                      <TagRow
                        key={tag.id}
                        tag={tag}
                        isEditing={editingTag?.id === tag.id}
                        editState={{
                          name, setName, color, setColor, tagType, setTagType,
                          affectsLoad, setAffectsLoad, affectsCredit, setAffectsCredit,
                        }}
                        onStartEdit={() => startEdit(tag)}
                        onCancelEdit={resetForm}
                        onSaveEdit={handleUpdate}
                        onDelete={() => setDeleteTagId(tag.id)}
                        isPending={updateTag.isPending}
                      />
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTagId} onOpenChange={(open) => !open && setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat tag?</AlertDialogTitle>
            <AlertDialogDescription>
              {tagToDelete?.is_system ? (
                "Systémové tagy nelze smazat."
              ) : (
                `Opravdu chcete smazat tag "${tagToDelete?.name}"? Tag bude odstraněn ze všech tréninků a klientů.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            {!tagToDelete?.is_system && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Smazat
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Tag Form Component
// ============================================================================

interface TagFormProps {
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  tagType: TagType;
  setTagType: (v: TagType) => void;
  affectsLoad: boolean;
  setAffectsLoad: (v: boolean) => void;
  affectsCredit: boolean;
  setAffectsCredit: (v: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}

function TagForm({
  name, setName, color, setColor, tagType, setTagType,
  affectsLoad, setAffectsLoad, affectsCredit, setAffectsCredit,
  onSubmit, isPending, submitLabel,
}: TagFormProps) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Název</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Název tagu"
          className="mt-2"
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
      </div>

      <div>
        <Label>Typ tagu</Label>
        <Select value={tagType} onValueChange={(v) => setTagType(v as TagType)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAG_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: TAG_TYPE_COLORS[type] }} 
                  />
                  {TAG_TYPE_LABELS[type]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Barva</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "w-8 h-8 rounded-full transition-all hover:scale-110",
                color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="affects-load" className="font-normal">
              Ovlivňuje zátěž
            </Label>
          </div>
          <Switch
            id="affects-load"
            checked={affectsLoad}
            onCheckedChange={setAffectsLoad}
          />
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Pokud vypnuto, trénink s tímto tagem nezvýší tréninkovou zátěž
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="affects-credit" className="font-normal">
              Ovlivňuje kredit
            </Label>
          </div>
          <Switch
            id="affects-credit"
            checked={affectsCredit}
            onCheckedChange={setAffectsCredit}
          />
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Pokud vypnuto, trénink s tímto tagem nesníží kredit klienta
        </p>
      </div>

      <Button 
        onClick={onSubmit} 
        disabled={isPending || !name.trim()} 
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  );
}

// ============================================================================
// Tag Row Component
// ============================================================================

interface TagRowProps {
  tag: Tag;
  isEditing: boolean;
  editState: {
    name: string;
    setName: (v: string) => void;
    color: string;
    setColor: (v: string) => void;
    tagType: TagType;
    setTagType: (v: TagType) => void;
    affectsLoad: boolean;
    setAffectsLoad: (v: boolean) => void;
    affectsCredit: boolean;
    setAffectsCredit: (v: boolean) => void;
  };
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

function TagRow({
  tag,
  isEditing,
  editState,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isPending,
}: TagRowProps) {
  if (isEditing) {
    return (
      <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: editState.color }}
          />
          <Input
            value={editState.name}
            onChange={(e) => editState.setName(e.target.value)}
            className="flex-1 h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={editState.tagType} onValueChange={(v) => editState.setTagType(v as TagType)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAG_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TAG_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            {PRESET_COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "w-5 h-5 rounded-full transition-all hover:scale-110",
                  editState.color === c && "ring-2 ring-offset-1 ring-offset-background ring-primary"
                )}
                style={{ backgroundColor: c }}
                onClick={() => editState.setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <Switch
              checked={editState.affectsLoad}
              onCheckedChange={editState.setAffectsLoad}
              className="scale-75"
            />
            <span className="text-muted-foreground">Zátěž</span>
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={editState.affectsCredit}
              onCheckedChange={editState.setAffectsCredit}
              className="scale-75"
            />
            <span className="text-muted-foreground">Kredit</span>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onCancelEdit}
          >
            <X className="w-4 h-4 mr-1" />
            Zrušit
          </Button>
          <Button 
            size="sm"
            onClick={onSaveEdit} 
            disabled={isPending || !editState.name.trim()}
          >
            <Check className="w-4 h-4 mr-1" />
            Uložit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 group transition-colors">
      <div
        className="w-4 h-4 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      <span className="flex-1 text-sm font-medium text-foreground">{tag.name}</span>
      
      {/* Status indicators */}
      <div className="flex items-center gap-1">
        {tag.is_system && (
          <Badge variant="outline" className="text-xs gap-1 h-5">
            <Shield className="w-3 h-3" />
            Systém
          </Badge>
        )}
        {!tag.affects_load && (
          <Badge variant="secondary" className="text-xs h-5" title="Neovlivňuje zátěž">
            <Zap className="w-3 h-3 opacity-50" />
          </Badge>
        )}
        {!tag.affects_credit && (
          <Badge variant="secondary" className="text-xs h-5" title="Neovlivňuje kredit">
            <CreditCard className="w-3 h-3 opacity-50" />
          </Badge>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onStartEdit}
          disabled={tag.is_system}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          disabled={tag.is_system}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
