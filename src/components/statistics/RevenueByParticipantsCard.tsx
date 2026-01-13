import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, UsersRound, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { startOfYear, format } from 'date-fns';

interface ParticipantRevenue {
  solo: number;
  duo: number;
  group: number;
  soloCount: number;
  duoCount: number;
  groupCount: number;
}

export function RevenueByParticipantsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-by-participants'],
    queryFn: async (): Promise<ParticipantRevenue | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

      // Get completed trainings with their participant count
      const { data: trainings, error } = await supabase
        .from('training_sessions')
        .select('id, final_price, participant_count')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', yearStart);

      if (error) throw error;
      if (!trainings) return null;

      const result: ParticipantRevenue = {
        solo: 0,
        duo: 0,
        group: 0,
        soloCount: 0,
        duoCount: 0,
        groupCount: 0,
      };

      trainings.forEach(t => {
        const count = t.participant_count || 1;
        const price = t.final_price || 0;

        if (count === 1) {
          result.solo += price;
          result.soloCount++;
        } else if (count === 2) {
          result.duo += price;
          result.duoCount++;
        } else {
          result.group += price;
          result.groupCount++;
        }
      });

      return result;
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

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            Příjem podle účastníků
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

  const total = data.solo + data.duo + data.group;
  const totalCount = data.soloCount + data.duoCount + data.groupCount;

  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          Příjem podle účastníků
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Solo */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              <span className="text-sm">Solo (1 účastník)</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-sm">{formatCurrency(data.solo)}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({data.soloCount}×)
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(data.solo)}%` }}
            />
          </div>
        </div>

        {/* Duo */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <span className="text-sm">Duo (2 účastníci)</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-sm">{formatCurrency(data.duo)}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({data.duoCount}×)
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(data.duo)}%` }}
            />
          </div>
        </div>

        {/* Group */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-warning" />
              <span className="text-sm">Skupina (3+ účastníků)</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-sm">{formatCurrency(data.group)}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({data.groupCount}×)
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-warning rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(data.group)}%` }}
            />
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t text-center">
          <span className="text-xs text-muted-foreground">
            Celkem: {formatCurrency(total)} z {totalCount} tréninků
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
