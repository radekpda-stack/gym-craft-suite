import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { startOfMonth } from 'date-fns';

interface RecentPRsListProps {
  onViewAll?: () => void;
  limit?: number;
}

export function RecentPRsList({ onViewAll, limit = 5 }: RecentPRsListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-prs-list'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const monthStart = startOfMonth(new Date());

      // Get recent PRs
      const { data: prs } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, weight_kg, reps, date, client_id')
        .eq('user_id', user.user.id)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(20);

      if (!prs) return { recentPRs: [], monthlyCount: 0 };

      // Get client names
      const clientIds = [...new Set(prs.map(p => p.client_id))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      const recentPRs = prs.map(pr => ({
        id: pr.id,
        exercise: pr.exercise_name,
        weight: pr.weight_kg,
        reps: pr.reps,
        date: pr.date,
        client: clientMap.get(pr.client_id) || 'Neznámý',
      }));

      // Count PRs this month
      const monthlyCount = prs.filter(pr => new Date(pr.date) >= monthStart).length;

      return { recentPRs, monthlyCount };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const recentPRs = data?.recentPRs || [];

  if (recentPRs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-warning" />
            Poslední osobní rekordy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné osobní rekordy
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-warning" />
            Poslední osobní rekordy
          </CardTitle>
          {data?.monthlyCount !== undefined && data.monthlyCount > 0 && (
            <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
              {data.monthlyCount} tento měsíc
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentPRs.slice(0, limit).map((pr, i) => (
          <div
            key={pr.id}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-lg gap-3',
              i === 0 && 'bg-warning/10 border border-warning/20',
              i > 0 && 'bg-secondary/30'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{pr.exercise}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{pr.client}</span>
                <span>•</span>
                <span className="flex-shrink-0">
                  {format(new Date(pr.date), 'd. MMM', { locale: cs })}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {pr.weight && pr.weight > 0 ? (
                <>
                  <p className="text-sm font-bold text-success">{pr.weight} kg</p>
                  {pr.reps && pr.reps > 0 && (
                    <p className="text-[10px] text-muted-foreground">{pr.reps}×</p>
                  )}
                </>
              ) : pr.reps && pr.reps > 0 ? (
                <p className="text-sm font-bold text-success">{pr.reps} opak.</p>
              ) : (
                <p className="text-sm font-bold text-success">PR</p>
              )}
            </div>
          </div>
        ))}

        {recentPRs.length > limit && onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground hover:text-foreground"
            onClick={onViewAll}
          >
            Zobrazit vše
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Export hook for getting monthly PR count
export function useMonthlyPRCount() {
  return useQuery({
    queryKey: ['monthly-pr-count'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;

      const monthStart = startOfMonth(new Date());

      const { count } = await supabase
        .from('exercise_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user.id)
        .eq('is_pr', true)
        .gte('date', monthStart.toISOString().split('T')[0]);

      return count || 0;
    },
  });
}
