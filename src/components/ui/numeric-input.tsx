import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'onChange'> {
  /** Whether to allow decimal values (shows decimal keyboard on mobile) */
  allowDecimals?: boolean;
  /** Callback with the current value as string */
  onChange?: (value: string) => void;
  /** Optional suffix to display (e.g., "kg", "%") */
  suffix?: string;
}

/**
 * A numeric input component optimized for mobile devices.
 * Uses type="text" with inputMode for proper keyboard support including decimal separator.
 * 
 * This solves the issue where type="number" on mobile shows a keyboard without 
 * comma/period for decimal values.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, allowDecimals = true, onChange, suffix, value, ...props }, ref) => {
    // Handle input change - allow numbers, decimal separators (. and ,), and minus
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Allow empty value
      if (inputValue === '') {
        onChange?.('');
        return;
      }
      
      // Replace comma with period for consistency (Czech users use comma)
      inputValue = inputValue.replace(',', '.');
      
      // Validate the input
      if (allowDecimals) {
        // Allow numbers with one decimal point and optional leading minus
        if (!/^-?\d*\.?\d*$/.test(inputValue)) {
          return; // Invalid input, don't update
        }
      } else {
        // Allow only integers and optional leading minus
        if (!/^-?\d*$/.test(inputValue)) {
          return; // Invalid input, don't update
        }
      }
      
      onChange?.(inputValue);
    };

    // Display value - convert period back to comma for display (Czech locale)
    const displayValue = typeof value === 'string' || typeof value === 'number' 
      ? String(value).replace('.', ',') 
      : '';

    if (suffix) {
      return (
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            pattern={allowDecimals ? '[0-9]*[,.]?[0-9]*' : '[0-9]*'}
            value={displayValue}
            onChange={handleChange}
            className={cn('pr-10', className)}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        </div>
      );
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        pattern={allowDecimals ? '[0-9]*[,.]?[0-9]*' : '[0-9]*'}
        value={displayValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';

export { NumericInput };
