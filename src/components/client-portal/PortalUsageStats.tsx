import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, Calendar, TrendingUp, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { usePortalStats, usePortalClients } from '@/hooks/useClientPortalAdmin';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: typeof Users;
  color: string;
  bgColor: string;
  subLabel?: string;
  trend?: number | null;
}

function StatCard({ label, value, icon: Icon, color, bgColor, subLabel, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", bgColor)}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold truncate">{value}</p>
              {trend !== undefined && trend !== null && trend !== 0 && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  trend > 0 ? "text-success" : "text-destructive"
                )}>
                  {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(trend)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {subLabel && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{subLabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortalUsageStats() {
  const { data: stats, isLoading: statsLoading } = usePortalStats();
  const { data: clients, isLoading: clientsLoading } = usePortalClients();

  const isLoading = statsLoading || clientsLoading;

  // Calculate clients needing attention (inactive 7+ days)
  const now = new Date();
  const needsAttentionCount = clients?.filter((client) => {
    if (!client.is_active || !client.auth_user_id) return false;
    if (!client.last_portal_login) return true;
    return differenceInDays(now, new Date(client.last_portal_login)) >= 7;
  }).length || 0;

  // Calculate active percentage
  const activePercent = stats?.totalClients 
    ? Math.round((stats.activeThisWeek / stats.totalClients) * 100)
    : 0;

  const statCards: StatCardProps[] = [
    {
      label: 'Celkem klientů',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Aktivní dnes',
      value: stats?.activeToday || 0,
      icon: UserCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Aktivní tento týden',
      value: `${activePercent}%`,
      subLabel: `${stats?.activeThisWeek || 0} z ${stats?.totalClients || 0}`,
      icon: Calendar,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Ø návštěv / klient',
      value: stats?.avgVisitsPerClient?.toFixed(1) || '0',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Vyžaduje pozornost',
      value: needsAttentionCount,
      subLabel: 'neaktivní 7+ dní',
      icon: AlertTriangle,
      color: needsAttentionCount > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: needsAttentionCount > 0 ? 'bg-destructive/10' : 'bg-muted',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {statCards.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
