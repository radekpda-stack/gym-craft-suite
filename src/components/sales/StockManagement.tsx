import { useState, useMemo } from 'react';
import { 
  Plus, 
  Pencil, 
  Package, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Wrench,
  Loader2,
  CreditCard,
  Sparkles,
  FileText,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useProducts, useCreateProduct, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useStockVelocity } from '@/hooks/useStockVelocity';
import { StockReceiveDialog } from '@/components/settings/StockReceiveDialog';
import { StockSearchAndFilters, StockFilter, StockSortOption, StockTypeFilter } from './StockSearchAndFilters';
import { LowStockBanner } from './LowStockBanner';
import { InvoiceImportDialog } from './InvoiceImportDialog';
import { StockMovementsTimeline } from './StockMovementsTimeline';
import { StockExportButton } from './StockExportButton';
import { StocktakingDialog } from './StocktakingDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';

const CATEGORIES = [
  { value: 'supplement', label: 'Doplněk' },
  { value: 'drink', label: 'Nápoj' },
  { value: 'snack', label: 'Svačina' },
  { value: 'service', label: 'Služba' },
  { value: 'other', label: 'Ostatní' },
];

const PRODUCT_KINDS = [
  { value: 'inventory', label: 'Skladová položka', description: 'Sleduje zásoby' },
  { value: 'service', label: 'Služba', description: 'Nesleduje zásoby' },
  { value: 'credit_topup', label: 'Dobití kreditu', description: 'Přičte kredit klientovi' },
];

