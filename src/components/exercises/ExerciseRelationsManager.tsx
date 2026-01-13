import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, RefreshCw, Zap, Plus, X, Link2, Wand2, Loader2 } from 'lucide-react';
import { useExercises, useExerciseRelations, type RelationType } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  progression: {
    label: 'Progrese',
    icon: <ArrowRight className="w-3 h-3" />,
    color: 'bg-success/10 text-success border-success/30',
    description: 'Těžší varianta cviku',
  },
  regression: {
    label: 'Regrese',
    icon: <ArrowLeft className="w-3 h-3" />,
    color: 'bg-accent/10 text-accent border-accent/30',
    description: 'Jednodušší varianta cviku',
  },
  variant: {
    label: 'Varianta',
    icon: <RefreshCw className="w-3 h-3" />,
    color: 'bg-primary/10 text-primary border-primary/30',
    description: 'Podobná varianta cviku',
  },
  alternative: {
    label: 'Alternativa',
    icon: <Zap className="w-3 h-3" />,
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Záměnný cvik',
  },
  prep: {
    label: 'Příprava',
    icon: <Link2 className="w-3 h-3" />,
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Přípravný cvik',
  },
};

interface ExerciseRelationsManagerProps {
  exerciseId: string;
  exerciseName: string;
  readonly?: boolean;
}

export function ExerciseRelationsManager({ exerciseId, exerciseName, readonly = false }: ExerciseRelationsManagerProps) {
  const { exercises } = useExercises();
  const { relations, isLoading, addRelation, removeRelation } = useExerciseRelations(exerciseId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedRelationType, setSelectedRelationType] = useState<RelationType>('variant');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const activeExercises = exercises.filter(e => !e.is_archived && e.id !== exerciseId);

  // Get current exercise
  const currentExercise = exercises.find(e => e.id === exerciseId);

  // Get exercise name by id
  const getExerciseName = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    return ex?.name_cs || ex?.name || 'Neznámý cvik';
  };

  // Find related exercises based on subcategory
  const findRelatedExercises = () => {
    if (!currentExercise) return [];
    
    const existingRelatedIds = new Set(relations.map(r => r.related_exercise_id));
    
    return activeExercises.filter(ex => {
      // Don't suggest already related exercises
      if (existingRelatedIds.has(ex.id)) return false;
      
      // Same subcategory = variant
      if (currentExercise.subcategory && ex.subcategory === currentExercise.subcategory) {
        return true;
      }
      
      // Same category = alternative
      if (currentExercise.category && ex.category === currentExercise.category) {
        return true;
      }
      
      return false;
    });
  };

  // Auto-generate relations
  const handleAutoGenerate = async () => {
    if (!currentExercise) return;
    
    setIsGenerating(true);
    let addedCount = 0;
    
    try {
      const existingRelatedIds = new Set(relations.map(r => r.related_exercise_id));
      
      // Find exercises in same subcategory (variants)
      const sameSubcategory = currentExercise.subcategory 
        ? activeExercises.filter(ex => 
            ex.subcategory === currentExercise.subcategory && 
            !existingRelatedIds.has(ex.id)
          )
        : [];
      
      // Add variant relations (max 5)
      for (const ex of sameSubcategory.slice(0, 5)) {
        await addRelation.mutateAsync({
          exercise_id: exerciseId,
          related_exercise_id: ex.id,
          relation_type: 'variant',
          note_cs: null,
          note_en: null,
        });
        addedCount++;
        existingRelatedIds.add(ex.id);
      }
      
      // Find exercises in same category but different subcategory (alternatives)
      const sameCategory = activeExercises.filter(ex => 
        ex.category === currentExercise.category && 
        ex.subcategory !== currentExercise.subcategory &&
        !existingRelatedIds.has(ex.id)
      );
      
      // Add alternative relations (max 3)
      for (const ex of sameCategory.slice(0, 3)) {
        await addRelation.mutateAsync({
          exercise_id: exerciseId,
          related_exercise_id: ex.id,
          relation_type: 'alternative',
          note_cs: null,
          note_en: null,
        });
        addedCount++;
      }
      
      toast({
        title: 'Vztahy vygenerovány',
        description: `Přidáno ${addedCount} nových vztahů`,
      });
    } catch {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vygenerovat vztahy',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRelation = async () => {
    if (!selectedExerciseId) return;
    
    await addRelation.mutateAsync({
      exercise_id: exerciseId,
      related_exercise_id: selectedExerciseId,
      relation_type: selectedRelationType,
      note_cs: null,
      note_en: null,
    });
    
    setShowAddDialog(false);
    setSelectedExerciseId('');
    setSelectedRelationType('variant');
  };

  const handleRemoveRelation = async (relationId: string) => {
    await removeRelation.mutateAsync(relationId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Vztahy k jiným cvikům
            </CardTitle>
            {!readonly && (
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAutoGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-1" />
                  )}
                  Generovat
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {relations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <p>Žádné vztahy zatím nejsou definovány</p>
              {!readonly && (
                <div className="flex flex-col gap-2 mt-3">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="mx-auto"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Automaticky vygenerovat vztahy
                  </Button>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowAddDialog(true)}
                  >
                    nebo přidat ručně
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {relations.map(relation => {
                const config = RELATION_TYPE_CONFIG[relation.relation_type as RelationType];
                const relatedName = getExerciseName(relation.related_exercise_id);
                
                return (
                  <div
                    key={relation.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge 
                        variant="outline" 
                        className={cn('flex items-center gap-1 shrink-0', config?.color)}
                      >
                        {config?.icon}
                        {config?.label}
                      </Badge>
                      <span className="text-sm truncate">{relatedName}</span>
                    </div>
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveRelation(relation.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Relation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat vztah k cviku</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Propojení pro: <span className="font-medium text-foreground">{exerciseName}</span>
            </div>

            {/* Relation type selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Typ vztahu</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(RELATION_TYPE_CONFIG) as [RelationType, typeof RELATION_TYPE_CONFIG[RelationType]][]).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedRelationType(type)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                      selectedRelationType === type 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Badge variant="outline" className={cn('shrink-0', config.color)}>
                      {config.icon}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vyberte cvik</label>
              <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cvik..." />
                </SelectTrigger>
                <SelectContent>
                  {activeExercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name_cs || ex.name}
                      <span className="text-muted-foreground ml-2">({ex.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleAddRelation} 
              disabled={!selectedExerciseId || addRelation.isPending}
            >
              Přidat vztah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
