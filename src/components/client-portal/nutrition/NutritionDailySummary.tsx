import { Card, CardContent } from '@/components/ui/card';
import { Droplets, Utensils, Target, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutritionDailySummaryProps {
  foodCount: number;
  drinkCount: number;
  coffeeCount: number;
  waterMl: number;
  campaignProgress: number;
  campaignTotal: number;
}

export function NutritionDailySummary({
  foodCount,
  drinkCount,
  coffeeCount,
  waterMl,
  campaignProgress,
  campaignTotal,
}: NutritionDailySummaryProps) {
  const progressPercent = campaignTotal > 0 ? Math.round((campaignProgress / campaignTotal) * 100) : 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Utensils className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{foodCount}</p>
            <p className="text-xs text-muted-foreground">Jídel dnes</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{waterMl}</p>
            <p className="text-xs text-muted-foreground">ml vody</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{coffeeCount + drinkCount}</p>
            <p className="text-xs text-muted-foreground">Nápojů</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{progressPercent}%</p>
            <p className="text-xs text-muted-foreground">Kampaň</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
