import { useState, useMemo } from 'react';
import { Users, Trophy, Plus, Search, ChevronRight, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllClientsProgress } from '@/hooks/useClientProgressStats';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

function getActivityStatus(lastActivity: string | null) {
  if (!lastActivity) return { dot: 'bg-muted-foreground/30', avatarRing: 'ring-muted-foreground/20', badgeClass: 'border-border/40 text-muted-foreground', label: 'Bez záznamu', priority: 3 };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { dot: 'bg-success', avatarRing: 'ring-success/40', badgeClass: 'border-success/40 text-success bg-success/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }), priority: 0 };
  if (days <= 30) return { dot: 'bg-warning', avatarRing: 'ring-warning/40', badgeClass: 'border-warning/40 text-warning bg-warning/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }), priority: 1 };
  return { dot: 'bg-destructive', avatarRing: 'ring-destructive/40', badgeClass: 'border-destructive/40 text-destructive bg-destructive/10', label: formatDistanceToNow(parseISO(lastActivity), { addSuffix: true, locale: cs }), priority: 2 };
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function useClientMonthlyStats(clientIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-monthly-stats', user?.id, clientIds.sort().join(',')],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString().split('T')[0];

      const [s, c, sk] = await Promise.all([
        supabase.from('exercise_entries').select('client_id').eq('user_id', user!.id).gte('date', since).in('client_id', clientIds),
        supabase.from('cardio_entries').select('client_id').eq('user_id', user!.id).gte('date', since).in('client_id', clientIds),
        supabase.from('skill_entries').select('client_id').eq('user_id', user!.id).gte('date', since).in('client_id', clientIds),
      ]);

      const counts: Record<string, number> = {};
      [...(s.data || []), ...(c.data || []), ...(sk.data || [])].forEach(r => {
        counts[r.client_id] = (counts[r.client_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user?.id && clientIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
}

interface ClientListProps {
  onSelectClient: (id: string, name: string) => void;
  onQuickLog: (clientId: string) => void;
}

export function ClientList({ onSelectClient, onQuickLog }: ClientListProps) {
  const [search, setSearch] = useState('');
  const { data: allClients = [], isLoading } = useAllClientsProgress();

  const sorted = useMemo(() => {
    return [...allClients].sort((a, b) => {
      const aStatus = getActivityStatus(a.lastActivity || null);
      const bStatus = getActivityStatus(b.lastActivity || null);
      if (bStatus.priority !== aStatus.priority) return bStatus.priority - aStatus.priority;
      return a.name.localeCompare(b.name);
    });
  }, [allClients]);

  const filtered = sorted.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const clientIds = allClients.map(c => c.id);
  const { data: monthlyStats = {} } = useClientMonthlyStats(clientIds);

  const colors = ['from-orange-500 to-amber-500', 'from-emerald-500 to-teal-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-rose-500 to-red-500'];
  const getColor = (name: string) => colors[name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Hledat klienta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Žádní klienti</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const activity = getActivityStatus(client.lastActivity || null);
            const monthlyCount = monthlyStats[client.id] || 0;
            const initials = getInitials(client.name);
            const gradient = getColor(client.name);

            return (
              <div
                key={client.id}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl text-left',
                  'bg-card/80 border border-border/50',
                  'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                )}
              >
                <button onClick={() => onSelectClient(client.id, client.name)} className="relative shrink-0 focus:outline-none">
                  <div className={cn('w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center ring-2', gradient, activity.avatarRing)}>
                    <span className="text-sm font-bold text-white">{initials}</span>
                  </div>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card", activity.dot)} />
                </button>

                <button onClick={() => onSelectClient(client.id, client.name)} className="flex-1 min-w-0 text-left focus:outline-none">
                  <p className="font-semibold text-foreground truncate text-sm">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", activity.badgeClass)}>
                      {activity.label}
                    </span>
                  </div>
                </button>

                <button onClick={() => onSelectClient(client.id, client.name)} className="flex flex-col items-end gap-1 shrink-0 focus:outline-none">
                  <div className="flex items-center gap-1.5">
                    {client.prCount > 0 && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium">
                        <Trophy className="w-2.5 h-2.5" />
                        {client.prCount}
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {monthlyCount > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Flame className="w-2.5 h-2.5 text-warning" />
                      <span>{monthlyCount} / 30 dní</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onQuickLog(client.id); }}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
                    "bg-primary/10 text-primary",
                    "hover:bg-primary hover:text-primary-foreground",
                    "transition-all duration-200 focus:outline-none",
                  )}
                  title="Zapsat výkon"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
