import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Calendar } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, getDay } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const DAY_FULL_NAMES = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

export function TrainingsByDayCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['trainings-by-day'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);

      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('user_id', user.user.id)
        .eq('status', 'completed')
        .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

      if (!sessions) return null;

      // Count by day of week
      const dayCounts = [0, 0, 0, 0, 0, 0, 0];
      sessions.forEach(s => {
        const day = getDay(new Date(s.date));
        dayCounts[day]++;
      });

      // Reorder to start from Monday
      const mondayFirst = [1, 2, 3, 4, 5, 6, 0].map(i => ({
        day: DAY_NAMES[i],
        fullName: DAY_FULL_NAMES[i],
        count: dayCounts[i],
        index: i,
      }));

      const maxCount = Math.max(...dayCounts);
      const maxDay = dayCounts.indexOf(maxCount);
      const minCount = Math.min(...dayCounts.filter(c => c > 0));
      const minDay = dayCounts.indexOf(minCount);

      return {
        data: mondayFirst,
        maxDay: DAY_FULL_NAMES[maxDay],
        maxCount,
        minDay: DAY_FULL_NAMES[minDay],
        minCount,
        total: sessions.length,
      };
    },
  });

  const expandedContent = data && (
    <div className="space-y-6">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="fullName" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} tréninků`, 'Počet']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.data.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={entry.count === data.maxCount ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                  fillOpacity={entry.count === data.maxCount ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Nejvíce tréninků</p>
          <p className="text-xl font-bold text-primary">{data.maxDay}</p>
          <p className="text-sm text-muted-foreground">{data.maxCount} tréninků</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground mb-1">Nejméně tréninků</p>
          <p className="text-xl font-bold">{data.minDay}</p>
          <p className="text-sm text-muted-foreground">{data.minCount} tréninků</p>
        </div>
      </div>

      {/* Day by day breakdown */}
      <div className="space-y-2">
        {data.data.map(day => (
          <div key={day.day} className="flex items-center gap-3">
            <span className="w-16 text-sm text-muted-foreground">{day.fullName}</span>
            <div className="flex-1 h-6 bg-secondary/30 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  day.count === data.maxCount ? "bg-primary" : "bg-muted-foreground/30"
                )}
                style={{ width: `${data.maxCount > 0 ? (day.count / data.maxCount) * 100 : 0}%` }}
              />
            </div>
            <span className="w-12 text-sm font-medium text-right">{day.count}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Tréninky podle dne"
      icon={<Calendar className="h-4 w-4 text-primary" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
      infoDescription="Rozložení tréninků během týdne za poslední 3 měsíce. Pomáhá identifikovat nejsilnější a nejslabší dny."
      infoCalculation="Počítají se všechny dokončené tréninky za posledních 90 dní, seskupené podle dne v týdnu."
    >
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.data || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {(data?.data || []).map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={entry.count === data?.maxCount ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                  fillOpacity={entry.count === data?.maxCount ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Nejoblíbenější: <span className="font-medium text-primary">{data?.maxDay || '-'}</span>
      </p>
    </StatisticsCard>
  );
}
