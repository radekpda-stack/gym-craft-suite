import { useState } from 'react';
import { 
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Wallet,
  XCircle,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel } from '@/hooks/useDashboardViewModel';

interface TrendsPanelSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

interface SparklineProps {
  current: number;
  previous: number;
}

function Sparkline({ current, previous }: SparklineProps) {
  const isPositive = current >= previous;
  
  const bars = [
    previous * 0.8,
    previous * 0.9,
    previous,
    (current + previous) / 2,
    current,
  ].map(v => Math.max(0, v));
  
  const maxBar = Math.max(...bars, 1);
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 rounded-sm transition-all',
            i === bars.length - 1 
              ? isPositive ? 'bg-[hsl(142_76%_36%)]' : 'bg-destructive'
              : 'bg-muted-foreground/20'
          )}
          style={{ height: `${(bar / maxBar) * 100}%`, minHeight: 2 }}
        />
      ))}
    </div>
  );
}

interface TrendCardProps {
  icon: typeof Dumbbell;
  label: string;
  value: string | number;
  subValue?: string;
  current: number;
  previous: number;
  invertColors?: boolean;
  onClick?: () => void;
}

function TrendCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  current,
  previous,
  invertColors,
  onClick,
}: TrendCardProps) {
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  const isPositive = invertColors ? change <= 0 : change >= 0;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : null;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-secondary/20 w-full text-left transition-all',
        'hover:bg-secondary/40 hover:scale-[1.01] active:scale-[0.99]'
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/50 shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{value}</span>
          {change !== 0 && TrendIcon && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              isPositive ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'
            )}>
              <TrendIcon className="w-3 h-3" />
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
        {subValue && (
          <p className="text-[10px] text-muted-foreground/70">{subValue}</p>
        )}
      </div>
      
      <Sparkline current={current} previous={previous} />
    </button>
  );
}

type DetailType = 'trainings' | 'income' | 'cancellations' | 'products' | null;

interface DetailDialogProps {
  type: DetailType;
  onClose: () => void;
  trends: DashboardViewModel['trends'];
}

function DetailDialog({ type, onClose, trends }: DetailDialogProps) {
  if (!type) return null;
  
  const configs = {
    trainings: {
      title: 'Tréninky',
      icon: Dumbbell,
      stats: [
        { label: 'Tento měsíc', value: trends.trainingsThisMonth },
        { label: 'Minulý měsíc', value: trends.trainingsLastMonth },
        { label: 'Změna', value: `${trends.trainingsChange > 0 ? '+' : ''}${trends.trainingsChange}%`, 
          highlight: trends.trainingsChange > 0 },
      ],
    },
    income: {
      title: 'Příjem',
      icon: Wallet,
      stats: [
        { label: 'Tento měsíc', value: formatCurrency(trends.incomeThisMonth) },
        { label: 'Minulý měsíc', value: formatCurrency(trends.incomeLastMonth) },
        { label: 'Změna', value: `${trends.incomeChange > 0 ? '+' : ''}${trends.incomeChange}%`,
          highlight: trends.incomeChange > 0 },
      ],
    },
    cancellations: {
      title: 'Zrušení',
      icon: XCircle,
      stats: [
        { label: 'Míra zrušení', value: `${trends.cancellationRate}%` },
        { label: 'Tento měsíc', value: trends.cancellationRate === 0 ? 'Žádné zrušení' : `${trends.cancellationRate}% tréninků` },
      ],
    },
    products: {
      title: 'Produkty',
      icon: Package,
      stats: [
        { label: 'Podíl na příjmech', value: `${trends.productShare}%` },
        { label: 'Význam', value: trends.productShare < 5 ? 'Minoritní' : trends.productShare < 20 ? 'Střední' : 'Významný' },
      ],
    },
  };
  
  const config = configs[type];
  const Icon = config.icon;
  
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TrendsPanelSection({ data, isLoading }: TrendsPanelSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { trends } = data;

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Trendy
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <TrendCard
                icon={Dumbbell}
                label="Tréninky / měsíc"
                value={trends.trainingsThisMonth}
                subValue={`vs ${trends.trainingsLastMonth} minulý měsíc`}
                current={trends.trainingsThisMonth}
                previous={trends.trainingsLastMonth}
                onClick={() => setActiveDetail('trainings')}
              />
              
              <TrendCard
                icon={Wallet}
                label="Příjem / měsíc"
                value={formatCurrency(trends.incomeThisMonth)}
                subValue={`vs ${formatCurrency(trends.incomeLastMonth)}`}
                current={trends.incomeThisMonth}
                previous={trends.incomeLastMonth}
                onClick={() => setActiveDetail('income')}
              />
              
              <TrendCard
                icon={XCircle}
                label="Zrušení"
                value={`${trends.cancellationRate}%`}
                subValue="tento měsíc"
                current={trends.cancellationRate}
                previous={10}
                invertColors
                onClick={() => setActiveDetail('cancellations')}
              />
              
              <TrendCard
                icon={Package}
                label="Produkty"
                value={`${trends.productShare}%`}
                subValue="z celkového příjmu"
                current={trends.productShare}
                previous={15}
                onClick={() => setActiveDetail('products')}
              />
            </div>
          </CardContent>
        )}
      </Card>
      
      <DetailDialog 
        type={activeDetail} 
        onClose={() => setActiveDetail(null)} 
        trends={trends}
      />
    </>
  );
}
