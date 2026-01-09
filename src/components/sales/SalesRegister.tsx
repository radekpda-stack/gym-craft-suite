import { useState, useMemo, useCallback } from 'react';
import { 
  Loader2, 
  Package, 
  User,
  AlertTriangle,
  Check,
  Wrench,
  Coins,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { useProductsSortedBySales } from '@/hooks/useProductsSortedBySales';
import { useClients } from '@/hooks/useClients';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';
import { processSaleWithDiscount, showSaleResultToast, PaymentMethod } from '@/services/saleProcessor';
import { ProductSearchAndFilters } from './ProductSearchAndFilters';
import { CartPanel } from './CartPanel';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { useQueryClient } from '@tanstack/react-query';

type SortOption = 'best_selling' | 'least_selling' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

// Helper to normalize text for search (remove diacritics)
const normalizeText = (text: string) => 
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'best_selling', label: 'Nejprodávanější' },
  { value: 'least_selling', label: 'Nejméně prodávané' },
  { value: 'name_asc', label: 'Název A-Z' },
  { value: 'name_desc', label: 'Název Z-A' },
  { value: 'price_asc', label: 'Cena ↑' },
  { value: 'price_desc', label: 'Cena ↓' },
];

// ProductCard component for reuse in grouped sections
interface ProductCardProps {
  product: Product;
  cart: ReturnType<typeof useSalesCartWithDiscount>;
  isLowStock: (product: Product) => boolean;
  getProductIcon: (product: Product) => React.ReactNode;
  getProductKindLabel: (product: Product) => string;
}

function ProductCard({ product, cart, isLowStock, getProductIcon, getProductKindLabel }: ProductCardProps) {
  const cartItem = cart.getItem(product.id);
  const inCart = !!cartItem;
  const lowStock = isLowStock(product);
  const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;

  return (
    <button
      onClick={() => !outOfStock && cart.addItem(product)}
      disabled={outOfStock}
      className={cn(
        "relative p-3 sm:p-4 rounded-xl text-left transition-all",
        "hover:scale-[1.02] active:scale-[0.98]",
        outOfStock && "opacity-50 cursor-not-allowed",
        inCart 
          ? "bg-primary/20 ring-2 ring-primary" 
          : "glass hover:bg-secondary/50",
        lowStock && !outOfStock && "ring-1 ring-warning/50"
      )}
    >
      {/* Product type badge */}
      <div className="flex items-center gap-1.5 mb-2">
        {getProductIcon(product)}
        <span className="text-[10px] text-muted-foreground uppercase">
          {getProductKindLabel(product)}
        </span>
      </div>

      {/* Name & Price */}
      <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
      <p className="text-lg sm:text-xl font-bold text-primary mt-1">
        {formatCurrency(product.price)}
      </p>

      {/* Credit delta for topups */}
      {product.kind === 'credit_topup' && product.credit_delta > 0 && (
        <p className="text-xs text-amber-600 mt-1">
          +{formatCurrency(product.credit_delta)} kredit
        </p>
      )}

      {/* Stock info for inventory */}
      {product.kind === 'inventory' && (
        <div className="flex items-center gap-1 mt-2">
          {outOfStock ? (
            <span className="text-xs text-destructive font-medium">Vyprodáno</span>
          ) : (
            <>
              {lowStock && <AlertTriangle className="w-3 h-3 text-warning" />}
              <span className={cn(
                "text-xs",
                lowStock ? "text-warning font-medium" : "text-muted-foreground"
              )}>
                {product.stock_quantity || 0} ks
              </span>
            </>
          )}
        </div>
      )}

      {/* In cart indicator with count */}
      {inCart && (
        <Badge className="absolute -top-2 -right-2 bg-primary min-w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg">
          {cartItem.quantity}
        </Badge>
      )}
    </button>
  );
}

