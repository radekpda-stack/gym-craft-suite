import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, X, Search, Tag, ChevronRight } from 'lucide-react';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseAliases } from '@/hooks/useExerciseAliases';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function ExerciseAliasManagerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const { exercises = [], isLoading: exercisesLoading } = useExercises();

  const filteredExercises = exercises.filter(ex => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      ex.name.toLowerCase().includes(query) ||
      (ex.name_cs && ex.name_cs.toLowerCase().includes(query))
    );
  }).slice(0, 50);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Hledat cviky..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px]">
        {exercisesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Žádné cviky nenalezeny</p>
        ) : (
          <div className="space-y-1">
            {filteredExercises.map((exercise) => (
              <ExerciseAliasRow
                key={exercise.id}
                exerciseId={exercise.id}
                exerciseName={exercise.name_cs || exercise.name}
                isOpen={selectedExerciseId === exercise.id}
                onToggle={() => setSelectedExerciseId(
                  selectedExerciseId === exercise.id ? null : exercise.id
                )}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ExerciseAliasRow({ 
  exerciseId, 
  exerciseName, 
  isOpen, 
  onToggle 
}: { 
  exerciseId: string; 
  exerciseName: string; 
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [newAlias, setNewAlias] = useState('');
  const { aliases, isLoading, addAlias, removeAlias } = useExerciseAliases(isOpen ? exerciseId : null);

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    await addAlias.mutateAsync({
      exerciseId,
      aliasName: newAlias.trim(),
    });
    setNewAlias('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-auto py-3 px-3"
        >
          <span className="font-medium">{exerciseName}</span>
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-90"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pr-3 pb-4 space-y-3">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Nový alias..."
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAlias();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  onClick={handleAddAlias}
                  disabled={!newAlias.trim() || addAlias.isPending}
                  size="sm"
                  className="h-8"
                >
                  {addAlias.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {aliases.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {aliases.map((alias) => (
                    <Badge 
                      key={alias.id} 
                      variant="outline"
                      className="gap-1 pr-0.5 text-xs"
                    >
                      {alias.alias_name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => removeAlias.mutate(alias.id)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Žádné aliasy
                </p>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
