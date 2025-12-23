import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { UserCheck, Users, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { StatisticsCard } from './StatisticsGrid';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function ClientRetentionCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-retention'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Get all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, is_archived')
        .eq('user_id', user.user.id)
        .eq('is_archived', false);

      // Get training sessions for last 6 months
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .eq('user_id', user.user.id)
        .eq('status', 'completed')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

      if (!clients || !sessions) return null;

      // Calculate monthly retention
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        
        const activeClients = new Set(
          sessions
            .filter(s => {
              const d = new Date(s.date);
              return d >= monthStart && d < monthEnd;
            })
            .map(s => s.client_id)
        );

        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: cs }),
          activeClients: activeClients.size,
          totalClients: clients.length,
        });
      }

      // Calculate client activity status
      const clientActivity = clients.map(client => {
        const clientSessions = sessions.filter(s => s.client_id === client.id);
        const lastSession = clientSessions.length > 0 
          ? new Date(Math.max(...clientSessions.map(s => new Date(s.date).getTime())))
          : null;
        const daysSinceLastSession = lastSession 
          ? differenceInDays(now, lastSession)
          : Infinity;

        return {
          id: client.id,
          name: client.name,
          sessionsCount: clientSessions.length,
          daysSinceLastSession,
          status: daysSinceLastSession <= 14 ? 'active' : daysSinceLastSession <= 30 ? 'warning' : 'inactive',
        };
      });

      const activeCount = clientActivity.filter(c => c.status === 'active').length;
      const warningCount = clientActivity.filter(c => c.status === 'warning').length;
      const inactiveCount = clientActivity.filter(c => c.status === 'inactive').length;

      return {
        monthlyData,
        clientActivity,
        activeCount,
        warningCount,
        inactiveCount,
        retentionRate: clients.length > 0 ? Math.round((activeCount / clients.length) * 100) : 0,
      };
    },
  });

  const expandedContent = data && (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} klientů`, 'Aktivní']}
            />
            <Bar dataKey="activeClients" radius={[4, 4, 0, 0]}>
              {data.monthlyData.map((_, index) => (
                <Cell 
                  key={index} 
                  fill={index === data.monthlyData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                  fillOpacity={index === data.monthlyData.length - 1 ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 text-success mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Aktivní</span>
          </div>
          <p className="text-2xl font-bold">{data.activeCount}</p>
          <p className="text-xs text-muted-foreground">Trénink do 14 dní</p>
        </div>
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-2 text-warning mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Varování</span>
          </div>
          <p className="text-2xl font-bold">{data.warningCount}</p>
          <p className="text-xs text-muted-foreground">14-30 dní bez tréninku</p>
        </div>
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">Neaktivní</span>
          </div>
          <p className="text-2xl font-bold">{data.inactiveCount}</p>
          <p className="text-xs text-muted-foreground">30+ dní bez tréninku</p>
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <p className="text-sm font-medium text-muted-foreground mb-2">Přehled klientů</p>
        {data.clientActivity
          .sort((a, b) => a.daysSinceLastSession - b.daysSinceLastSession)
          .slice(0, 10)
          .map(client => (
            <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-2 h-8 rounded-full',
                  client.status === 'active' && 'bg-success',
                  client.status === 'warning' && 'bg-warning',
                  client.status === 'inactive' && 'bg-destructive'
                )} />
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {client.sessionsCount} tréninků za 6 měsíců
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-medium',
                  client.status === 'active' && 'text-success',
                  client.status === 'warning' && 'text-warning',
                  client.status === 'inactive' && 'text-destructive'
                )}>
                  {client.daysSinceLastSession === Infinity 
                    ? 'Bez tréninku' 
                    : `${client.daysSinceLastSession}d`}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <StatisticsCard
      title="Retence klientů"
      icon={<UserCheck className="h-4 w-4 text-success" />}
      isLoading={isLoading}
      expandedContent={expandedContent}
    >
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-success">{data?.retentionRate || 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Míra retence</p>
        </div>
        
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success">
              <Users className="h-3.5 w-3.5" />
              <span className="font-bold">{data?.activeCount || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Aktivní</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-warning">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-bold">{data?.warningCount || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Varování</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-destructive">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="font-bold">{data?.inactiveCount || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Neaktivní</p>
          </div>
        </div>
      </div>
    </StatisticsCard>
  );
}
