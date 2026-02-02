import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientHealthSummary } from '@/hooks/useClientHealthSummary';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Users, TrendingUp, Wallet, AlertTriangle, UserPlus, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface ClientHealthDashboardProps {
  periodRange: StatsPeriodRange | undefined;
}

function StatCell({ 
  label, 
  value, 
  subLabel,
  icon: Icon 
}: { 
  label: string; 
  value: string | number; 
  subLabel?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="text-center p-3">
      {Icon && <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />}
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subLabel && <p className="text-[10px] text-muted-foreground">{subLabel}</p>}
    </div>
  );
}

export function ClientHealthDashboard({ periodRange }: ClientHealthDashboardProps) {
  const { data, isLoading } = useClientHealthSummary(periodRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Zdraví klientely
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics grid - Instrument style */}
        <div className="grid grid-cols-3 gap-3">
          {/* Active Clients */}
          <div className="rounded-xl p-3 bg-secondary/30 border border-border/30 hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aktivních</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{data.activeClients}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{data.inactiveClients} neaktivních</p>
          </div>
          
          {/* Retention */}
          <div className="rounded-xl p-3 bg-secondary/30 border border-border/30 hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Retence</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{data.retentionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">60 dní</p>
          </div>
          
          {/* Avg LTV */}
          <div className="rounded-xl p-3 bg-secondary/30 border border-border/30 hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ø LTV</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(data.avgLTV, false)}</p>
            {data.topClient && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">Top: {data.topClient.name}</p>
            )}
          </div>
        </div>

        {/* Secondary metrics - Glass style */}
        <div className="flex items-center justify-around py-3 bg-secondary/20 rounded-xl border border-border/30">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <UserPlus className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="font-medium">{data.newClientsThisMonth}</span>
            <span className="text-muted-foreground text-xs">nových tento měsíc</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">{formatCurrency(data.avgMonthlyValue, false)}</span>
            <span className="text-muted-foreground text-xs">Ø měsíčně/klient</span>
          </div>
        </div>

        {/* At-risk clients with pulse effect */}
        {data.clientsAtRisk.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-warning">
              <div className="relative">
                <AlertTriangle className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full animate-pulse" />
              </div>
              <span>{data.clientsAtRisk.length} klientů vyžaduje pozornost</span>
            </div>
            <div className="space-y-2">
              {data.clientsAtRisk.slice(0, 3).map((client) => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    client.severity === 'critical' 
                      ? "bg-destructive/10 border border-destructive/30 hover:bg-destructive/15" 
                      : "bg-warning/10 border border-warning/30 hover:bg-warning/15"
                  )}
                >
                  <span className="font-medium">{client.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {client.reason}: {client.detail}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
