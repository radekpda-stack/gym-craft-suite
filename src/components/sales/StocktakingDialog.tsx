import { useState, useMemo } from 'react';
import { ClipboardCheck, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useCreateStockMovement } from '@/hooks/useStockMovements';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function StocktakingDialog() {
  const [open, setOpen] = useState(false);
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const createMovement = useCreateStockMovement();

  const inventoryProducts = useMemo(() =>
    products.filter(p => p.kind === 'inventory' && p.is_active).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [products]
  );

  const differences = useMemo(() => {
    const diffs: { product: Product; expected: number; actual: number; diff: number }[] = [];
    inventoryProducts.forEach(p => {
      const val = actualCounts[p.id];
      if (val === undefined || val === '') return;
      const actual = parseInt(val) || 0;
      if (actual !== p.stock_quantity) {
        diffs.push({ product: p, expected: p.stock_quantity, actual, diff: actual - p.stock_quantity });
      }
    });
    return diffs;
  }, [inventoryProducts, actualCounts]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Pre-fill with current values
      const counts: Record<string, string> = {};
      inventoryProducts.forEach(p => { counts[p.id] = p.stock_quantity.toString(); });
      setActualCounts(counts);
    }
    setOpen(isOpen);
  };

  const handleSubmit = async () => {
    if (differences.length === 0) {
      toast({ title: 'Vše sedí', description: 'Žádné rozdíly nebyly nalezeny.' });
      setOpen(false);
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const d of differences) {
      try {
        await updateProduct.mutateAsync({ id: d.product.id, stock_quantity: d.actual });
        await createMovement.mutateAsync({
          product_id: d.product.id,
          movement_type: 'inventura',
          quantity: d.diff,
          note: `Inventura: ${d.expected} → ${d.actual} ks`,
        });
        successCount++;
      } catch (e) {
        console.error('Stocktake error for', d.product.name, e);
      }
    }

    setIsSubmitting(false);
    toast({
      title: 'Inventura dokončena',
      description: `Opraveno ${successCount} z ${differences.length} položek.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ClipboardCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Inventura</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Inventura skladu
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Zadejte skutečný počet kusů. Rozdíly budou automaticky opraveny a zaznamenány.
        </p>

        <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 -mr-1">
          {inventoryProducts.map(p => {
            const val = actualCounts[p.id] ?? '';
            const actual = val !== '' ? parseInt(val) || 0 : p.stock_quantity;
            const diff = actual - p.stock_quantity;
            const hasDiff = val !== '' && diff !== 0;

            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                  hasDiff ? "border-warning/40 bg-warning/5" : "border-border/30 bg-card/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Evidence: {p.stock_quantity} ks</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    value={val}
                    onChange={e => setActualCounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-20 h-9 text-center text-sm"
                    min="0"
                  />
                  {hasDiff && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs tabular-nums min-w-[3rem] justify-center",
                        diff > 0 ? "text-success border-success/40" : "text-destructive border-destructive/40"
                      )}
                    >
                      {diff > 0 ? '+' : ''}{diff}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border/50 space-y-3">
          {differences.length > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <span className="text-warning font-medium">{differences.length} rozdíl{differences.length > 1 ? 'ů' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="w-4 h-4" />
              <span>Vše sedí</span>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || differences.length === 0}
            className="w-full gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Dokončit inventuru ({differences.length} změn)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
