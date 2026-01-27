import { useState } from 'react';
import { PackagePlus, Plus, Minus, X, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useCreateExpense } from '@/hooks/useBusinessExpenses';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StockItem {
  product: Product;
  quantity: number;
  unitCost: number; // Nákupní cena za kus
}

export function StockReceiveDialog() {
  const { data: products = [], isLoading } = useProducts();
  const updateProduct = useUpdateProduct();
  const createExpense = useCreateExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createExpenseRecord, setCreateExpenseRecord] = useState(true);

  // Filter out services and already added products
  const availableProducts = products.filter(
    p => p.category !== 'service' && !items.some(item => item.product.id === p.id)
  );

  const addProduct = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Use product's purchase_price as default unit cost
    const defaultUnitCost = product.purchase_price || 0;
    setItems(prev => [...prev, { product, quantity: 1, unitCost: defaultUnitCost }]);
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

  const updateUnitCost = (productId: string, value: number) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, unitCost: Math.max(0, value) }
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
      // Update stock quantities
      for (const item of items) {
        const newStock = (item.product.stock_quantity || 0) + item.quantity;
        await updateProduct.mutateAsync({
          id: item.product.id,
          stock_quantity: newStock,
        });
      }

      // Create expense record if enabled and total cost > 0
      if (createExpenseRecord && totalCost > 0) {
        const productNames = items.map(i => `${i.product.name} (${i.quantity}x)`).join(', ');
        await createExpense.mutateAsync({
          name: `Nákup zboží: ${items.length === 1 ? items[0].product.name : `${items.length} produktů`}`,
          description: productNames,
          amount: totalCost,
          date: format(new Date(), 'yyyy-MM-dd'),
          category: 'inventory',
        });
      }

      toast({
        title: 'Příjem zboží dokončen',
        description: createExpenseRecord && totalCost > 0 
          ? `Přijato ${items.length} produktů na sklad. Náklad ${formatCurrency(totalCost)} zaznamenán.`
          : `Přijato ${items.length} produktů na sklad.`,
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
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
  };

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
                    className="p-3 bg-secondary/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Aktuálně: {item.product.stock_quantity || 0} ks → Nově:{' '}
                          <span className="font-medium text-success">
                            {(item.product.stock_quantity || 0) + item.quantity} ks
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
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
                        <span className="text-xs text-muted-foreground">ks</span>
                      </div>
                      <div className="text-muted-foreground">×</div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => updateUnitCost(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-7 text-center text-sm"
                          min={0}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">Kč/ks</span>
                      </div>
                      <div className="text-sm font-medium ml-auto">
                        = {formatCurrency(item.quantity * item.unitCost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Celkem k příjmu:</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalItems} ks
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Celková nákupní cena:</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalCost)}
                  </p>
                </div>
              </div>
              
              {/* Create expense toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-success/20">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Zaznamenat jako náklad</span>
                </div>
                <Switch 
                  checked={createExpenseRecord} 
                  onCheckedChange={setCreateExpenseRecord}
                />
              </div>
              {createExpenseRecord && totalCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Náklad {formatCurrency(totalCost)} bude automaticky přidán do kategorie "Nákup zboží"
                </p>
              )}
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
