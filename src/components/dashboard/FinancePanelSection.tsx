import { useNavigate } from 'react-router-dom';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel } from '@/hooks/useDashboardViewModel';

interface FinancePanelSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

interface FinanceMetricProps {
  icon: typeof Wallet;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  warning?: boolean;
  error?: boolean;
  onClick?: () => void;
}

function FinanceMetric({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  warning, 
  error,
  onClick 
}: FinanceMetricProps) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : null;
  
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex flex-col items-start gap-1 p-4 rounded-xl transition-all text-left w-full',
        'bg-secondary/30 hover:bg-secondary/50',
        onClick && 'cursor-pointer hover:scale-[1.01]',
        !onClick && 'cursor-default',
        error && 'ring-1 ring-destructive/30',
        warning && !error && 'ring-1 ring-[hsl(38_92%_50%/0.3)]'
      )}
    >
      <div className="flex items-center justify-between w-full">
        <Icon className={cn(
          'w-4 h-4',
          error ? 'text-destructive' : warning ? 'text-[hsl(38_92%_50%)]' : 'text-primary'
        )} />
        
        {trend !== undefined && trend !== 0 && TrendIcon && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend > 0 ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'
          )}>
            <TrendIcon className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      
      <span className={cn(
        'text-xl font-bold',
        error ? 'text-destructive' : warning ? 'text-[hsl(38_92%_50%)]' : 'text-foreground'
      )}>
        {value}
      </span>
      
      <span className="text-xs text-muted-foreground">{label}</span>
      
      {subValue && (
        <span className="text-[10px] text-muted-foreground/70">{subValue}</span>
      )}
    </button>
  );
}

export function FinancePanelSection({ data, isLoading }: FinancePanelSectionProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { finance } = data;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="w-5 h-5 text-primary" />
          Finance
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Credit at Risk */}
          <FinanceMetric
            icon={AlertCircle}
            label="Kredit v riziku"
            value={finance.creditAtRisk.count}
            subValue={`${finance.creditAtRisk.count} klientů`}
            warning={finance.creditAtRisk.count > 0}
            onClick={finance.creditAtRisk.count > 0 
              ? () => navigate('/clients?filter=lowcredit') 
              : undefined
            }
          />
          
          {/* Unpaid Total */}
          <FinanceMetric
            icon={Clock}
            label="Nezaplaceno"
            value={formatCurrency(finance.unpaidTotal.amount)}
            subValue={`${finance.unpaidTotal.count} tréninků`}
            warning={finance.unpaidTotal.count > 0 && finance.unpaidTotal.count <= 3}
            error={finance.unpaidTotal.count > 3}
            onClick={finance.unpaidTotal.count > 0 
              ? () => navigate('/clients?filter=unpaid') 
              : undefined
            }
          />
          
          {/* Monthly Income */}
          <FinanceMetric
            icon={Wallet}
            label="Příjem měsíc"
            value={formatCurrency(finance.monthlyIncome)}
            trend={finance.incomeChange}
          />
          
          {/* Average per Training */}
          <FinanceMetric
            icon={TrendingUp}
            label="Ø za trénink"
            value={formatCurrency(finance.avgPerTraining)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
