import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

function useWeekStrip(clientId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['week-strip', user?.id, clientId],
    queryFn: async () => {
      const today = new Date();
      const dateRange = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const [s, c, sk] = await Promise.all([
        supabase.from('exercise_entries').select('date').eq('user_id', user!.id).eq('client_id', clientId).in('date', dateRange),
        supabase.from('cardio_entries').select('date').eq('user_id', user!.id).eq('client_id', clientId).in('date', dateRange),
        supabase.from('skill_entries').select('date').eq('user_id', user!.id).eq('client_id', clientId).in('date', dateRange),
      ]);

      const counts: Record<string, number> = {};
      [...(s.data || []), ...(c.data || []), ...(sk.data || [])].forEach(r => {
        counts[r.date] = (counts[r.date] || 0) + 1;
      });

      const todayStr = today.toISOString().split('T')[0];
      return dateRange.map(date => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('cs-CZ', { weekday: 'short' }).slice(0, 2),
        count: counts[date] || 0,
        isToday: date === todayStr,
      }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
}

export function WeekStrip({ clientId }: { clientId: string }) {
  const { data: days = [] } = useWeekStrip(clientId);

  if (days.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 bg-muted/30 rounded-xl px-3 py-2.5">
      {days.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
          <span className={cn("text-[10px] font-medium uppercase", day.isToday ? "text-primary" : "text-muted-foreground/60")}>
            {day.label}
          </span>
          <div className="flex flex-col gap-0.5 items-center">
            {day.count > 0 ? (
              Array.from({ length: Math.min(day.count, 3) }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i === 0 ? "bg-primary" : i === 1 ? "bg-primary/60" : "bg-primary/30"
                  )}
                />
              ))
            ) : (
              <span className={cn(
                "w-2 h-2 rounded-full",
                day.isToday ? "border-2 border-primary/40" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
