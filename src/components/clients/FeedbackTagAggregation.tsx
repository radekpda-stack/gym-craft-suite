/**
 * FeedbackTagAggregation - Shows aggregated feedback metrics by training tags
 * Part of section C) in the implementation plan
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingUp, Activity, Dumbbell, Flame, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeedbackAnalysisByTags, TagAggregation } from '@/hooks/useFeedbackWithTags';
import { formatMetric } from '@/lib/feedbackCalculations';

interface FeedbackTagAggregationProps {
  clientId: string;
}

// Single aggregation card
function AggregationCard({ 
  aggregation, 
  showMetrics = ['bodyFeel', 'pain', 'energy', 'sessionFit'] 
}: { 
  aggregation: TagAggregation;
  showMetrics?: string[];
}) {
  const hasLowData = aggregation.feedbackCount < 3;
  
  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant="secondary"
          className="font-medium"
          style={{ 
            backgroundColor: `${aggregation.tag.color}20`,
            borderColor: aggregation.tag.color,
            color: aggregation.tag.color
          }}
        >
          {aggregation.tag.name}
        </Badge>
        <div className="flex items-center gap-2">
          {hasLowData && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    málo dat
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Méně než 3 feedbacky</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-xs text-muted-foreground">
            n={aggregation.feedbackCount}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        {showMetrics.includes('bodyFeel') && (
          <MetricDisplay label="Tělo" value={aggregation.avgBodyFeel} />
        )}
        {showMetrics.includes('pain') && (
          <MetricDisplay label="Bolest" value={aggregation.avgPain} inverted />
        )}
        {showMetrics.includes('energy') && (
          <MetricDisplay label="Energie" value={aggregation.avgEnergy} />
        )}
        {showMetrics.includes('sessionFit') && (
          <MetricDisplay label="Sedl" value={aggregation.avgSessionFit} />
        )}
        {showMetrics.includes('difficulty') && (
          <MetricDisplay label="Obtížnost" value={aggregation.avgDifficulty} inverted />
        )}
        {showMetrics.includes('fun') && (
          <MetricDisplay label="Zábava" value={aggregation.avgFun} />
        )}
      </div>
      
      {/* Red flags / warnings indicator */}
      {(aggregation.redFlagCount > 0 || aggregation.warningCount > 0) && (
        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs">
          {aggregation.redFlagCount > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {aggregation.redFlagCount} red flag{aggregation.redFlagCount > 1 ? 's' : ''}
            </span>
          )}
          {aggregation.warningCount > 0 && (
            <span className="text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {aggregation.warningCount} varování
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Metric display with visual bar
function MetricDisplay({ 
  label, 
  value, 
  inverted = false 
}: { 
  label: string; 
  value: number | null; 
  inverted?: boolean;
}) {
  if (value == null) {
    return (
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }
  
  // Calculate "goodness" for color
  let goodness = value / 10; // 0-1 scale
  if (inverted) {
    goodness = 1 - goodness; // For pain/difficulty, low is good
  }
  
  let colorClass = 'text-foreground';
  let barColor = 'bg-primary';
  
  if (goodness < 0.4) {
    colorClass = 'text-destructive font-medium';
    barColor = 'bg-destructive';
  } else if (goodness < 0.6) {
    colorClass = 'text-warning';
    barColor = 'bg-warning';
  } else {
    colorClass = 'text-success';
    barColor = 'bg-success';
  }
  
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={colorClass}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all rounded-full', barColor)}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

// Section with aggregations
function AggregationSection({ 
  title, 
  icon: Icon,
  aggregations,
  emptyMessage 
}: { 
  title: string;
  icon: React.ElementType;
  aggregations: TagAggregation[];
  emptyMessage: string;
}) {
  if (aggregations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className="grid gap-2">
        {aggregations.map(agg => (
          <AggregationCard key={agg.tag.id} aggregation={agg} />
        ))}
      </div>
    </div>
  );
}

export function FeedbackTagAggregation({ clientId }: FeedbackTagAggregationProps) {
  const { data: analysis, isLoading, error } = useFeedbackAnalysisByTags(clientId);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reakce podle tagů
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    console.error('FeedbackTagAggregation error:', error);
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chyba při načítání dat
        </CardContent>
      </Card>
    );
  }
  
  // Handle case when analysis is undefined or has no feedbacks
  if (!analysis || analysis.totalFeedbacks === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reakce podle tagů
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Zatím žádná data pro analýzu</p>
          <p className="text-xs mt-1">Zpětná vazba se zobrazí po vyplnění feedbacku k tréninku.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reakce podle tagů
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {analysis.feedbacksWithTags}/{analysis.totalFeedbacks} s tagy
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* By Focus (training type) */}
        <AggregationSection
          title="Podle typu tréninku"
          icon={Dumbbell}
          aggregations={analysis.byFocus}
          emptyMessage="Žádné feedbacky s tagy typu zaměření"
        />
        
        {/* By Body Part */}
        <AggregationSection
          title="Podle partie těla"
          icon={Activity}
          aggregations={analysis.byBodyPart}
          emptyMessage="Žádné feedbacky s tagy partií"
        />
        
        {/* By Intensity */}
        <AggregationSection
          title="Podle intenzity"
          icon={Flame}
          aggregations={analysis.byIntensity}
          emptyMessage="Žádné feedbacky s tagy intenzity"
        />
      </CardContent>
    </Card>
  );
}
