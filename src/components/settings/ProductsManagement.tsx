import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Package, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from '@/hooks/useProducts';
import { StockReceiveDialog } from './StockReceiveDialog';
import { cn } from '@/lib/utils';

export function ProductsManagement() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [category, setCategory] = useState('supplement');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [showMargin, setShowMargin] = useState(false);

  const lowStockProducts = useMemo(() => (
    products.filter(p => p.is_active && p.stock_quantity <= p.low_stock_threshold && p.category !== 'service')
  ), [products]);

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
      stock_quantity: parseInt(stockQuantity) || 0,
      low_stock_threshold: parseInt(lowStockThreshold) || 5,
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
      stock_quantity: parseInt(stockQuantity) || 0,
      low_stock_threshold: parseInt(lowStockThreshold) || 5,
    });

    resetForm();
  };

  const handleToggleActive = async (product: Product) => {
    await updateProduct.mutateAsync({
      id: product.id,
      is_active: !product.is_active,
    });
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutate(id);
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

  return (
    <div className="space-y-4">
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

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-foreground">Produkty a služby</h3>
        <div className="flex items-center gap-2">
          {/* Toggle margin visibility */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMargin(!showMargin)}
            className="gap-2"
          >
            {showMargin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showMargin ? 'Skrýt marži' : 'Zobrazit marži'}
          </Button>
          <StockReceiveDialog />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Přidat produkt
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový produkt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Název</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Název produktu"
                  className="mt-2"
                />
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
              <div>
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplement">Doplněk</SelectItem>
                    <SelectItem value="drink">Nápoj</SelectItem>
                    <SelectItem value="snack">Svačina</SelectItem>
                    <SelectItem value="service">Služba</SelectItem>
                    <SelectItem value="other">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
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
                Vytvořit produkt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <div
            key={product.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl bg-secondary/50",
              isLowStock(product) && product.is_active && "ring-1 ring-warning/50"
            )}
          >
            {editingProduct?.id === product.id ? (
              <div className="flex-1 space-y-3">
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
                      <SelectItem value="supplement">Doplněk</SelectItem>
                      <SelectItem value="drink">Nápoj</SelectItem>
                      <SelectItem value="snack">Svačina</SelectItem>
                      <SelectItem value="service">Služba</SelectItem>
                      <SelectItem value="other">Ostatní</SelectItem>
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
              <>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isLowStock(product) && product.is_active 
                      ? "bg-warning/20 text-warning" 
                      : "bg-primary/10 text-primary"
                  )}>
                    {isLowStock(product) && product.is_active ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{product.name}</p>
                      {isLowStock(product) && product.is_active && (
                        <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                          Nízký stav
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">
                        {product.category === 'supplement' ? 'Doplněk' : 
                         product.category === 'service' ? 'Služba' : 
                         product.category === 'drink' ? 'Nápoj' :
                         product.category === 'snack' ? 'Svačina' : 'Ostatní'}
                      </span>
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
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-foreground">{product.price} Kč</p>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        disabled={deleteProduct.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Smazat produkt</AlertDialogTitle>
                        <AlertDialogDescription>
                          Opravdu chcete smazat produkt "{product.name}"? Tuto akci nelze vrátit zpět.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Smazat
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        ))}
        {products.length === 0 && !isLoading && (
          <p className="text-center text-muted-foreground py-8">
            Zatím žádné produkty
          </p>
        )}
      </div>
    </div>
  );
}
