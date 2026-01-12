import { PieChart as PieChartIcon } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryDistributionCardProps {
  days?: number;
  clientId?: string | null;
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Rozložení kategorií',
  description: 'Procentuální zastoupení jednotlivých kategorií cviků v tréninku za zvolené období.',
  calculation: 'Počet záznamů v každé kategorii ÷ celkový počet záznamů × 100. Kategorie se čte z tabulky exercises.',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Dolní tělo': 'hsl(var(--chart-1))',
  'Horní tělo': 'hsl(var(--chart-2))',
  'Core': 'hsl(var(--chart-3))',
  'Kardio': 'hsl(var(--chart-4))',
  'Záda': 'hsl(var(--chart-5))',
  'Síla': 'hsl(262, 83%, 58%)',
  'Nohy': 'hsl(199, 89%, 48%)',
  'Hrudník': 'hsl(43, 96%, 56%)',
  'Ramena': 'hsl(330, 81%, 60%)',
  'Paže': 'hsl(173, 80%, 40%)',
  'Plyometrics': 'hsl(24, 95%, 53%)',
  'Full Body': 'hsl(291, 64%, 42%)',
  'Ostatní': 'hsl(var(--muted-foreground))',
};

function getColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || `hsl(${(index * 40) % 360}, 70%, 50%)`;
}

export function CategoryDistributionCard({ days = 90, clientId, isLoading: externalLoading }: CategoryDistributionCardProps) {
  const { user } = useAuth();

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['category-distribution', user?.id, days, clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const startDate = subDays(now, days);

      let query = supabase
        .from('exercise_entries')
        .select(`
          id,
          exercises!exercise_entries_exercise_id_fkey (
            category
          )
        `)
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'));

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      // Count by category
      const categoryMap = new Map<string, number>();
      entries?.forEach(e => {
        const exercise = e.exercises as any;
        const category = exercise?.category || 'Ostatní';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const total = entries?.length || 0;
      const distribution = Array.from(categoryMap.entries())
        .map(([name, value]) => ({
          name,
          value,
          percent: total > 0 ? Math.round((value / total) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        distribution,
        total,
        topCategory: distribution[0]?.name || null,
        categoryCount: distribution.length,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = externalLoading || dataLoading;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-muted-foreground">
            {data.value} záznamů ({data.percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AnalyticsCard
      title="Kategorie cviků"
      icon={PieChartIcon}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      emptyMessage={data?.total === 0 ? 'Žádná data za období' : undefined}
    >
      <div className="space-y-4">
        {/* Stats header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{data?.categoryCount || 0}</span>
            <span className="text-muted-foreground text-sm">kategorií</span>
          </div>
          {data?.topCategory && (
            <div className="text-xs text-muted-foreground">
              Top: <span className="font-medium text-foreground">{data.topCategory}</span>
            </div>
          )}
        </div>

        {/* Chart */}
        {data?.distribution && data.distribution.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.distribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getColor(entry.name, index)}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Žádná data za vybrané období
          </div>
        )}

        {/* Legend */}
        {data?.distribution && data.distribution.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs justify-center">
            {data.distribution.slice(0, 6).map((item, index) => (
              <div key={item.name} className="flex items-center gap-1">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: getColor(item.name, index) }}
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.percent}%</span>
              </div>
            ))}
            {data.distribution.length > 6 && (
              <span className="text-muted-foreground">+{data.distribution.length - 6} dalších</span>
            )}
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
