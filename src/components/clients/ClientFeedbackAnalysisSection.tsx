/**
 * ClientFeedbackAnalysisSection - Main section for client feedback analysis
 * Combines table, chart, tag aggregations, and recovery insights
 * Part of section B) and C) in the implementation plan
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  BarChart3, 
  Table as TableIcon, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Battery,
  MapPin
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeedbackTrainingTable } from './FeedbackTrainingTable';
import { FeedbackTimelineChart } from './FeedbackTimelineChart';
import { FeedbackTagAggregation } from './FeedbackTagAggregation';
import { RecoveryInsightsCard } from '@/components/feedback/RecoveryInsightsCard';
import { PainAreaTimeline } from '@/components/feedback/PainAreaTimeline';
import { useFeedbackWithTags } from '@/hooks/useFeedbackWithTags';

interface ClientFeedbackAnalysisSectionProps {
  clientId: string;
  defaultOpen?: boolean;
}

export function ClientFeedbackAnalysisSection({ 
  clientId,
  defaultOpen = true 
}: ClientFeedbackAnalysisSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: feedbacks = [] } = useFeedbackWithTags(clientId, { limit: 5 });
  
  // Quick stats
  const totalFeedbacks = feedbacks.length;
  const redFlags = feedbacks.filter(f => f.status === 'red_flag').length;
  const warnings = feedbacks.filter(f => f.status === 'warning').length;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-all duration-200">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Trénink → Reakce
              </div>
              <div className="flex items-center gap-3">
                {totalFeedbacks > 0 && (
                  <div className="flex items-center gap-2 text-sm font-normal">
                    {redFlags > 0 && (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        {redFlags} red flag
                      </span>
                    )}
                    {warnings > 0 && (
                      <span className="text-warning font-medium">{warnings} varování</span>
                    )}
                    <span className="text-muted-foreground">{totalFeedbacks} feedbacků</span>
                  </div>
                )}
                {isOpen ? <ChevronUp className="h-5 w-5 transition-transform" /> : <ChevronDown className="h-5 w-5 transition-transform" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs defaultValue="table" className="w-full">
              <TabsList className="mb-4 bg-secondary/30 backdrop-blur-sm p-1 rounded-lg">
                <TabsTrigger value="table" className="gap-1.5 data-[state=active]:shadow-sm transition-all">
                  <TableIcon className="h-4 w-4" />
                  Tabulka
                </TabsTrigger>
                <TabsTrigger value="chart" className="gap-1.5 data-[state=active]:shadow-sm transition-all">
                  <TrendingUp className="h-4 w-4" />
                  Graf
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-1.5 data-[state=active]:shadow-sm transition-all">
                  <BarChart3 className="h-4 w-4" />
                  Podle tagů
                </TabsTrigger>
                <TabsTrigger value="recovery" className="gap-1.5 data-[state=active]:shadow-sm transition-all">
                  <Battery className="h-4 w-4" />
                  Regenerace
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="table" className="mt-0">
                <FeedbackTrainingTable clientId={clientId} limit={20} />
              </TabsContent>
              
              <TabsContent value="chart" className="mt-0">
                <FeedbackTimelineChart clientId={clientId} />
              </TabsContent>
              
              <TabsContent value="tags" className="mt-0">
                <FeedbackTagAggregation clientId={clientId} />
              </TabsContent>
              
              <TabsContent value="recovery" className="mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <RecoveryInsightsCard clientId={clientId} />
                  <PainAreaTimeline clientId={clientId} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
