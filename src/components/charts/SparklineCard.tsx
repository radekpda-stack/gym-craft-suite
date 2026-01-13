import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, Line, LineChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SparklineCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  data: Array<{ value: number }>;
  trend?: number;
  trendLabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'blue';
  chartType?: 'area' | 'line';
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const VARIANT_COLORS = {
  primary: {
    stroke: 'hsl(68 100% 50%)',
    fill: 'hsl(68 100% 50%)',
    text: 'text-primary',
  },
  success: {
    stroke: 'hsl(142 76% 45%)',
    fill: 'hsl(142 76% 45%)',
    text: 'text-success',
  },
  warning: {
    stroke: 'hsl(38 92% 50%)',
    fill: 'hsl(38 92% 50%)',
    text: 'text-warning',
  },
  destructive: {
    stroke: 'hsl(0 84% 60%)',
    fill: 'hsl(0 84% 60%)',
    text: 'text-destructive',
  },
  blue: {
    stroke: 'hsl(217 91% 60%)',
    fill: 'hsl(217 91% 60%)',
    text: 'text-accent',
  },
};

export function SparklineCard({
  title,
  value,
  subtitle,
  data,
  trend,
  trendLabel,
  variant = 'primary',
  chartType = 'area',
  onClick,
  className,
  icon,
}: SparklineCardProps) {
  const colors = VARIANT_COLORS[variant];
  const hasTrend = trend !== undefined;
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card 
      className={cn(
        'sparkline-card overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.fill}20` }}
                >
                  <div style={{ color: colors.stroke }}>{icon}</div>
                </div>
              )}
              <p className="text-sm text-muted-foreground truncate">{title}</p>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: colors.stroke }}>
              {value}
            </p>
            {(subtitle || hasTrend) && (
              <div className="flex items-center gap-2 mt-1">
                {hasTrend && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
                    isPositive && 'bg-success/10 text-success',
                    isNegative && 'bg-destructive/10 text-destructive',
                    !isPositive && !isNegative && 'bg-muted text-muted-foreground'
                  )}>
                    <TrendIcon className="h-3 w-3" />
                    {isPositive && '+'}{trend}%
                  </div>
                )}
                {subtitle && (
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Sparkline Chart */}
          <div className="w-20 h-12 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={`sparkGradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.fill} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.stroke}
                    strokeWidth={2}
                    fill={`url(#sparkGradient-${variant})`}
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.stroke}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
