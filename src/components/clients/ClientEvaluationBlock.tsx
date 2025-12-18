import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Utensils,
  ChevronRight,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientEvaluationBlockProps {
  clientId: string;
  onViewFeedback?: () => void;
  onViewNutrition?: () => void;
}

interface FeedbackSummary {
  hasRecent: boolean;
  lastDate?: string;
  avgBodyFeel?: number;
  avgEnergy?: number;
  avgPain?: number;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  summary: string;
}

interface NutritionSummary {
  hasActive: boolean;
  sessionEndDate?: string;
  entriesCount?: number;
  regularity: 'good' | 'moderate' | 'poor' | 'unknown';
  summary: string;
}

export function ClientEvaluationBlock({ 
  clientId, 
  onViewFeedback, 
  onViewNutrition 
}: ClientEvaluationBlockProps) {
  // Fetch feedback summary
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['client-feedback-summary', clientId],
    queryFn: async (): Promise<FeedbackSummary> => {
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, completed_at, training_session_id')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);
      
      if (!requests || requests.length === 0) {
        return {
          hasRecent: false,
          trend: 'unknown',
          summary: 'Zatím žádný feedback',
        };
      }
      
      // For now, simplified summary
      const lastDate = requests[0].completed_at 
        ? format(new Date(requests[0].completed_at), 'd.M.', { locale: cs })
        : undefined;
      
      return {
        hasRecent: true,
        lastDate,
        trend: 'stable',
        summary: `Poslední feedback: ${lastDate}`,
      };
    },
  });

  // Fetch nutrition summary
  const { data: nutritionData, isLoading: nutritionLoading } = useQuery({
    queryKey: ['client-nutrition-summary', clientId],
    queryFn: async (): Promise<NutritionSummary> => {
      const { data: sessions } = await supabase
        .from('nutrition_log_sessions')
        .select(`
          id,
          start_date,
          end_date,
          status
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!sessions || sessions.length === 0) {
        return {
          hasActive: false,
          regularity: 'unknown',
          summary: 'Zatím žádné záznamy stravy',
        };
      }
      
      const session = sessions[0];
      const isActive = session.status === 'active';
      
      // Count entries for this session
      const { count } = await supabase
        .from('nutrition_food_entries')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);
      
      const entriesCount = count || 0;
      
      return {
        hasActive: isActive,
        sessionEndDate: session.end_date 
          ? format(new Date(session.end_date), 'd.M.', { locale: cs })
          : undefined,
        entriesCount,
        regularity: entriesCount >= 14 ? 'good' : entriesCount >= 7 ? 'moderate' : 'poor',
        summary: isActive 
          ? `Aktivní sezení (${entriesCount} záznamů)`
          : `Ukončeno ${session.end_date ? format(new Date(session.end_date), 'd.M.', { locale: cs }) : ''}`,
      };
    },
  });

  const TrendIcon = ({ trend }: { trend: string }) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const RegularityIcon = ({ regularity }: { regularity: string }) => {
    switch (regularity) {
      case 'good':
        return <Smile className="w-4 h-4 text-green-500" />;
      case 'moderate':
        return <Meh className="w-4 h-4 text-orange-500" />;
      case 'poor':
        return <Frown className="w-4 h-4 text-destructive" />;
      default:
        return <Meh className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (feedbackLoading || nutritionLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Feedback Summary */}
      <button
        onClick={onViewFeedback}
        className={cn(
          'p-4 rounded-xl text-left transition-colors',
          feedbackData?.hasRecent 
            ? 'bg-secondary/50 hover:bg-secondary/70' 
            : 'bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/30'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn(
              'w-5 h-5',
              feedbackData?.hasRecent ? 'text-primary' : 'text-orange-500'
            )} />
            <span className="font-medium text-sm">Feedback</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon trend={feedbackData?.trend || 'unknown'} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{feedbackData?.summary}</p>
      </button>
      
      {/* Nutrition Summary */}
      <button
        onClick={onViewNutrition}
        className={cn(
          'p-4 rounded-xl text-left transition-colors',
          nutritionData?.hasActive || nutritionData?.regularity !== 'unknown'
            ? 'bg-secondary/50 hover:bg-secondary/70' 
            : 'bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/30'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Utensils className={cn(
              'w-5 h-5',
              nutritionData?.hasActive ? 'text-primary' : 
              nutritionData?.regularity !== 'unknown' ? 'text-muted-foreground' : 'text-orange-500'
            )} />
            <span className="font-medium text-sm">Strava</span>
          </div>
          <div className="flex items-center gap-1">
            <RegularityIcon regularity={nutritionData?.regularity || 'unknown'} />
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{nutritionData?.summary}</p>
      </button>
    </div>
  );
}
