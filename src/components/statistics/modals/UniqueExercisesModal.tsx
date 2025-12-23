import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Hash, TrendingUp, List } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UniqueExercisesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function UniqueExercisesModal({ open, onOpenChange, stats }: UniqueExercisesModalProps) {
  if (!stats) return null;

  // Sort exercises by count for display
  const allExercises = [...stats.topExercises];

  const avgUsagePerExercise = stats.uniqueExercises > 0 
    ? (stats.totalExerciseEntries / stats.uniqueExercises).toFixed(1) 
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Unikátní cviky - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-primary/5 rounded-xl">
            <p className="text-4xl font-bold text-primary">
              {stats.uniqueExercises}
            </p>
            <p className="text-sm text-muted-foreground mt-1">různých cviků použito</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Celkem zápisů</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalExerciseEntries.toLocaleString('cs-CZ')}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Průměr použití</span>
              </div>
              <p className="text-2xl font-bold">{avgUsagePerExercise}×</p>
              <p className="text-xs text-muted-foreground">na cvik</p>
            </div>
          </div>

          {/* Exercise list */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              Seznam cviků (Top 10)
            </h4>
            <ScrollArea className="h-64">
              <div className="space-y-1.5 pr-4">
                {allExercises.map((exercise, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between text-sm p-2.5 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="font-medium">{exercise.name}</span>
                    </div>
                    <span className="text-muted-foreground">{exercise.count}×</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
