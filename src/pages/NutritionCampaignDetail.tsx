import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, eachDayOfInterval, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Utensils,
  Droplets,
  Coffee,
  Copy,
  ExternalLink,
  BarChart3,
  XCircle,
  MessageSquare,
  Loader2,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNutritionLogSession, useNutritionEntries, useUpdateNutritionLogSession } from '@/hooks/useNutritionLog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// Types for analysis
interface DayAnalysis {
  date: string;
  dayName: string;
  foodCount: number;
  drinkCount: number;
  coffeeCount: number;
  totalEntries: number;
  hasEntries: boolean;
  qualityBreakdown: { good: number; normal: number; poor: number };
  issues: string[];
}

interface BehaviorInsight {
  type: 'pattern' | 'issue' | 'recommendation';
  icon: React.ReactNode;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'error';
}

export default function NutritionCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading: sessionLoading } = useNutritionLogSession(id || '');
  const { food, drinks, coffee, isLoading: entriesLoading } = useNutritionEntries(id || '');
  const updateSession = useUpdateNutritionLogSession();

  const [trainerNotes, setTrainerNotes] = useState('');
  const [isNotesChanged, setIsNotesChanged] = useState(false);

  // Fetch client info
  const { data: client } = useQuery({
    queryKey: ['client-for-campaign', session?.client_id],
    queryFn: async () => {
      if (!session?.client_id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', session.client_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.client_id,
  });

  // Fetch existing trainer notes
  const { data: sessionDetails } = useQuery({
    queryKey: ['session-details', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .select('trainer_notes, expected_entries_per_day')
        .eq('id', id)
        .single();
      if (error) throw error;
      setTrainerNotes(data.trainer_notes || '');
      return data;
    },
    enabled: !!id,
  });

  // Save trainer notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!id) throw new Error('No session ID');
      const { error } = await supabase
        .from('nutrition_log_sessions')
        .update({ trainer_notes: notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Poznámky uloženy');
      setIsNotesChanged(false);
      queryClient.invalidateQueries({ queryKey: ['session-details', id] });
    },
    onError: () => {
      toast.error('Nepodařilo se uložit poznámky');
    },
  });

  // Calculate campaign stats
  const campaignStats = useMemo(() => {
    if (!session) return null;

    const startDate = parseISO(session.start_date);
    const endDate = parseISO(session.end_date);
    const today = new Date();
    
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const currentDay = Math.min(Math.max(1, differenceInDays(today, startDate) + 1), totalDays);
    const progress = (currentDay / totalDays) * 100;
    const daysRemaining = Math.max(0, differenceInDays(endDate, today));
    
    const isActive = session.status === 'active';
    const isCompleted = session.status === 'completed';
    const isExpired = !isCompleted && isAfter(today, endDate);

    const totalEntries = food.length + drinks.length + coffee.length;
    const expectedEntries = totalDays * (sessionDetails?.expected_entries_per_day || 3);
    const completionRate = Math.round((totalEntries / expectedEntries) * 100);

    return {
      startDate,
      endDate,
      totalDays,
      currentDay,
      progress,
      daysRemaining,
      isActive,
      isCompleted,
      isExpired,
      totalEntries,
      expectedEntries,
      completionRate,
      foodCount: food.length,
      drinkCount: drinks.length,
      coffeeCount: coffee.length,
    };
  }, [session, food, drinks, coffee, sessionDetails]);

  // Day-by-day analysis
  const dayAnalysis = useMemo((): DayAnalysis[] => {
    if (!session) return [];

    const startDate = parseISO(session.start_date);
    const endDate = parseISO(session.end_date);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayFood = food.filter(f => f.entry_date === dateStr);
      const dayDrinks = drinks.filter(d => d.entry_date === dateStr);
      const dayCoffee = coffee.filter(c => c.entry_date === dateStr);

      const qualityBreakdown = {
        good: dayFood.filter(f => f.quality === 'good').length,
        normal: dayFood.filter(f => f.quality === 'normal').length,
        poor: dayFood.filter(f => f.quality === 'poor').length,
      };

      const issues: string[] = [];
      if (dayFood.length === 0) issues.push('Žádné záznamy jídla');
      if (dayDrinks.length === 0) issues.push('Žádné záznamy pití');
      if (dayCoffee.length > 4) issues.push('Vysoká spotřeba kávy');

      return {
        date: dateStr,
        dayName: format(day, 'EEEE d. MMMM', { locale: cs }),
        foodCount: dayFood.length,
        drinkCount: dayDrinks.length,
        coffeeCount: dayCoffee.length,
        totalEntries: dayFood.length + dayDrinks.length + dayCoffee.length,
        hasEntries: dayFood.length + dayDrinks.length + dayCoffee.length > 0,
        qualityBreakdown,
        issues,
      };
    });
  }, [session, food, drinks, coffee]);

  // Generate behavior insights
  const insights = useMemo((): BehaviorInsight[] => {
    const result: BehaviorInsight[] = [];
    if (!campaignStats || !dayAnalysis.length) return result;

    // Recording quality
    const daysWithEntries = dayAnalysis.filter(d => d.hasEntries).length;
    const recordingRate = Math.round((daysWithEntries / dayAnalysis.length) * 100);

    if (recordingRate >= 80) {
      result.push({
        type: 'pattern',
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        title: 'Kvalitní vedení záznamů',
        description: `Klient zapisuje pravidelně (${recordingRate}% dní). To ukazuje na disciplínu a motivaci.`,
        severity: 'info',
      });
    } else if (recordingRate >= 50) {
      result.push({
        type: 'issue',
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        title: 'Nepravidelné záznamy',
        description: `Klient zapisuje pouze ${recordingRate}% dní. Chybějící dny ztěžují analýzu.`,
        severity: 'warning',
      });
    } else {
      result.push({
        type: 'issue',
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        title: 'Velmi slabé vedení záznamů',
        description: `Pouze ${recordingRate}% dní má záznamy. Kampaň nemá dostatek dat pro spolehlivou analýzu.`,
        severity: 'error',
      });
    }

    // Meal patterns
    const avgMeals = campaignStats.foodCount / dayAnalysis.length;
    if (avgMeals < 2) {
      result.push({
        type: 'issue',
        icon: <Utensils className="h-5 w-5 text-amber-500" />,
        title: 'Málo jídel denně',
        description: `Průměrně ${avgMeals.toFixed(1)} jídla/den. Klient pravděpodobně vynechává jídla nebo nezapisuje vše.`,
        severity: 'warning',
      });
    }

    // Hydration
    const avgDrinks = campaignStats.drinkCount / dayAnalysis.length;
    if (avgDrinks < 3) {
      result.push({
        type: 'issue',
        icon: <Droplets className="h-5 w-5 text-blue-500" />,
        title: 'Nedostatečná hydratace',
        description: `Průměrně ${avgDrinks.toFixed(1)} nápojů/den. Doporučte zvýšit příjem tekutin.`,
        severity: 'warning',
      });
    } else {
      result.push({
        type: 'pattern',
        icon: <Droplets className="h-5 w-5 text-blue-500" />,
        title: 'Dobrý pitný režim',
        description: `Průměrně ${avgDrinks.toFixed(1)} nápojů/den. Klient dbá na hydrataci.`,
        severity: 'info',
      });
    }

    // Coffee consumption
    const avgCoffee = campaignStats.coffeeCount / dayAnalysis.length;
    if (avgCoffee > 4) {
      result.push({
        type: 'issue',
        icon: <Coffee className="h-5 w-5 text-amber-600" />,
        title: 'Vysoká spotřeba kávy',
        description: `Průměrně ${avgCoffee.toFixed(1)} káv/den. Může ovlivňovat spánek a hladinu stresu.`,
        severity: 'warning',
      });
    }

    // Food quality
    const goodQuality = food.filter(f => f.quality === 'good').length;
    const poorQuality = food.filter(f => f.quality === 'poor').length;
    const qualityRatio = food.length > 0 ? (goodQuality / food.length) * 100 : 0;

    if (qualityRatio >= 60) {
      result.push({
        type: 'pattern',
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        title: 'Kvalitní stravování',
        description: `${Math.round(qualityRatio)}% jídel hodnoceno jako kvalitní. Výborná volba potravin.`,
        severity: 'info',
      });
    } else if (poorQuality > goodQuality) {
      result.push({
        type: 'issue',
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        title: 'Nízká kvalita stravy',
        description: `Více nekvalitních než kvalitních jídel. Zaměřte se na zlepšení výběru potravin.`,
        severity: 'error',
      });
    }

    // Generate recommendations based on issues
    const issueCount = result.filter(r => r.type === 'issue').length;
    if (issueCount === 0) {
      result.push({
        type: 'recommendation',
        icon: <Lightbulb className="h-5 w-5 text-green-500" />,
        title: 'Doporučení pro trenéra',
        description: 'Klient vede záznamy dobře a stravuje se kvalitně. Můžete přejít k pokročilejším cílům.',
      });
    } else if (issueCount <= 2) {
      result.push({
        type: 'recommendation',
        icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
        title: 'Doporučení pro trenéra',
        description: 'Zaměřte se na řešení identifikovaných problémů. Nastavte konkrétní denní cíle.',
      });
    } else {
      result.push({
        type: 'recommendation',
        icon: <Lightbulb className="h-5 w-5 text-red-500" />,
        title: 'Doporučení pro trenéra',
        description: 'Více problémů vyžaduje pozornost. Navrhněte schůzku s klientem a stanovte priority.',
      });
    }

    return result;
  }, [campaignStats, dayAnalysis, food]);

  const copyLink = async () => {
    if (!session) return;
    const url = `${window.location.origin}/nutrition-log/${session.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz zkopírován');
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await updateSession.mutateAsync({ sessionId: id, status: 'completed' });
      toast.success('Kampaň ukončena');
    } catch {
      toast.error('Nepodařilo se ukončit kampaň');
    }
  };

  const isLoading = sessionLoading || entriesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Kampaň nenalezena</p>
            <Button className="mt-4" onClick={() => navigate('/nutrition/campaigns')}>
              Zpět na kampaně
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {client?.name || 'Kampaň'}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {format(campaignStats?.startDate || new Date(), 'd. MMMM', { locale: cs })} – {format(campaignStats?.endDate || new Date(), 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaignStats?.isActive && (
            <>
              <Button variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Kopírovat odkaz
              </Button>
              <Button variant="outline" onClick={() => window.open(`/nutrition-log/${session.token}`, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Otevřít formulář
              </Button>
              <Button variant="destructive" onClick={handleComplete}>
                Ukončit kampaň
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status & Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                campaignStats?.isCompleted ? "bg-green-500/10" : campaignStats?.isActive ? "bg-blue-500/10" : "bg-red-500/10"
              )}>
                {campaignStats?.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : campaignStats?.isActive ? (
                  <Clock className="h-5 w-5 text-blue-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaignStats?.isCompleted ? 'Dokončeno' : campaignStats?.isActive ? `Den ${campaignStats.currentDay}` : 'Vypršelo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaignStats?.isActive ? `Zbývá ${campaignStats.daysRemaining} dní` : `Celkem ${campaignStats?.totalDays} dní`}
                </p>
              </div>
            </div>
            {campaignStats?.isActive && (
              <Progress value={campaignStats.progress} className="h-2 mt-4" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaignStats?.foodCount || 0}</p>
                <p className="text-sm text-muted-foreground">Záznamů jídla</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaignStats?.drinkCount || 0}</p>
                <p className="text-sm text-muted-foreground">Záznamů nápojů</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaignStats?.coffeeCount || 0}</p>
                <p className="text-sm text-muted-foreground">Záznamů kávy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="records">Záznamy</TabsTrigger>
          <TabsTrigger value="behavior">Chování</TabsTrigger>
          <TabsTrigger value="notes">Doporučení</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Completion Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Kvalita vedení záznamů
              </CardTitle>
              <CardDescription>
                Jak důsledně klient zaznamenává své stravování
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Míra dokončení</span>
                    <span className="text-sm font-medium">{campaignStats?.completionRate || 0}%</span>
                  </div>
                  <Progress 
                    value={campaignStats?.completionRate || 0} 
                    className={cn(
                      "h-3",
                      (campaignStats?.completionRate || 0) >= 70 ? "bg-green-100" : 
                      (campaignStats?.completionRate || 0) >= 40 ? "bg-amber-100" : "bg-red-100"
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {campaignStats?.totalEntries || 0} z očekávaných {campaignStats?.expectedEntries || 0} záznamů
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{dayAnalysis.filter(d => d.hasEntries).length}</p>
                    <p className="text-xs text-muted-foreground">Dní se záznamy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{dayAnalysis.filter(d => !d.hasEntries).length}</p>
                    <p className="text-xs text-muted-foreground">Dní bez záznamů</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {dayAnalysis.length > 0 
                        ? (campaignStats?.totalEntries || 0 / dayAnalysis.length).toFixed(1) 
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Průměr/den</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {Math.max(...dayAnalysis.map(d => d.totalEntries))}
                    </p>
                    <p className="text-xs text-muted-foreground">Max za den</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight, i) => (
              <Card key={i} className={cn(
                insight.severity === 'error' && "border-red-200 bg-red-50/50 dark:bg-red-950/10",
                insight.severity === 'warning' && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {insight.icon}
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Denní záznamy</CardTitle>
              <CardDescription>Přehled záznamů po dnech</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {dayAnalysis.map((day) => (
                    <div 
                      key={day.date}
                      className={cn(
                        "p-4 rounded-lg border",
                        day.hasEntries ? "bg-card" : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{day.dayName}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Utensils className="h-3 w-3" /> {day.foodCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Droplets className="h-3 w-3" /> {day.drinkCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Coffee className="h-3 w-3" /> {day.coffeeCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {day.issues.length > 0 && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {day.issues.length} problémů
                            </Badge>
                          )}
                          {day.hasEntries ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {day.totalEntries} záznamů
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Bez záznamů</Badge>
                          )}
                        </div>
                      </div>
                      {day.issues.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex flex-wrap gap-1">
                            {day.issues.map((issue, i) => (
                              <span key={i} className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">Nedostatek dat</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Klient zatím nezadal dostatek záznamů pro analýzu chování.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {insights.map((insight, i) => (
                <Card key={i} className={cn(
                  insight.severity === 'error' && "border-red-200 bg-red-50/50 dark:bg-red-950/10",
                  insight.severity === 'warning' && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        insight.type === 'pattern' && "bg-blue-100 dark:bg-blue-900/20",
                        insight.type === 'issue' && "bg-amber-100 dark:bg-amber-900/20",
                        insight.type === 'recommendation' && "bg-green-100 dark:bg-green-900/20"
                      )}>
                        {insight.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            insight.type === 'pattern' ? 'secondary' :
                            insight.type === 'issue' ? 'destructive' : 'default'
                          }>
                            {insight.type === 'pattern' ? 'Vzorec' :
                             insight.type === 'issue' ? 'Problém' : 'Doporučení'}
                          </Badge>
                          <h3 className="font-semibold">{insight.title}</h3>
                        </div>
                        <p className="text-muted-foreground mt-2">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Poznámky trenéra
              </CardTitle>
              <CardDescription>
                Vaše poznámky a doporučení pro tuto kampaň
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Zadejte poznámky pro tuto kampaň..."
                value={trainerNotes}
                onChange={(e) => {
                  setTrainerNotes(e.target.value);
                  setIsNotesChanged(true);
                }}
                rows={6}
                className="mb-4"
              />
              <Button 
                onClick={() => saveNotesMutation.mutate(trainerNotes)}
                disabled={!isNotesChanged || saveNotesMutation.isPending}
              >
                {saveNotesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Uložit poznámky
              </Button>
            </CardContent>
          </Card>

          {/* Auto-generated recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Automatická doporučení
              </CardTitle>
              <CardDescription>
                Doporučení vygenerovaná na základě dat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.filter(i => i.type === 'recommendation').length === 0 ? (
                <p className="text-muted-foreground">
                  Nedostatek dat pro generování doporučení.
                </p>
              ) : (
                <div className="space-y-4">
                  {insights.filter(i => i.type === 'recommendation').map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      {rec.icon}
                      <div>
                        <p className="font-medium">{rec.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
