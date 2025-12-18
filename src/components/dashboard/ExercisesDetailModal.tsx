import { Activity, Trophy, Dumbbell, TrendingDown, Weight } from 'lucide-react';
import { KPIDetailModal } from './KPIDetailModal';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ExercisesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData;
}

export function ExercisesDetailModal({ open, onOpenChange, stats }: ExercisesDetailModalProps) {
  const { language } = useLanguage();

  const modalStats = [
    {
      label: language === 'cs' ? 'Unikátních cviků' : 'Unique exercises',
      value: stats.uniqueExercises,
    },
    {
      label: language === 'cs' ? 'Osobních rekordů' : 'Personal records',
      value: stats.totalPRs,
    },
    {
      label: language === 'cs' ? 'Max váha' : 'Max weight',
      value: stats.maxWeightLifted ? `${stats.maxWeightLifted.weight} kg` : '-',
    },
    {
      label: language === 'cs' ? 'Nejsilnější cvik' : 'Strongest exercise',
      value: stats.maxWeightLifted?.exercise || '-',
    },
  ];

  return (
    <KPIDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={language === 'cs' ? 'Detail cviků' : 'Exercises Detail'}
      icon={<Activity className="w-5 h-5" />}
      mainValue={stats.totalExerciseEntries.toLocaleString()}
      mainLabel={language === 'cs' ? 'záznamů cviků' : 'exercise entries'}
      stats={modalStats}
    >
      {/* Max weight detail */}
      {stats.maxWeightLifted && (
        <div className="pt-2">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10">
            <Weight className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{stats.maxWeightLifted.exercise}</p>
              <p className="text-xs text-muted-foreground">
                {stats.maxWeightLifted.weight} kg • {stats.maxWeightLifted.client}
              </p>
            </div>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
      )}

      {/* Top exercises */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">
            {language === 'cs' ? 'TOP 5 nejčastější cviky' : 'TOP 5 most frequent'}
          </p>
        </div>
        <div className="space-y-1.5">
          {stats.topExercises.slice(0, 5).map((exercise, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{exercise.name}</span>
              </div>
              <span className="text-muted-foreground">{exercise.count}×</span>
            </div>
          ))}
          {stats.topExercises.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>

      {/* Least used exercises */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-medium">
            {language === 'cs' ? 'Nejméně používané cviky' : 'Least used exercises'}
          </p>
        </div>
        <div className="space-y-1.5">
          {stats.leastUsedExercises.slice(0, 5).map((exercise, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{exercise.name}</span>
              </div>
              <span className="text-muted-foreground">{exercise.count}×</span>
            </div>
          ))}
          {stats.leastUsedExercises.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>
    </KPIDetailModal>
  );
}
