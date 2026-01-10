import { StickyNote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NoteEditor } from './NoteEditor';
import { useCreateTrainerNote, useUpdateTrainerNote, TrainerNote } from '@/hooks/useTrainerNotes';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface NoteCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  note?: TrainerNote | null;
  onSuccess?: (note: TrainerNote) => void;
}

export function NoteCreateDialog({
  open,
  onOpenChange,
  defaultClientId,
  note,
  onSuccess,
}: NoteCreateDialogProps) {
  const createNote = useCreateTrainerNote();
  const updateNote = useUpdateTrainerNote();
  const isMobile = useIsMobile();

  const isEditing = !!note;

  const handleSave = async (data: {
    title?: string;
    content: string;
    client_id?: string | null;
    is_pinned: boolean;
  }) => {
    try {
      let savedNote: TrainerNote;

      if (isEditing && note) {
        savedNote = await updateNote.mutateAsync({
          id: note.id,
          title: data.title,
          content: data.content,
          client_id: data.client_id,
          is_pinned: data.is_pinned,
        });
        toast({ title: 'Poznámka aktualizována' });
      } else {
        savedNote = await createNote.mutateAsync({
          title: data.title,
          content: data.content,
          client_id: data.client_id,
          is_pinned: data.is_pinned,
        });
        toast({ title: 'Poznámka vytvořena' });
      }

      onOpenChange(false);
      onSuccess?.(savedNote);
      return savedNote;
    } catch (error) {
      toast({
        title: 'Chyba',
        description: isEditing ? 'Nepodařilo se uložit poznámku' : 'Nepodařilo se vytvořit poznámku',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const content = (
    <NoteEditor
      note={note}
      defaultClientId={defaultClientId}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={createNote.isPending || updateNote.isPending}
    />
  );

  const title = (
    <div className="flex items-center gap-2">
      <StickyNote className="w-5 h-5 text-primary" />
      {isEditing ? 'Upravit poznámku' : 'Nová poznámka'}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
