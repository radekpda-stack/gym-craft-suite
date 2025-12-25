import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Utensils, Droplets, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TodayEntriesProps {
  food: any[];
  drinks: any[];
  coffee: any[];
  isLoading?: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
};

const DRINK_LABELS: Record<string, string> = {
  water: 'Voda',
  sugary: 'Slazené',
  sports: 'Ionťák',
  alcohol: 'Alkohol',
  other: 'Jiné',
};

const COFFEE_LABELS: Record<string, string> = {
  espresso: 'Espresso',
  cappuccino: 'Cappuccino',
  energy: 'Energy drink',
  other: 'Jiné',
};

export function TodayEntries({ food, drinks, coffee, isLoading }: TodayEntriesProps) {
  const hasEntries = food.length > 0 || drinks.length > 0 || coffee.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dnešní záznamy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasEntries) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Zatím žádné záznamy pro dnešek
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Dnešní záznamy</span>
          <span className="text-xs font-normal text-muted-foreground">
            {format(new Date(), 'd. MMMM', { locale: cs })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Food entries */}
        {food.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
              <Utensils className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {MEAL_LABELS[entry.meal_type] || entry.meal_type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.entry_time?.slice(0, 5)}
                </span>
              </div>
              <p className="text-sm truncate">{entry.description}</p>
              {entry.portion_size && (
                <span className="text-xs text-muted-foreground">
                  {entry.portion_size === 'small' ? 'Malá' : entry.portion_size === 'large' ? 'Velká' : 'Střední'} porce
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Drink entries */}
        {drinks.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {DRINK_LABELS[entry.drink_type] || entry.drink_type}
                </span>
                {entry.amount_ml && (
                  <span className="text-xs text-muted-foreground">
                    {entry.amount_ml} ml
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {entry.entry_time?.slice(0, 5)}
            </span>
          </div>
        ))}

        {/* Coffee entries */}
        {coffee.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-amber-600/5 border border-amber-600/10"
          >
            <div className="w-8 h-8 rounded-full bg-amber-600/10 flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {COFFEE_LABELS[entry.coffee_type] || entry.coffee_type}
                </span>
                {entry.count > 1 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    ×{entry.count}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {entry.entry_time?.slice(0, 5)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
