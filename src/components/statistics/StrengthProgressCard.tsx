import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(280, 87%, 65%)',
];

export function StrengthProgressCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['strength-progress'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const sixMonthsAgo = subMonths(new Date(), 6);

      // Get exercise entries with weight
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('exercise_name, weight_kg, date')
        .eq('user_id', user.user.id)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .not('weight_kg', 'is', null)
        .order('date');

      if (!entries) return null;

      // Find top 5 exercises by frequency
      const exerciseCounts: Record<string, number> = {};
      entries.forEach(e => {
        exerciseCounts[e.exercise_name] = (exerciseCounts[e.exercise_name] || 0) + 1;
      });

      const topExercises = Object.entries(exerciseCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

      // Group by month and exercise - find max weight per month
      const monthlyData: Record<string, Record<string, number>> = {};
      
      entries.forEach(e => {
        if (!topExercises.includes(e.exercise_name)) return;
        
        const month = format(new Date(e.date), 'yyyy-MM');
        if (!monthlyData[month]) monthlyData[month] = {};
        
        const currentMax = monthlyData[month][e.exercise_name] || 0;
        monthlyData[month][e.exercise_name] = Math.max(currentMax, e.weight_kg || 0);
      });

      // Convert to chart data
      const chartData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, exercises]) => ({
          month,
          label: format(new Date(month + '-01'), 'MMM', { locale: cs }),
          ...exercises,
        }));

      return { chartData, topExercises };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.chartData?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Vývoj síly
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Zatím nemáte dostatek dat pro zobrazení vývoje síly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Vývoj síly (max. váhy za měsíc)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v} kg`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} kg`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {data.topExercises.map((exercise, i) => (
                <Line
                  key={exercise}
                  type="monotone"
                  dataKey={exercise}
                  name={exercise.length > 20 ? exercise.slice(0, 20) + '...' : exercise}
                  stroke={COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
