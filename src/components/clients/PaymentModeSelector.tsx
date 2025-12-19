import { Banknote, CreditCard, Shuffle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type PaymentMode = 'credit' | 'cash_only' | 'mixed';

interface PaymentModeSelectorProps {
  value: PaymentMode;
  onChange: (value: PaymentMode) => void;
  disabled?: boolean;
}

const modes = [
  {
    value: 'credit' as const,
    label: 'Kredit',
    icon: CreditCard,
    description: 'Standardní práce s kreditem. Upozornění při nízkém zůstatku.',
  },
  {
    value: 'cash_only' as const,
    label: 'Hotovost',
    icon: Banknote,
    description: 'Klient platí vždy hotově. Kredit = 0 je normální stav, žádná upozornění.',
  },
  {
    value: 'mixed' as const,
    label: 'Kombinovaně',
    icon: Shuffle,
    description: 'Upozornění pouze při neuhrazených tréninzích, ne podle výše kreditu.',
  },
];

export function PaymentModeSelector({ value, onChange, disabled }: PaymentModeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Platební režim</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as PaymentMode)}
        disabled={disabled}
        className="grid grid-cols-3 gap-2"
      >
        <TooltipProvider>
          {modes.map((mode) => (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <div>
                  <RadioGroupItem
                    value={mode.value}
                    id={`payment-mode-${mode.value}`}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`payment-mode-${mode.value}`}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all",
                      value === mode.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <mode.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{mode.label}</span>
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </RadioGroup>
    </div>
  );
}
