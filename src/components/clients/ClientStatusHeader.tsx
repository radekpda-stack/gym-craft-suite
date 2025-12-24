import { Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';
import { Client } from '@/hooks/useClients';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientStatusHeaderProps {
  client: Client;
  creditBalance: number;
  lastTrainingDate?: string;
  nextTrainingDate?: string;
  isSharedBudget?: boolean;
  sharedBudgetName?: string;
  unpaidCount?: number;
}

export function ClientStatusHeader({
  client,
  creditBalance,
  lastTrainingDate,
  nextTrainingDate,
  isSharedBudget,
  sharedBudgetName,
  unpaidCount = 0,
}: ClientStatusHeaderProps) {
  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const config = STATUS_CONFIG[creditStatus];

  return (
    <div className="glass rounded-2xl p-4">
      {/* Top row: Avatar, name, credit */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {client.name}
          </h1>
          {client.training_goals && client.training_goals.length > 0 && (
            <p className="text-sm text-muted-foreground truncate">
              {client.training_goals[0]}
            </p>
          )}
        </div>
        
        {/* Credit badge */}
        {client.payment_mode !== 'cash_only' && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl shrink-0',
            config.bgClass
          )}>
            <Wallet className={cn('w-4 h-4', config.textClass)} />
            <span className={cn('font-bold', config.textClass)}>
              {formatCurrency(creditBalance)}
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom row: Status info */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
        {/* Shared budget */}
        {isSharedBudget && sharedBudgetName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-secondary text-xs font-medium">
              {sharedBudgetName}
            </span>
          </div>
        )}
        
        {/* Last training */}
        {lastTrainingDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Poslední:</span>
            <span className="font-medium text-foreground">{lastTrainingDate}</span>
          </div>
        )}
        
        {/* Next training */}
        {nextTrainingDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Příští:</span>
            <span className="font-medium text-primary">{nextTrainingDate}</span>
          </div>
        )}
        
        {/* Unpaid count */}
        {unpaidCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-warning">
            <span className="font-medium">{unpaidCount}× nezaplaceno</span>
          </div>
        )}
      </div>
    </div>
  );
}
