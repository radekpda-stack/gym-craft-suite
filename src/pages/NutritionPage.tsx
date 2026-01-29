import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  Users,
  Search,
  Apple,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Activity,
  Coffee,
  Droplets,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useClients } from '@/hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, subDays, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UnifiedKPICards, UnifiedClientRow, UnifiedActivityTimeline, AttentionInbox } from '@/components/shared';
import type { KPICardConfig, ActivityItem, AttentionItem } from '@/components/shared';

interface ClientNutritionStats {
  clientId: string;
  clientName: string;
  hasActiveSession: boolean;
  lastEntryDate: string | null;
  totalEntries: number;
  recentFoodCount: number;
  recentDrinkCount: number;
  recentCoffeeCount: number;
  weekEntries: number;
  qualityDistribution: { good: number; normal: number; poor: number };
  emptyDays: number;
  lateCaffeineCount: number;
  hasWarning: boolean;
}

interface DashboardStats {
  totalActiveClients: number;
  totalEntriesThisWeek: number;
  avgEntriesPerClient: number;
  mostActiveClient: string | null;
  todayEntries: number;
  qualityDistribution: { good: number; normal: number; poor: number };
  clientsWithWarnings: number;
}

// Hook to get nutrition stats for all clients
function useClientsNutritionStats() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  return useQuery({
    queryKey: ['trainer-clients-nutrition-stats'],
    queryFn: async (): Promise<{ stats: ClientNutritionStats[]; dashboard: DashboardStats }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { 
        stats: [], 
        dashboard: { 
          totalActiveClients: 0, 
          totalEntriesThisWeek: 0, 
          avgEntriesPerClient: 0, 
          mostActiveClient: null, 
          todayEntries: 0,
          qualityDistribution: { good: 0, normal: 0, poor: 0 },
          clientsWithWarnings: 0,
        } 
      };

      const { data: sessions } = await supabase
        .from('nutrition_log_sessions')
        .select('id, client_id, status, start_date, end_date')
        .eq('user_id', user.id);

      if (!sessions || sessions.length === 0) {
        return {
          stats: clients.map(c => ({
            clientId: c.id,
            clientName: c.name,
            hasActiveSession: false,
            lastEntryDate: null,
            totalEntries: 0,
            recentFoodCount: 0,
            recentDrinkCount: 0,
            recentCoffeeCount: 0,
            weekEntries: 0,
            qualityDistribution: { good: 0, normal: 0, poor: 0 },
            emptyDays: 0,
            lateCaffeineCount: 0,
            hasWarning: false,
          })),
          dashboard: { 
            totalActiveClients: 0, 
            totalEntriesThisWeek: 0, 
            avgEntriesPerClient: 0, 
            mostActiveClient: null, 
            todayEntries: 0,
            qualityDistribution: { good: 0, normal: 0, poor: 0 },
            clientsWithWarnings: 0,
          }
        };
      }

      const sessionIds = sessions.map(s => s.id);
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [foodResult, drinksResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('id, session_id, client_id, entry_date, quality')
          .in('session_id', sessionIds)
          .gte('entry_date', weekAgo),
        supabase
          .from('nutrition_drink_entries')
          .select('id, session_id, client_id, entry_date')
          .in('session_id', sessionIds)
          .gte('entry_date', weekAgo),
        supabase
          .from('nutrition_coffee_entries')
          .select('id, session_id, client_id, entry_date, occurred_at')
          .in('session_id', sessionIds)
          .gte('entry_date', weekAgo),
      ]);

      const foodEntries = foodResult.data || [];
      const drinkEntries = drinksResult.data || [];
      const coffeeEntries = coffeeResult.data || [];

      const statsMap = new Map<string, ClientNutritionStats>();
      let totalWeekEntries = 0;
      let todayEntriesCount = 0;
      let totalQuality = { good: 0, normal: 0, poor: 0 };
      let clientsWithWarningsCount = 0;

      const weekDates = Array.from({ length: 7 }, (_, i) => 
        format(subDays(new Date(), i), 'yyyy-MM-dd')
      );

      clients.forEach(client => {
        const clientSessions = sessions.filter(s => s.client_id === client.id);
        const hasActive = clientSessions.some(s => s.status === 'active');
        
        const clientFood = foodEntries.filter(e => e.client_id === client.id);
        const clientDrinks = drinkEntries.filter(e => e.client_id === client.id);
        const clientCoffee = coffeeEntries.filter(e => e.client_id === client.id);
        
        const allDates = [
          ...clientFood.map(e => e.entry_date),
          ...clientDrinks.map(e => e.entry_date),
          ...clientCoffee.map(e => e.entry_date),
        ].sort().reverse();
        
        const recentFood = clientFood.filter(e => e.entry_date === today || e.entry_date === yesterday);
        const recentDrinks = clientDrinks.filter(e => e.entry_date === today || e.entry_date === yesterday);
        const recentCoffee = clientCoffee.filter(e => e.entry_date === today || e.entry_date === yesterday);
        
        const weekEntries = clientFood.length + clientDrinks.length + clientCoffee.length;
        totalWeekEntries += weekEntries;

        const todayFood = clientFood.filter(e => e.entry_date === today).length;
        const todayDrinks = clientDrinks.filter(e => e.entry_date === today).length;
        const todayCoffee = clientCoffee.filter(e => e.entry_date === today).length;
        todayEntriesCount += todayFood + todayDrinks + todayCoffee;

        const clientQuality = { good: 0, normal: 0, poor: 0 };
        clientFood.forEach(entry => {
          if (entry.quality === 'good') clientQuality.good++;
          else if (entry.quality === 'poor') clientQuality.poor++;
          else clientQuality.normal++;
        });
        
        totalQuality.good += clientQuality.good;
        totalQuality.normal += clientQuality.normal;
        totalQuality.poor += clientQuality.poor;

        const activeDatesSet = new Set(allDates);
        const emptyDays = hasActive ? weekDates.filter(d => !activeDatesSet.has(d)).length : 0;

        const lateCaffeineCount = clientCoffee.filter(entry => {
          if (!entry.occurred_at) return false;
          try {
            const hour = parseISO(entry.occurred_at).getHours();
            return hour >= 18;
          } catch {
            return false;
          }
        }).length;

        const hasWarning = hasActive && (emptyDays >= 3 || lateCaffeineCount >= 2);
        if (hasWarning) clientsWithWarningsCount++;

        statsMap.set(client.id, {
          clientId: client.id,
          clientName: client.name,
          hasActiveSession: hasActive,
          lastEntryDate: allDates[0] || null,
          totalEntries: weekEntries,
          recentFoodCount: recentFood.length,
          recentDrinkCount: recentDrinks.length,
          recentCoffeeCount: recentCoffee.length,
          weekEntries,
          qualityDistribution: clientQuality,
          emptyDays,
          lateCaffeineCount,
          hasWarning,
        });
      });

      const statsArray = Array.from(statsMap.values());
      const activeClients = statsArray.filter(s => s.hasActiveSession).length;
      const clientsWithEntries = statsArray.filter(s => s.weekEntries > 0);
      const mostActive = clientsWithEntries.length > 0 
        ? clientsWithEntries.reduce((a, b) => a.weekEntries > b.weekEntries ? a : b).clientName
        : null;

      return {
        stats: statsArray,
        dashboard: {
          totalActiveClients: activeClients,
          totalEntriesThisWeek: totalWeekEntries,
          avgEntriesPerClient: clientsWithEntries.length > 0 
            ? Math.round(totalWeekEntries / clientsWithEntries.length) 
            : 0,
          mostActiveClient: mostActive,
          todayEntries: todayEntriesCount,
          qualityDistribution: totalQuality,
          clientsWithWarnings: clientsWithWarningsCount,
        }
      };
    },
    enabled: clients.length > 0 && !clientsLoading,
  });
}

