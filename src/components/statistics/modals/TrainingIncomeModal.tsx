import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dumbbell, Users, DollarSign, Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface TrainingIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function TrainingIncomeModal({ open, onOpenChange, stats }: TrainingIncomeModalProps) {
  if (!stats) return null;

  const avgPricePerTraining = stats.completedTrainings > 0 
    ? stats.trainingIncome / stats.completedTrainings 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            Příjem z tréninků - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-primary/5 rounded-xl">
            <p className="text-4xl font-bold text-primary">
              {formatCurrency(stats.trainingIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">příjem z tréninků tento rok</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Počet tréninků</span>
              </div>
              <p className="text-2xl font-bold">{stats.completedTrainings}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Průměrná cena</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(avgPricePerTraining)}</p>
            </div>
          </div>

          {/* Additional stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <span>Tréninků týdně (průměr)</span>
              <span className="font-medium">{stats.avgTrainingsPerWeek}</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <span>Aktivních klientů</span>
              <span className="font-medium">{stats.activeClients}</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <span>Nejaktivnější den</span>
              <span className="font-medium">{stats.mostActiveDay}</span>
            </div>
          </div>

          {/* Top clients by spent */}
          {stats.topClientsBySpent && stats.topClientsBySpent.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                Top klienti dle útraty
              </h4>
              <div className="space-y-2">
                {stats.topClientsBySpent.map((client, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span>{client.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(client.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
