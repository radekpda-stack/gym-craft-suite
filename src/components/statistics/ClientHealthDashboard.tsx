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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Zdraví klientely
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics grid */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          <div className="bg-background">
            <StatCell
              icon={Users}
              label="Aktivních"
              value={data.activeClients}
              subLabel={`${data.inactiveClients} neaktivních`}
            />
          </div>
          <div className="bg-background">
            <StatCell
              icon={TrendingUp}
              label="Retence"
              value={`${data.retentionRate}%`}
              subLabel="60 dní"
            />
          </div>
          <div className="bg-background">
            <StatCell
              icon={Wallet}
              label="Ø LTV"
              value={formatCurrency(data.avgLTV, false)}
              subLabel={data.topClient ? `Top: ${data.topClient.name}` : undefined}
            />
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="flex items-center justify-around py-2 border-t border-b">
          <div className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            <span className="font-medium">{data.newClientsThisMonth}</span>
            <span className="text-muted-foreground text-xs">nových tento měsíc</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-medium">{formatCurrency(data.avgMonthlyValue, false)}</span>
            <span className="text-muted-foreground text-xs">Ø měsíčně/klient</span>
          </div>
        </div>

        {/* At-risk clients */}
        {data.clientsAtRisk.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>{data.clientsAtRisk.length} klientů vyžaduje pozornost</span>
            </div>
            <div className="space-y-1.5">
              {data.clientsAtRisk.slice(0, 3).map((client) => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm transition-colors",
                    client.severity === 'critical' 
                      ? "bg-destructive/10 hover:bg-destructive/20" 
                      : "bg-warning/10 hover:bg-warning/20"
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
