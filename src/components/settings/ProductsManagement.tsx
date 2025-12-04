import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from '@/hooks/useProducts';

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

  const resetForm = () => {
    setName('');
    setPrice('');
    setPurchasePrice('');
    setCategory('supplement');
    setEditingProduct(null);
  };

  const handleCreate = async () => {
    if (!name || !price) return;
    
    await createProduct.mutateAsync({
      name,
      price: parseFloat(price),
      purchase_price: parseFloat(purchasePrice) || 0,
      category,
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
    });

    resetForm();
  };

  const handleToggleActive = async (product: Product) => {
    await updateProduct.mutateAsync({
      id: product.id,
      is_active: !product.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteProduct.mutateAsync(id);
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setPurchasePrice(product.purchase_price?.toString() || '0');
    setCategory(product.category);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Produkty a služby</h3>
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
                    <SelectItem value="service">Služba</SelectItem>
                    <SelectItem value="other">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {price && purchasePrice && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Marže:</p>
                  <p className="text-lg font-bold text-success">
                    {(parseFloat(price) - parseFloat(purchasePrice)).toLocaleString('cs-CZ')} Kč
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({((1 - parseFloat(purchasePrice) / parseFloat(price)) * 100).toFixed(0)}%)
                    </span>
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

      <div className="space-y-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
          >
            {editingProduct?.id === product.id ? (
              <div className="flex-1 flex items-center gap-3 flex-wrap">
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
                    <SelectItem value="service">Služba</SelectItem>
                    <SelectItem value="other">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleUpdate} disabled={updateProduct.isPending}>
                  Uložit
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  Zrušit
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {product.category === 'supplement' ? 'Doplněk' : product.category === 'service' ? 'Služba' : 'Ostatní'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-foreground">{product.price} Kč</p>
                    {product.purchase_price > 0 && (
                      <p className="text-xs text-muted-foreground">
                        nákup: {product.purchase_price} Kč • marže: {(product.price - product.purchase_price)} Kč
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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