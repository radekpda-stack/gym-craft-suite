import { cn } from '@/lib/utils';

export type Period = 30 | 90 | 'all';

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  options?: Period[];
  className?: string;
}

const periodLabels: Record<Period, string> = {
  30: 'Měsíc',
  90: '3 měsíce',
  all: 'Vše',
};

export function PeriodFilter({ 
  value, 
  onChange, 
  options = [30, 90, 'all'],
  className 
}: PeriodFilterProps) {
  return (
    <div className={cn("flex gap-1.5 flex-wrap", className)}>
      {options.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
            value === period
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {periodLabels[period]}
        </button>
      ))}
    </div>
  );
}
