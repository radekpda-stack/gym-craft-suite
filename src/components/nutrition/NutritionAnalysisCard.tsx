import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronUp, Zap, Droplets, Apple, Beef, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DailyAnalysis {
  id: string;
  analysis_date: string;
  calorie_range_low?: number;
  calorie_range_high?: number;
  calorie_level?: string;
  protein_sources?: string[];
  carb_sources?: string[];
  fat_sources?: string[];
  vegetables_fruits?: string[];
  ultra_processed?: string[];
  protein_score?: number;
  vegetable_fiber_score?: number;
  carb_quality_score?: number;
  fat_quality_score?: number;
  meal_regularity_score?: number;
  hydration_score?: number;
  ultra_processed_score?: number;
  alcohol_sugar_score?: number;
  feedback_positive?: string;
  feedback_improve?: string;
  feedback_suggestions?: string[];
}

interface WeeklySummary {
  id: string;
  avg_calorie_range_low?: number;
  avg_calorie_range_high?: number;
  calorie_trend?: string;
  avg_quality_scores?: {
    protein?: number;
    vegetables?: number;
    hydration?: number;
    regularity?: number;
  };
  quality_trend_summary?: string;
  client_strengths?: string[];
  client_weaknesses?: string[];
  client_recommendations?: string[];
  trainer_risks?: string[];
  trainer_observations?: string;
  trainer_conclusion?: string;
}

interface NutritionAnalysisCardProps {
  sessionId: string;
  dailyAnalyses?: DailyAnalysis[];
  weeklySummary?: WeeklySummary;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
}

const scoreToLabel = (score?: number): { label: string; color: string } => {
  if (score === undefined || score === null) return { label: 'Nehodnoceno', color: 'text-muted-foreground' };
  if (score >= 4) return { label: 'Výborný', color: 'text-success' };
  if (score >= 3) return { label: 'Dobrý', color: 'text-accent' };
  if (score >= 2) return { label: 'Průměrný', color: 'text-warning' };
  return { label: 'K zlepšení', color: 'text-destructive' };
};

const calorieLevelLabel = (level?: string): string => {
  if (level === 'low') return 'Nízký příjem';
  if (level === 'high') return 'Vysoký příjem';
  return 'Střední příjem';
};

const trendLabel = (trend?: string): { label: string; icon: React.ReactNode } => {
  if (trend === 'increasing') return { label: 'Rostoucí', icon: <TrendingUp className="h-4 w-4 text-warning" /> };
  if (trend === 'decreasing') return { label: 'Klesající', icon: <TrendingUp className="h-4 w-4 text-accent rotate-180" /> };
  if (trend === 'irregular') return { label: 'Nepravidelný', icon: <AlertTriangle className="h-4 w-4 text-warning" /> };
  return { label: 'Stabilní', icon: <CheckCircle className="h-4 w-4 text-success" /> };
};

