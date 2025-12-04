import { useState } from 'react';
import { Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProducts } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';

interface QuickProductSaleProps {
  collapsed?: boolean;
}

export function QuickProductSale({ collapsed = false }: QuickProductSaleProps) {
  const { data: products = [] } = useProducts(true);
  const { data: clients = [] } = useClients();
  const createTransaction = useCreateTransaction();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedProductData = products.find(p => p.id === selectedProduct);
  const totalAmount = selectedProductData ? selectedProductData.price * productQuantity : 0;

  const handleSale = async () => {
    if (!selectedClient || !selectedProductData) return;

    await createTransaction.mutateAsync({
      client_id: selectedClient,
      amount: -totalAmount,
      type: 'product',
      description: `${selectedProductData.name}${productQuantity > 1 ? ` (${productQuantity}x)` : ''}`,
      product_id: selectedProductData.id,
    });

    setSelectedClient('');
    setSelectedProduct('');
    setProductQuantity(1);
    setIsOpen(false);
  };

  const resetForm = () => {
    setSelectedClient('');
    setSelectedProduct('');
    setProductQuantity(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {!collapsed && (
            <span className="font-medium truncate">Prodej</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Rychlý prodej produktu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Klient</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Vyberte klienta" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{client.name}</span>
                      <span className={cn(
                        "text-xs",
                        (client.credit_balance || 0) < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClientData && (
            <div className="p-3 rounded-xl bg-secondary/50 text-sm">
              <span className="text-muted-foreground">Kredit: </span>
              <span className={cn(
                "font-semibold",
                (selectedClientData.credit_balance || 0) < 0 ? "text-destructive" : 
                (selectedClientData.credit_balance || 0) < 500 ? "text-warning" : "text-success"
              )}>
                {(selectedClientData.credit_balance || 0).toLocaleString('cs-CZ')} Kč
              </span>
            </div>
          )}

          <div>
            <Label>Produkt</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Vyberte produkt" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.price.toLocaleString('cs-CZ')} Kč
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Počet</Label>
            <Input
              type="number"
              min="1"
              value={productQuantity}
              onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>

          {selectedProductData && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Celkem k odečtení:</p>
              <p className="text-2xl font-bold text-foreground">
                {totalAmount.toLocaleString('cs-CZ')} Kč
              </p>
              {selectedClientData && (
                <p className="text-sm text-muted-foreground mt-1">
                  Nový zůstatek: {' '}
                  <span className={cn(
                    "font-medium",
                    ((selectedClientData.credit_balance || 0) - totalAmount) < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {((selectedClientData.credit_balance || 0) - totalAmount).toLocaleString('cs-CZ')} Kč
                  </span>
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={handleSale} 
            disabled={!selectedClient || !selectedProduct || createTransaction.isPending} 
            className="w-full"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Prodat a odečíst z kreditu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
