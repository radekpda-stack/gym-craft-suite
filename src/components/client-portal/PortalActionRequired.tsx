import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, UserX } from 'lucide-react';
import { useAllClientWorkoutLogs } from '@/hooks/useClientWorkoutLogs';
import { usePortalClients } from '@/hooks/useClientPortalAdmin';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface ActionItem {
  icon: typeof AlertCircle;
  label: string;
  count: number;
  color: string;
  action?: () => void;
  link?: string;
}

export function PortalActionRequired() {
  const { data: logs } = useAllClientWorkoutLogs();
  const { data: clients } = usePortalClients();

  // Calculate action items
  const unreviewedCount = logs?.filter(
    (log) => (log as any).status !== 'reviewed' && (log as any).status !== 'planned'
  ).length || 0;

  const now = new Date();
  const inactiveClients = clients?.filter((client) => {
    if (!client.last_portal_login) return true;
    const daysSinceLogin = differenceInDays(now, new Date(client.last_portal_login));
    return daysSinceLogin >= 7;
  }).length || 0;

  const pendingClients = clients?.filter(
    (client) => !client.auth_user_id && client.is_active
  ).length || 0;

  const actions: ActionItem[] = [
    {
      icon: CheckCircle2,
      label: 'Tréninky ke kontrole',
      count: unreviewedCount,
      color: 'text-warning',
      link: '#diaries', // We'll handle this with tab switching
    },
    {
      icon: UserX,
      label: 'Neaktivní 7+ dní',
      count: inactiveClients,
      color: 'text-destructive',
      link: '#clients',
    },
    {
      icon: Clock,
      label: 'Čekají na aktivaci',
      count: pendingClients,
      color: 'text-muted-foreground',
      link: '#clients',
    },
  ].filter((a) => a.count > 0);

  if (actions.length === 0) return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">Vyžaduje pozornost</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.label}
                className="flex items-center gap-2 text-sm"
              >
                <Icon className={`w-4 h-4 ${action.color}`} />
                <span>{action.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {action.count}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
