import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TagOption {
  id: string;
  label: string;
  icon?: string;
}

interface TagDropdownSelectProps {
  label: string;
  options: TagOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

export function TagDropdownSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Vybrat...',
  className,
  allowClear = true,
}: TagDropdownSelectProps) {
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <Select
        value={value || ''}
        onValueChange={(val) => {
          if (val === '__clear__') {
            onChange(null);
          } else {
            onChange(val);
          }
        }}
      >
        <SelectTrigger 
          className={cn(
            'h-9 min-w-[100px] bg-secondary/50 border-border/50',
            'text-sm font-medium',
            value && 'border-primary/30 bg-primary/5'
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? (
              <span className="flex items-center gap-1.5">
                {selectedOption.icon && <span>{selectedOption.icon}</span>}
                <span className="truncate">{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {allowClear && value && (
            <SelectItem value="__clear__" className="text-muted-foreground italic">
              — Zrušit výběr —
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <span className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                <span>{option.label}</span>
                {option.id === value && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