// Hook to get recent nutrition activity
function useNutritionActivity() {
  return useQuery({
    queryKey: ['nutrition-recent-activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const weekAgo = subDays(new Date(), 7);

      // Get recent food entries with client info
      const { data: foodEntries } = await supabase
        .from('nutrition_food_entries')
        .select(`
          id,
          client_id,
          entry_date,
          meal_type,
          created_at,
          clients!inner(id, name)
        `)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(15);

      const activities: ActivityItem[] = (foodEntries || []).map((entry: any) => ({
        id: entry.id,
        clientId: entry.client_id,
        clientName: entry.clients?.name || 'Klient',
        type: 'food',
        label: 'zapsal/a jídlo',
        timestamp: entry.created_at,
        icon: Apple,
        color: 'success' as const,
        detail: entry.meal_type,
      }));

      return activities.slice(0, 10);
    },
    refetchInterval: 60000,
  });
}

type FilterType = 'all' | 'active' | 'attention';

export default function NutritionPage() {
  usePageTracking('nutrition');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  
  const { data, isLoading } = useClientsNutritionStats();
  const { data: recentActivity = [], isLoading: activityLoading } = useNutritionActivity();
  
  const stats = data?.stats || [];
  const dashboard = data?.dashboard || { 
    totalActiveClients: 0, 
    totalEntriesThisWeek: 0, 
    avgEntriesPerClient: 0, 
    mostActiveClient: null, 
    todayEntries: 0,
    qualityDistribution: { good: 0, normal: 0, poor: 0 },
    clientsWithWarnings: 0,
  };

  // KPI Cards configuration
  const kpiCards: KPICardConfig[] = [
    {
      id: 'active',
      label: 'Aktivně zapisuje',
      value: dashboard.totalActiveClients,
      icon: Apple,
      variant: 'success',
    },
    {
      id: 'today',
      label: 'Dnes zapsáno',
      value: dashboard.todayEntries,
      icon: Calendar,
      variant: 'primary',
    },
    {
      id: 'week',
      label: 'Tento týden',
      value: dashboard.totalEntriesThisWeek,
      icon: TrendingUp,
      variant: 'accent',
    },
    {
      id: 'attention',
      label: 'Vyžaduje pozornost',
      value: dashboard.clientsWithWarnings,
      icon: AlertTriangle,
      variant: dashboard.clientsWithWarnings > 0 ? 'destructive' : 'muted',
    },
  ];

  // Handle KPI card click
  const handleKPIClick = (id: string) => {
    if (id === 'active') setFilter('active');
    else if (id === 'attention') setFilter('attention');
    else setFilter('all');
  };

  // Filter and search
  const filteredStats = stats.filter(s => {
    if (searchQuery && !s.clientName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === 'active' && !s.hasActiveSession) return false;
    if (filter === 'attention' && !s.hasWarning) return false;
    return true;
  });

  // Sort: clients with warnings first, then active, then by last entry
  const sortedStats = [...filteredStats].sort((a, b) => {
    if (a.hasWarning && !b.hasWarning) return -1;
    if (!a.hasWarning && b.hasWarning) return 1;
    if (a.hasActiveSession && !b.hasActiveSession) return -1;
    if (!a.hasActiveSession && b.hasActiveSession) return 1;
    if (a.lastEntryDate && b.lastEntryDate) {
      return b.lastEntryDate.localeCompare(a.lastEntryDate);
    }
    if (a.lastEntryDate) return -1;
    if (b.lastEntryDate) return 1;
    return a.clientName.localeCompare(b.clientName);
  });

  // Format last entry for display
  const formatLastEntry = (dateStr: string | null) => {
    if (!dateStr) return 'Žádné záznamy';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Dnes';
    if (isYesterday(date)) return 'Včera';
    return format(date, 'd. M.', { locale: cs });
  };

  // Build attention items
  const attentionItems: AttentionItem[] = stats
    .filter(s => s.hasWarning)
    .map(s => ({
      id: s.clientId,
      clientId: s.clientId,
      clientName: s.clientName,
      priority: 'medium' as const,
      label: s.emptyDays >= 3 ? 'Prázdné dny' : 'Pozdní kofein',
      reason: s.emptyDays >= 3 
        ? `${s.emptyDays} dnů bez záznamu` 
        : `${s.lateCaffeineCount}× kofein po 18:00`,
      icon: s.emptyDays >= 3 ? Calendar : Coffee,
    }));

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Strava
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Přehled deníků návyků klientů
        </p>
      </div>

      {/* KPI Cards - Unified */}
      <UnifiedKPICards 
        cards={kpiCards}
        activeId={filter !== 'all' ? filter : undefined}
        onCardClick={handleKPIClick}
        isLoading={isLoading}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat klienta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                Vše
              </Button>
              <Button 
                variant={filter === 'active' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('active')}
              >
                Aktivní
              </Button>
              <Button 
                variant={filter === 'attention' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('attention')}
                className={cn(
                  filter === 'attention' && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Pozornost
              </Button>
            </div>
          </div>

          {/* Client List - Unified Rows */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Klienti ({sortedStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sortedStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Žádní klienti nenalezeni</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedStats.map((stat) => (
                    <UnifiedClientRow
                      key={stat.clientId}
                      client={{
                        id: stat.clientId,
                        name: stat.clientName,
                        photo_url: null,
                      }}
                      status={stat.hasWarning ? 'warning' : stat.hasActiveSession ? 'active' : 'inactive'}
                      primaryText={`${formatLastEntry(stat.lastEntryDate)} • ${stat.weekEntries} záz. tento týden`}
                      secondaryText={stat.lateCaffeineCount > 0 ? `${stat.lateCaffeineCount}× pozdní kofein` : undefined}
                      badges={stat.hasWarning ? [{ label: 'Pozornost', variant: 'destructive', icon: AlertTriangle }] : undefined}
                      onClick={() => navigate(`/nutrition/client/${stat.clientId}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <UnifiedActivityTimeline
            title="Nedávná aktivita"
            titleIcon={Activity}
            activities={recentActivity}
            isLoading={activityLoading}
            maxHeight="250px"
            emptyMessage="Žádná nedávná aktivita"
          />

          {/* Attention Inbox */}
          <AttentionInbox
            title="Vyžaduje pozornost"
            items={attentionItems}
            isLoading={isLoading}
            maxHeight="250px"
            emptyMessage="Všichni klienti OK"
            limit={5}
          />
        </div>
      </div>
    </div>
  );
}
