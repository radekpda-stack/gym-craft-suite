import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  Users,
  Search,
  Apple,
  Clock,
  ChevronRight,
  TrendingUp,
  Calendar,
  Droplets,
  Coffee,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useClients } from '@/hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, isToday, isYesterday, subDays, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  // New fields for quality and warnings
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
  // New aggregated quality stats
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

      // Get all sessions for this trainer's clients
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

      // Get all entries with quality field
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

      // Build stats per client
      const statsMap = new Map<string, ClientNutritionStats>();
      let totalWeekEntries = 0;
      let todayEntriesCount = 0;
      let totalQuality = { good: 0, normal: 0, poor: 0 };
      let clientsWithWarningsCount = 0;

      // Get all dates in the week for empty days calculation
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

        // Calculate quality distribution for this client
        const clientQuality = { good: 0, normal: 0, poor: 0 };
        clientFood.forEach(entry => {
          if (entry.quality === 'good') clientQuality.good++;
          else if (entry.quality === 'poor') clientQuality.poor++;
          else clientQuality.normal++;
        });
        
        // Aggregate to total
        totalQuality.good += clientQuality.good;
        totalQuality.normal += clientQuality.normal;
        totalQuality.poor += clientQuality.poor;

        // Calculate empty days (days in active period without entries)
        const activeDatesSet = new Set(allDates);
        const emptyDays = hasActive ? weekDates.filter(d => !activeDatesSet.has(d)).length : 0;

        // Calculate late caffeine (coffee after 18:00)
        const lateCaffeineCount = clientCoffee.filter(entry => {
          if (!entry.occurred_at) return false;
          try {
            const hour = parseISO(entry.occurred_at).getHours();
            return hour >= 18;
          } catch {
            return false;
          }
        }).length;

        // Determine if client has warning
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

type FilterType = 'all' | 'active' | 'attention' | 'recent';

