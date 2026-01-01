import { Trophy, TrendingUp, Clock, Dumbbell, Target } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPRs, formatTimeDisplay } from '@/hooks/useClientPRs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const metricIcons: Record<string, any> = {
  time: Clock,
  weight: Dumbbell,
  reps: Target,
  distance: TrendingUp,
  power: TrendingUp,
};

export function ClientPRsWidget() {
  const { clientId } = useClientPortal();
  const { data: prs, isLoading } = useClientPRs(clientId ?? undefined);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!prs?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Osobní rekordy (PR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné osobní rekordy. Pokračuj v trénincích!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show top 5 PRs
  const topPRs = prs.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Osobní rekordy (PR)
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {prs.length} PR
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {topPRs.map((pr) => {
          const Icon = metricIcons[pr.pr_definitions?.metric_type || 'weight'] || Target;
          return (
            <div
              key={pr.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {pr.pr_definitions?.name || pr.pr_definition_id}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{pr.best_display}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(pr.achieved_at), 'd. MMM yyyy', { locale: cs })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
