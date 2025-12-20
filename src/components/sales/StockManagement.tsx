import { useState, useMemo } from 'react';
import { 
  Plus, 
  Pencil, 
  Package, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Archive,
  Wrench,
  PackagePlus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useProducts, useCreateProduct, useUpdateProduct, Product } from '@/hooks/useProducts';
import { StockReceiveDialog } from '@/components/settings/StockReceiveDialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

const CATEGORIES = [
  { value: 'supplement', label: 'Doplněk' },
  { value: 'drink', label: 'Nápoj' },
  { value: 'snack', label: 'Svačina' },
  { value: 'service', label: 'Služba' },
  { value: 'other', label: 'Ostatní' },
];

export function StockManagement() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [category, setCategory] = useState('supplement');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [showMargin, setShowMargin] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const lowStockProducts = useMemo(() => (
    products.filter(p => p.is_active && p.stock_quantity <= p.low_stock_threshold && p.category !== 'service')
  ), [products]);

  const filteredProducts = useMemo(() => {
    if (showArchived) return products;
    return products.filter(p => p.is_active);
  }, [products, showArchived]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setPurchasePrice('');
    setCategory('supplement');
    setStockQuantity('0');
    setLowStockThreshold('5');
    setEditingProduct(null);
  };

  const handleCreate = async () => {
    if (!name || !price) return;
    
    await createProduct.mutateAsync({
      name,
      price: parseFloat(price),
      purchase_price: parseFloat(purchasePrice) || 0,
      category,
      stock_quantity: category === 'service' ? 0 : parseInt(stockQuantity) || 0,
      low_stock_threshold: category === 'service' ? 0 : parseInt(lowStockThreshold) || 5,
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingProduct || !name || !price) return;

    await updateProduct.mutateAsync({
      id: editingProduct.id,
      name,
      price: parseFloat(price),
      purchase_price: parseFloat(purchasePrice) || 0,
      category,
      stock_quantity: category === 'service' ? 0 : parseInt(stockQuantity) || 0,
      low_stock_threshold: category === 'service' ? 0 : parseInt(lowStockThreshold) || 5,
    });

    resetForm();
  };

  const handleToggleActive = async (product: Product) => {
    await updateProduct.mutateAsync({
      id: product.id,
      is_active: !product.is_active,
    });
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setPurchasePrice(product.purchase_price?.toString() || '0');
    setCategory(product.category);
    setStockQuantity(product.stock_quantity?.toString() || '0');
    setLowStockThreshold(product.low_stock_threshold?.toString() || '5');
  };

  const isLowStock = (product: Product) => 
    product.category !== 'service' && product.stock_quantity <= product.low_stock_threshold;

  const calculateMarginPercent = (sellPrice: number, buyPrice: number) => {
    if (buyPrice <= 0 || sellPrice <= 0) return 0;
    return Math.round((1 - buyPrice / sellPrice) * 100);
  };

  const getCategoryLabel = (cat: string) => 
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Low stock warning banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning">Nízký stav zásob</p>
            <p className="text-sm text-muted-foreground mt-1">
              {lowStockProducts.map(p => p.name).join(', ')} 
              {lowStockProducts.length === 1 ? ' má' : ' mají'} nízký stav zásob
            </p>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMargin(!showMargin)}
            className="gap-2"
          >
            {showMargin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showMargin ? 'Skrýt marži' : 'Zobrazit marži'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">{showArchived ? 'Skrýt archiv' : 'Zobrazit archiv'}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <StockReceiveDialog />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Přidat</span> položku
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nová položka</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Název</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Název produktu nebo služby"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Typ</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-2">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prodejní cena (Kč)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="65"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Nákupní cena (Kč)</Label>
                    <Input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="30"
                      className="mt-2"
                    />
                  </div>
                </div>
                {category !== 'service' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Skladem (ks)</Label>
                      <Input
                        type="number"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder="0"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Upozornit při (ks)</Label>
                      <Input
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        placeholder="5"
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
                {price && purchasePrice && parseFloat(purchasePrice) > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Marže:</p>
                    <p className="text-lg font-bold text-success">
                      {calculateMarginPercent(parseFloat(price), parseFloat(purchasePrice))}%
                    </p>
                  </div>
                )}
                <Button onClick={handleCreate} disabled={createProduct.isPending} className="w-full">
                  Vytvořit položku
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Products list */}
      <div className="space-y-2">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={cn(
              "glass rounded-xl p-4",
              isLowStock(product) && product.is_active && "ring-1 ring-warning/50",
              !product.is_active && "opacity-60"
            )}
          >
            {editingProduct?.id === product.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-36"
                    placeholder="Název"
                  />
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-20"
                    placeholder="Cena"
                  />
                  <Input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-20"
                    placeholder="Nákup"
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-28">
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
                {category !== 'service' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Skladem:</Label>
                      <Input
                        type="number"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        className="w-16"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Upozornit:</Label>
                      <Input
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        className="w-16"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} disabled={updateProduct.isPending}>
                    Uložit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    Zrušit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0",
                    product.category === 'service' 
                      ? "bg-blue-500/10 text-blue-500"
                      : isLowStock(product) && product.is_active 
                        ? "bg-warning/20 text-warning" 
                        : "bg-primary/10 text-primary"
                  )}>
                    {product.category === 'service' ? (
                      <Wrench className="w-5 h-5" />
                    ) : isLowStock(product) && product.is_active ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      {!product.is_active && (
                        <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
                          Archivováno
                        </Badge>
                      )}
                      {isLowStock(product) && product.is_active && (
                        <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                          Nízký stav
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span>{getCategoryLabel(product.category)}</span>
                      {product.category !== 'service' && (
                        <>
                          <span>•</span>
                          <span className={cn(
                            isLowStock(product) && product.is_active && "text-warning font-medium"
                          )}>
                            {product.stock_quantity || 0} ks
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(product.price)}</p>
                    {showMargin && product.purchase_price > 0 && (
                      <p className="text-xs text-success font-medium">
                        marže: {calculateMarginPercent(product.price, product.purchase_price)}%
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={product.is_active}
                    onCheckedChange={() => handleToggleActive(product)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(product)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Zatím žádné položky</p>
            <Button 
              className="mt-4 gap-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Přidat první položku
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
