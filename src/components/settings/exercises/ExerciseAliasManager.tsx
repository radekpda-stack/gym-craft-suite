import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, Tag } from 'lucide-react';
import { useExerciseAliases } from '@/hooks/useExerciseAliases';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExerciseAliasManagerProps {
  exerciseId: string;
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseAliasManager({ 
  exerciseId, 
  exerciseName,
  open,
  onOpenChange 
}: ExerciseAliasManagerProps) {
  const [newAlias, setNewAlias] = useState('');
  const { aliases, isLoading, addAlias, removeAlias } = useExerciseAliases(exerciseId);

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    
    await addAlias.mutateAsync({
      exerciseId,
      aliasName: newAlias.trim(),
    });
    
    setNewAlias('');
  };

  const handleRemoveAlias = async (aliasId: string) => {
    await removeAlias.mutateAsync(aliasId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Aliasy cviku
          </DialogTitle>
          <DialogDescription>
            Spravujte alternativní názvy pro cvik "{exerciseName}".
            Tyto aliasy budou použity při vyhledávání.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new alias */}
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
            />
            <Button 
              onClick={handleAddAlias}
              disabled={!newAlias.trim() || addAlias.isPending}
              size="icon"
            >
              {addAlias.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Existing aliases */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : aliases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Žádné aliasy. Přidejte alternativní název pro tento cvik.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <Badge 
                    key={alias.id} 
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {alias.alias_name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-destructive/20"
                      onClick={() => handleRemoveAlias(alias.id)}
                      disabled={removeAlias.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact inline alias manager for use in exercise detail forms
 */
export function InlineAliasManager({ exerciseId }: { exerciseId: string }) {
  const [newAlias, setNewAlias] = useState('');
  const { aliases, isLoading, addAlias, removeAlias } = useExerciseAliases(exerciseId);

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    await addAlias.mutateAsync({
      exerciseId,
      aliasName: newAlias.trim(),
    });
    setNewAlias('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Aliasy (alternativní názvy)
        </CardTitle>
        <CardDescription className="text-xs">
          Slouží pro vyhledávání cviku pod různými názvy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Přidat alias..."
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

        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : aliases.length > 0 ? (
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
          <p className="text-xs text-muted-foreground">Žádné aliasy</p>
        )}
      </CardContent>
    </Card>
  );
}