export function NutritionAnalysisCard({ 
  sessionId, 
  dailyAnalyses = [], 
  weeklySummary, 
  onAnalyze,
  isAnalyzing 
}: NutritionAnalysisCardProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showTrainerView, setShowTrainerView] = useState(false);

  const hasAnalyses = dailyAnalyses.length > 0 || weeklySummary;

  return (
    <div className="space-y-4">
      {/* Header with analyze button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Analýza stravy</h3>
        </div>
        <Button onClick={onAnalyze} disabled={isAnalyzing} size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          {isAnalyzing ? 'Analyzuji...' : hasAnalyses ? 'Aktualizovat analýzu' : 'Spustit analýzu'}
        </Button>
      </div>

      {!hasAnalyses && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>AI analýza ještě nebyla provedena.</p>
            <p className="text-sm mt-1">Klikněte na "Spustit analýzu" pro vyhodnocení stravy.</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Summary */}
      {weeklySummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Týdenní shrnutí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calorie overview */}
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Průměrný příjem:</span>
                <p className="font-medium">
                  {weeklySummary.avg_calorie_range_low && weeklySummary.avg_calorie_range_high
                    ? `${weeklySummary.avg_calorie_range_low}–${weeklySummary.avg_calorie_range_high} kcal/den`
                    : 'Nehodnoceno'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {trendLabel(weeklySummary.calorie_trend).icon}
                <span className="text-sm">{trendLabel(weeklySummary.calorie_trend).label}</span>
              </div>
            </div>

            {/* Quality trend */}
            {weeklySummary.quality_trend_summary && (
              <p className="text-sm">{weeklySummary.quality_trend_summary}</p>
            )}

            {/* Client view: strengths, weaknesses, recommendations */}
            <div className="grid md:grid-cols-3 gap-4">
              {weeklySummary.client_strengths && weeklySummary.client_strengths.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-success flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Silné stránky
                  </span>
                  <ul className="text-sm space-y-1">
                    {weeklySummary.client_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-success">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {weeklySummary.client_weaknesses && weeklySummary.client_weaknesses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-warning flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Slabiny
                  </span>
                  <ul className="text-sm space-y-1">
                    {weeklySummary.client_weaknesses.map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-warning">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {weeklySummary.client_recommendations && weeklySummary.client_recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-accent flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Doporučení
                  </span>
                  <ul className="text-sm space-y-1">
                    {weeklySummary.client_recommendations.map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-accent">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Trainer section - collapsible */}
            <Collapsible open={showTrainerView} onOpenChange={setShowTrainerView}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {showTrainerView ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  Pohled pro trenéra
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3 border-t mt-2">
                {weeklySummary.trainer_risks && weeklySummary.trainer_risks.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-destructive">⚠️ Rizika:</span>
                    <ul className="text-sm mt-1 space-y-1">
                      {weeklySummary.trainer_risks.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {weeklySummary.trainer_observations && (
                  <div>
                    <span className="text-sm font-medium">Pozorování:</span>
                    <p className="text-sm text-muted-foreground">{weeklySummary.trainer_observations}</p>
                  </div>
                )}
                {weeklySummary.trainer_conclusion && (
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Závěr a priority:</span>
                    <p className="text-sm">{weeklySummary.trainer_conclusion}</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Daily analyses */}
      {dailyAnalyses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Denní analýzy</h4>
          {dailyAnalyses.map(analysis => (
            <DailyAnalysisItem 
              key={analysis.id} 
              analysis={analysis}
              expanded={expandedDay === analysis.id}
              onToggle={() => setExpandedDay(expandedDay === analysis.id ? null : analysis.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DailyAnalysisItem({ 
  analysis, 
  expanded, 
  onToggle 
}: { 
  analysis: DailyAnalysis; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const avgScore = [
    analysis.protein_score,
    analysis.vegetable_fiber_score,
    analysis.hydration_score,
    analysis.meal_regularity_score,
  ].filter(s => s !== undefined && s !== null).reduce((a, b) => a + (b || 0), 0) / 4;

  const scoreInfo = scoreToLabel(avgScore);

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {format(parseISO(analysis.analysis_date), 'EEEE d.M.', { locale: cs })}
                </span>
                {analysis.calorie_range_low && analysis.calorie_range_high && (
                  <Badge variant="outline">
                    {analysis.calorie_range_low}–{analysis.calorie_range_high} kcal
                  </Badge>
                )}
                <span className={cn('text-sm', scoreInfo.color)}>{scoreInfo.label}</span>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4 border-t">
            {/* Score bars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              <ScoreBar icon={<Beef className="h-4 w-4" />} label="Bílkoviny" score={analysis.protein_score} />
              <ScoreBar icon={<Apple className="h-4 w-4" />} label="Zelenina" score={analysis.vegetable_fiber_score} />
              <ScoreBar icon={<Droplets className="h-4 w-4" />} label="Hydratace" score={analysis.hydration_score} />
              <ScoreBar icon={<Zap className="h-4 w-4" />} label="Pravidelnost" score={analysis.meal_regularity_score} />
            </div>

            {/* Macros breakdown */}
            {(analysis.protein_sources?.length || analysis.carb_sources?.length || analysis.vegetables_fruits?.length) && (
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                {analysis.protein_sources && analysis.protein_sources.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Bílkoviny:</span>
                    <p>{analysis.protein_sources.join(', ')}</p>
                  </div>
                )}
                {analysis.carb_sources && analysis.carb_sources.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Sacharidy:</span>
                    <p>{analysis.carb_sources.join(', ')}</p>
                  </div>
                )}
                {analysis.vegetables_fruits && analysis.vegetables_fruits.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Zelenina/ovoce:</span>
                    <p>{analysis.vegetables_fruits.join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ultra processed warning */}
            {analysis.ultra_processed && analysis.ultra_processed.length > 0 && (
              <div className="p-2 rounded bg-warning/10 text-sm">
                <span className="text-warning font-medium">Ultra-processed:</span>{' '}
                <span className="text-warning/80">{analysis.ultra_processed.join(', ')}</span>
              </div>
            )}

            {/* Feedback */}
            <div className="grid md:grid-cols-2 gap-3">
              {analysis.feedback_positive && (
                <div className="p-3 rounded-lg bg-success/10">
                  <span className="text-sm font-medium text-success">✓ Co bylo dobré:</span>
                  <p className="text-sm mt-1">{analysis.feedback_positive}</p>
                </div>
              )}
              {analysis.feedback_improve && (
                <div className="p-3 rounded-lg bg-warning/10">
                  <span className="text-sm font-medium text-warning">→ Co zlepšit:</span>
                  <p className="text-sm mt-1">{analysis.feedback_improve}</p>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {analysis.feedback_suggestions && analysis.feedback_suggestions.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm font-medium">💡 Návrhy:</span>
                <ul className="text-sm space-y-1">
                  {analysis.feedback_suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ScoreBar({ icon, label, score }: { icon: React.ReactNode; label: string; score?: number }) {
  const value = (score || 0) * 20; // 0-5 to 0-100
  const info = scoreToLabel(score);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon} {label}
        </span>
        <span className={info.color}>{score ?? '-'}/5</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
