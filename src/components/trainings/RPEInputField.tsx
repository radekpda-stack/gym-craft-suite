import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RPEInputFieldProps {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
  readOnly?: boolean;
  showHelp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: 'Velmi lehké',
  2: 'Lehké',
  3: 'Mírné',
  4: 'Lehce náročné',
  5: 'Střední',
  6: 'Středně náročné',
  7: 'Náročné',
  8: 'Velmi náročné',
  9: 'Extrémně náročné',
  10: 'Maximum',
};

const RPE_COLORS: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-400',
  3: 'bg-lime-400',
  4: 'bg-lime-500',
  5: 'bg-yellow-400',
  6: 'bg-yellow-500',
  7: 'bg-orange-400',
  8: 'bg-orange-500',
  9: 'bg-red-400',
  10: 'bg-red-500',
};

export function RPEInputField({
  value,
  onChange,
  label = 'RPE',
  readOnly = false,
  showHelp = true,
  size = 'md',
  className,
}: RPEInputFieldProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {showHelp && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Rate of Perceived Exertion</p>
                  <p>1-4: Lehké | 5-6: Střední | 7-8: Těžké | 9-10: Maximum</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {value && (
          <span className="ml-auto text-sm text-muted-foreground">
            {RPE_DESCRIPTIONS[value]}
          </span>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
          <button
            key={rpe}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(rpe)}
            className={cn(
              'rounded-md font-medium transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              sizeClasses[size],
              value === rpe
                ? cn(RPE_COLORS[rpe], 'text-white shadow-md scale-110')
                : 'bg-muted hover:bg-muted/80 text-muted-foreground',
              readOnly && 'cursor-not-allowed opacity-60',
              !readOnly && value !== rpe && 'hover:scale-105'
            )}
          >
            {rpe}
          </button>
        ))}
      </div>

      {/* Visual scale legend */}
      <div className="flex justify-between text-xs text-muted-foreground pt-1">
        <span>Lehké</span>
        <span>Střední</span>
        <span>Těžké</span>
        <span>Max</span>
      </div>
    </div>
  );
}
