import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number; // 0-100
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'blue' | 'purple';
  orientation?: 'vertical' | 'horizontal';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  showProgressValue?: boolean;
}

const VARIANT_COLORS = {
  primary: {
    bar: 'bg-primary',
    glow: 'shadow-[0_0_12px_hsl(68_100%_50%_/_0.5)]',
    text: 'text-primary',
    bg: 'bg-primary/10',
  },
  success: {
    bar: 'bg-green-500',
    glow: 'shadow-[0_0_12px_hsl(142_76%_45%_/_0.5)]',
    text: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  warning: {
    bar: 'bg-amber-500',
    glow: 'shadow-[0_0_12px_hsl(38_92%_50%_/_0.5)]',
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  destructive: {
    bar: 'bg-red-500',
    glow: 'shadow-[0_0_12px_hsl(0_84%_60%_/_0.5)]',
    text: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  blue: {
    bar: 'bg-blue-500',
    glow: 'shadow-[0_0_12px_hsl(217_91%_60%_/_0.5)]',
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  purple: {
    bar: 'bg-purple-500',
    glow: 'shadow-[0_0_12px_hsl(271_81%_56%_/_0.5)]',
    text: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  progress,
  variant = 'primary',
  orientation = 'vertical',
  icon,
  onClick,
  className,
  showProgressValue = false,
}: MetricCardProps) {
  const colors = VARIANT_COLORS[variant];
  const hasProgress = progress !== undefined;
  const clampedProgress = hasProgress ? Math.min(Math.max(progress, 0), 100) : 0;

  if (orientation === 'horizontal') {
    return (
      <Card 
        className={cn(
          'metric-card overflow-hidden transition-all duration-300',
          onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
                <div className={colors.text}>{icon}</div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground truncate">{title}</p>
              <p className={cn('text-xl font-bold', colors.text)}>{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {hasProgress && (
              <div className="w-24">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full rounded-full transition-all duration-500', colors.bar, colors.glow)}
                    style={{ width: `${clampedProgress}%` }}
                  />
                </div>
                {showProgressValue && (
                  <p className="text-xs text-muted-foreground text-right mt-1">{Math.round(clampedProgress)}%</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'metric-card overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vertical progress bar */}
          {hasProgress && (
            <div className="w-2 h-full min-h-[80px] bg-muted/50 rounded-full overflow-hidden relative">
              <div 
                className={cn(
                  'absolute bottom-0 left-0 w-full rounded-full transition-all duration-700',
                  colors.bar,
                  colors.glow
                )}
                style={{ height: `${clampedProgress}%` }}
              />
              {/* Glowing dot at top of progress */}
              {clampedProgress > 0 && (
                <div 
                  className={cn(
                    'absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-700',
                    colors.bar,
                    colors.glow
                  )}
                  style={{ bottom: `calc(${clampedProgress}% - 6px)` }}
                />
              )}
            </div>
          )}
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                  <div className={colors.text}>{icon}</div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold tracking-tight', colors.text)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {hasProgress && showProgressValue && (
              <p className="text-xs text-muted-foreground mt-1">{Math.round(clampedProgress)}% cíle</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
