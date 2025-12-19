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
  isPercent?: boolean;
}

function Sparkline({ current, previous, isPercent }: SparklineProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change >= 0;
  
  // Simple visual sparkline (would need real data for actual chart)
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
  isPercent?: boolean;
  invertColors?: boolean; // For metrics where lower is better (cancellations)
}

function TrendCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  current,
  previous,
  isPercent,
  invertColors,
}: TrendCardProps) {
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  const isPositive = invertColors ? change <= 0 : change >= 0;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : null;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
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
      
      <Sparkline current={current} previous={previous} isPercent={isPercent} />
    </div>
  );
}

export function TrendsPanelSection({ data, isLoading }: TrendsPanelSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
            {/* Trainings per month */}
            <TrendCard
              icon={Dumbbell}
              label="Tréninky / měsíc"
              value={trends.trainingsThisMonth}
              subValue={`vs ${trends.trainingsLastMonth} minulý měsíc`}
              current={trends.trainingsThisMonth}
              previous={trends.trainingsLastMonth}
            />
            
            {/* Income per month */}
            <TrendCard
              icon={Wallet}
              label="Příjem / měsíc"
              value={formatCurrency(trends.incomeThisMonth)}
              subValue={`vs ${formatCurrency(trends.incomeLastMonth)}`}
              current={trends.incomeThisMonth}
              previous={trends.incomeLastMonth}
            />
            
            {/* Cancellation rate */}
            <TrendCard
              icon={XCircle}
              label="Zrušení"
              value={`${trends.cancellationRate}%`}
              subValue="tento měsíc"
              current={trends.cancellationRate}
              previous={10} // baseline for comparison
              invertColors
              isPercent
            />
            
            {/* Product share */}
            <TrendCard
              icon={Package}
              label="Produkty"
              value={`${trends.productShare}%`}
              subValue="z celkového příjmu"
              current={trends.productShare}
              previous={15} // baseline for comparison
              isPercent
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
