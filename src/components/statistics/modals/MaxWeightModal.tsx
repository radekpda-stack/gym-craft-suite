import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, User, Calendar, Dumbbell } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface MaxWeightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function MaxWeightModal({ open, onOpenChange, stats }: MaxWeightModalProps) {
  if (!stats) return null;

  const hasMaxWeight = stats.maxWeightLifted && stats.maxWeightLifted.weight > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Zap className="h-5 w-5 text-destructive" />
            </div>
            Maximální váha - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {hasMaxWeight ? (
            <>
              {/* Main value */}
              <div className="text-center py-6 bg-destructive/5 rounded-xl">
                <p className="text-5xl font-bold text-destructive">
                  {stats.maxWeightLifted!.weight} kg
                </p>
                <p className="text-sm text-muted-foreground mt-2">rekordní zvednutá váha</p>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cvik</p>
                    <p className="font-medium text-lg">{stats.maxWeightLifted!.exercise}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="p-2 rounded-lg bg-success/10">
                    <User className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Klient</p>
                    <p className="font-medium text-lg">{stats.maxWeightLifted!.client}</p>
                  </div>
                </div>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold">{stats.totalPRs}</p>
                  <p className="text-xs text-muted-foreground">celkem PR</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold">{stats.uniqueExercises}</p>
                  <p className="text-xs text-muted-foreground">různých cviků</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Žádný záznam</p>
              <p className="text-sm text-muted-foreground mt-1">
                Zatím nemáte žádný záznam s váhou
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
