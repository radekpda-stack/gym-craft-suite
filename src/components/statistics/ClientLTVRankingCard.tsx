import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { differenceInMonths } from 'date-fns';

interface TopClientLTVProps {
  onViewAll?: () => void;
  limit?: number;
}

export function ClientLTVRankingCard({ onViewAll, limit = 5 }: TopClientLTVProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-ltv-ranking-compact'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, is_archived')
        .eq('user_id', user.user.id)
        .eq('is_archived', false);

      if (!clients) return null;

      // Get all transactions (deposits)
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('client_id, amount, type')
        .eq('user_id', user.user.id)
        .in('type', ['payment', 'manual']);

      // Get training count
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('client_id')
        .eq('user_id', user.user.id)
        .eq('status', 'completed');

      // Calculate LTV per client
      const clientLTV: Record<string, { 
        revenue: number; 
        trainings: number; 
        months: number;
      }> = {};

      transactions?.forEach(t => {
        if (!clientLTV[t.client_id]) {
          clientLTV[t.client_id] = { revenue: 0, trainings: 0, months: 0 };
        }
        clientLTV[t.client_id].revenue += Math.abs(t.amount);
      });

      trainings?.forEach(t => {
        if (t.client_id && clientLTV[t.client_id]) {
          clientLTV[t.client_id].trainings++;
        }
      });

      // Calculate months active
      const now = new Date();
      clients.forEach(c => {
        if (clientLTV[c.id]) {
          clientLTV[c.id].months = Math.max(1, differenceInMonths(now, new Date(c.created_at)));
        }
      });

      const clientMap = new Map(clients.map(c => [c.id, c]));

      const ranking = Object.entries(clientLTV)
        .map(([id, data]) => {
          const client = clientMap.get(id);
          const monthlyValue = data.months > 0 ? Math.round(data.revenue / data.months) : 0;
          return {
            id,
            name: client?.name || 'Neznámý',
            monthlyValue,
            ...data,
          };
        })
        .filter(c => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const totalLTV = ranking.reduce((sum, c) => sum + c.revenue, 0);
      const avgLTV = ranking.length > 0 ? totalLTV / ranking.length : 0;
      const avgMonthly = ranking.length > 0 
        ? Math.round(ranking.reduce((sum, c) => sum + c.monthlyValue, 0) / ranking.length)
        : 0;

      return { ranking, avgLTV, avgMonthly };
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

  const ranking = data?.ranking || [];

  if (ranking.length === 0) {
    return (
      <Card>
      <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-warning" />
            Nejhodnotnější klienti (LTV)
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-warning" />
            Nejhodnotnější klienti (LTV)
          </CardTitle>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">
              Ø LTV: {formatCurrency(data?.avgLTV || 0)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Ø měsíčně: {formatCurrency(data?.avgMonthly || 0)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ranking.slice(0, limit).map((client, i) => (
          <div
            key={client.id}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-lg gap-3',
              i === 0 && 'bg-warning/10 border border-warning/20',
              i > 0 && 'bg-secondary/30'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
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
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{client.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {client.trainings} tréninků • {client.months}m • {formatCurrency(client.monthlyValue)}/m
                </p>
              </div>
            </div>
            <span className="font-bold text-sm text-success flex-shrink-0">
              {formatCurrency(client.revenue)}
            </span>
          </div>
        ))}

        {ranking.length > limit && onViewAll && (
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
