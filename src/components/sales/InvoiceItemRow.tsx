import { Check, AlertTriangle, Package, Sparkles, Hash, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ParsedInvoiceItem } from '@/hooks/useInvoiceImport';
import { formatCurrency } from '@/lib/formatters';
import { Product } from '@/hooks/useProducts';
import { ProductMatchSelector } from './ProductMatchSelector';

const CATEGORIES = [
  { value: 'supplement', label: 'Doplněk' },
  { value: 'drink', label: 'Nápoj' },
  { value: 'snack', label: 'Svačina' },
  { value: 'equipment', label: 'Vybavení' },
  { value: 'other', label: 'Ostatní' },
];

interface InvoiceItemRowProps {
  item: ParsedInvoiceItem;
  products: Product[];
  onToggleSelection: () => void;
  onUpdate: (updates: Partial<ParsedInvoiceItem>) => void;
  onChangeMatch: (productId: string | null) => void;
}

export function InvoiceItemRow({ 
  item, 
  products,
  onToggleSelection, 
  onUpdate,
  onChangeMatch,
}: InvoiceItemRowProps) {
  const isNew = !item.matchedProductId;
  const hasLowMargin = item.editedPurchasePrice > 0 && item.editedSellPrice > 0 && 
    ((item.editedSellPrice - item.editedPurchasePrice) / item.editedSellPrice) < 0.2;
  const hasMissingPrice = !item.editedPurchasePrice || !item.editedSellPrice;
  const marginPercent = item.editedPurchasePrice > 0 && item.editedSellPrice > 0
    ? Math.round((1 - item.editedPurchasePrice / item.editedSellPrice) * 100)
    : 0;

  // Check if AI is uncertain about the match
  const isUncertainMatch = item.matchedProductId && item.confidence < 0.8;
  const hasAlternatives = item.matchSuggestions && item.matchSuggestions.length > 1;

  // Format extracted details
  const detailsBadges = [];
  if (item.extractedDetails?.brand) {
    detailsBadges.push({ label: item.extractedDetails.brand, icon: Tag });
  }
  if (item.extractedDetails?.weight) {
    detailsBadges.push({ label: item.extractedDetails.weight, icon: null });
  }
  if (item.extractedDetails?.flavor) {
    detailsBadges.push({ label: item.extractedDetails.flavor, icon: null });
  }

  const hasImportError = !!item.importError;

  return (
    <div className={cn(
      "p-3 sm:p-4 rounded-lg border transition-all",
      hasImportError
        ? "bg-destructive/5 border-destructive/50 ring-1 ring-destructive/30"
        : item.selected 
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
            
            {isUncertainMatch && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Ověřte shodu
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

          {/* Extracted details badges */}
          {detailsBadges.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {detailsBadges.map((badge, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] h-5">
                  {badge.icon && <badge.icon className="w-2.5 h-2.5 mr-0.5" />}
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
          
          {/* SKU code */}
          {item.skuCode && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Hash className="w-3 h-3" />
              {item.skuCode}
            </span>
          )}
          
          {/* Product match selector */}
          {item.selected && (
            <div className="mt-2">
              <ProductMatchSelector
                matchedProductId={item.matchedProductId}
                matchedProductName={item.matchedProductName}
                confidence={item.confidence}
                matchSuggestions={item.matchSuggestions}
                products={products}
                onSelect={onChangeMatch}
              />
            </div>
          )}
          
          {item.matchedProduct && (
            <p className="text-xs text-muted-foreground mt-1">
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
          
          {/* Prodejní cena - pro nové produkty vždy, pro existující jako volitelná aktualizace */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Prodejní cena {!isNew && <span className="text-muted-foreground/60">(aktualizovat)</span>}
            </Label>
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
                placeholder={isNew ? "0" : item.matchedProduct?.price?.toString() || "0"}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kč</span>
            </div>
          </div>
          
          {isNew && (
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
          )}
        </div>
      )}

      {/* Import error message */}
      {hasImportError && (
        <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="font-medium">Chyba importu:</span>
            <span>{item.importError}</span>
          </div>
        </div>
      )}

      {/* Summary line for selected items */}
      {item.selected && !hasImportError && (
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
