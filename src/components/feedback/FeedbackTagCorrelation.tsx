/**
 * FeedbackTagCorrelation - Shows feedback metrics aggregated by training tags
 * Enhanced with visual progress bars and responsive layout
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, Dumbbell, Activity, Flame } from 'lucide-react';
import { useTrainingFeedbackCorrelation, TagAggregation } from '@/hooks/useTrainingFeedbackCorrelation';
import { MetricMiniBar } from './MetricMiniBar';
import { FeedbackTagCard } from './FeedbackTagCard';
import { cn } from '@/lib/utils';

interface FeedbackTagCorrelationProps {
  clientId?: string;
  days?: number;
  className?: string;
}

// Desktop table row with mini-bars
const TagTableRow = ({ agg }: { agg: TagAggregation }) => (
  <div className="grid grid-cols-[140px_60px_1fr] gap-2 items-center py-2 border-b border-border/50 last:border-0">
    {/* Tag name */}
    <div className="min-w-0">
      <Badge variant="secondary" className="font-normal truncate max-w-[130px]">
        {agg.tagName}
      </Badge>
    </div>
    
    {/* Count */}
    <div className="text-center text-sm text-muted-foreground tabular-nums">
      {agg.count}×
    </div>
    
    {/* Metrics with mini-bars */}
    <div className="grid grid-cols-4 gap-3">
      <MetricMiniBar value={agg.avgSoreness} label="Sval." showValue size="sm" />
      <MetricMiniBar value={agg.avgEnergy} label="Ener." showValue size="sm" />
      <MetricMiniBar value={agg.avgPain} label="Bol." showValue size="sm" />
      <MetricMiniBar value={agg.avgBodyFeel} label="Pocit" showValue size="sm" />
    </div>
  </div>
);

// Desktop table header
const TagTableHeader = () => (
  <div className="grid grid-cols-[140px_60px_1fr] gap-2 items-center pb-2 border-b border-border text-xs text-muted-foreground font-medium">
    <div>Tag</div>
    <div className="text-center">Počet</div>
    <div className="grid grid-cols-4 gap-3">
      <div>Svalovka</div>
      <div>Energie</div>
      <div>Bolest</div>
      <div>Pocit</div>
    </div>
  </div>
);

// Content renderer - responsive: cards on mobile, table on desktop
const TagContent = ({ 
  aggregations, 
  emptyMessage 
}: { 
  aggregations: TagAggregation[]; 
  emptyMessage: string;
}) => {
  if (aggregations.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <>
      {/* Mobile: Cards */}
      <div className="md:hidden space-y-2">
        {aggregations.map((agg) => (
          <FeedbackTagCard
            key={agg.tagName}
            tagName={agg.tagName}
            count={agg.count}
            avgSoreness={agg.avgSoreness}
            avgEnergy={agg.avgEnergy}
            avgPain={agg.avgPain}
            avgBodyFeel={agg.avgBodyFeel}
          />
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <TagTableHeader />
        <div className="divide-y divide-border/30">
          {aggregations.map((agg) => (
            <TagTableRow key={agg.tagName} agg={agg} />
          ))}
        </div>
      </div>
    </>
  );
};

export function FeedbackTagCorrelation({ 
  clientId, 
  days = 90,
  className 
}: FeedbackTagCorrelationProps) {
  const { data, isLoading } = useTrainingFeedbackCorrelation(clientId, days);
  
  if (isLoading) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="w-4 h-4" />
            Feedback podle tagů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.tagAggregations.length === 0) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="w-4 h-4" />
            Feedback podle tagů
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Tags className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Zatím žádná data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Přidejte tagy k tréninkům a sbírejte feedback.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Split by tag type
  const focusTags = data.tagAggregations.filter(t => t.tagType === 'focus');
  const bodyPartTags = data.tagAggregations.filter(t => t.tagType === 'body_part');
  const intensityTags = data.tagAggregations.filter(t => t.tagType === 'intensity');
  
  return (
    <Card className={cn("glass", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Tags className="w-4 h-4" />
            Feedback podle tagů
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            {data.tagAggregations.length} tagů
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="focus" className="w-full">
          <TabsList className="mb-3 w-full grid grid-cols-3">
            <TabsTrigger value="focus" className="gap-1.5 text-xs px-2">
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Typ</span>
              {focusTags.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">
                  {focusTags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="body_part" className="gap-1.5 text-xs px-2">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Partie</span>
              {bodyPartTags.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">
                  {bodyPartTags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="intensity" className="gap-1.5 text-xs px-2">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Intenzita</span>
              {intensityTags.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">
                  {intensityTags.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="focus" className="mt-0">
            <TagContent 
              aggregations={focusTags} 
              emptyMessage="Žádné feedbacky s tagy typu zaměření"
            />
          </TabsContent>
          
          <TabsContent value="body_part" className="mt-0">
            <TagContent 
              aggregations={bodyPartTags} 
              emptyMessage="Žádné feedbacky s tagy partií těla"
            />
          </TabsContent>
          
          <TabsContent value="intensity" className="mt-0">
            <TagContent 
              aggregations={intensityTags} 
              emptyMessage="Žádné feedbacky s tagy intenzity"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
