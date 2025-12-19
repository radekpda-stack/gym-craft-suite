import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Banknote,
  User,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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

type FinanceDetailType = 'income' | 'avgPerTraining' | null;

interface FinanceDetailDialogProps {
  type: FinanceDetailType;
  onClose: () => void;
  finance: DashboardViewModel['finance'];
}

function FinanceDetailDialog({ type, onClose, finance }: FinanceDetailDialogProps) {
  if (!type) return null;
  
  const avgChange = finance.lastMonthAvgPerTraining > 0
    ? Math.round(((finance.avgPerTraining - finance.lastMonthAvgPerTraining) / finance.lastMonthAvgPerTraining) * 100)
    : 0;
  
  const { trainingsByParticipants } = finance;
  
  const configs = {
    income: {
      title: 'Měsíční příjem',
      icon: Wallet,
      stats: [
        { label: 'Tento měsíc', value: formatCurrency(finance.monthlyIncome) },
        { label: 'Minulý měsíc', value: formatCurrency(finance.lastMonthIncome) },
        { label: 'Změna', value: `${finance.incomeChange > 0 ? '+' : ''}${finance.incomeChange}%`, highlight: finance.incomeChange > 0 },
      ],
    },
    avgPerTraining: {
      title: 'Průměr za trénink',
      icon: TrendingUp,
      stats: [
        { label: 'Tento měsíc', value: formatCurrency(finance.avgPerTraining) },
        { label: 'Minulý měsíc', value: formatCurrency(finance.lastMonthAvgPerTraining) },
        { label: 'Změna', value: `${avgChange > 0 ? '+' : ''}${avgChange}%`, highlight: avgChange > 0 },
        { label: 'Počet tréninků v průměru', value: finance.trainingsWithPriceCount },
      ],
    },
  };
  
  const config = configs[type];
  const Icon = config.icon;
  
  const participantRows = [
    { 
      icon: User, 
      label: '1 osoba', 
      data: trainingsByParticipants.solo 
    },
    { 
      icon: Users, 
      label: '2 osoby', 
      data: trainingsByParticipants.duo 
    },
    { 
      icon: Users, 
      label: '3+ osob', 
      data: trainingsByParticipants.group 
    },
  ];
  
  return (
    <Dialog open={!!type} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          {config.stats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className={cn(
                'font-semibold',
                stat.highlight ? 'text-[hsl(142_76%_36%)]' : 'text-foreground'
              )}>
                {stat.value}
              </span>
            </div>
          ))}
          
          {type === 'avgPerTraining' && (
            <>
              <Separator className="my-3" />
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Podle počtu osob
              </p>
              {participantRows.map((row, i) => {
                const RowIcon = row.icon;
                return (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-2">
                      <RowIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {row.data.count}×
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {row.data.count > 0 ? `⌀ ${formatCurrency(row.data.avgPrice)}` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FinancePanelSection({ data, isLoading }: FinancePanelSectionProps) {
  const navigate = useNavigate();
  const [activeDetail, setActiveDetail] = useState<FinanceDetailType>(null);
  
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
    <>
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
              onClick={() => setActiveDetail('income')}
            />
            
            {/* Average per Training */}
            <FinanceMetric
              icon={TrendingUp}
              label="Ø za trénink"
              value={formatCurrency(finance.avgPerTraining)}
              onClick={() => setActiveDetail('avgPerTraining')}
            />
          </div>
        </CardContent>
      </Card>
      
      <FinanceDetailDialog
        type={activeDetail}
        onClose={() => setActiveDetail(null)}
        finance={finance}
      />
    </>
  );
}
