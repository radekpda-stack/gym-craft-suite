import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface CompactPRsSectionProps {
  clientId: string;
  onViewAll?: () => void;
}

export function CompactPRsSection({ clientId, onViewAll }: CompactPRsSectionProps) {
  const { data: prs, isLoading } = useQuery({
    queryKey: ['compact-prs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, weight_kg, reps, date')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (!prs || prs.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-sm">Osobní rekordy</span>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Zatím žádné rekordy
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="font-semibold text-sm">Osobní rekordy</span>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Vše
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* PRs list */}
      <div className="space-y-2">
        {prs.map((pr, index) => (
          <motion.div
            key={pr.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{pr.exercise_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(pr.date), { addSuffix: true, locale: cs })}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <span className="text-sm font-bold text-primary">{pr.weight_kg}kg</span>
              {pr.reps && <span className="text-xs text-muted-foreground ml-1">×{pr.reps}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
