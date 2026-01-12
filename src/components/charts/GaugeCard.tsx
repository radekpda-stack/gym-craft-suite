import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CircularGauge } from './CircularGauge';

interface GaugeCardProps {
  title: string;
  value: number;
  maxValue?: number;
  displayValue?: string;
  sublabel?: string;
  description?: string;
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function GaugeCard({
  title,
  value,
  maxValue = 100,
  displayValue,
  sublabel,
  description,
  variant = 'primary',
  size = 'md',
  onClick,
  className,
}: GaugeCardProps) {
  return (
    <Card 
      className={cn(
        'gauge-card overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center min-w-0">
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 text-center truncate max-w-full">{title}</p>
        
        <CircularGauge
          value={value}
          maxValue={maxValue}
          size={size}
          variant={variant}
          label={displayValue || String(Math.round(value))}
          sublabel={sublabel}
        />
        
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 text-center line-clamp-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
