import { Check, AlertTriangle, Package, Sparkles, Hash } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ParsedInvoiceItem } from '@/hooks/useInvoiceImport';
import { formatCurrency } from '@/lib/formatters';

const CATEGORIES = [
  { value: 'supplement', label: 'Doplněk' },
  { value: 'drink', label: 'Nápoj' },
  { value: 'snack', label: 'Svačina' },
  { value: 'equipment', label: 'Vybavení' },
  { value: 'other', label: 'Ostatní' },
];

interface InvoiceItemRowProps {
  item: ParsedInvoiceItem;
  onToggleSelection: () => void;
  onUpdate: (updates: Partial<ParsedInvoiceItem>) => void;
}

export function InvoiceItemRow({ item, onToggleSelection, onUpdate }: InvoiceItemRowProps) {
  const isNew = !item.matchedProductId;
  const hasLowMargin = item.editedPurchasePrice > 0 && item.editedSellPrice > 0 && 
    ((item.editedSellPrice - item.editedPurchasePrice) / item.editedSellPrice) < 0.2;
  const hasMissingPrice = !item.editedPurchasePrice || !item.editedSellPrice;
  const marginPercent = item.editedPurchasePrice > 0 && item.editedSellPrice > 0
    ? Math.round((1 - item.editedPurchasePrice / item.editedSellPrice) * 100)
    : 0;

  return (
    <div className={cn(
      "p-3 sm:p-4 rounded-lg border transition-all",
      item.selected 
        ? "bg-secondary/30 border-primary/30" 
        : "bg-secondary/10 border-border/30 opacity-60"
    )}>
      {/* Header with checkbox and name */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.selected}
          onCheckedChange={onToggleSelection}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm sm:text-base truncate">
              {item.name}
            </span>
            
            {isNew ? (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Nový
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                <Check className="w-3 h-3 mr-1" />
                Existující
              </Badge>
            )}
            
            {hasMissingPrice && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Doplňte cenu
              </Badge>
            )}
            
            {hasLowMargin && !hasMissingPrice && (
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Nízká marže ({marginPercent}%)
              </Badge>
            )}
          </div>
          
          {/* SKU code */}
          {item.skuCode && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Hash className="w-3 h-3" />
              {item.skuCode}
            </span>
          )}
          
          {item.matchedProductName && item.matchedProductName !== item.name && (
            <p className="text-xs text-muted-foreground mt-0.5">
              → Přiřazeno k: {item.matchedProductName}
            </p>
          )}
          
          {item.matchedProduct && (
            <p className="text-xs text-muted-foreground">
              <Package className="w-3 h-3 inline mr-1" />
              Na skladu: {item.matchedProduct.stock_quantity} ks
              {item.selected && ` (+${item.editedQuantity} ks)`}
            </p>
          )}
        </div>
      </div>

      {/* Editable fields */}
      {item.selected && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Počet (ks)</Label>
            <Input
              type="number"
              min={1}
              value={item.editedQuantity}
              onChange={(e) => onUpdate({ editedQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Nákupní cena</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.editedPurchasePrice || ''}
                onChange={(e) => onUpdate({ editedPurchasePrice: parseFloat(e.target.value) || 0 })}
                className="h-8 text-sm pr-8"
                placeholder="0"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kč</span>
            </div>
          </div>
          
          {isNew && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Prodejní cena</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.editedSellPrice || ''}
                    onChange={(e) => onUpdate({ editedSellPrice: parseFloat(e.target.value) || 0 })}
                    className={cn(
                      "h-8 text-sm pr-8",
                      hasLowMargin && "border-orange-500/50"
                    )}
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kč</span>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Kategorie</Label>
                <Select 
                  value={item.editedCategory} 
                  onValueChange={(v) => onUpdate({ editedCategory: v })}
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary line for selected items */}
      {item.selected && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {item.editedQuantity} ks × {formatCurrency(item.editedPurchasePrice)} = {formatCurrency(item.editedQuantity * item.editedPurchasePrice)}
          </span>
          {marginPercent > 0 && (
            <span className={cn(
              "font-medium",
              marginPercent < 20 ? "text-orange-500" : marginPercent > 40 ? "text-green-500" : "text-foreground"
            )}>
              Marže: {marginPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
