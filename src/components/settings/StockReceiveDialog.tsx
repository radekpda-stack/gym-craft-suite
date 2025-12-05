import { useState } from 'react';
import { PackagePlus, Plus, Minus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { toast } from '@/hooks/use-toast';

interface StockItem {
  product: Product;
  quantity: number;
}

export function StockReceiveDialog() {
  const { data: products = [], isLoading } = useProducts();
  const updateProduct = useUpdateProduct();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out services and already added products
  const availableProducts = products.filter(
    p => p.category !== 'service' && !items.some(item => item.product.id === p.id)
  );

  const addProduct = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setItems(prev => [...prev, { product, quantity: 1 }]);
    setSelectedProductId('');
  };

  const updateQuantity = (productId: string, value: number) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, value) }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleReceive = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      for (const item of items) {
        const newStock = (item.product.stock_quantity || 0) + item.quantity;
        await updateProduct.mutateAsync({
          id: item.product.id,
          stock_quantity: newStock,
        });
      }

      toast({
        title: 'Příjem zboží dokončen',
        description: `Přijato ${items.length} produktů na sklad.`,
      });

      setItems([]);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přijmout zboží na sklad.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setItems([]);
        setSelectedProductId('');
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PackagePlus className="w-4 h-4" />
          Příjem zboží
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5" />
            Hromadný příjem zboží
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add product selector */}
          <div>
            <Label>Přidat produkt</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableProducts.length === 0 && items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Žádné produkty k příjmu (služby nelze naskladnit)
              </p>
            ) : (
              <div className="flex gap-2 mt-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Vyberte produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (aktuálně {product.stock_quantity || 0} ks)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addProduct}
                  disabled={!selectedProductId}
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Produkty k příjmu ({items.length})</Label>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 bg-secondary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Aktuálně: {item.product.stock_quantity || 0} ks → Nově:{' '}
                        <span className="font-medium text-success">
                          {(item.product.stock_quantity || 0) + item.quantity} ks
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-center text-sm"
                        min={1}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/20">
              <p className="text-sm text-muted-foreground">Celkem k příjmu:</p>
              <p className="text-2xl font-bold text-foreground">
                {totalItems} ks
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {items.length} {items.length === 1 ? 'produkt' : items.length < 5 ? 'produkty' : 'produktů'}
              </p>
            </div>
          )}

          <Button
            onClick={handleReceive}
            disabled={items.length === 0 || isProcessing}
            className="w-full"
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            {isProcessing ? 'Zpracovávám...' : `Přijmout na sklad (${totalItems} ks)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
