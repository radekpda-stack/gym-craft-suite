import { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Loader2, 
  Package, 
  User,
  AlertTriangle,
  Check,
  Wrench,
  Coins,
  SlidersHorizontal,
  Users
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
import { useSharedBudgetBalance } from '@/hooks/useCreditOperations';
import { ProductSearchAndFilters } from './ProductSearchAndFilters';
import { CartPanel } from './CartPanel';
import { FavoriteProducts } from './FavoriteProducts';
import { RecentSales } from './RecentSales';
import { ClientPurchaseSuggestions } from './ClientPurchaseSuggestions';
import { MobileCartBar } from './MobileCartBar';
import { MobileCartDrawer } from './MobileCartDrawer';
import { useRecentSales, RecentSale } from '@/hooks/useRecentSales';
import { useIsMobile } from '@/hooks/use-mobile';
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
  onAddToCart?: (product: Product) => void;
}

function ProductCard({ product, cart, isLowStock, getProductIcon, getProductKindLabel, onAddToCart }: ProductCardProps) {
  const cartItem = cart.getItem(product.id);
  const inCart = !!cartItem;
  const lowStock = isLowStock(product);
  const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;
  
  // Calculate stock percentage for gauge
  const maxStock = product.low_stock_threshold ? product.low_stock_threshold * 4 : 20;
  const stockPercent = product.kind === 'inventory' 
    ? Math.min(100, ((product.stock_quantity || 0) / maxStock) * 100) 
    : 100;

  return (
    <button
      onClick={() => { if (!outOfStock) { cart.addItem(product); onAddToCart?.(product); } }}
      disabled={outOfStock}
      className={cn(
        "relative overflow-hidden rounded-xl text-left transition-all duration-200",
        "bg-card/80 backdrop-blur-md border border-border/50 shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
        outOfStock && "opacity-50 cursor-not-allowed",
        inCart && "ring-2 ring-primary bg-primary/10",
        lowStock && !outOfStock && !inCart && "border-warning/50"
      )}
    >
      {/* Stock gauge bar for inventory items */}
      {product.kind === 'inventory' && (
        <div className="h-1 bg-secondary/30">
          <div 
            className={cn(
              "h-full transition-all duration-300",
              outOfStock ? "bg-destructive/50" :
              lowStock ? "bg-gradient-to-r from-warning to-warning/50" :
              "bg-gradient-to-r from-success to-success/50"
            )}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      )}
      
      <div className="p-2 sm:p-3 sm:p-4">
        {/* Product type badge */}
        <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
          <div className={cn(
            "p-1 rounded-md hidden sm:block",
            product.kind === 'service' ? "bg-accent/10" :
            product.kind === 'credit_topup' ? "bg-warning/10" :
            "bg-primary/10"
          )}>
            {getProductIcon(product)}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            {getProductKindLabel(product)}
          </span>
        </div>

        {/* Name & Price */}
        <p className="font-medium text-xs sm:text-sm line-clamp-2 min-h-[2em] sm:min-h-[2.5em]">{product.name}</p>
        <p className="text-base sm:text-xl font-bold text-primary mt-0.5 sm:mt-1 tabular-nums">
          {formatCurrency(product.price)}
        </p>

        {/* Credit delta for topups */}
        {product.kind === 'credit_topup' && product.credit_delta > 0 && (
          <p className="text-xs text-warning mt-1 font-medium">
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
                  "text-xs tabular-nums",
                  lowStock ? "text-warning font-medium" : "text-muted-foreground"
                )}>
                  {product.stock_quantity || 0} ks
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* In cart indicator with count */}
      {inCart && (
        <Badge className="absolute -top-1.5 -right-1.5 bg-primary min-w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg animate-scale-in">
          {cartItem.quantity}
        </Badge>
      )}
    </button>
  );
}

