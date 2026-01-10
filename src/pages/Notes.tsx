import { useState, useMemo } from 'react';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFilters, SortField, SortOrder } from '@/components/notes/NoteFilters';
import { NoteCreateDialog } from '@/components/notes/NoteCreateDialog';
import { NoteDetailSheet } from '@/components/notes/NoteDetailSheet';
import {
  useTrainerNotes,
  useDeleteTrainerNote,
  useToggleNotePin,
  TrainerNote,
} from '@/hooks/useTrainerNotes';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Notes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<TrainerNote | null>(null);
  const [selectedNote, setSelectedNote] = useState<TrainerNote | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useTrainerNotes({
    clientId: clientId || undefined,
    searchQuery: searchQuery || undefined,
    sortBy,
    sortOrder,
    pinnedFirst: true,
  });

  const deleteNote = useDeleteTrainerNote();
  const togglePin = useToggleNotePin();

  const handleEdit = (note: TrainerNote) => {
    setSelectedNote(null);
    setEditingNote(note);
    setShowCreateDialog(true);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast({ title: 'Poznámka smazána' });
      setDeleteNoteId(null);
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat poznámku',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await togglePin.mutateAsync({ id: noteId, isPinned });
      toast({ title: isPinned ? 'Poznámka odepnuta' : 'Poznámka připnuta' });
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se změnit stav připnutí',
        variant: 'destructive',
      });
    }
  };

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleNoteClick = (note: TrainerNote) => {
    setSelectedNote(note);
  };

  const handleCloseCreate = () => {
    setShowCreateDialog(false);
    setEditingNote(null);
  };

  // Stats
  const totalNotes = notes.length;
  const pinnedCount = notes.filter((n) => n.is_pinned).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <StickyNote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Poznámky</h1>
            <p className="text-sm text-muted-foreground">
              {totalNotes} {totalNotes === 1 ? 'poznámka' : totalNotes < 5 ? 'poznámky' : 'poznámek'}
              {pinnedCount > 0 && ` • ${pinnedCount} připnuto`}
            </p>
          </div>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nová poznámka
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <NoteFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          clientId={clientId}
          onClientChange={setClientId}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            {searchQuery || clientId ? 'Žádné poznámky nenalezeny' : 'Zatím nemáte žádné poznámky'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || clientId
              ? 'Zkuste změnit vyhledávání nebo filtry'
              : 'Vytvořte první poznámku pro zaznamenání důležitých informací'}
          </p>
          {!searchQuery && !clientId && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit poznámku
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteNoteId(id)}
              onTogglePin={handleTogglePin}
              onClick={handleNoteClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <NoteCreateDialog
        open={showCreateDialog}
        onOpenChange={handleCloseCreate}
        note={editingNote}
        defaultClientId={clientId}
      />

      {/* Detail sheet */}
      <NoteDetailSheet
        note={selectedNote}
        open={!!selectedNote}
        onOpenChange={(open) => !open && setSelectedNote(null)}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteNoteId(id)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat poznámku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Poznámka a všechna přiložená média budou trvale smazána.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && handleDelete(deleteNoteId)}
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
