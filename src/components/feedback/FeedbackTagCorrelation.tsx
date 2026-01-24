/**
 * FeedbackTagCorrelation - Shows feedback metrics aggregated by training tags
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, Dumbbell, Activity, Flame } from 'lucide-react';
import { useTrainingFeedbackCorrelation, TagAggregation } from '@/hooks/useTrainingFeedbackCorrelation';
import { cn } from '@/lib/utils';

interface FeedbackTagCorrelationProps {
  clientId?: string;
  days?: number;
  className?: string;
}

const formatMetric = (value: number | null): string => {
  if (value === null) return '—';
  return value.toFixed(1);
};

const TagTable = ({ 
  aggregations, 
  emptyMessage 
}: { 
  aggregations: TagAggregation[]; 
  emptyMessage: string;
}) => {
  if (aggregations.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Tag</TableHead>
            <TableHead className="text-center">Počet</TableHead>
            <TableHead className="text-center">Ø Svalovka</TableHead>
            <TableHead className="text-center">Ø Energie</TableHead>
            <TableHead className="text-center">Ø Bolest</TableHead>
            <TableHead className="text-center">Ø Pocit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aggregations.map((agg) => (
            <TableRow key={agg.tagName}>
              <TableCell className="font-medium">
                <Badge variant="secondary" className="font-normal">
                  {agg.tagName}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{agg.count}</TableCell>
              <TableCell className="text-center">{formatMetric(agg.avgSoreness)}</TableCell>
              <TableCell className="text-center">{formatMetric(agg.avgEnergy)}</TableCell>
              <TableCell className="text-center">{formatMetric(agg.avgPain)}</TableCell>
              <TableCell className="text-center">{formatMetric(agg.avgBodyFeel)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Feedback podle tagů
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Tags className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím žádná data</p>
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
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Feedback podle tagů
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {data.tagAggregations.length} tagů
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="focus" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="focus" className="gap-1.5 text-xs">
              <Dumbbell className="w-3.5 h-3.5" />
              Typ tréninku
              {focusTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {focusTags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="body_part" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" />
              Partie
              {bodyPartTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {bodyPartTags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="intensity" className="gap-1.5 text-xs">
              <Flame className="w-3.5 h-3.5" />
              Intenzita
              {intensityTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {intensityTags.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="focus">
            <TagTable 
              aggregations={focusTags} 
              emptyMessage="Žádné feedbacky s tagy typu zaměření"
            />
          </TabsContent>
          
          <TabsContent value="body_part">
            <TagTable 
              aggregations={bodyPartTags} 
              emptyMessage="Žádné feedbacky s tagy partií těla"
            />
          </TabsContent>
          
          <TabsContent value="intensity">
            <TagTable 
              aggregations={intensityTags} 
              emptyMessage="Žádné feedbacky s tagy intenzity"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
