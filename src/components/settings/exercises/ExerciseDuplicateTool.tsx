import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Merge, AlertTriangle, Check, Search } from 'lucide-react';
import { useMergeExercises, normalizeTextForSearch } from '@/hooks/useExerciseAliases';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DuplicateGroup {
  normalizedName: string;
  exercises: {
    id: string;
    name: string;
    name_cs: string | null;
    search_name: string | null;
    category: string;
    usageCount: number;
  }[];
}

export function ExerciseDuplicateTool() {
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [canonicalId, setCanonicalId] = useState<string>('');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  
  const mergeExercises = useMergeExercises();

  // Find potential duplicates
  const { data: duplicates = [], isLoading } = useQuery({
    queryKey: ['exercise-duplicates'],
    queryFn: async () => {
      // Get all active exercises with their usage count
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select(`
          id, 
          name, 
          name_cs, 
          search_name, 
          category
        `)
        .eq('is_archived', false);

      if (error) throw error;

      // Get usage counts
      const { data: usageCounts } = await supabase
        .from('workout_entries')
        .select('exercise_id')
        .not('exercise_id', 'is', null);

      const usageMap = new Map<string, number>();
      usageCounts?.forEach(entry => {
        const id = entry.exercise_id;
        if (id) usageMap.set(id, (usageMap.get(id) || 0) + 1);
      });

      // Group by normalized name
      const groups = new Map<string, Array<{
        id: string;
        name: string;
        name_cs: string | null;
        search_name: string | null;
        category: string;
        usageCount: number;
      }>>();
      
      exercises?.forEach(ex => {
        const normalized = normalizeTextForSearch(ex.name_cs || ex.name);
        if (!groups.has(normalized)) {
          groups.set(normalized, []);
        }
        groups.get(normalized)!.push({
          id: ex.id,
          name: ex.name,
          name_cs: ex.name_cs,
          search_name: ex.search_name,
          category: ex.category,
          usageCount: usageMap.get(ex.id) || 0,
        });
      });

      // Filter to only groups with duplicates
      const duplicateGroups: DuplicateGroup[] = [];
      groups.forEach((exercises, normalizedName) => {
        if (exercises.length > 1) {
          duplicateGroups.push({
            normalizedName,
            exercises: exercises.sort((a, b) => b.usageCount - a.usageCount),
          });
        }
      });

      return duplicateGroups.sort((a, b) => b.exercises.length - a.exercises.length);
    },
  });

  const handleMerge = async () => {
    if (!selectedGroup || !canonicalId) return;

    const duplicateIds = selectedGroup.exercises
      .filter(ex => ex.id !== canonicalId)
      .map(ex => ex.id);

    // Merge each duplicate into canonical
    for (const duplicateId of duplicateIds) {
      await mergeExercises.mutateAsync({
        canonicalId,
        duplicateId,
      });
    }

    setShowMergeDialog(false);
    setSelectedGroup(null);
    setCanonicalId('');
  };

  const openMergeDialog = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    // Default to the exercise with most usage
    setCanonicalId(group.exercises[0].id);
    setShowMergeDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Detekce duplicit
        </CardTitle>
        <CardDescription>
          Nalezené potenciální duplicitní cviky s podobnými názvy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {duplicates.length === 0 ? (
          <div className="flex items-center gap-2 text-success py-4">
            <Check className="h-5 w-5" />
            <span>Žádné duplicity nebyly nalezeny.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Nalezeno {duplicates.length} skupin potenciálních duplicit</span>
            </div>

            <div className="space-y-3">
              {duplicates.map((group) => (
                <div 
                  key={group.normalizedName}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {group.exercises.map((ex, idx) => (
                        <Badge 
                          key={ex.id} 
                          variant={idx === 0 ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {ex.name_cs || ex.name}
                          <span className="text-xs opacity-70">({ex.usageCount}×)</span>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kategorie: {group.exercises.map(e => e.category).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openMergeDialog(group)}
                    className="gap-2"
                  >
                    <Merge className="h-4 w-4" />
                    Sloučit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sloučit duplicitní cviky</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Vyberte kanonický cvik, do kterého budou ostatní sloučeny. 
                  Všechny záznamy z duplicit budou přesunuty ke kanonickému cviku.
                </p>
                
                {selectedGroup && (
                  <Select value={canonicalId} onValueChange={setCanonicalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte kanonický cvik" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedGroup.exercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name_cs || ex.name} ({ex.usageCount} záznamů)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>Po sloučení:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Všechny záznamy budou přesunuty ke kanonickému cviku</li>
                    <li>Názvy duplicit budou uloženy jako aliasy</li>
                    <li>Duplicitní cviky budou archivovány</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMerge}
                disabled={!canonicalId || mergeExercises.isPending}
              >
                {mergeExercises.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Merge className="h-4 w-4 mr-2" />
                )}
                Sloučit cviky
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