export function SalesRegister() {
  const isMobile = useIsMobile();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [lastAddedName, setLastAddedName] = useState<string | undefined>();
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
  const [inStockOnly, setInStockOnly] = useState(true);
  
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
  
  // Get shared budget info for selected client - handles both individual and shared budgets
  // This hook fetches the balance directly from DB, ensuring fresh data
  const { data: sharedBudget, isLoading: isBudgetLoading } = useSharedBudgetBalance(selectedClient || undefined);
  
  // ALWAYS use displayBalance from sharedBudget - it fetches fresh data from DB
  // Do NOT fall back to selectedClientData.credit_balance as it comes from cached useClients()
  const effectiveBalance = isBudgetLoading ? null : (sharedBudget?.displayBalance ?? 0);

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
        return <Wrench className="w-3.5 h-3.5 text-accent" />;
      case 'credit_topup':
        return <Coins className="w-3.5 h-3.5 text-warning" />;
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

  // Handle repeating a recent sale
  const handleRepeatSale = useCallback((sale: RecentSale) => {
    // Clear current cart
    cart.clear();
    
    // Add items from the sale
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        // Add the product the specified number of times
        for (let i = 0; i < item.quantity; i++) {
          cart.addItem(product);
        }
      }
    });
    
    // Set the client if one existed
    if (sale.client_id) {
      setSelectedClient(sale.client_id);
      setNoClient(false);
    } else {
      setSelectedClient('');
      setNoClient(true);
    }
    
    // Set payment method from sale
    if (sale.payment_method) {
      setPaymentMethod(sale.payment_method as PaymentMethod);
    }
  }, [cart, products]);

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
        {/* Compact Client Selection */}
        <div className="card-floating rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 rounded-md bg-primary/10">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <Label className="text-sm font-medium flex-1">Klient</Label>
            <Button
              variant={noClient ? "default" : "ghost"}
              size="xs"
              onClick={handleNoClientToggle}
              className="gap-1 h-7 text-xs"
              disabled={hasCreditTopup}
            >
              {noClient ? <Check className="w-3 h-3" /> : null}
              Bez klienta
            </Button>
          </div>
          
          {!noClient ? (
            <div className="space-y-2">
              <ClientSearchSelect
                clients={sortedClients}
                value={selectedClient}
                onValueChange={setSelectedClient}
                placeholder="Vyhledat klienta..."
                showCreditBalance={false}
                filterArchived={false}
              />
              {/* Inline credit info */}
              {selectedClientData && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-muted-foreground">{selectedClientData.name}</span>
                  <div className="flex items-center gap-2">
                    {sharedBudget?.isShared && (
                      <Badge variant="outline" className="gap-0.5 text-[9px] py-0 px-1 bg-secondary/50">
                        <Users className="w-2.5 h-2.5" />
                        {sharedBudget.groupName}
                      </Badge>
                    )}
                    {isBudgetLoading || effectiveBalance === null ? (
                      <span className="text-muted-foreground animate-pulse">...</span>
                    ) : (
                      <span className={cn(
                        "font-bold tabular-nums",
                        effectiveBalance < 0 ? "text-destructive" : 
                        effectiveBalance < 500 ? "text-warning" : "text-success"
                      )}>
                        {formatCurrency(effectiveBalance)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">
              Prodej bez přiřazení klientovi
              {creditTopupNeedsClient && (
                <span className="text-destructive ml-1 font-medium">⚠️ Dobití vyžaduje klienta</span>
              )}
            </p>
          )}
        </div>

        {/* Client Purchase Suggestions - inline, no card wrapper */}
        <ClientPurchaseSuggestions
          clientId={selectedClient || undefined}
          products={products}
          onAddToCart={(product) => { cart.addItem(product); setLastAddedName(product.name); }}
          getCartQuantity={(productId) => cart.getItem(productId)?.quantity || 0}
        />

        {/* Search and Filters - sticky on mobile */}
        <div className={cn(
          "card-floating rounded-xl p-3 sm:p-4",
          "lg:relative sticky top-0 z-30 lg:z-auto"
        )}>
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
            products={products}
            onProductSelect={(product) => { cart.addItem(product); setLastAddedName(product.name); }}
          />
        </div>

        {/* Products Grid */}
        {totalProducts === 0 ? (
          <div className="card-floating rounded-xl p-8 text-center">
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
                {/* Premium section divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Wrench className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm font-semibold">Služby</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.services.length})</span>
                  <div className="flex-1 h-px bg-border/50" />
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
                      onAddToCart={(p) => setLastAddedName(p.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Products/Inventory Section */}
            {groupedProducts.inventory.length > 0 && (
              <div>
                {/* Premium section divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Produkty</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.inventory.length})</span>
                  <div className="flex-1 h-px bg-border/50" />
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
                      onAddToCart={(p) => setLastAddedName(p.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Credit Topups Section */}
            {groupedProducts.creditTopups.length > 0 && (
              <div>
                {/* Premium section divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-warning/10">
                    <Coins className="w-4 h-4 text-warning" />
                  </div>
                  <span className="text-sm font-semibold">Dobití kreditu</span>
                  <span className="text-xs text-muted-foreground">({groupedProducts.creditTopups.length})</span>
                  <div className="flex-1 h-px bg-border/50" />
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
                      onAddToCart={(p) => setLastAddedName(p.name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secondary sections - below products on mobile */}
        <RecentSales onRepeatSale={handleRepeatSale} defaultCollapsed={true} />
        <FavoriteProducts
          products={products}
          onAddToCart={(product) => { cart.addItem(product); setLastAddedName(product.name); }}
          getCartQuantity={(productId) => cart.getItem(productId)?.quantity || 0}
          defaultCollapsed={true}
        />
      </div>

      {/* Right Column - Sticky Cart Panel (hidden on mobile, replaced by drawer) */}
      <div className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
        <CartPanel
          cart={cart}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          saleNote={saleNote}
          onSaleNoteChange={setSaleNote}
          clientCreditBalance={effectiveBalance}
          hasCreditTopup={hasCreditTopup}
          isProcessing={isProcessing}
          checkoutDisabled={checkoutDisabled}
          onSale={handleSale}
          selectedClient={selectedClient}
          noClient={noClient}
        />
      </div>

      {/* Mobile sticky cart bar */}
      <MobileCartBar
        itemCount={cart.items.reduce((sum, i) => sum + i.quantity, 0)}
        total={cart.totals.totalAfterDiscount}
        isProcessing={isProcessing}
        checkoutDisabled={checkoutDisabled}
        onCheckout={handleSale}
        onOpenCart={() => setCartDrawerOpen(true)}
        lastAddedName={lastAddedName}
      />

      {/* Mobile cart drawer */}
      <MobileCartDrawer
        open={cartDrawerOpen}
        onOpenChange={setCartDrawerOpen}
        cart={cart}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        saleNote={saleNote}
        onSaleNoteChange={setSaleNote}
        clientCreditBalance={effectiveBalance}
        hasCreditTopup={hasCreditTopup}
        isProcessing={isProcessing}
        checkoutDisabled={checkoutDisabled}
        onSale={handleSale}
        selectedClient={selectedClient}
        noClient={noClient}
      />
    </div>
  );
}
