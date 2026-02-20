import { useState, useMemo } from 'react';
import { ShoppingCart, Download, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStockVelocity } from '@/hooks/useStockVelocity';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function ShoppingListDialog() {
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const { data: velocityMap } = useStockVelocity();
  const { data: products = [] } = useProducts();

  const shoppingList = useMemo(() => {
    if (!velocityMap) return [];
    return products
      .filter(p => p.kind === 'inventory' && p.is_active)
      .map(p => {
        const v = velocityMap[p.id];
        if (!v || v.daysRemaining === null || v.daysRemaining > threshold) return null;
        const recommended = Math.ceil(v.avgDailySales * 30);
        return {
          id: p.id,
          name: p.name,
          currentStock: p.stock_quantity,
          daysRemaining: v.daysRemaining,
          avgDailySales: v.avgDailySales,
          recommended,
          purchasePrice: p.purchase_price,
          estimatedCost: recommended * p.purchase_price,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.daysRemaining) - (b!.daysRemaining)) as NonNullable<typeof shoppingList[0]>[];
  }, [velocityMap, products, threshold]);

  const totalCost = shoppingList.reduce((s, i) => s + i.estimatedCost, 0);

  const exportCSV = () => {
    const header = 'Produkt;Skladem;Dní zbývá;Ø denní prodej;Doporučené množství;Nákupní cena;Odhadovaný náklad\n';
    const rows = shoppingList.map(i =>
      `${i.name};${i.currentStock};${i.daysRemaining};${i.avgDailySales.toFixed(1)};${i.recommended};${i.purchasePrice};${i.estimatedCost}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nakupni-seznam-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Nákupní seznam</span>
          {shoppingList.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {shoppingList.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Automatický nákupní seznam
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm whitespace-nowrap">Práh dojezdu:</Label>
          <Input
            type="number"
            value={threshold}
            onChange={e => setThreshold(parseInt(e.target.value) || 14)}
            className="w-20 h-9"
            min={1}
          />
          <span className="text-sm text-muted-foreground">dní</span>
        </div>

        {shoppingList.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-success" />
            </div>
            <p className="font-medium text-foreground">Vše v pořádku!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Žádný produkt nedojde v příštích {threshold} dnech.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {shoppingList.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/30"
                >
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    item.daysRemaining <= 3 ? "bg-destructive/10 text-destructive" :
                    item.daysRemaining <= 7 ? "bg-warning/10 text-warning" :
                    "bg-primary/10 text-primary"
                  )}>
                    {item.daysRemaining <= 3 ? <AlertTriangle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Skladem: {item.currentStock} ks • ~{item.daysRemaining} dní
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-primary">+{item.recommended} ks</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.estimatedCost)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-3">
              <div>
                <p className="text-sm text-muted-foreground">Odhadovaný náklad</p>
                <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
