import { useState } from 'react';
import { 
  MessageSquare, 
  ChevronRight, 
  Send,
  Activity,
  Battery,
  Brain,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useClientFeedback, useClientFeedbackStats } from '@/hooks/useTrainingFeedback';
import { useFeedbackRequests, useSendFeedbackEmail } from '@/hooks/useFeedbackRequests';
import { FeedbackStatistics } from '@/components/feedback/FeedbackStatistics';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ClientFeedbackCardProps {
  clientId: string;
  clientName: string;
  lastCompletedTrainingId?: string;
  defaultOpen?: boolean;
}

export function ClientFeedbackCard({ 
  clientId, 
  clientName,
  lastCompletedTrainingId,
  defaultOpen = false 
}: ClientFeedbackCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showFullStats, setShowFullStats] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  const { data: feedbackData = [], isLoading } = useClientFeedback(clientId);
  const { stats } = useClientFeedbackStats(clientId);
  const { data: feedbackRequests = [] } = useFeedbackRequests(clientId);

  const totalFeedbacks = feedbackData.length;
  const pendingRequests = feedbackRequests.filter(r => r.status === 'pending').length;
  const redFlags = feedbackData.filter(f => f.is_red_flag).length;
  const highPainCount = feedbackData.filter(f => (f.pain || 0) >= 7).length;
  
  const lastFeedback = feedbackData[0];
  const lastFeedbackDaysAgo = lastFeedback 
    ? differenceInDays(new Date(), new Date(lastFeedback.training_date))
    : null;

  const handleGenerateFeedbackLink = async () => {
    if (!lastCompletedTrainingId) {
      toast({ title: 'Žádný dokončený trénink pro feedback', variant: 'destructive' });
      return;
    }

    setIsGeneratingLink(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('feedback_requests')
        .insert({
          client_id: clientId,
          training_session_id: lastCompletedTrainingId,
          user_id: userData.user?.id,
        })
        .select('token')
        .single();
      
      if (error) throw error;
      
      const link = `${window.location.origin}/feedback/${data.token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Odkaz zkopírován do schránky' });
    } catch (error) {
      toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
        <div className="h-20 bg-secondary/30 rounded" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              redFlags > 0 ? 'bg-destructive/10' :
              highPainCount > 0 ? 'bg-warning/10' : 'bg-primary/10'
            )}>
              <MessageSquare className={cn(
                'w-5 h-5',
                redFlags > 0 ? 'text-destructive' :
                highPainCount > 0 ? 'text-warning' : 'text-primary'
              )} />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Feedback</p>
              <p className="text-sm text-muted-foreground">
                {totalFeedbacks > 0 
                  ? `${totalFeedbacks} odpovědí${pendingRequests > 0 ? ` • ${pendingRequests} čeká` : ''}`
                  : 'Žádné odpovědi'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {redFlags > 0 && (
              <Badge variant="destructive" className="h-5 text-[10px]">
                {redFlags} red flag
              </Badge>
            )}
            <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 glass rounded-2xl space-y-4">
          {totalFeedbacks > 0 ? (
            <>
              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-secondary/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3 text-primary" />
                    <p className="text-lg font-bold text-foreground">{stats.avgRpe.toFixed(1)}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Ø RPE</p>
                </div>
                <div className="p-2 rounded-xl bg-secondary/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Battery className="w-3 h-3 text-orange-500" />
                    <p className="text-lg font-bold text-foreground">{stats.avgFatigue.toFixed(1)}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Ø Únava</p>
                </div>
                <div className="p-2 rounded-xl bg-secondary/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Brain className="w-3 h-3 text-green-500" />
                    <p className="text-lg font-bold text-foreground">{stats.avgMood.toFixed(1)}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Ø Nálada</p>
                </div>
                <div className="p-2 rounded-xl bg-secondary/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className={cn(
                      'w-3 h-3',
                      highPainCount > 0 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                    <p className={cn(
                      'text-lg font-bold',
                      highPainCount > 0 ? 'text-warning' : 'text-foreground'
                    )}>
                      {highPainCount}
                    </p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Vysoká bolest</p>
                </div>
              </div>

              {/* Last feedback summary */}
              {lastFeedback && (
                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      Poslední feedback
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lastFeedbackDaysAgo === 0 ? 'Dnes' : 
                       lastFeedbackDaysAgo === 1 ? 'Včera' : 
                       `Před ${lastFeedbackDaysAgo} dny`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>
                      RPE: <strong>{lastFeedback.rpe_rating || '—'}</strong>
                    </span>
                    {lastFeedback.pain > 0 && (
                      <span className={lastFeedback.pain >= 7 ? 'text-warning' : ''}>
                        Bolest: <strong>{lastFeedback.pain}/10</strong>
                      </span>
                    )}
                    {lastFeedback.is_red_flag && (
                      <Badge variant="destructive" className="h-5 text-[10px]">
                        Red flag
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handleGenerateFeedbackLink}
                  disabled={isGeneratingLink || !lastCompletedTrainingId}
                >
                  <Send className="w-4 h-4" />
                  {isGeneratingLink ? 'Generuji...' : 'Vyžádat feedback'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setShowFullStats(!showFullStats)}
                >
                  <BarChart3 className="w-4 h-4" />
                  {showFullStats ? 'Skrýt statistiky' : 'Statistiky'}
                </Button>
              </div>

              {/* Full statistics */}
              {showFullStats && (
                <div className="pt-4 border-t border-border/50">
                  <FeedbackStatistics clientId={clientId} />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Zatím žádné odpovědi na feedback</p>
              {lastCompletedTrainingId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGenerateFeedbackLink}
                  disabled={isGeneratingLink}
                >
                  <Send className="w-4 h-4" />
                  Vyžádat první feedback
                </Button>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
