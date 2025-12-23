import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Users, TrendingUp, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface PRsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
  genderStats?: {
    male: number;
    female: number;
    unknown: number;
  };
}

export function PRsDetailModal({ open, onOpenChange, stats, genderStats }: PRsDetailModalProps) {
  if (!stats) return null;

  const prRate = stats.totalExerciseEntries > 0 
    ? ((stats.totalPRs / stats.totalExerciseEntries) * 100).toFixed(1) 
    : '0';

  // Gender pie chart data
  const genderData = genderStats ? [
    { name: 'Muži', value: genderStats.male, color: 'hsl(var(--primary))' },
    { name: 'Ženy', value: genderStats.female, color: 'hsl(var(--destructive))' },
    { name: 'Neuvedeno', value: genderStats.unknown, color: 'hsl(var(--muted-foreground))' },
  ].filter(item => item.value > 0) : [];

  const hasGenderStats = genderData.length > 0 && genderData.some(g => g.value > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            Osobní rekordy - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 bg-success/5 rounded-xl">
            <p className="text-4xl font-bold text-success">
              {stats.totalPRs}
            </p>
            <p className="text-sm text-muted-foreground mt-1">osobních rekordů tento rok</p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Úspěšnost PR</span>
              </div>
              <p className="text-2xl font-bold">{prRate}%</p>
              <p className="text-xs text-muted-foreground">z celkových cviků</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Celkem cviků</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalExerciseEntries.toLocaleString('cs-CZ')}</p>
            </div>
          </div>

          {/* Gender distribution */}
          {hasGenderStats && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                PR podle pohlaví
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} PR`, '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {genderData.map((item, i) => (
                  <div key={i} className="text-center p-2 rounded bg-secondary/30">
                    <p className="text-lg font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Max weight info */}
          {stats.maxWeightLifted && (
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Rekordní váha</span>
              </div>
              <p className="text-2xl font-bold">{stats.maxWeightLifted.weight} kg</p>
              <p className="text-sm text-muted-foreground">
                {stats.maxWeightLifted.exercise} • {stats.maxWeightLifted.client}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
