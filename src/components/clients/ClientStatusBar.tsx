import { 
  Wallet, 
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Client } from '@/hooks/useClients';
import { Status, STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';

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
  // Use unified credit status logic
  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const statusConfig = STATUS_CONFIG[creditStatus];

  const StatusIndicator = ({ ok, label }: { ok: boolean; label: string }) => {
    const config = STATUS_CONFIG[ok ? 'ok' : 'warning'];
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium',
        config.bgClass, config.textClass
      )}>
        {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        {label}
      </div>
    );
  };

  return (
    <div className={cn(
      'sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-b-2 backdrop-blur-lg',
      statusConfig.bgClass,
      statusConfig.borderClass
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
          statusConfig.bgClass,
          statusConfig.textClass
        )}>
          <Wallet className="w-5 h-5" />
          {formatCurrency(creditBalance)}
        </div>
      </div>
      
      {/* Status indicators */}
      <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
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
