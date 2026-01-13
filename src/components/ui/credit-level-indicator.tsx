import { cn } from '@/lib/utils';
import { Leaf } from 'lucide-react';

interface CreditLevelIndicatorProps {
  creditBalance: number;
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { leafSize: 12, gap: 'gap-0.5' },
  md: { leafSize: 14, gap: 'gap-0.5' },
  lg: { leafSize: 18, gap: 'gap-1' },
};

// Credit thresholds for leaves
// 5 leaves: > 2000 Kč
// 4 leaves: 800-2000 Kč  
// 3 leaves: 400-800 Kč
// 2 leaves: 100-400 Kč
// 1 leaf: 0-100 Kč
// 0 leaves (red): < 0 Kč
function getActiveLeaves(balance: number): number {
  if (balance < 0) return 0;
  if (balance < 100) return 1;
  if (balance < 400) return 2;
  if (balance < 800) return 3;
  if (balance < 2000) return 4;
  return 5;
}

function getLeafColor(isActive: boolean, isNegative: boolean, index: number, activeCount: number) {
  if (isNegative) {
    return 'text-destructive/80';
  }
  
  if (!isActive) {
    return 'text-muted-foreground/20';
  }
  
  // Gradient from success to warning for active leaves
  if (activeCount >= 4) {
    return 'text-success';
  }
  if (activeCount === 3) {
    return 'text-success';
  }
  if (activeCount === 2) {
    return 'text-warning';
  }
  return 'text-warning';
}

export function CreditLevelIndicator({ 
  creditBalance, 
  size = 'md',
  showAmount = false,
  className 
}: CreditLevelIndicatorProps) {
  const config = sizeConfig[size];
  const activeLeaves = getActiveLeaves(creditBalance);
  const isNegative = creditBalance < 0;
  
  return (
    <div className={cn('flex items-center', config.gap, className)}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isActive = index < activeLeaves;
        const leafColor = getLeafColor(isActive, isNegative, index, activeLeaves);
        
        return (
          <Leaf
            key={index}
            size={config.leafSize}
            className={cn(
              'transition-all duration-300',
              leafColor,
              isActive && 'drop-shadow-sm',
              isActive && activeLeaves >= 4 && 'drop-shadow-[0_0_4px_hsl(142_76%_36%/0.5)]',
              isNegative && 'animate-pulse',
              // Stagger animation for active leaves
              isActive && 'animate-[leafPop_0.3s_ease-out_backwards]',
            )}
            style={{
              animationDelay: isActive ? `${index * 50}ms` : '0ms',
              transform: isActive ? 'rotate(-15deg)' : 'rotate(-15deg) scale(0.9)',
              opacity: isActive ? 1 : 0.3,
            }}
            fill={isActive ? 'currentColor' : 'none'}
            strokeWidth={isActive ? 1.5 : 1}
          />
        );
      })}
      
      {showAmount && (
        <span className={cn(
          'ml-1.5 text-xs tabular-nums font-medium',
          isNegative ? 'text-destructive' : 
          activeLeaves <= 2 ? 'text-warning' : 
          'text-muted-foreground'
        )}>
          {creditBalance.toLocaleString('cs-CZ')} Kč
        </span>
      )}
    </div>
  );
}
