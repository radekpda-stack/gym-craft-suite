import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Calendar, 
  MessageSquare,
  Utensils,
  Target,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Client } from '@/hooks/useClients';

interface ClientStatusBarProps {
  client: Client;
  creditBalance: number;
  isSharedBudget?: boolean;
  sharedBudgetName?: string;
  lastTrainingDate?: string;
  hasFeedback: boolean;
  hasNutrition: boolean;
  unpaidCount: number;
}

export function ClientStatusBar({
  client,
  creditBalance,
  isSharedBudget,
  sharedBudgetName,
  lastTrainingDate,
  hasFeedback,
  hasNutrition,
  unpaidCount,
}: ClientStatusBarProps) {
  // Determine overall status
  const getCreditStatus = () => {
    if (unpaidCount > 0 || creditBalance <= 0) return 'error';
    if (creditBalance < 800) return 'warning';
    return 'ok';
  };
  
  const creditStatus = getCreditStatus();
  
  const statusStyles = {
    ok: 'border-green-500/50 bg-green-500/5',
    warning: 'border-orange-500/50 bg-orange-500/5',
    error: 'border-destructive/50 bg-destructive/5',
  };
  
  const creditStyles = {
    ok: 'text-green-500 bg-green-500/10',
    warning: 'text-orange-500 bg-orange-500/10',
    error: 'text-destructive bg-destructive/10',
  };

  const StatusIndicator = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium',
      ok ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
    )}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <div className={cn(
      'sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-b-2 backdrop-blur-lg',
      statusStyles[creditStatus]
    )}>
      <div className="flex items-center justify-between gap-3">
        {/* Left: Name + shared budget */}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{client.name}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSharedBudget && (
              <span className="text-primary">{sharedBudgetName || 'Sdílený účet'}</span>
            )}
            {lastTrainingDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastTrainingDate}
              </span>
            )}
          </div>
        </div>
        
        {/* Right: Credit */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-lg shrink-0',
          creditStyles[creditStatus]
        )}>
          <Wallet className="w-5 h-5" />
          {formatCurrency(creditBalance)}
        </div>
      </div>
      
      {/* Status indicators */}
      <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
        <StatusIndicator ok={hasFeedback} label={hasFeedback ? 'Feedback OK' : 'Chybí feedback'} />
        <StatusIndicator ok={hasNutrition} label={hasNutrition ? 'Strava OK' : 'Chybí strava'} />
        {client.training_goals && client.training_goals.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
            <Target className="w-3 h-3" />
            {client.training_goals[0]}
          </div>
        )}
      </div>
    </div>
  );
}
