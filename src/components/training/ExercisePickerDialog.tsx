import { useState, useMemo } from 'react';
import { useExerciseSearch, searchExercises } from '@/hooks/useExerciseAliases';
import { useExerciseBodyPartCategories, useBodyPartCategories, BODY_PART_LABELS, BODY_PART_COLORS } from '@/hooks/useBodyPartCategories';
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
import { Search, Loader2, Dumbbell, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const { data: exerciseIndex = [], isLoading } = useExerciseSearch();
  const { categories: bodyPartCategories } = useBodyPartCategories();
  
  // Get all exercise IDs for body part lookup
  const exerciseIds = useMemo(() => exerciseIndex.map(e => e.id), [exerciseIndex]);
  const { exerciseMatchesFilter, getExerciseBodyParts } = useExerciseBodyPartCategories(exerciseIds);

  const filteredExercises = useMemo(() => {
    let results = exerciseIndex;
    
    // Apply text search
    if (searchQuery.trim()) {
      results = searchExercises(results, searchQuery);
    }
    
    // Apply body part filter
    if (selectedBodyParts.length > 0) {
      results = results.filter(ex => exerciseMatchesFilter(ex.id, selectedBodyParts));
    }
    
    return results.slice(0, 50);
  }, [exerciseIndex, searchQuery, selectedBodyParts, exerciseMatchesFilter]);

  const handleSelect = (exercise: typeof exerciseIndex[0]) => {
    onSelect({
      id: exercise.id,
      name: exercise.name_cs || exercise.name,
    });
    setSearchQuery('');
    setSelectedBodyParts([]);
  };

  const toggleBodyPart = (key: string) => {
    setSelectedBodyParts(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
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

        <div className="space-y-3">
          {/* Search */}
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

          {/* Body Part Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {bodyPartCategories.map((bp) => (
              <Badge
                key={bp.key}
                variant={selectedBodyParts.includes(bp.key) ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedBodyParts.includes(bp.key) && BODY_PART_COLORS[bp.key]
                )}
                onClick={() => toggleBodyPart(bp.key)}
              >
                {bp.name_cs}
              </Badge>
            ))}
            {selectedBodyParts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={() => setSelectedBodyParts([])}
              >
                Zrušit filtr
              </Button>
            )}
          </div>
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
                const bodyParts = getExerciseBodyParts(exercise.id);
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
                        {bodyParts.map(bp => (
                          <Badge 
                            key={bp} 
                            variant="outline" 
                            className={cn("text-xs", BODY_PART_COLORS[bp])}
                          >
                            {BODY_PART_LABELS[bp]}
                          </Badge>
                        ))}
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
