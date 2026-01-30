import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Utensils, Coffee, Droplets, ExternalLink, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { UnifiedNotification } from '@/hooks/useAggregatedNotifications';
import {
  MEAL_LABELS,
  PORTION_LABELS,
  QUALITY_LABELS,
  SATIATION_LABELS,
  DRINK_LABELS,
  COFFEE_LABELS,
} from '@/components/client-portal/nutrition/constants';

interface NutritionEntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

interface FoodEntry {
  id: string;
  meal_type: string;
  description: string | null;
  portion_size: string | null;
  quality: string | null;
  satiation: string | null;
  entry_time: string | null;
}

interface DrinkEntry {
  id: string;
  drink_type: string;
  amount_ml: number | null;
  entry_time: string | null;
}

interface CoffeeEntry {
  id: string;
  coffee_type: string;
  entry_time: string | null;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

const DRINK_ICONS: Record<string, string> = {
  water: '💧',
  sugary: '🥤',
  sports: '⚡',
  alcohol: '🍺',
  other: '🧃',
};

const COFFEE_ICONS: Record<string, string> = {
  espresso: '☕',
  cappuccino: '🥛',
  tea: '🍵',
  energy: '⚡',
  other: '🫖',
};

export function NutritionEntryDetailDialog({
  open,
  onOpenChange,
  notification,
}: NutritionEntryDetailDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState<string>('');
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [drinkEntries, setDrinkEntries] = useState<DrinkEntry[]>([]);
  const [coffeeEntries, setCoffeeEntries] = useState<CoffeeEntry[]>([]);

  useEffect(() => {
    if (!open || !notification) {
      setFoodEntries([]);
      setDrinkEntries([]);
      setCoffeeEntries([]);
      setClientName('');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const clientId = notification.client_id;
        const notificationDate = parseISO(notification.created_at);
        const dayStart = startOfDay(notificationDate).toISOString();
        const dayEnd = endOfDay(notificationDate).toISOString();

        if (!clientId) {
          console.error('[NutritionEntryDetailDialog] No client_id in notification');
          return;
        }

        // Fetch client name
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .maybeSingle();
        
        if (clientData?.name) {
          setClientName(clientData.name);
        }

        // Fetch food entries for the day
        const { data: food } = await supabase
          .from('nutrition_food_entries')
          .select('id, meal_type, description, portion_size, quality, satiation, entry_time')
          .eq('client_id', clientId)
          .gte('entry_time', dayStart)
          .lte('entry_time', dayEnd)
          .order('entry_time', { ascending: true });

        // Fetch drink entries for the day
        const { data: drinks } = await supabase
          .from('nutrition_drink_entries')
          .select('id, drink_type, amount_ml, entry_time')
          .eq('client_id', clientId)
          .gte('entry_time', dayStart)
          .lte('entry_time', dayEnd)
          .order('entry_time', { ascending: true });

        // Fetch coffee entries for the day
        const { data: coffee } = await supabase
          .from('nutrition_coffee_entries')
          .select('id, coffee_type, entry_time')
          .eq('client_id', clientId)
          .gte('entry_time', dayStart)
          .lte('entry_time', dayEnd)
          .order('entry_time', { ascending: true });

        setFoodEntries(food || []);
        setDrinkEntries(drinks || []);
        setCoffeeEntries(coffee || []);
      } catch (error) {
        console.error('[NutritionEntryDetailDialog] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, notification]);

  const handleNavigateToFullDiary = () => {
    if (notification?.client_id) {
      onOpenChange(false);
      navigate(`/nutrition/client/${notification.client_id}`);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      return format(parseISO(timeStr), 'HH:mm', { locale: cs });
    } catch {
      return '';
    }
  };

  const formattedDate = notification
    ? format(parseISO(notification.created_at), 'EEEE d. MMMM yyyy', { locale: cs })
    : '';

  const hasAnyEntries = foodEntries.length > 0 || drinkEntries.length > 0 || coffeeEntries.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col z-[120]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">🍎</span>
            Strava klienta
          </DialogTitle>
          <DialogDescription>
            {clientName && <span className="font-medium text-foreground">{clientName}</span>}
            {clientName && ' • '}
            <span className="capitalize">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasAnyEntries ? (
            <div className="text-center py-8">
              <Utensils className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Pro tento den nebyly nalezeny záznamy
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Food Entries */}
              {foodEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-foreground">Jídla</h3>
                    <span className="text-xs text-muted-foreground">({foodEntries.length})</span>
                  </div>
                  <div className="space-y-2">
                    {foodEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg shrink-0">
                            {MEAL_ICONS[entry.meal_type] || '🍽️'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {MEAL_LABELS[entry.meal_type] || entry.meal_type}
                              </span>
                              {entry.entry_time && (
                                <span className="text-xs text-muted-foreground">
                                  ({formatTime(entry.entry_time)})
                                </span>
                              )}
                            </div>
                            {entry.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {entry.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {entry.portion_size && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                  {PORTION_LABELS[entry.portion_size] || entry.portion_size}
                                </span>
                              )}
                              {entry.quality && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                  {QUALITY_LABELS[entry.quality] || entry.quality}
                                </span>
                              )}
                              {entry.satiation && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                  {SATIATION_LABELS[entry.satiation] || entry.satiation}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drink Entries */}
              {drinkEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-foreground">Nápoje</h3>
                    <span className="text-xs text-muted-foreground">({drinkEntries.length})</span>
                  </div>
                  <div className="space-y-2">
                    {drinkEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg shrink-0">
                            {DRINK_ICONS[entry.drink_type] || '💧'}
                          </span>
                          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {DRINK_LABELS[entry.drink_type] || entry.drink_type}
                            </span>
                            {entry.entry_time && (
                              <span className="text-xs text-muted-foreground">
                                ({formatTime(entry.entry_time)})
                              </span>
                            )}
                            {entry.amount_ml && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {entry.amount_ml} ml
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coffee Entries */}
              {coffeeEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Coffee className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-foreground">Kofein</h3>
                    <span className="text-xs text-muted-foreground">({coffeeEntries.length})</span>
                  </div>
                  <div className="space-y-2">
                    {coffeeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg shrink-0">
                            {COFFEE_ICONS[entry.coffee_type] || '☕'}
                          </span>
                          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {COFFEE_LABELS[entry.coffee_type] || entry.coffee_type}
                            </span>
                            {entry.entry_time && (
                              <span className="text-xs text-muted-foreground">
                                ({formatTime(entry.entry_time)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Zavřít
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleNavigateToFullDiary}
          >
            <ExternalLink className="w-4 h-4" />
            Zobrazit celý deník
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
