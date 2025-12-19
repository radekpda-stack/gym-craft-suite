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

const labels: Record<TimeFilter, string> = {
  today: 'Dnes',
  week: 'Tento týden',
  all: 'Všechny',
};

export function TimeFilterToggle({ value, onChange, counts }: TimeFilterToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
      {(['today', 'week', 'all'] as const).map((filter) => (
        <Button
          key={filter}
          variant="ghost"
          size="sm"
          onClick={() => onChange(filter)}
          className={cn(
            'flex-1 h-9 px-3 rounded-lg gap-2 transition-all',
            value === filter
              ? 'bg-background shadow-sm text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
          )}
        >
          <span className="text-sm">{labels[filter]}</span>
          <Badge
            variant="secondary"
            className={cn(
              'h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full',
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
