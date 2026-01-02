import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Dumbbell, 
  Flame, 
  Sun, 
  Calendar, 
  Link, 
  Trophy, 
  Award,
  Zap,
  Gift
} from 'lucide-react';

interface XPBreakdownCardProps {
  clientId: string;
}

interface XPEvent {
  id: string;
  client_id: string;
  source_type: string;
  xp_amount: number;
  description: string | null;
  created_at: string | null;
  meta: Record<string, unknown> | null;
}

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  workout_base: {
    icon: Dumbbell,
    label: 'Trénink',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  workout_type: {
    icon: Flame,
    label: 'HIIT bonus',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  morning_bonus: {
    icon: Sun,
    label: 'Ranní bonus',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  weekend_bonus: {
    icon: Calendar,
    label: 'Víkendový bonus',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  weekly_streak: {
    icon: Link,
    label: 'Týdenní série',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  pr_bonus: {
    icon: Trophy,
    label: 'Osobní rekord',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  badge: {
    icon: Award,
    label: 'Badge bonus',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  challenge: {
    icon: Trophy,
    label: 'Výzva',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  bonus: {
    icon: Gift,
    label: 'Bonus',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
};

const DEFAULT_CONFIG = {
  icon: Zap,
  label: 'XP',
  color: 'text-primary',
  bgColor: 'bg-primary/10',
};

function useXPEvents(clientId: string, limit = 20) {
  return useQuery({
    queryKey: ['xp-events-breakdown', clientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as XPEvent[];
    },
    enabled: !!clientId,
  });
}

export function XPBreakdownCard({ clientId }: XPBreakdownCardProps) {
  const { data: events, isLoading } = useXPEvents(clientId);

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Historie XP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Zatím žádné XP události. Potvrď svůj první trénink!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Historie XP
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          <div className="space-y-2 pb-4">
            {events.map((event) => {
              const config = SOURCE_CONFIG[event.source_type] || DEFAULT_CONFIG;
              const Icon = config.icon;
              
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.description || config.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.created_at 
                        ? formatDistanceToNow(new Date(event.created_at), { 
                            addSuffix: true, 
                            locale: cs 
                          })
                        : 'Neznámý čas'
                      }
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${event.xp_amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {event.xp_amount > 0 ? '+' : ''}{event.xp_amount} XP
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
