import { useState, useMemo } from 'react';
import { useExerciseSearch, searchExercises } from '@/hooks/useExerciseAliases';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Dumbbell } from 'lucide-react';

interface ExercisePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: { id: string; name: string }) => void;
}

export function ExercisePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: ExercisePickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: exerciseIndex = [], isLoading } = useExerciseSearch();

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exerciseIndex.slice(0, 50);
    return searchExercises(exerciseIndex, searchQuery).slice(0, 50);
  }, [exerciseIndex, searchQuery]);

  const handleSelect = (exercise: typeof exerciseIndex[0]) => {
    onSelect({
      id: exercise.id,
      name: exercise.name_cs || exercise.name,
    });
    setSearchQuery('');
  };

  // Check if match came via alias
  const getMatchedAlias = (exercise: typeof exerciseIndex[0]) => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const name = (exercise.name_cs || exercise.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (name.includes(query)) return null;
    const matchedAlias = exercise.aliases.find(a => a.normalized.includes(query));
    return matchedAlias?.name || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Vybrat cvik</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat cviky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Žádné cviky nenalezeny</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredExercises.map((exercise) => {
                const matchedAlias = getMatchedAlias(exercise);
                return (
                  <Button
                    key={exercise.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => handleSelect(exercise)}
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium">
                        {exercise.name_cs || exercise.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exercise.category && (
                          <Badge variant="secondary" className="text-xs">
                            {exercise.category}
                          </Badge>
                        )}
                        {matchedAlias && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            alias: {matchedAlias}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
              {exerciseIndex.length > 50 && filteredExercises.length >= 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Zobrazeno 50 z {exerciseIndex.length} výsledků. Upřesněte hledání.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
