import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePainHistory } from '@/hooks/usePainHistory';
import { cn } from '@/lib/utils';

interface PainHistoryCardProps {
  clientId: string;
}

const AREA_LABELS: Record<string, string> = {
  neck: 'Krk',
  shoulder: 'Rameno',
  chest: 'Hrudník',
  upper_back: 'Horní záda',
  lower_back: 'Dolní záda',
  hip: 'Kyčel',
  glutes: 'Hýždě',
  knee: 'Koleno',
  hamstring: 'Zadní stehno',
  calf: 'Lýtko',
  ankle: 'Kotník',
  wrist: 'Zápěstí',
  elbow: 'Loket',
  other: 'Jiné',
};

export function PainHistoryCard({ clientId }: PainHistoryCardProps) {
  const { data, isLoading } = usePainHistory(clientId);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Historie bolestí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { entries, stats } = data || { entries: [], stats: [] };

  if (stats.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Historie bolestí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zatím žádné záznamy o bolestech z feedbacků.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stats.map(s => s.count));

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Historie bolestí
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {entries.length} záznamů
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pain area frequency chart */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            Nejčastější oblasti bolesti
          </p>
          <div className="space-y-2">
            {stats.slice(0, 5).map((stat) => {
              const percentage = (stat.count / maxCount) * 100;
              const painLevel = stat.avgPain >= 7 ? 'high' : stat.avgPain >= 4 ? 'medium' : 'low';
              
              return (
                <div key={stat.area} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {AREA_LABELS[stat.area] || stat.area}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {stat.count}×
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          painLevel === 'high' && "border-destructive text-destructive",
                          painLevel === 'medium' && "border-warning text-warning",
                          painLevel === 'low' && "border-muted-foreground"
                        )}
                      >
                        ⌀ {stat.avgPain}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2",
                      painLevel === 'high' && "[&>div]:bg-destructive",
                      painLevel === 'medium' && "[&>div]:bg-warning",
                      painLevel === 'low' && "[&>div]:bg-primary"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent pain entries */}
        {entries.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">
              Poslední záznamy
            </p>
            <div className="space-y-1.5">
              {entries.slice(0, 3).map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {format(new Date(entry.training_date), 'd.M.', { locale: cs })}
                    </span>
                    <span className="font-medium">
                      {entry.pain_area 
                        ? entry.pain_area.split(',').map(a => 
                            AREA_LABELS[a.trim().replace(/_left|_right|_both/g, '')] || a.trim()
                          ).join(', ')
                        : 'Neurčeno'
                      }
                    </span>
                  </div>
                  <Badge 
                    variant={entry.pain >= 7 ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {entry.pain}/10
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
