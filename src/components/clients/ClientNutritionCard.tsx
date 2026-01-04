import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Apple, 
  ChevronRight, 
  Calendar,
  Clock,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, differenceInDays, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientNutritionCardProps {
  clientId: string;
  clientName: string;
  defaultOpen?: boolean;
}

// Hook to get client nutrition stats
function useClientNutritionStats(clientId: string) {
  return useQuery({
    queryKey: ['client-nutrition-card-stats', clientId],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      // Get active session
      const { data: session } = await supabase
        .from('nutrition_log_sessions')
        .select('id, status, created_at')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get recent entries
      const [foodResult, drinksResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('id, entry_date')
          .eq('client_id', clientId)
          .gte('entry_date', weekAgo),
        supabase
          .from('nutrition_drink_entries')
          .select('id, entry_date, drink_type, amount_ml')
          .eq('client_id', clientId)
          .gte('entry_date', weekAgo),
        supabase
          .from('nutrition_coffee_entries')
          .select('id, entry_date')
          .eq('client_id', clientId)
          .gte('entry_date', weekAgo),
      ]);

      const food = foodResult.data || [];
      const drinks = drinksResult.data || [];
      const coffee = coffeeResult.data || [];

      const allDates = [
        ...food.map(e => e.entry_date),
        ...drinks.map(e => e.entry_date),
        ...coffee.map(e => e.entry_date),
      ].sort().reverse();

      const lastEntryDate = allDates[0] || null;
      const weekEntries = food.length + drinks.length + coffee.length;
      const waterMl = drinks
        .filter(d => d.drink_type === 'water')
        .reduce((sum, d) => sum + (d.amount_ml || 0), 0);

      return {
        hasActiveSession: !!session,
        sessionId: session?.id,
        lastEntryDate,
        weekEntries,
        foodCount: food.length,
        drinkCount: drinks.length,
        coffeeCount: coffee.length,
        waterMl,
      };
    },
  });
}

export function ClientNutritionCard({ clientId, clientName, defaultOpen = false }: ClientNutritionCardProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: stats, isLoading } = useClientNutritionStats(clientId);

  const formatLastEntry = (dateStr: string | null) => {
    if (!dateStr) return 'Žádné záznamy';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Dnes';
    if (isYesterday(date)) return 'Včera';
    const days = differenceInDays(new Date(), date);
    if (days < 7) return `Před ${days} dny`;
    return format(date, 'd. M.', { locale: cs });
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
        <div className="h-16 bg-secondary/30 rounded" />
      </div>
    );
  }

  const hasData = stats && stats.weekEntries > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              stats?.hasActiveSession ? 'bg-success/10' : 'bg-secondary/50'
            )}>
              <Apple className={cn(
                'w-5 h-5',
                stats?.hasActiveSession ? 'text-success' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Výživa</p>
              <p className="text-sm text-muted-foreground">
                {stats?.hasActiveSession 
                  ? `Aktivně zapisuje • ${stats.weekEntries} záznamů tento týden`
                  : hasData 
                    ? `Posl. záznam: ${formatLastEntry(stats?.lastEntryDate || null)}`
                    : 'Zatím nezačal zapisovat'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats?.hasActiveSession && (
              <Badge variant="secondary" className="bg-success/20 text-success border-0">
                Aktivní
              </Badge>
            )}
            <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 glass rounded-2xl space-y-4">
          {hasData ? (
            <>
              {/* Stats for this week */}
              <p className="text-xs text-muted-foreground">Tento týden</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-orange-500/10 text-center">
                  <p className="text-xl font-bold text-orange-500">{stats?.foodCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Jídel</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 text-center">
                  <p className="text-xl font-bold text-blue-500">{Math.round((stats?.waterMl || 0) / 100) / 10}l</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Vody</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-600/10 text-center">
                  <p className="text-xl font-bold text-amber-600">{stats?.coffeeCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Kávy</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Poslední: {formatLastEntry(stats?.lastEntryDate || null)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/nutrition/client/${clientId}`)}
                >
                  Zobrazit deník
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Apple className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Klient zatím nezapisuje stravu
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/nutrition/client/${clientId}`)}
              >
                <Calendar className="w-4 h-4" />
                Zobrazit deník
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
