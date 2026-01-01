import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, User, Dumbbell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

const TRAINING_TYPE_LABELS: Record<string, string> = {
  individual: 'Individuální',
  group: 'Skupinový',
  pair: 'Párový',
  online: 'Online',
  outdoor: 'Venkovní',
  other: 'Ostatní',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function TrainingTypesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['training-types-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

      const { data: trainings, error } = await supabase
        .from('training_sessions')
        .select('id, training_type, training_goal, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', yearStart);

      if (error) throw error;

      // Count by training type
      const typeCounts: Record<string, number> = {};
      const goalCounts: Record<string, number> = {};

      (trainings || []).forEach(t => {
        const type = t.training_type || 'other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (t.training_goal) {
          goalCounts[t.training_goal] = (goalCounts[t.training_goal] || 0) + 1;
        }
      });

      const typeData = Object.entries(typeCounts)
        .map(([name, value]) => ({
          name,
          label: TRAINING_TYPE_LABELS[name] || name,
          value,
        }))
        .sort((a, b) => b.value - a.value);

      const topGoals = Object.entries(goalCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        typeData,
        topGoals,
        totalTrainings: trainings?.length || 0,
      };
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (!data || data.totalTrainings === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-muted-foreground" />
            Typy tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" />
          Typy tréninků
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pie chart for training types */}
        {data.typeData.length > 0 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.typeData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {data.typeData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} tréninků`, 'Počet']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top training goals */}
        {data.topGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Nejčastější cíle</p>
            <div className="space-y-1">
              {data.topGoals.slice(0, 3).map((goal, index) => (
                <div key={goal.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      {goal.name}
                    </span>
                  </div>
                  <span className="font-medium">{goal.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
