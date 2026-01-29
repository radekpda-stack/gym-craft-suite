/**
 * Coach Insights card - aggregated actionable insights from feedback data
 * Uses coachSuggestions.ts logic to identify patterns across all clients
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { Lightbulb, AlertTriangle, TrendingDown, Activity, Heart, Moon, Target, Frown } from 'lucide-react';
import { safeAverage } from '@/lib/feedbackCalculations';

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  clientName?: string;
}

export function FeedbackCoachInsights() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['feedback-coach-insights'],
    queryFn: async (): Promise<Insight[]> => {
      const startDate = subDays(new Date(), 14);
      const results: Insight[] = [];
      
      // Get recent feedback with client info
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select(`
          id,
          body_feel,
          soreness,
          energy_rating,
          pain,
          pain_area,
          rpe_rating,
          session_fit,
          difficulty,
          fun,
          sleep_hours,
          sleep_after,
          created_at,
          feedback_request_id
        `)
        .gte('created_at', startOfDay(startDate).toISOString())
        .order('created_at', { ascending: false });
      
      // Get feedback requests with client info
      const feedbackRequestIds = feedbacks?.map(f => f.feedback_request_id).filter(Boolean) || [];
      
      let requestsWithClients: Array<{ id: string; client: { id: string; name: string } | null }> = [];
      if (feedbackRequestIds.length > 0) {
        const { data: requests } = await supabase
          .from('feedback_requests')
          .select('id, client:clients(id, name)')
          .in('id', feedbackRequestIds);
        requestsWithClients = (requests || []) as any;
      }
      
      // Map request id to client
      const requestClientMap = new Map<string, { id: string; name: string }>();
      for (const req of requestsWithClients) {
        if (req.client) {
          requestClientMap.set(req.id, req.client);
        }
      }
      
      if (!feedbacks || feedbacks.length === 0) {
        return [];
      }
      
      // Aggregate by client
      const clientFeedbacks = new Map<string, { name: string; feedbacks: typeof feedbacks }>();
      
      for (const fb of feedbacks) {
        const client = fb.feedback_request_id ? requestClientMap.get(fb.feedback_request_id) : null;
        if (!client) continue;
        
        if (!clientFeedbacks.has(client.id)) {
          clientFeedbacks.set(client.id, { name: client.name, feedbacks: [] });
        }
        clientFeedbacks.get(client.id)!.feedbacks.push(fb);
      }
      
      // Insight 1: Repeated pain in same area
      const painLocationCounts = new Map<string, { count: number; clients: Set<string> }>();
      
      for (const fb of feedbacks) {
        // pain_area is a single string (can be null)
        const painArea = fb.pain_area;
        if (painArea && typeof painArea === 'string') {
          if (!painLocationCounts.has(painArea)) {
            painLocationCounts.set(painArea, { count: 0, clients: new Set() });
          }
          const entry = painLocationCounts.get(painArea)!;
          entry.count++;
          const client = fb.feedback_request_id ? requestClientMap.get(fb.feedback_request_id) : null;
          if (client) {
            entry.clients.add(client.name);
          }
        }
      }
      
      // Find pain areas reported multiple times
      for (const [area, data] of painLocationCounts) {
        if (data.count >= 3) {
          results.push({
            id: `pain-${area}`,
            icon: <Heart className="h-4 w-4 text-destructive" />,
            title: `Opakovaná bolest: ${area}`,
            description: `${data.count}× za 14 dní (${Array.from(data.clients).slice(0, 2).join(', ')}${data.clients.size > 2 ? '...' : ''})`,
            priority: 'high'
          });
        }
      }
      
      // Insight 2: Declining energy trend per client
      for (const [clientId, data] of clientFeedbacks) {
        if (data.feedbacks.length >= 4) {
          const energyValues = data.feedbacks
            .map(f => f.energy_rating)
            .filter((v): v is number => v !== null);
          
          if (energyValues.length >= 4) {
            // Check if last 3 are declining
            const recent = energyValues.slice(0, 3);
            const older = energyValues.slice(3, 6);
            
            const recentAvg = safeAverage(recent);
            const olderAvg = safeAverage(older);
            
            if (recentAvg !== null && olderAvg !== null && recentAvg < olderAvg - 1.5) {
              results.push({
                id: `energy-decline-${clientId}`,
                icon: <TrendingDown className="h-4 w-4 text-amber-500" />,
                title: `Klesající energie`,
                description: `${data.name}: Ø ${recentAvg.toFixed(1)} vs ${olderAvg.toFixed(1)} dříve`,
                priority: 'medium',
                clientName: data.name
              });
            }
          }
        }
      }
      
      // Insight 3: High RPE but low body feel (overtraining signal)
      for (const [clientId, data] of clientFeedbacks) {
        const recentFeedbacks = data.feedbacks.slice(0, 5);
        const highRpeLowFeel = recentFeedbacks.filter(f => 
          f.rpe_rating && f.rpe_rating >= 8 && 
          f.body_feel && f.body_feel <= 5
        );
        
        if (highRpeLowFeel.length >= 2) {
          results.push({
            id: `overtraining-${clientId}`,
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
            title: `Možné přetížení`,
            description: `${data.name}: ${highRpeLowFeel.length}× vysoké RPE + špatný pocit`,
            priority: 'high',
            clientName: data.name
          });
        }
      }
      
      // Insight 4: High soreness average across all
      const allSorenessValues = feedbacks
        .map(f => f.soreness)
        .filter((v): v is number => v !== null);
      
      const avgSoreness = safeAverage(allSorenessValues);
      if (avgSoreness !== null && avgSoreness >= 7) {
        results.push({
          id: 'high-soreness-global',
          icon: <Activity className="h-4 w-4 text-amber-500" />,
          title: `Vysoká průměrná svalovka`,
          description: `Ø ${avgSoreness.toFixed(1)}/10 za posledních 14 dní`,
          priority: 'medium'
        });
      }
      
      // Insight 5: Low session fit per client
      for (const [clientId, data] of clientFeedbacks) {
        const sessionFitValues = data.feedbacks
          .map(f => f.session_fit)
          .filter((v): v is number => v !== null);
        
        if (sessionFitValues.length >= 3) {
          const avgSessionFit = safeAverage(sessionFitValues);
          if (avgSessionFit !== null && avgSessionFit <= 4) {
            results.push({
              id: `low-session-fit-${clientId}`,
              icon: <Target className="h-4 w-4 text-amber-500" />,
              title: `Tréninky nesedí`,
              description: `${data.name}: Ø session fit ${avgSessionFit.toFixed(1)}/10`,
              priority: 'medium',
              clientName: data.name
            });
          }
        }
      }
      
      // Insight 6: Poor sleep pattern
      for (const [clientId, data] of clientFeedbacks) {
        const poorSleepCount = data.feedbacks.filter(f => f.sleep_after === 'poor').length;
        const lowSleepHours = data.feedbacks.filter(f => f.sleep_hours !== null && (f.sleep_hours as number) < 6).length;
        
        if (poorSleepCount >= 2 || lowSleepHours >= 2) {
          results.push({
            id: `poor-sleep-${clientId}`,
            icon: <Moon className="h-4 w-4 text-amber-500" />,
            title: `Problémy se spánkem`,
            description: `${data.name}: ${poorSleepCount > 0 ? `${poorSleepCount}× špatný spánek` : `${lowSleepHours}× méně než 6h`}`,
            priority: 'medium',
            clientName: data.name
          });
        }
      }
      
      // Insight 7: High difficulty + low fun (demotivation signal)
      for (const [clientId, data] of clientFeedbacks) {
        const recentFeedbacks = data.feedbacks.slice(0, 5);
        const highDiffLowFun = recentFeedbacks.filter(f => 
          f.difficulty !== null && (f.difficulty as number) >= 7 && 
          f.fun !== null && (f.fun as number) <= 4
        );
        
        if (highDiffLowFun.length >= 2) {
          results.push({
            id: `demotivation-${clientId}`,
            icon: <Frown className="h-4 w-4 text-amber-500" />,
            title: `Možná demotivace`,
            description: `${data.name}: ${highDiffLowFun.length}× vysoká náročnost + nízká zábava`,
            priority: 'medium',
            clientName: data.name
          });
        }
      }
      
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      return results.slice(0, 5); // Top 5 insights
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Postřehy z feedbacku
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!insights || insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Žádné významné postřehy za posledních 14 dní
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map(insight => (
              <div 
                key={insight.id}
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div className="mt-0.5">
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{insight.title}</span>
                    <Badge 
                      variant={insight.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs h-5"
                    >
                      {insight.priority === 'high' ? 'Důležité' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
