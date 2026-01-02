import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, TrendingUp, TrendingDown, Minus, Heart, Sparkles } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ClientFeedbackCardProps {
  stats?: AnnualStatsData | null;
}

export function ClientFeedbackCard({ stats }: ClientFeedbackCardProps) {
  const totalFeedback = stats?.totalFeedback || 0;
  const avgBodyFeel = stats?.avgBodyFeel || 0;
  const avgSessionFit = stats?.avgSessionFit || 0;

  // Scores are on 1-10 scale
  const getScoreDisplay = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (score === 0) return { color: 'text-muted-foreground', label: 'Bez dat' };
    if (percentage >= 80) return { color: 'text-emerald-500', label: 'Výborné' };
    if (percentage >= 60) return { color: 'text-amber-500', label: 'Dobré' };
    return { color: 'text-red-500', label: 'Ke zlepšení' };
  };

  const bodyFeelDisplay = getScoreDisplay(avgBodyFeel, 10);
  const sessionFitDisplay = getScoreDisplay(avgSessionFit, 10);

  if (totalFeedback === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            Zpětná vazba klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná zpětná vazba
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4 text-primary" />
          Zpětná vazba klientů
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total feedback count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Celkem odpovědí</span>
          <span className="text-lg font-semibold">{totalFeedback}</span>
        </div>

        {/* Body feel metric */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-sm">Pocit těla</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${bodyFeelDisplay.color}`}>
                {avgBodyFeel > 0 ? avgBodyFeel.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${(avgBodyFeel / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{bodyFeelDisplay.label}</p>
        </div>

        {/* Session fit metric */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Náročnost tréninku</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${sessionFitDisplay.color}`}>
                {avgSessionFit > 0 ? avgSessionFit.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(avgSessionFit / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{sessionFitDisplay.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
