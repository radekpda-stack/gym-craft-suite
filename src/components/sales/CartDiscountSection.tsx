import { useState } from 'react';
import { Percent, DollarSign, Tag, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CartDiscount } from '@/hooks/useSalesCartWithDiscount';

interface CartDiscountSectionProps {
  discount: CartDiscount | null;
  onDiscountChange: (discount: CartDiscount | null) => void;
  productsSubtotal: number;
  className?: string;
}

const QUICK_DISCOUNTS = [
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
];

export function CartDiscountSection({
  discount,
  onDiscountChange,
  productsSubtotal,
  className,
}: CartDiscountSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(discount?.type || 'percent');
  const [customValue, setCustomValue] = useState<string>(discount?.value?.toString() || '');

  const handleQuickDiscount = (value: number) => {
    onDiscountChange({ type: 'percent', value });
    setDiscountType('percent');
    setCustomValue('');
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const value = parseFloat(customValue);
    if (!isNaN(value) && value > 0) {
      onDiscountChange({ type: discountType, value });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onDiscountChange(null);
    setCustomValue('');
    setIsOpen(false);
  };

  const calculateDiscountAmount = () => {
    if (!discount) return 0;
    if (discount.type === 'percent') {
      return Math.round(productsSubtotal * (discount.value / 100));
    }
    return Math.min(discount.value, productsSubtotal);
  };

  const discountAmount = calculateDiscountAmount();
  const hasDiscount = discount && discount.value > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="w-4 h-4" />
          <span>Sleva</span>
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={hasDiscount ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8',
                hasDiscount && 'bg-primary text-primary-foreground'
              )}
            >
              {hasDiscount ? (
                <span>
                  -{discount.type === 'percent' ? `${discount.value}%` : `${discount.value} Kč`}
                </span>
              ) : (
                <span>Přidat slevu</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Sleva platí pouze na <strong>produkty</strong>. Služby jsou vždy bez slevy.
                </p>
              </div>

              {productsSubtotal > 0 ? (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Rychlé volby</Label>
                    <div className="flex gap-2">
                      {QUICK_DISCOUNTS.map(qd => (
                        <Button
                          key={qd.value}
                          variant={discount?.type === 'percent' && discount?.value === qd.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleQuickDiscount(qd.value)}
                          className="flex-1"
                        >
                          -{qd.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Vlastní sleva</Label>
                    <RadioGroup
                      value={discountType}
                      onValueChange={(value) => setDiscountType(value as 'percent' | 'fixed')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percent" id="percent" />
                        <Label htmlFor="percent" className="flex items-center gap-1 cursor-pointer">
                          <Percent className="w-3 h-3" />
                          Procenta
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed" className="flex items-center gap-1 cursor-pointer">
                          <DollarSign className="w-3 h-3" />
                          Částka (Kč)
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={discountType === 'percent' ? 'Např. 25' : 'Např. 100'}
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        min="0"
                        max={discountType === 'percent' ? '100' : productsSubtotal}
                        className="flex-1"
                      />
                      <Button onClick={handleCustomApply} disabled={!customValue}>
                        Použít
                      </Button>
                    </div>
                  </div>

                  {hasDiscount && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Sleva z produktů:</span>
                        <span className="font-medium text-destructive">-{discountAmount.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleClear} className="w-full">
                        Zrušit slevu
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  V košíku nejsou žádné produkty, na které by šla sleva aplikovat.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {hasDiscount && (
        <div className="text-sm text-destructive text-right">
          -{discountAmount.toLocaleString('cs-CZ')} Kč
        </div>
      )}
    </div>
  );
}
