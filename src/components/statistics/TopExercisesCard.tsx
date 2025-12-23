import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Dumbbell, Trophy, TrendingUp } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--muted-foreground))',
];

export function TopExercisesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-exercises-stats'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);

      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('exercise_name, weight_kg, reps, sets, is_pr')
        .eq('user_id', user.user.id)
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      if (!entries) return null;

      // Count by exercise
      const exerciseCounts: Record<string, { count: number; totalVolume: number; prCount: number }> = {};
      
      entries.forEach(e => {
        const name = e.exercise_name;
        if (!exerciseCounts[name]) {
          exerciseCounts[name] = { count: 0, totalVolume: 0, prCount: 0 };
        }
        exerciseCounts[name].count++;
        exerciseCounts[name].totalVolume += (e.weight_kg || 0) * (e.reps || 0) * (e.sets || 1);
        if (e.is_pr) exerciseCounts[name].prCount++;
      });

      const sorted = Object.entries(exerciseCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count);

      return {
        topByFrequency: sorted.slice(0, 10),
        topByVolume: [...sorted].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 10),
        topByPR: sorted.filter(e => e.prCount > 0).sort((a, b) => b.prCount - a.prCount).slice(0, 5),
        totalExercises: entries.length,
        uniqueExercises: sorted.length,
      };
    },
  });

  const expandedContent = data && (
    <div className="space-y-6">
      {/* Top 10 by frequency */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Top 10 podle četnosti
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data.topByFrequency} 
              layout="vertical"
              margin={{ top: 0, right: 20, left: 100, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}×`, 'Počet']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Celkem cvičení</p>
          <p className="text-2xl font-bold">{data.totalExercises}</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground mb-1">Unikátních cviků</p>
          <p className="text-2xl font-bold">{data.uniqueExercises}</p>
        </div>
      </div>

      {/* Top PRs */}
      {data.topByPR.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Nejvíce osobních rekordů
          </h4>
          <div className="space-y-2">
            {data.topByPR.map((ex, i) => (
              <div key={ex.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    i === 0 && "bg-warning/20 text-warning",
                    i === 1 && "bg-muted text-muted-foreground",
                    i > 1 && "bg-secondary text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-sm">{ex.name}</span>
                </div>
                <span className="text-sm font-bold text-success">{ex.prCount} PR</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <StatisticsCard
      title="Top cviky"
      icon={<Dumbbell className="h-4 w-4 text-warning" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      infoDescription="Nejčastěji používané cviky za posledních 3 měsíce u všech klientů."
      infoCalculation="Počet = kolikrát byl cvik zaznamenán. Objem = váha × opakování × série. PR = počet osobních rekordů."
    >
      <div className="space-y-2">
        {(data?.topByFrequency || []).slice(0, 5).map((ex, i) => (
          <div key={ex.name} className="flex items-center gap-2">
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
              i === 0 && "bg-warning/20 text-warning",
              i === 1 && "bg-muted text-muted-foreground",
              i > 1 && "bg-secondary text-muted-foreground"
            )}>
              {i + 1}
            </span>
            <span className="text-xs truncate flex-1">{ex.name}</span>
            <span className="text-xs font-medium text-muted-foreground">{ex.count}×</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {data?.uniqueExercises || 0} různých cviků
      </p>
    </StatisticsCard>
  );
}
