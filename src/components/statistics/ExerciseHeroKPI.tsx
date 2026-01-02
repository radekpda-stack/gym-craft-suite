import { useMemo } from 'react';
import { MetricCard, GaugeCard } from '@/components/charts';
import { 
  Trophy, 
  Dumbbell, 
  Flame,
  Target
} from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ExerciseHeroKPIProps {
  stats: AnnualStatsData | null;
  monthlyPRs?: number;
  avgRPE?: number;
  onCardClick?: (card: string) => void;
}

export function ExerciseHeroKPI({ 
  stats, 
  monthlyPRs = 0,
  avgRPE,
  onCardClick 
}: ExerciseHeroKPIProps) {
  const totalExercises = stats?.totalExerciseEntries || 0;
  const uniqueExercises = stats?.uniqueExercises || 0;
  const totalPRs = stats?.totalPRs || 0;

  // Calculate monthly entries (rough estimate from total / months)
  const monthlyEntries = useMemo(() => {
    if (!stats?.totalDays) return 0;
    const months = Math.max(1, stats.totalDays / 30);
    return Math.round(totalExercises / months);
  }, [stats?.totalDays, totalExercises]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Exercise entries this month */}
      <MetricCard
        title="Záznamů"
        value={monthlyEntries.toLocaleString('cs-CZ')}
        subtitle="měsíčně průměr"
        progress={Math.min((monthlyEntries / 500) * 100, 100)}
        variant="primary"
        icon={<Dumbbell className="h-4 w-4" />}
        onClick={() => onCardClick?.('entries')}
      />
      
      {/* PRs this month */}
      <MetricCard
        title="PR tento měsíc"
        value={monthlyPRs.toString()}
        subtitle={`${totalPRs} celkem`}
        progress={Math.min((monthlyPRs / 10) * 100, 100)}
        variant="success"
        icon={<Trophy className="h-4 w-4" />}
        onClick={() => onCardClick?.('prs')}
      />

      {/* Average RPE */}
      {avgRPE !== undefined && avgRPE > 0 ? (
        <GaugeCard
          title="Ø Intenzita"
          value={avgRPE}
          maxValue={10}
          displayValue={avgRPE.toFixed(1)}
          sublabel="RPE"
          description={avgRPE >= 8 ? 'Vysoká' : avgRPE >= 6 ? 'Střední' : 'Nízká'}
          variant={avgRPE >= 8 ? 'destructive' : avgRPE >= 6 ? 'warning' : 'success'}
          size="md"
          onClick={() => onCardClick?.('intensity')}
        />
      ) : (
        <MetricCard
          title="Ø Intenzita"
          value="-"
          subtitle="Žádná RPE data"
          progress={0}
          variant="primary"
          icon={<Flame className="h-4 w-4" />}
          onClick={() => onCardClick?.('intensity')}
        />
      )}

      {/* Unique exercises */}
      <MetricCard
        title="Cviky v databázi"
        value={uniqueExercises.toString()}
        subtitle={`z ${totalExercises.toLocaleString('cs-CZ')} záznamů`}
        progress={Math.min((uniqueExercises / 100) * 100, 100)}
        variant="purple"
        icon={<Target className="h-4 w-4" />}
        onClick={() => onCardClick?.('exercises')}
        showProgressValue
      />
    </div>
  );
}
