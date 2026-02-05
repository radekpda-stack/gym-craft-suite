import { useState } from 'react';
import { Trash2, Archive, Loader2, AlertTriangle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExercises } from '@/hooks/useExercises';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  name_cs?: string | null;
}

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExercises: Exercise[];
  onComplete: () => void;
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedExercises,
  onComplete,
}: BulkDeleteConfirmDialogProps) {
  const { archiveExercise, deleteExercise } = useExercises();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'archive' | 'permanent'>('archive');

  const handleDelete = async () => {
    if (selectedExercises.length === 0) return;

    setIsDeleting(true);
    try {
      if (deleteMode === 'archive') {
        // Archive all selected exercises
        await Promise.all(
          selectedExercises.map((exercise) =>
            archiveExercise.mutateAsync({ id: exercise.id, archived: true })
          )
        );
        toast({
          title: 'Cviky archivovány',
          description: `${selectedExercises.length} cviků bylo přesunuto do archivu.`,
        });
      } else {
        // Permanently delete all selected exercises
        await Promise.all(
          selectedExercises.map((exercise) =>
            deleteExercise.mutateAsync(exercise.id)
          )
        );
        toast({
          title: 'Cviky smazány',
          description: `${selectedExercises.length} cviků bylo trvale smazáno.`,
        });
      }
      onComplete();
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Některé cviky se nepodařilo smazat.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Smazat {selectedExercises.length} cviků?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Vyberte způsob smazání:</p>
              
              {/* Delete mode selection */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={deleteMode === 'archive' ? 'default' : 'outline'}
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => setDeleteMode('archive')}
                >
                  <Archive className="w-5 h-5" />
                  <span className="text-sm font-medium">Archivovat</span>
                  <span className="text-xs text-muted-foreground">
                    Zachová záznamy
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={deleteMode === 'permanent' ? 'destructive' : 'outline'}
                  className="flex-col h-auto py-3 gap-1"
                  onClick={() => setDeleteMode('permanent')}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Smazat trvale</span>
                  <span className="text-xs text-muted-foreground">
                    Nevratné
                  </span>
                </Button>
              </div>

              {/* Warning for permanent delete */}
              {deleteMode === 'permanent' && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  ⚠️ Tato akce je nevratná. Cviky budou trvale smazány, ale záznamy tréninků zůstanou zachovány.
                </div>
              )}

              {/* Selected exercises list */}
              <div>
                <p className="text-sm font-medium mb-2">Vybrané cviky:</p>
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="flex flex-wrap gap-1">
                    {selectedExercises.map((exercise) => (
                      <Badge key={exercise.id} variant="secondary" className="text-xs">
                        {exercise.name_cs || exercise.name}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
          <Button
            variant={deleteMode === 'permanent' ? 'destructive' : 'default'}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleteMode === 'archive' ? 'Archivovat' : 'Smazat trvale'} ({selectedExercises.length})
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}