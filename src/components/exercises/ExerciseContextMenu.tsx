import { useState } from 'react';
import { MoreVertical, Edit2, Copy, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
import { useExercises, type Exercise } from '@/hooks/useExercises';

interface ExerciseContextMenuProps {
  exercise: Exercise;
  onEdit: () => void;
  onDuplicate: () => void;
}

export function ExerciseContextMenu({ 
  exercise, 
  onEdit, 
  onDuplicate 
}: ExerciseContextMenuProps) {
  const { archiveExercise, deleteExercise } = useExercises();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleArchive = () => {
    archiveExercise.mutate({ id: exercise.id, archived: !exercise.is_archived });
    setShowArchiveConfirm(false);
  };

  const handleDelete = () => {
    deleteExercise.mutate(exercise.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Upravit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplikovat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowArchiveConfirm(true)}
            className={exercise.is_archived ? 'text-green-600' : 'text-orange-600'}
          >
            {exercise.is_archived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Obnovit z archivu
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Archivovat
              </>
            )}
          </DropdownMenuItem>
          {exercise.is_archived && (
            <DropdownMenuItem 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat trvale
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {exercise.is_archived ? 'Obnovit cvik?' : 'Archivovat cvik?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {exercise.is_archived 
                ? `Cvik "${exercise.name_cs || exercise.name}" bude obnoven a opět se zobrazí v knihovně.`
                : `Cvik "${exercise.name_cs || exercise.name}" bude přesunut do archivu. Existující záznamy zůstanou zachovány.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              {exercise.is_archived ? 'Obnovit' : 'Archivovat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat cvik trvale?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Cvik "{exercise.name_cs || exercise.name}" bude trvale smazán.
              Záznamy tréninků s tímto cvikem zůstanou zachovány.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Smazat trvale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
