import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatisticsCard } from './StatisticsGrid';
import { Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export function RecordWeightsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['record-weights'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all PRs with weight
      const { data: prs } = await supabase
        .from('exercise_entries')
        .select('exercise_name, weight_kg, reps, date, client_id')
        .eq('user_id', user.user.id)
        .eq('is_pr', true)
        .not('weight_kg', 'is', null)
        .order('weight_kg', { ascending: false })
        .limit(20);

      if (!prs) return null;

      // Get client names
      const clientIds = [...new Set(prs.map(p => p.client_id))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      // Get top records per exercise
      const exerciseRecords: Record<string, { weight: number; reps: number; date: string; client: string }> = {};
      
      prs.forEach(pr => {
        const name = pr.exercise_name;
        if (!exerciseRecords[name] || (pr.weight_kg || 0) > exerciseRecords[name].weight) {
          exerciseRecords[name] = {
            weight: pr.weight_kg || 0,
            reps: pr.reps || 0,
            date: pr.date,
            client: clientMap.get(pr.client_id) || 'Neznámý',
          };
        }
      });

      const topRecords = Object.entries(exerciseRecords)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10);

      return { topRecords, totalPRs: prs.length };
    },
  });

  const records = data?.topRecords || [];

  const expandedContent = (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-warning" />
          <span className="font-bold">Osobní rekordy</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Top 10 nejtěžších vah napříč všemi cviky a klienty.
        </p>
      </div>

      <div className="space-y-2">
        {records.map((record, i) => (
          <div
            key={record.name}
            className={cn(
              'p-3 rounded-lg',
              i === 0 && 'bg-warning/10 border border-warning/20',
              i > 0 && 'bg-secondary/30'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      i === 0 && 'bg-warning/20 text-warning',
                      i === 1 && 'bg-muted text-muted-foreground',
                      i > 1 && 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="font-medium truncate">{record.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-8 text-xs text-muted-foreground">
                  <span>{record.client}</span>
                  <span>•</span>
                  <span>{format(new Date(record.date), 'd. MMM yyyy', { locale: cs })}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-success">{record.weight} kg</p>
                {record.reps > 0 && (
                  <p className="text-xs text-muted-foreground">{record.reps}× opak.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Rekordní váhy"
      icon={<TrendingUp className="h-4 w-4 text-success" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="space-y-2">
        {records.slice(0, 5).map((record, i) => (
          <div key={record.name} className="flex items-center gap-2">
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                i === 0 && 'bg-warning/20 text-warning',
                i === 1 && 'bg-muted text-muted-foreground',
                i > 1 && 'bg-secondary text-muted-foreground'
              )}
            >
              {i + 1}
            </span>
            <span className="text-xs truncate flex-1">{record.name}</span>
            <span className="text-xs font-bold text-success">{record.weight} kg</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {data?.totalPRs || 0} osobních rekordů
      </p>
    </StatisticsCard>
  );
}
