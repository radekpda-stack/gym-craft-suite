import { useMemo } from 'react';
import { format, subDays, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';

interface FeedbackStatisticsCardProps {
  clientId: string;
}

interface MiniTrendProps {
  current: number;
  previous: number;
  label: string;
  icon: React.ReactNode;
  inverted?: boolean; // For metrics where lower is better (like pain)
}

function MiniTrend({ current, previous, label, icon, inverted = false }: MiniTrendProps) {
  const diff = current - previous;
  const isImproving = inverted ? diff < 0 : diff > 0;
  const isWorsening = inverted ? diff > 0 : diff < 0;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{current.toFixed(1)}</span>
        {diff !== 0 && (
          <span className={cn(
            "flex items-center text-xs",
            isImproving && "text-success",
            isWorsening && "text-destructive",
            !isImproving && !isWorsening && "text-muted-foreground"
          )}>
            {isImproving ? <TrendingUp className="w-3 h-3" /> : 
             isWorsening ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
          </span>
        )}
      </div>
    </div>
  );
}

export function FeedbackStatisticsCard({ clientId }: FeedbackStatisticsCardProps) {
  const { data: allFeedback = [] } = useClientFeedback(clientId);
  const { data: allSessions = [] } = useTrainingSessions(clientId);

  const stats = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    // Last 10 feedbacks
    const last10 = allFeedback.slice(0, 10);
    
    // Feedback in last 30 days
    const feedbackLast30Days = allFeedback.filter(f => 
      isAfter(new Date(f.training_date), thirtyDaysAgo)
    );
    
    // Completed trainings in last 30 days
    const completedTrainingsLast30Days = allSessions.filter(s => 
      s.status === 'completed' && isAfter(new Date(s.date), thirtyDaysAgo)
    );
    
    // Adherence rate (feedback count / completed trainings count)
    const adherenceRate = completedTrainingsLast30Days.length > 0
      ? (feedbackLast30Days.length / completedTrainingsLast30Days.length) * 100
      : 0;

    // Calculate averages for last 5 vs previous 5
    const last5 = allFeedback.slice(0, 5);
    const prev5 = allFeedback.slice(5, 10);

    const calcAvg = (items: typeof allFeedback, field: keyof typeof allFeedback[0]) => {
      if (items.length === 0) return 0;
      const values = items.map(i => Number(i[field]) || 0);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    // Red flags count
    const redFlagsCount = feedbackLast30Days.filter(f => 
      (f.pain && f.pain >= 7) || (f.body_feel && f.body_feel <= 3)
    ).length;

    return {
      last10,
      feedbackCount30Days: feedbackLast30Days.length,
      trainingsCount30Days: completedTrainingsLast30Days.length,
      adherenceRate: Math.min(adherenceRate, 100),
      redFlagsCount,
      trends: {
        rpe: { current: calcAvg(last5, 'rpe_rating'), previous: calcAvg(prev5, 'rpe_rating') },
        mood: { current: calcAvg(last5, 'mood_rating'), previous: calcAvg(prev5, 'mood_rating') },
        fatigue: { current: calcAvg(last5, 'fatigue_level'), previous: calcAvg(prev5, 'fatigue_level') },
        technique: { current: calcAvg(last5, 'technique_rating'), previous: calcAvg(prev5, 'technique_rating') },
      },
    };
  }, [allFeedback, allSessions]);

  if (allFeedback.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Zatím žádná zpětná vazba</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Adherence */}
        <div className={cn(
          "p-3 rounded-xl text-center",
          stats.adherenceRate >= 70 ? "bg-success/10" : 
          stats.adherenceRate >= 40 ? "bg-warning/10" : "bg-destructive/10"
        )}>
          <p className="text-xs text-muted-foreground">Adherence 30d</p>
          <p className={cn(
            "text-lg font-bold",
            stats.adherenceRate >= 70 ? "text-success" : 
            stats.adherenceRate >= 40 ? "text-warning" : "text-destructive"
          )}>
            {stats.adherenceRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats.feedbackCount30Days}/{stats.trainingsCount30Days}
          </p>
        </div>

        {/* Total Feedback */}
        <div className="p-3 rounded-xl bg-primary/10 text-center">
          <p className="text-xs text-muted-foreground">Celkem</p>
          <p className="text-lg font-bold text-primary">{allFeedback.length}</p>
          <p className="text-[10px] text-muted-foreground">feedbacků</p>
        </div>

        {/* Red Flags */}
        <div className={cn(
          "p-3 rounded-xl text-center",
          stats.redFlagsCount > 0 ? "bg-destructive/10" : "bg-secondary/50"
        )}>
          <p className="text-xs text-muted-foreground">Red flags</p>
          <p className={cn(
            "text-lg font-bold",
            stats.redFlagsCount > 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {stats.redFlagsCount}
          </p>
          <p className="text-[10px] text-muted-foreground">za 30 dní</p>
        </div>
      </div>

      {/* Mini Trends */}
      <div className="p-3 rounded-xl bg-secondary/30 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Trend (posl. 5 vs předchozích 5)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniTrend
            current={stats.trends.rpe.current}
            previous={stats.trends.rpe.previous}
            label="RPE"
            icon={<Zap className="w-3 h-3" />}
          />
          <MiniTrend
            current={stats.trends.mood.current}
            previous={stats.trends.mood.previous}
            label="Nálada"
            icon={<Heart className="w-3 h-3" />}
          />
          <MiniTrend
            current={stats.trends.fatigue.current}
            previous={stats.trends.fatigue.previous}
            label="Únava"
            icon={<Activity className="w-3 h-3" />}
            inverted
          />
          <MiniTrend
            current={stats.trends.technique.current}
            previous={stats.trends.technique.previous}
            label="Technika"
            icon={<TrendingUp className="w-3 h-3" />}
          />
        </div>
      </div>

      {/* Last Feedbacks List */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Posledních {Math.min(stats.last10.length, 10)} feedbacků
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {stats.last10.map((feedback) => (
            <div
              key={feedback.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg text-xs",
                feedback.is_red_flag ? "bg-destructive/10 border border-destructive/20" : "bg-background/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {format(new Date(feedback.training_date), 'd.M.', { locale: cs })}
                </span>
                {feedback.is_red_flag && (
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span title="RPE">
                  <Zap className="w-3 h-3 inline mr-0.5 text-muted-foreground" />
                  {feedback.rpe_rating}
                </span>
                <span title="Nálada">
                  <Heart className="w-3 h-3 inline mr-0.5 text-muted-foreground" />
                  {feedback.mood_rating}
                </span>
                {feedback.pain && feedback.pain > 0 && (
                  <span className={cn(
                    feedback.pain >= 7 ? "text-destructive" : "text-warning"
                  )} title="Bolest">
                    ⚠ {feedback.pain}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