export function SalesRegister() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useProductsSortedBySales(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [noClient, setNoClient] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleNote, setSaleNote] = useState('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<SortOption>('best_selling');
  const [outOfStockLast, setOutOfStockLast] = useState(true);

  // New cart hook with discount support
  const cart = useSalesCartWithDiscount({ clientId: noClient ? null : selectedClient || null });

  // Sort and filter products, then group by kind
  const groupedProducts = useMemo(() => {
    let result = [...products];

    // Search filter (case-insensitive, normalize diacritics)
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery.trim());
      result = result.filter(p => normalizeText(p.name).includes(query));
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    // In stock only filter (only applies to inventory items)
    if (inStockOnly) {
      result = result.filter(p => p.kind !== 'inventory' || (p.stock_quantity || 0) > 0);
    }

    // Sort based on option
    const compareFn = (a: Product, b: Product): number => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'cs');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'cs');
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'least_selling':
          return a.name.localeCompare(b.name, 'cs');
        case 'best_selling':
        default:
          return 0;
      }
    };

    if (sortBy !== 'best_selling') {
      result.sort(compareFn);
    }

    if (sortBy === 'least_selling') {
      result.reverse();
    }

    // Move out of stock to end if enabled (within each group)
    const sortWithStock = (items: Product[]) => {
      if (outOfStockLast) {
        const inStock = items.filter(p => p.kind !== 'inventory' || (p.stock_quantity || 0) > 0);
        const outOfStock = items.filter(p => p.kind === 'inventory' && (p.stock_quantity || 0) <= 0);
        return [...inStock, ...outOfStock];
      }
      return items;
    };

    // Group by kind
    const services = sortWithStock(result.filter(p => p.kind === 'service'));
    const inventory = sortWithStock(result.filter(p => p.kind === 'inventory'));
    const creditTopups = sortWithStock(result.filter(p => p.kind === 'credit_topup'));

    return { services, inventory, creditTopups };
  }, [products, sortBy, outOfStockLast, searchQuery, selectedCategory, inStockOnly]);

  const totalProducts = groupedProducts.services.length + groupedProducts.inventory.length + groupedProducts.creditTopups.length;

  // Sort clients by last activity
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [clients]);

  const selectedClientData = clients.find(c => c.id === selectedClient);

  const handleNoClientToggle = useCallback(() => {
    setNoClient(!noClient);
    if (!noClient) {
      setSelectedClient('');
    }
  }, [noClient]);

  const handleSale = useCallback(async () => {
    if (cart.isEmpty) return;

    // Validate: credit payment requires client
    if (paymentMethod === 'credit' && !selectedClient) return;

    // Validate cart
    if (!cart.validation.isValid) return;

    setIsProcessing(true);
    try {
      const result = await processSaleWithDiscount({
        clientId: noClient ? null : selectedClient || null,
        paymentMethod,
        note: saleNote || undefined,
        items: cart.items,
        orderDiscount: cart.orderDiscount,
        itemDiscounts: cart.itemsWithTotals
          .filter(item => item.lineDiscount && item.product.kind === 'inventory')
          .map(item => ({
            productId: item.product.id,
            type: item.lineDiscount!.type,
            value: item.lineDiscount!.value,
          })),
      });

      showSaleResultToast(result, cart.totals.totalAfterDiscount);

      if (result.success) {
        featureTracker.track('product_sale', 'finance', { 
          itemCount: cart.items.length, 
          totalAmount: cart.totals.totalAfterDiscount, 
          paymentMethod,
          hasDiscount: cart.totals.totalDiscount > 0,
          anonymous: noClient 
        });

        // Reset form
        cart.clear();
        setSelectedClient('');
        setNoClient(false);
        setPaymentMethod('cash');
        setSaleNote('');

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['products_sorted_by_sales'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
        queryClient.invalidateQueries({ queryKey: ['sales_stats'] });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, selectedClient, noClient, saleNote, queryClient]);

  const isLowStock = (product: Product) => 
    product.kind === 'inventory' && product.stock_quantity <= product.low_stock_threshold;

  const getProductIcon = (product: Product) => {
    switch (product.kind) {
      case 'service':
        return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
      case 'credit_topup':
        return <Coins className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Package className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getProductKindLabel = (product: Product) => {
    switch (product.kind) {
      case 'service':
        return 'Služba';
      case 'credit_topup':
        return 'Dobití';
      default:
        return 'Produkt';
    }
  };

  // Check if checkout is disabled
  const checkoutDisabled = useMemo(() => {
    if (isProcessing) return true;
    if (cart.isEmpty) return true;
    if (!cart.validation.isValid) return true;
    if (paymentMethod === 'credit' && !selectedClient) return true;
    return false;
  }, [isProcessing, cart.isEmpty, cart.validation.isValid, paymentMethod, selectedClient]);

  // Check if credit topup in cart requires client
  const hasCreditTopup = cart.items.some(item => item.product.kind === 'credit_topup');
  const creditTopupNeedsClient = hasCreditTopup && noClient;

  if (productsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:gap-6">
      {/* Left Column - Client, Search, Products */}
      <div className="space-y-4">
        {/* Client Selection */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4" />
              Klient
            </Label>
            <Button
              variant={noClient ? "default" : "outline"}
              size="sm"
              onClick={handleNoClientToggle}
              className="gap-2"
              disabled={hasCreditTopup}
            >
              {noClient ? <Check className="w-4 h-4" /> : null}
              Bez klienta
            </Button>
          </div>
          
          {!noClient ? (
            <ClientSearchSelect
              clients={sortedClients}
              value={selectedClient}
              onValueChange={setSelectedClient}
              placeholder="Vyhledat klienta..."
              showCreditBalance
              filterArchived={false}
            />
          ) : (
            <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
              Prodej bude zaznamenán bez přiřazení klientovi
              {creditTopupNeedsClient && (
                <p className="text-destructive mt-1 font-medium">
                  ⚠️ Dobití kreditu vyžaduje výběr klienta
                </p>
              )}
            </div>
          )}

          {selectedClientData && (
            <div className="mt-3 p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kredit:</span>
                <span className={cn(
                  "font-semibold",
                  (selectedClientData.credit_balance || 0) < 0 ? "text-destructive" : 
                  (selectedClientData.credit_balance || 0) < 500 ? "text-warning" : "text-success"
                )}>
                  {formatCurrency(selectedClientData.credit_balance || 0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <Label className="text-sm font-medium">Produkty a služby</Label>
            
            {/* Sorting popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Řazení</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Řazení</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label htmlFor="out-of-stock-last" className="text-sm cursor-pointer">
                      Vyprodané na konec
                    </Label>
                    <Switch
                      id="out-of-stock-last"
                      checked={outOfStockLast}
                      onCheckedChange={setOutOfStockLast}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <ProductSearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            inStockOnly={inStockOnly}
            onInStockOnlyChange={setInStockOnly}
          />
        </div>

        {/* Products Grid */}
        {totalProducts === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory ? 'Žádné výsledky' : 'Žádné produkty'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || selectedCategory 
                ? 'Zkuste upravit vyhledávání nebo filtry'
                : 'Přidejte produkty v záložce Sklad'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Services Section */}
            {groupedProducts.services.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-muted-foreground">Služby</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.services.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {groupedProducts.services.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      cart={cart}
                      isLowStock={isLowStock}
                      getProductIcon={getProductIcon}
                      getProductKindLabel={getProductKindLabel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Products/Inventory Section */}
            {groupedProducts.inventory.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Produkty</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.inventory.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {groupedProducts.inventory.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      cart={cart}
                      isLowStock={isLowStock}
                      getProductIcon={getProductIcon}
                      getProductKindLabel={getProductKindLabel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Credit Topups Section */}
            {groupedProducts.creditTopups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">Dobití kreditu</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.creditTopups.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {groupedProducts.creditTopups.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      cart={cart}
                      isLowStock={isLowStock}
                      getProductIcon={getProductIcon}
                      getProductKindLabel={getProductKindLabel}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column - Sticky Cart Panel */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <CartPanel
          cart={cart}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          saleNote={saleNote}
          onSaleNoteChange={setSaleNote}
          selectedClientData={selectedClientData}
          hasCreditTopup={hasCreditTopup}
          isProcessing={isProcessing}
          checkoutDisabled={checkoutDisabled}
          onSale={handleSale}
          selectedClient={selectedClient}
          noClient={noClient}
        />
      </div>
    </div>
  );
}
