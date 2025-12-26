import { cn } from '@/lib/utils';

export type Period = 30 | 90 | 180 | 'all';

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  options?: Period[];
  className?: string;
}

const periodLabels: Record<Period, string> = {
  30: '30 dní',
  90: '90 dní',
  180: '180 dní',
  all: 'Vše',
};

export function PeriodFilter({ 
  value, 
  onChange, 
  options = [30, 90, 180, 'all'],
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
