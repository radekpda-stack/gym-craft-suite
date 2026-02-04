import { Bell, ArrowUp, Minus, ArrowDown, ExternalLink, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllUnresolvedFollowups, FollowupPriority } from '@/hooks/useTrainingFollowups';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const followupTypes = {
  pain: { label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  technique: { label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  goal: { label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  general: { label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
};

const priorityConfig = {
  high: { label: 'Vysoká', icon: ArrowUp, color: 'text-red-400' },
  medium: { label: 'Střední', icon: Minus, color: 'text-yellow-400' },
  low: { label: 'Nízká', icon: ArrowDown, color: 'text-muted-foreground' },
};

interface FollowupsDashboardWidgetProps {
  limit?: number;
}

export function FollowupsDashboardWidget({ limit = 5 }: FollowupsDashboardWidgetProps) {
  const { data: followups = [], isLoading } = useAllUnresolvedFollowups();

  const displayedFollowups = followups.slice(0, limit);
  const hasMore = followups.length > limit;
  const highPriorityCount = followups.filter(f => f.priority === 'high').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Připomenutí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (followups.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Připomenutí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Žádná aktivní připomenutí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={highPriorityCount > 0 ? 'border-red-500/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className={`w-5 h-5 ${highPriorityCount > 0 ? 'text-red-400' : ''}`} />
            Připomenutí
            <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'}>
              {followups.length}
            </Badge>
          </CardTitle>
          {hasMore && (
            <span className="text-xs text-muted-foreground ml-auto">
              +{followups.length - limit} dalších
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedFollowups.map((followup) => {
            const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
            const prioConfig = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
            const PrioIcon = prioConfig.icon;
            const createdDate = format(new Date(followup.created_at), 'd.M.', { locale: cs });

            return (
              <Link
                key={followup.id}
                to={`/klienti/${followup.client_id}?tab=communication`}
                className={`block p-2 rounded-lg border transition-colors hover:bg-accent/50 ${
                  followup.priority === 'high'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-card/50 border-border/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <PrioIcon className={`w-4 h-4 mt-0.5 shrink-0 ${prioConfig.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">
                        {followup.client?.name || 'Klient'}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${typeConfig.color}`}>
                        {typeConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {createdDate}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {followup.content}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {/* All followups are shown inline in FollowupsSection on Dashboard */}
      </CardContent>
    </Card>
  );
}
