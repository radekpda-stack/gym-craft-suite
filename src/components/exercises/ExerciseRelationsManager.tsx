import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, RefreshCw, Zap, Plus, X, Link2 } from 'lucide-react';
import { useExercises, useExerciseRelations, type RelationType } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';

const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  progression: {
    label: 'Progrese',
    icon: <ArrowRight className="w-3 h-3" />,
    color: 'bg-green-500/10 text-green-600 border-green-500/30',
    description: 'Těžší varianta cviku',
  },
  regression: {
    label: 'Regrese',
    icon: <ArrowLeft className="w-3 h-3" />,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    description: 'Jednodušší varianta cviku',
  },
  variant: {
    label: 'Varianta',
    icon: <RefreshCw className="w-3 h-3" />,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    description: 'Podobná varianta cviku',
  },
  alternative: {
    label: 'Alternativa',
    icon: <Zap className="w-3 h-3" />,
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    description: 'Záměnný cvik',
  },
  prep: {
    label: 'Příprava',
    icon: <Link2 className="w-3 h-3" />,
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
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

  const activeExercises = exercises.filter(e => !e.is_archived && e.id !== exerciseId);

  // Get exercise name by id
  const getExerciseName = (id: string) => {
    const ex = exercises.find(e => e.id === id);
    return ex?.name_cs || ex?.name || 'Neznámý cvik';
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
              <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Přidat
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {relations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <p>Žádné vztahy zatím nejsou definovány</p>
              {!readonly && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setShowAddDialog(true)}
                  className="mt-2"
                >
                  Přidat první vztah
                </Button>
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