export default function NutritionPage() {
  usePageTracking('nutrition');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  
  const { data, isLoading } = useClientsNutritionStats();
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

  // Calculate quality percentages
  const totalQualityEntries = dashboard.qualityDistribution.good + dashboard.qualityDistribution.normal + dashboard.qualityDistribution.poor;
  const qualityPercentages = totalQualityEntries > 0 ? {
    good: Math.round((dashboard.qualityDistribution.good / totalQualityEntries) * 100),
    normal: Math.round((dashboard.qualityDistribution.normal / totalQualityEntries) * 100),
    poor: Math.round((dashboard.qualityDistribution.poor / totalQualityEntries) * 100),
  } : { good: 0, normal: 0, poor: 0 };

  // Filter and search
  const filteredStats = stats.filter(s => {
    if (searchQuery && !s.clientName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === 'active' && !s.hasActiveSession) return false;
    if (filter === 'attention' && !s.hasWarning) return false;
    if (filter === 'recent' && s.totalEntries === 0) return false;
    return true;
  });

  // Sort: clients with warnings first, then active, then by last entry
  const sortedStats = [...filteredStats].sort((a, b) => {
    // Warnings first
    if (a.hasWarning && !b.hasWarning) return -1;
    if (!a.hasWarning && b.hasWarning) return 1;
    // Then active
    if (a.hasActiveSession && !b.hasActiveSession) return -1;
    if (!a.hasActiveSession && b.hasActiveSession) return 1;
    // Then by last entry
    if (a.lastEntryDate && b.lastEntryDate) {
      return b.lastEntryDate.localeCompare(a.lastEntryDate);
    }
    if (a.lastEntryDate) return -1;
    if (b.lastEntryDate) return 1;
    return a.clientName.localeCompare(b.clientName);
  });

  const formatLastEntry = (dateStr: string | null) => {
    if (!dateStr) return 'Žádné záznamy';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Dnes';
    if (isYesterday(date)) return 'Včera';
    const days = differenceInDays(new Date(), date);
    if (days < 7) return `Před ${days} dny`;
    return format(date, 'd. M.', { locale: cs });
  };

  const getActivityColor = (lastEntryDate: string | null, hasWarning: boolean) => {
    if (hasWarning) return 'bg-destructive/10 text-destructive';
    if (!lastEntryDate) return 'bg-muted text-muted-foreground';
    const date = new Date(lastEntryDate);
    if (isToday(date)) return 'bg-success/10 text-success';
    if (isYesterday(date)) return 'bg-warning/10 text-warning';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
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

      {/* Dashboard Stats - Row 1: Basic metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <Apple className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{dashboard.totalActiveClients}</p>
                <p className="text-xs text-muted-foreground truncate">Aktivně zapisuje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{dashboard.totalEntriesThisWeek}</p>
                <p className="text-xs text-muted-foreground truncate">Záznamů tento týden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{dashboard.todayEntries}</p>
                <p className="text-xs text-muted-foreground truncate">Dnes zapsáno</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{dashboard.avgEntriesPerClient}</p>
                <p className="text-xs text-muted-foreground truncate">Průměr/klient</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Stats - Row 2: Quality and warnings */}
      {totalQualityEntries > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Quality distribution card */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Kvalita stravy tento týden</p>
                <div className="flex items-center gap-2 h-2 rounded-full overflow-hidden bg-muted">
                  {qualityPercentages.good > 0 && (
                    <div 
                      className="h-full bg-emerald-500/70" 
                      style={{ width: `${qualityPercentages.good}%` }}
                    />
                  )}
                  {qualityPercentages.normal > 0 && (
                    <div 
                      className="h-full bg-amber-500/70" 
                      style={{ width: `${qualityPercentages.normal}%` }}
                    />
                  )}
                  {qualityPercentages.poor > 0 && (
                    <div 
                      className="h-full bg-rose-500/70" 
                      style={{ width: `${qualityPercentages.poor}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                    {qualityPercentages.good}% kvalitní
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500/70" />
                    {qualityPercentages.normal}% běžná
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500/70" />
                    {qualityPercentages.poor}% nezdravá
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings card */}
          <Card className={cn(
            dashboard.clientsWithWarnings > 0 && "border-destructive/30"
          )}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  dashboard.clientsWithWarnings > 0 ? "bg-destructive/10" : "bg-muted"
                )}>
                  <AlertTriangle className={cn(
                    "w-5 h-5",
                    dashboard.clientsWithWarnings > 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold">{dashboard.clientsWithWarnings}</p>
                  <p className="text-xs text-muted-foreground truncate">Vyžaduje pozornost</p>
                </div>
                {dashboard.clientsWithWarnings > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setFilter('attention')}
                  >
                    Zobrazit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Most Active Client */}
      {dashboard.mostActiveClient && (
        <div className="px-1">
          <p className="text-sm text-muted-foreground">
            🏆 Nejaktivnější tento týden: <span className="font-medium text-foreground">{dashboard.mostActiveClient}</span>
          </p>
        </div>
      )}

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
        <div className="flex gap-1 flex-wrap">
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

      {/* Clients List */}
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
                <button
                  key={stat.clientId}
                  onClick={() => navigate(`/nutrition/client/${stat.clientId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                >
                  {/* Avatar with activity color */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    getActivityColor(stat.lastEntryDate, stat.hasWarning)
                  )}>
                    {stat.clientName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{stat.clientName}</span>
                      {stat.hasWarning && (
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px] px-1.5 shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          Pozornost
                        </Badge>
                      )}
                      {stat.hasActiveSession && !stat.hasWarning && (
                        <Badge variant="outline" className="text-success border-success/30 text-[10px] px-1.5 shrink-0">
                          Aktivní
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastEntry(stat.lastEntryDate)}
                      </span>
                      {stat.weekEntries > 0 && (
                        <span className="flex items-center gap-1">
                          <Apple className="w-3 h-3" />
                          {stat.weekEntries} tento týden
                        </span>
                      )}
                      {stat.emptyDays > 0 && stat.hasActiveSession && (
                        <span className="flex items-center gap-1 text-destructive/70">
                          {stat.emptyDays} prázdných dnů
                        </span>
                      )}
                      {stat.lateCaffeineCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive/70">
                          <Coffee className="w-3 h-3" />
                          {stat.lateCaffeineCount}× po 18:00
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Activity indicators */}
                  <div className="flex items-center gap-1 shrink-0">
                    {stat.recentFoodCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 gap-0.5">
                        <Apple className="w-3 h-3" />
                        {stat.recentFoodCount}
                      </Badge>
                    )}
                    {stat.recentDrinkCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 gap-0.5">
                        <Droplets className="w-3 h-3" />
                        {stat.recentDrinkCount}
                      </Badge>
                    )}
                    {stat.recentCoffeeCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 gap-0.5">
                        <Coffee className="w-3 h-3" />
                        {stat.recentCoffeeCount}
                      </Badge>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
