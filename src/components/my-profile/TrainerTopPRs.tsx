import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerTopPRsProps {
  clientId: string;
}

const MEDAL_COLORS = [
  'text-yellow-500 bg-yellow-500/10',
  'text-gray-400 bg-gray-400/10', 
  'text-amber-600 bg-amber-600/10',
];

export function TrainerTopPRs({ clientId }: TrainerTopPRsProps) {
  const { data: topPRs, isLoading } = useQuery({
    queryKey: ['trainer-top-prs', clientId],
    queryFn: async () => {
      // Get top strength PRs by weight
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, weight_kg, reps, date')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .not('weight_kg', 'is', null)
        .order('weight_kg', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique exercises with highest weight
      const uniqueExercises = new Map<string, typeof data[0]>();
      for (const entry of data || []) {
        if (!uniqueExercises.has(entry.exercise_name)) {
          uniqueExercises.set(entry.exercise_name, entry);
        }
      }

      return Array.from(uniqueExercises.values()).slice(0, 3);
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-36" />;
  }

  if (!topPRs || topPRs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            TOP Rekordy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-2">
            Zatím žádné osobní rekordy
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          TOP Rekordy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topPRs.map((pr, index) => (
          <div
            key={pr.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${MEDAL_COLORS[index]}`}>
              <Medal className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm truncate block">{pr.exercise_name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(pr.date), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-sm">{pr.weight_kg} kg</span>
              {pr.reps && (
                <span className="text-xs text-muted-foreground block">× {pr.reps}</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
