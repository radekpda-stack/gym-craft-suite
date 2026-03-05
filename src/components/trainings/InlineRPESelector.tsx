import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InlineRPESelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
  showLabel?: boolean;
  showDescription?: boolean;
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
  1: 'bg-success hover:bg-success/90',
  2: 'bg-success/80 hover:bg-success/70',
  3: 'bg-success/60 hover:bg-success/50',
  4: 'bg-warning/60 hover:bg-warning/50',
  5: 'bg-warning/70 hover:bg-warning/60',
  6: 'bg-warning hover:bg-warning/90',
  7: 'bg-warning hover:bg-warning/90',
  8: 'bg-destructive/70 hover:bg-destructive/60',
  9: 'bg-destructive/85 hover:bg-destructive/75',
  10: 'bg-destructive hover:bg-destructive/90',
};

export function InlineRPESelector({
  value,
  onChange,
  label = 'RPE',
  showLabel = true,
  showDescription = true,
  className,
}: InlineRPESelectorProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Rate of Perceived Exertion</p>
                  <p>1-4: Lehké | 5-6: Střední | 7-8: Těžké | 9-10: Maximum</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
          <button
            key={rpe}
            type="button"
            onClick={() => onChange(rpe)}
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[11px] font-bold transition-all duration-100',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              'active:scale-95',
              value === rpe
                ? cn(RPE_COLORS[rpe], 'text-white shadow-md scale-105 z-10')
                : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:scale-105'
            )}
          >
            {rpe}
          </button>
        ))}
      </div>
      
      {showDescription && value && (
        <span className="text-xs text-muted-foreground ml-1">
          {RPE_DESCRIPTIONS[value]}
        </span>
      )}
    </div>
  );
}
