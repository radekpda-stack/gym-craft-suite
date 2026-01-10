import { cn } from '@/lib/utils';
import { Button } from './button';

export type Side = 'left' | 'right' | 'both';

interface SideSelectorProps {
  value: Side;
  onChange: (side: Side) => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function SideSelector({ value, onChange, className, size = 'default' }: SideSelectorProps) {
  const buttonClass = size === 'sm' 
    ? 'h-9 px-3 text-sm' 
    : 'h-11 px-4 text-base font-medium';

  return (
    <div className={cn('flex gap-1 rounded-lg bg-muted/50 p-1', className)}>
      <Button
        type="button"
        variant={value === 'left' ? 'default' : 'ghost'}
        className={cn(
          buttonClass,
          'flex-1',
          value === 'left' && 'bg-primary text-primary-foreground shadow-sm'
        )}
        onClick={() => onChange('left')}
      >
        L
      </Button>
      <Button
        type="button"
        variant={value === 'both' ? 'default' : 'ghost'}
        className={cn(
          buttonClass,
          'flex-1',
          value === 'both' && 'bg-primary text-primary-foreground shadow-sm'
        )}
        onClick={() => onChange('both')}
      >
        Obě
      </Button>
      <Button
        type="button"
        variant={value === 'right' ? 'default' : 'ghost'}
        className={cn(
          buttonClass,
          'flex-1',
          value === 'right' && 'bg-primary text-primary-foreground shadow-sm'
        )}
        onClick={() => onChange('right')}
      >
        R
      </Button>
    </div>
  );
}

export function SideBadge({ side, className }: { side: string | null; className?: string }) {
  if (!side || side === 'none') return null;
  
  const labels: Record<string, { label: string; color: string }> = {
    left: { label: 'L', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    right: { label: 'R', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    both: { label: 'L+R', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  };

  const config = labels[side];
  if (!config) return null;

  return (
    <span className={cn(
      'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded border',
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}
