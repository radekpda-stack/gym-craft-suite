import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TimeFilter } from '@/hooks/useTrainingsPageState';

interface TimeFilterToggleProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
  counts: {
    today: number;
    week: number;
    all: number;
  };
}

const labels: Record<TimeFilter, { short: string; long: string }> = {
  today: { short: 'Dnes', long: 'Dnes' },
  week: { short: 'Týden', long: 'Tento týden' },
  all: { short: 'Vše', long: 'Všechny' },
};

export function TimeFilterToggle({ value, onChange, counts }: TimeFilterToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-full overflow-x-auto">
      {(['today', 'week', 'all'] as const).map((filter) => (
        <Button
          key={filter}
          variant="ghost"
          size="sm"
          onClick={() => onChange(filter)}
          className={cn(
            'flex-1 h-9 px-2 sm:px-3 rounded-lg gap-1.5 transition-all min-w-0',
            value === filter
              ? 'bg-background shadow-sm text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
          )}
        >
          <span className="text-sm sm:hidden truncate">{labels[filter].short}</span>
          <span className="text-sm hidden sm:inline">{labels[filter].long}</span>
          <Badge
            variant="secondary"
            className={cn(
              'h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full shrink-0',
              value === filter
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {counts[filter]}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
