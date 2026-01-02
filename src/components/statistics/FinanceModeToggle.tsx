import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Clock, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FinanceMode = 'performed' | 'received';

interface FinanceModeToggleProps {
  value: FinanceMode;
  onChange: (value: FinanceMode) => void;
  className?: string;
}

export function FinanceModeToggle({ value, onChange, className }: FinanceModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as FinanceMode)}
      className={cn('bg-secondary/50 p-1 rounded-lg', className)}
    >
      <ToggleGroupItem
        value="performed"
        aria-label="Odtrénováno"
        className={cn(
          'gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
          value === 'performed'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Clock className="h-4 w-4" />
        Odtrénováno
      </ToggleGroupItem>
      <ToggleGroupItem
        value="received"
        aria-label="Přijaté"
        className={cn(
          'gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
          value === 'received'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Wallet className="h-4 w-4" />
        Přijaté
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
