import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './scroll-area';

interface ChipOption {
  value: string;
  label: string;
  count?: number;
}

interface HorizontalChipScrollerProps {
  options: ChipOption[];
  value: string | string[];
  onChange: (value: string) => void;
  multiSelect?: boolean;
  className?: string;
}

export function HorizontalChipScroller({
  options,
  value,
  onChange,
  multiSelect = false,
  className,
}: HorizontalChipScrollerProps) {
  const isSelected = (optionValue: string) => {
    if (Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex gap-2 pb-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              'border focus:outline-none focus:ring-2 focus:ring-primary/50',
              isSelected(option.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card/50 text-muted-foreground border-border/50 hover:border-border hover:text-foreground'
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                isSelected(option.value)
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5" />
    </ScrollArea>
  );
}
