import { useState, useRef, useEffect } from 'react';
import { Minus, Plus, MoreHorizontal, Trash2, Tag, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Product } from '@/hooks/useProducts';
import { CartDiscount } from '@/hooks/useSalesCartWithDiscount';

interface CartItemRowProps {
  product: Product;
  quantity: number;
  lineTotal: number;
  lineDiscount?: CartDiscount;
  lineDiscountAmount: number;
  lineTotalAfterDiscount: number;
  onQuantityChange: (quantity: number) => void;
  onIncrement: (amount?: number) => void;
  onDecrement: () => void;
  onRemove: () => void;
  onLineDiscountChange: (discount: CartDiscount | null) => void;
  stockIssue?: boolean;
  minPriceIssue?: boolean;
  minPriceMessage?: string;
}

const QUICK_ADD_OPTIONS = [5, 10, 20];

export function CartItemRow({
  product,
  quantity,
  lineTotal,
  lineDiscount,
  lineDiscountAmount,
  lineTotalAfterDiscount,
  onQuantityChange,
  onIncrement,
  onDecrement,
  onRemove,
  onLineDiscountChange,
  stockIssue,
  minPriceIssue,
  minPriceMessage,
}: CartItemRowProps) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState(quantity.toString());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(lineDiscount?.type || 'percent');
  const [discountValue, setDiscountValue] = useState(lineDiscount?.value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isProduct = product.kind === 'inventory';
  const canHaveDiscount = isProduct;
  const hasDiscount = lineDiscount && lineDiscount.value > 0;

  useEffect(() => {
    if (isEditingQty && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingQty]);

  const handleQtyClick = () => {
    setEditQtyValue(quantity.toString());
    setIsEditingQty(true);
  };

  const handleQtyBlur = () => {
    const newQty = parseInt(editQtyValue, 10);
    if (!isNaN(newQty) && newQty >= 1) {
      onQuantityChange(newQty);
    } else {
      setEditQtyValue(quantity.toString());
    }
    setIsEditingQty(false);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQtyBlur();
    } else if (e.key === 'Escape') {
      setEditQtyValue(quantity.toString());
      setIsEditingQty(false);
    }
  };

  const handleApplyLineDiscount = () => {
    const value = parseFloat(discountValue);
    if (!isNaN(value) && value > 0) {
      onLineDiscountChange({ type: discountType, value });
      setDiscountOpen(false);
    }
  };

  const handleClearLineDiscount = () => {
    onLineDiscountChange(null);
    setDiscountValue('');
    setDiscountOpen(false);
  };

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg bg-secondary/30',
      stockIssue && 'ring-1 ring-destructive/50 bg-destructive/5',
      minPriceIssue && 'ring-1 ring-warning/50 bg-warning/5'
    )}>
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <span className="font-medium text-sm line-clamp-2">{product.name}</span>
          {hasDiscount && (
            <Tag className="w-3 h-3 text-primary flex-shrink-0" />
          )}
          {minPriceIssue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{minPriceMessage || 'Cena pod minimální prodejní cenou'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{product.price.toLocaleString('cs-CZ')} Kč</span>
          {hasDiscount && (
            <span className="text-destructive">
              -{lineDiscount.type === 'percent' ? `${lineDiscount.value}%` : `${lineDiscount.value} Kč`}
            </span>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDecrement}
        >
          <Minus className="w-3 h-3" />
        </Button>

        {isEditingQty ? (
          <Input
            ref={inputRef}
            type="number"
            value={editQtyValue}
            onChange={(e) => setEditQtyValue(e.target.value)}
            onBlur={handleQtyBlur}
            onKeyDown={handleQtyKeyDown}
            className="w-12 h-7 text-center text-sm p-0"
            min="1"
            max={isProduct ? product.stock_quantity : undefined}
          />
        ) : (
          <Popover open={showQuickAdd} onOpenChange={setShowQuickAdd}>
            <PopoverTrigger asChild>
              <button
                onClick={handleQtyClick}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowQuickAdd(true);
                }}
                className="w-8 h-7 text-center text-sm font-medium hover:bg-secondary rounded cursor-pointer"
              >
                {quantity}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="center">
              <div className="flex gap-1">
                {QUICK_ADD_OPTIONS.map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onIncrement(amt);
                      setShowQuickAdd(false);
                    }}
                  >
                    +{amt}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onIncrement(1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Line total */}
      <div className="text-right min-w-[70px]">
        {hasDiscount ? (
          <div className="space-y-0">
            <div className="text-xs text-muted-foreground line-through">
              {lineTotal.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-sm font-medium">
              {lineTotalAfterDiscount.toLocaleString('cs-CZ')} Kč
            </div>
          </div>
        ) : (
          <div className="text-sm font-medium">
            {lineTotal.toLocaleString('cs-CZ')} Kč
          </div>
        )}
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canHaveDiscount ? (
            <Popover open={discountOpen} onOpenChange={setDiscountOpen}>
              <PopoverTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Tag className="w-4 h-4 mr-2" />
                  {hasDiscount ? 'Upravit slevu' : 'Přidat slevu'}
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-64" side="left">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sleva na položku</Label>
                  <RadioGroup
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as 'percent' | 'fixed')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percent" id={`percent-${product.id}`} />
                      <Label htmlFor={`percent-${product.id}`} className="cursor-pointer">%</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id={`fixed-${product.id}`} />
                      <Label htmlFor={`fixed-${product.id}`} className="cursor-pointer">Kč</Label>
                    </div>
                  </RadioGroup>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={discountType === 'percent' ? '%' : 'Kč'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      min="0"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleApplyLineDiscount}>
                      OK
                    </Button>
                  </div>
                  {hasDiscount && (
                    <Button variant="ghost" size="sm" onClick={handleClearLineDiscount} className="w-full">
                      Zrušit slevu
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled className="opacity-50">
                  <Tag className="w-4 h-4 mr-2" />
                  Sleva (nelze)
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sleva neplatí na služby</p>
              </TooltipContent>
            </Tooltip>
          )}
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Odebrat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