// Helper to normalize text for search (remove diacritics)
const normalizeText = (text: string) => 
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function StockManagement() {
  const [stockTab, setStockTab] = useState('items');
  const { data: products = [], isLoading } = useProducts();
  const { data: velocityMap } = useStockVelocity();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [category, setCategory] = useState('supplement');
  const [kind, setKind] = useState<'inventory' | 'service' | 'credit_topup'>('inventory');
  const [creditDelta, setCreditDelta] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [xpBonus, setXpBonus] = useState('0');
  const [minSellPrice, setMinSellPrice] = useState('');
  const [discountEligible, setDiscountEligible] = useState(true);

  // Filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');
  const [typeFilter, setTypeFilter] = useState<StockTypeFilter>('all');
  const [sortBy, setSortBy] = useState<StockSortOption>('name_asc');
  const [showMargin, setShowMargin] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 250);

  // Low stock products (for banner)
  const lowStockProducts = useMemo(() => (
    products.filter(p => p.is_active && p.kind === 'inventory' && p.stock_quantity <= p.low_stock_threshold)
  ), [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Search filter (case-insensitive, normalize diacritics)
    if (debouncedSearch) {
      const searchNormalized = normalizeText(debouncedSearch);
      result = result.filter(p => 
        normalizeText(p.name).includes(searchNormalized)
      );
    }
    
    // Quick filter (chips)
    switch (activeFilter) {
      case 'low_stock':
        result = result.filter(p => p.is_active && p.kind === 'inventory' && p.stock_quantity <= p.low_stock_threshold);
        break;
      case 'active':
        result = result.filter(p => p.is_active);
        break;
      case 'archived':
        result = result.filter(p => !p.is_active);
        break;
      // 'all' = show all (including archived for visibility)
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(p => p.kind === typeFilter);
    }
    
    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'cs');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'cs');
        case 'stock_asc':
          return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        case 'stock_desc':
          return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'margin_desc': {
          const marginA = a.purchase_price > 0 ? (1 - a.purchase_price / a.price) : -1;
          const marginB = b.purchase_price > 0 ? (1 - b.purchase_price / b.price) : -1;
          return marginB - marginA;
        }
        default:
          return 0;
      }
    });
    
    return result;
  }, [products, debouncedSearch, activeFilter, typeFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setTypeFilter('all');
    setSortBy('name_asc');
  };

  const hasActiveFilters = searchQuery || activeFilter !== 'all' || typeFilter !== 'all';

  const resetForm = () => {
    setName('');
    setPrice('');
    setPurchasePrice('');
    setCategory('supplement');
    setKind('inventory');
    setCreditDelta('');
    setStockQuantity('0');
    setLowStockThreshold('5');
    setXpBonus('0');
    setMinSellPrice('');
    setDiscountEligible(true);
    setEditingProduct(null);
  };

  const handleCreate = async () => {
    if (!name || !price) return;
    if (kind === 'credit_topup' && (!creditDelta || parseFloat(creditDelta) <= 0)) return;
    
    await createProduct.mutateAsync({
      name,
      price: parseFloat(price),
      purchase_price: parseFloat(purchasePrice) || 0,
      category,
      kind,
      credit_delta: kind === 'credit_topup' ? parseFloat(creditDelta) || 0 : 0,
      stock_quantity: kind === 'inventory' ? parseInt(stockQuantity) || 0 : 0,
      low_stock_threshold: kind === 'inventory' ? parseInt(lowStockThreshold) || 5 : 0,
      xp_bonus: parseInt(xpBonus) || 0,
      min_sell_price: kind === 'inventory' && minSellPrice ? parseFloat(minSellPrice) : null,
      discount_eligible: discountEligible,
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingProduct || !name || !price) return;
    if (kind === 'credit_topup' && (!creditDelta || parseFloat(creditDelta) <= 0)) return;

    await updateProduct.mutateAsync({
      id: editingProduct.id,
      name,
      price: parseFloat(price),
      purchase_price: parseFloat(purchasePrice) || 0,
      category,
      kind,
      credit_delta: kind === 'credit_topup' ? parseFloat(creditDelta) || 0 : 0,
      stock_quantity: kind === 'inventory' ? parseInt(stockQuantity) || 0 : 0,
      low_stock_threshold: kind === 'inventory' ? parseInt(lowStockThreshold) || 5 : 0,
      xp_bonus: parseInt(xpBonus) || 0,
      min_sell_price: kind === 'inventory' && minSellPrice ? parseFloat(minSellPrice) : null,
      discount_eligible: discountEligible,
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
    setKind(product.kind || 'inventory');
    setCreditDelta(product.credit_delta?.toString() || '0');
    setStockQuantity(product.stock_quantity?.toString() || '0');
    setLowStockThreshold(product.low_stock_threshold?.toString() || '5');
    setXpBonus(product.xp_bonus?.toString() || '0');
    setMinSellPrice(product.min_sell_price?.toString() || '');
    setDiscountEligible(product.discount_eligible !== false);
  };

  const isLowStock = (product: Product) => 
    product.kind === 'inventory' && product.stock_quantity <= product.low_stock_threshold;

  const calculateMarginPercent = (sellPrice: number, buyPrice: number) => {
    if (buyPrice <= 0 || sellPrice <= 0) return 0;
    return Math.round((1 - buyPrice / sellPrice) * 100);
  };

  const getCategoryLabel = (cat: string) => 
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  const getKindIcon = (productKind: string) => {
    switch (productKind) {
      case 'service':
        return <Wrench className="w-5 h-5" />;
      case 'credit_topup':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getKindLabel = (productKind: string) => {
    return PRODUCT_KINDS.find(k => k.value === productKind)?.label || productKind;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sub-tabs: Items vs Movements */}
      <Tabs value={stockTab} onValueChange={setStockTab} className="w-full">
        <TabsList className="w-full h-auto p-1 rounded-xl mb-4">
          <TabsTrigger value="items" className="flex-1 gap-1.5 py-2 rounded-lg text-xs sm:text-sm">
            <Package className="w-4 h-4" />
            Položky
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex-1 gap-1.5 py-2 rounded-lg text-xs sm:text-sm">
            <History className="w-4 h-4" />
            Pohyby skladu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="mt-0">
          <StockMovementsTimeline />
        </TabsContent>

        <TabsContent value="items" className="mt-0 space-y-4 sm:space-y-6">
      <LowStockBanner
        products={lowStockProducts}
        expanded={bannerExpanded}
        onToggleExpand={() => setBannerExpanded(!bannerExpanded)}
        onShowLowStock={() => setActiveFilter('low_stock')}
      />

      {/* Search, filters, and actions */}
      <div className="space-y-3">
        <StockSearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMargin(!showMargin)}
            className="gap-2"
          >
            {showMargin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showMargin ? 'Skrýt marži' : 'Zobrazit marži'}</span>
          </Button>
           <div className="flex items-center gap-2">
             <StockExportButton />
             <StocktakingDialog />
             <StockReceiveDialog />
             <InvoiceImportDialog 
               trigger={
                 <Button variant="outline" size="sm" className="gap-2">
                   <FileText className="w-4 h-4" />
                   <span className="hidden sm:inline">Import faktury</span>
                 </Button>
               }
             />
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
                    <Label>Typ položky</Label>
                    <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            <div className="flex flex-col">
                              <span>{k.label}</span>
                              <span className="text-xs text-muted-foreground">{k.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kategorie</Label>
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
                  {kind === 'credit_topup' && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Label>Kredit k přičtení (Kč)</Label>
                      <Input
                        type="number"
                        value={creditDelta}
                        onChange={(e) => setCreditDelta(e.target.value)}
                        placeholder="1000"
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Částka kreditu, která se přičte klientovi po nákupu
                      </p>
                    </div>
                  )}
                  {kind === 'inventory' && (
                    <>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Min. prodejní cena (Kč)</Label>
                          <Input
                            type="number"
                            value={minSellPrice}
                            onChange={(e) => setMinSellPrice(e.target.value)}
                            placeholder="Volitelné"
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Sleva nemůže jít pod tuto cenu
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            checked={discountEligible}
                            onCheckedChange={setDiscountEligible}
                          />
                          <Label>Povolit slevy</Label>
                        </div>
                      </div>
                    </>
                  )}
                  {/* XP Bonus field */}
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <Label>XP Bonus při nákupu</Label>
                    </div>
                    <Input
                      type="number"
                      value={xpBonus}
                      onChange={(e) => setXpBonus(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Jednorázový XP bonus pro klienta při nákupu
                    </p>
                  </div>
                  {price && purchasePrice && parseFloat(purchasePrice) > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Marže:</p>
                      <p className="text-lg font-bold text-success">
                        {calculateMarginPercent(parseFloat(price), parseFloat(purchasePrice))}%
                      </p>
                    </div>
                  )}
                  <Button 
                    onClick={handleCreate} 
                    disabled={createProduct.isPending || (kind === 'credit_topup' && (!creditDelta || parseFloat(creditDelta) <= 0))} 
                    className="w-full"
                  >
                    Vytvořit položku
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Products list */}
      <div className="space-y-2">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={cn(
              "rounded-xl p-4 transition-all duration-200",
              "bg-card/80 backdrop-blur-md border border-border/50 shadow-sm",
              "hover:shadow-md",
              isLowStock(product) && product.is_active && "ring-1 ring-warning/50 border-warning/30",
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
                  <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {kind === 'credit_topup' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Kredit:</Label>
                    <Input
                      type="number"
                      value={creditDelta}
                      onChange={(e) => setCreditDelta(e.target.value)}
                      className="w-24"
                      placeholder="1000"
                    />
                    <span className="text-xs text-muted-foreground">Kč</span>
                  </div>
                )}
                {kind === 'inventory' && (
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
                {/* XP Bonus in edit mode */}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <Label className="text-xs whitespace-nowrap">XP:</Label>
                  <Input
                    type="number"
                    value={xpBonus}
                    onChange={(e) => setXpBonus(e.target.value)}
                    className="w-16"
                    min="0"
                  />
                </div>
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
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0",
                    product.kind === 'service' 
                      ? "bg-accent/10 text-accent"
                      : product.kind === 'credit_topup'
                        ? "bg-success/10 text-success"
                        : "bg-primary/10 text-primary"
                  )}>
                    {isLowStock(product) && product.is_active ? (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    ) : (
                      getKindIcon(product.kind || 'inventory')
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
                      {product.kind === 'credit_topup' && (
                        <Badge variant="outline" className="text-success border-success/50 text-xs">
                          +{(product.credit_delta || 0).toLocaleString('cs-CZ')} Kč kredit
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5 flex-wrap">
                      <span>{getKindLabel(product.kind || 'inventory')}</span>
                      <span>•</span>
                      <span>{getCategoryLabel(product.category)}</span>
                      {product.kind === 'inventory' && (
                        <>
                          <span>•</span>
                          <span className={cn(
                            isLowStock(product) && product.is_active && "text-warning font-medium"
                          )}>
                            {product.stock_quantity || 0} ks
                          </span>
                          {velocityMap?.[product.id] && velocityMap[product.id].daysRemaining !== null && (
                            <>
                              <span>•</span>
                              <span className={cn(
                                "tabular-nums",
                                velocityMap[product.id].daysRemaining! < 7 ? "text-destructive font-medium" :
                                velocityMap[product.id].daysRemaining! < 14 ? "text-warning font-medium" :
                                "text-muted-foreground"
                              )}>
                                ~{velocityMap[product.id].daysRemaining} dní
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
        
        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="card-floating rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            {products.length === 0 ? (
              <>
                <p className="text-muted-foreground font-medium">Zatím žádné položky</p>
                <Button 
                  className="mt-4 gap-2"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Přidat první položku
                </Button>
              </>
            ) : hasActiveFilters ? (
              <>
                <p className="text-muted-foreground font-medium">Žádné položky nevyhovují filtru</p>
                <Button 
                  variant="outline"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  Zrušit filtry
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground font-medium">Žádné položky</p>
            )}
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
