import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatisticsCard } from './StatisticsGrid';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Activity } from 'lucide-react';
import { subMonths } from 'date-fns';

const BODY_PART_MAP: Record<string, string> = {
  // Upper body
  chest: 'Hrudník',
  shoulders: 'Ramena',
  back: 'Záda',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Předloktí',
  // Core
  core: 'Core',
  abs: 'Břicho',
  obliques: 'Šikmé břišní',
  // Lower body
  quads: 'Čtyřhlavý',
  hamstrings: 'Zadní stehno',
  glutes: 'Hýždě',
  calves: 'Lýtka',
  // Full body
  'full-body': 'Celé tělo',
  cardio: 'Kardio',
};

const CATEGORY_MAP: Record<string, string> = {
  strength: 'Síla',
  mobility: 'Mobilita',
  cardio: 'Kardio',
  core: 'Core',
  upper: 'Horní tělo',
  lower: 'Dolní tělo',
  compound: 'Složené',
  isolation: 'Izolační',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
  'hsl(25, 95%, 53%)',
  'hsl(280, 87%, 65%)',
  'hsl(180, 70%, 45%)',
];

export function ExerciseBodyPartCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['exercise-body-parts'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);

      // Get exercise entries with exercise details
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('exercise_id, exercise_name')
        .eq('user_id', user.user.id)
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      if (!entries) return null;

      // Get exercise categories
      const exerciseIds = [...new Set(entries.map(e => e.exercise_id).filter(Boolean))];
      
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, category, muscle_groups')
        .in('id', exerciseIds);

      const exerciseMap = new Map(exercises?.map(e => [e.id, e]) || []);

      // Count by category
      const categoryCounts: Record<string, number> = {};
      const muscleGroupCounts: Record<string, number> = {};

      entries.forEach(entry => {
        const exercise = entry.exercise_id ? exerciseMap.get(entry.exercise_id) : null;
        
        if (exercise?.category) {
          const cat = CATEGORY_MAP[exercise.category] || exercise.category;
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }

        if (exercise?.muscle_groups && Array.isArray(exercise.muscle_groups)) {
          exercise.muscle_groups.forEach((mg: string) => {
            const mapped = BODY_PART_MAP[mg] || mg;
            muscleGroupCounts[mapped] = (muscleGroupCounts[mapped] || 0) + 1;
          });
        }
      });

      const categoryData = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      const muscleData = Object.entries(muscleGroupCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      return { categoryData, muscleData, total: entries.length };
    },
  });

  const chartData = data?.categoryData || [];
  const muscleData = data?.muscleData || [];

  const expandedContent = (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Podle kategorie</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}×`, 'Počet']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Podle svalové skupiny</h4>
        <div className="grid grid-cols-2 gap-2">
          {muscleData.map((mg, i) => (
            <div
              key={mg.name}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm truncate">{mg.name}</span>
              </div>
              <span className="text-sm font-medium">{mg.value}×</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Rozložení cviků"
      icon={<Activity className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}×`, 'Počet']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {data?.total || 0} cvičení za 3 měsíce
      </p>
    </StatisticsCard>
  );
}
