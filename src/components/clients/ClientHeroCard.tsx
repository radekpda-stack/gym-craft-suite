import { 
  Wallet, 
  Clock,
  TrendingUp,
  Dumbbell,
  MessageSquare,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Client } from '@/hooks/useClients';
import { STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';
import { useClientFeedbackSummary } from '@/hooks/useClientFeedbackSummary';
import { useNutritionEvaluation } from '@/hooks/useNutritionEvaluation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, startOfYear, format } from 'date-fns';

interface ClientHeroCardProps {
  client: Client;
  creditBalance: number;
  unpaidCount: number;
  lastTrainingDate?: string;
  isSharedBudget?: boolean;
  sharedBudgetName?: string;
}

export function ClientHeroCard({
  client,
  creditBalance,
  unpaidCount,
  lastTrainingDate,
  isSharedBudget,
  sharedBudgetName,
}: ClientHeroCardProps) {
  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const statusConfig = STATUS_CONFIG[creditStatus];
  
  const { data: feedbackSummary, isLoading: feedbackLoading } = useClientFeedbackSummary(client.id);
  const { data: nutritionEval, isLoading: nutritionLoading } = useNutritionEvaluation(client.id);
  
  // Fetch training counts specifically for this client
  const { data: trainingCounts, isLoading: trainingsLoading } = useQuery({
    queryKey: ['client-training-counts-hero', client.id],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const yearStart = format(startOfYear(now), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .gte('date', yearStart);
      
      if (error) throw error;
      
      const thisMonth = (data || []).filter(s => s.date >= monthStart).length;
      const thisYear = (data || []).length;
      
      return { thisMonth, thisYear };
    },
    enabled: !!client.id,
  });

  const feedbackOk = feedbackSummary?.totalCount ? feedbackSummary.totalCount > 0 : false;
  const nutritionOk = nutritionEval?.status === 'good' || nutritionEval?.status === 'moderate';
  
  const thisMonthTrainings = trainingCounts?.thisMonth ?? 0;
  const thisYearTrainings = trainingCounts?.thisYear ?? 0;

  return (
    <div className={cn(
      'glass rounded-2xl p-4 border-2',
      statusConfig.borderClass
    )}>
      {/* Top row - Credit balance prominent */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xl',
          statusConfig.bgClass,
          statusConfig.textClass
        )}>
          <Wallet className="w-5 h-5" />
          {formatCurrency(creditBalance)}
        </div>
        
        {isSharedBudget && (
          <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-lg">
            {sharedBudgetName || 'Sdílený'}
          </span>
        )}
      </div>
      
      {/* Status indicators row */}
      <div className="flex items-center gap-2 mb-4">
        {/* Feedback status */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center',
          feedbackOk 
            ? 'bg-[hsl(142_76%_36%/0.1)] text-[hsl(142_76%_36%)]' 
            : 'bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_50%)]'
        )}>
          <MessageSquare className="w-3.5 h-3.5" />
          {feedbackLoading ? <Skeleton className="w-8 h-3" /> : (feedbackOk ? 'FB OK' : 'Chybí FB')}
        </div>
        
        {/* Nutrition status */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center',
          nutritionOk 
            ? 'bg-[hsl(142_76%_36%/0.1)] text-[hsl(142_76%_36%)]' 
            : 'bg-[hsl(38_92%_50%/0.1)] text-[hsl(38_92%_50%)]'
        )}>
          <Utensils className="w-3.5 h-3.5" />
          {nutritionLoading ? <Skeleton className="w-8 h-3" /> : (nutritionOk ? 'Strava OK' : 'Chybí')}
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {/* This month */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-1 text-primary">
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">
              {trainingsLoading ? <Skeleton className="w-6 h-5 inline-block" /> : thisMonthTrainings}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">tento měsíc</span>
        </div>
        
        {/* This year */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-1 text-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-lg font-bold">
              {trainingsLoading ? <Skeleton className="w-6 h-5 inline-block" /> : thisYearTrainings}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">tento rok</span>
        </div>
        
        {/* Last training */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-medium truncate">
              {lastTrainingDate || '-'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">poslední</span>
        </div>
      </div>
      
      {/* Training goal if exists */}
      {client.training_goals && client.training_goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">Cíl:</p>
          <p className="text-sm font-medium text-foreground truncate">
            {client.training_goals[0]}
          </p>
        </div>
      )}
    </div>
  );
}
