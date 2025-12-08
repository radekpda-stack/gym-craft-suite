import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  TrendingUp,
  Calendar,
  Flame,
  Snowflake,
  AlertTriangle,
  Info,
  Lightbulb,
  BarChart3,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTrainingAnalytics, MUSCLE_GROUPS } from '@/hooks/useTrainingAnalytics';
import { useClientTrainingPhases, TRAINING_PHASES } from '@/hooks/useClientTrainingPhases';
import { MuscleHeatmap } from './MuscleHeatmap';
import { PeriodizationTimeline } from './PeriodizationTimeline';
import { TrainingRecommendations } from './TrainingRecommendations';
import { FrequencyChart } from './FrequencyChart';
import { StagnationAlerts } from './StagnationAlerts';

type Period = 'week' | 'month' | '3months' | 'custom';

interface TrainingHistoryTabProps {
  clientId: string;
  clientName: string;
}

export function TrainingHistoryTab({ clientId, clientName }: TrainingHistoryTabProps) {
  const [period, setPeriod] = useState<Period>('month');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [showRecommendations, setShowRecommendations] = useState(true);

  const periodDays = useMemo(() => {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      case '3months': return 90;
      default: return 30;
    }
  }, [period]);

  const {
    muscleGroupStats,
    heatmapData,
    frequencyData,
    recommendations,
    exerciseProgress,
    stagnationData,
    totalEntries,
  } = useTrainingAnalytics(clientId, periodDays);

  const { phases, currentPhase, getPhaseDurationWeeks } = useClientTrainingPhases(clientId);

  // Phase warnings
  const phaseWarnings = useMemo(() => {
    const warnings: { type: 'warning' | 'info'; message: string }[] = [];

    if (currentPhase) {
      const weeks = getPhaseDurationWeeks(currentPhase);
      const phaseLabel = TRAINING_PHASES.find((p) => p.value === currentPhase.phase_name)?.label || currentPhase.phase_name;

      if (weeks > 6 && currentPhase.phase_name !== 'deload') {
        warnings.push({
          type: 'warning',
          message: `Klient je v fázi "${phaseLabel}" již ${weeks} týdnů — zvažte změnu.`,
        });
      }
    }

    // Check for missing deload
    const lastDeload = phases.find((p) => p.phase_name === 'deload');
    if (phases.length > 0 && (!lastDeload || differenceInWeeks(new Date(), new Date(lastDeload.start_date)) > 6)) {
      warnings.push({
        type: 'info',
        message: 'Chybí deload v posledních 6 týdnech — doporučeno zařadit regenerační blok.',
      });
    }

    return warnings;
  }, [phases, currentPhase, getPhaseDurationWeeks]);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Historie tréninku a zatížení</h3>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Týden</SelectItem>
              <SelectItem value="month">Měsíc</SelectItem>
              <SelectItem value="3months">3 měsíce</SelectItem>
            </SelectContent>
          </Select>

          <Select value={muscleFilter} onValueChange={setMuscleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Svalová skupina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny skupiny</SelectItem>
              {MUSCLE_GROUPS.map((mg) => (
                <SelectItem key={mg.value} value={mg.value}>
                  {mg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEntries}</p>
                <p className="text-sm text-muted-foreground">Cviky celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Flame className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {muscleGroupStats.filter((s) => s.heatLevel === 'hot').length}
                </p>
                <p className="text-sm text-muted-foreground">Aktivní partie</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Snowflake className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {muscleGroupStats.filter((s) => s.heatLevel === 'frozen' || s.heatLevel === 'never').length}
                </p>
                <p className="text-sm text-muted-foreground">Zanedbané partie</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {exerciseProgress.filter((e) => e.trendDirection === 'up').length}
                </p>
                <p className="text-sm text-muted-foreground">Cviky v progresi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Periodization Section */}
      <PeriodizationTimeline clientId={clientId} phases={phases} currentPhase={currentPhase} />

      {/* Phase Warnings */}
      {phaseWarnings.length > 0 && (
        <div className="space-y-2">
          {phaseWarnings.map((warning, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 rounded-xl ${
                warning.type === 'warning'
                  ? 'bg-warning/10 border border-warning/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              }`}
            >
              {warning.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{warning.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stagnation Alerts */}
      {stagnationData.length > 0 && <StagnationAlerts data={stagnationData} />}

      {/* Heatmap and Frequency Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MuscleHeatmap data={heatmapData} />
        <FrequencyChart data={frequencyData} />
      </div>

      {/* Recommendations */}
      <Collapsible open={showRecommendations} onOpenChange={setShowRecommendations}>
        <Card className="glass">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Doporučení ({recommendations.length})
                </CardTitle>
                {showRecommendations ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <TrainingRecommendations recommendations={recommendations} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Recent Exercises Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Naposledy použité cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exerciseProgress.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Zatím žádné záznamy cviků
            </p>
          ) : (
            <div className="space-y-2">
              {exerciseProgress
                .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())
                .slice(0, 10)
                .map((exercise) => (
                  <div
                    key={exercise.exerciseName}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{exercise.exerciseName}</span>
                      {exercise.trendDirection === 'up' && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          ↑ Progrese
                        </Badge>
                      )}
                      {exercise.trendDirection === 'down' && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          ↓ Pokles
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {exercise.lastWeight && (
                        <span>{exercise.lastWeight} kg</span>
                      )}
                      <span>
                        {format(exercise.lastDate, 'd.M.', { locale: cs })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function differenceInWeeks(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (7 * 24 * 60 * 60 * 1000));
}
