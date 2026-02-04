/**
 * TrainingQuickSale - Collapsible quick sale section for training card
 * Allows trainers to sell products to participants directly from training detail
 */
import { useState, useCallback, useMemo } from 'react';
import { 
  Package, 
  ChevronDown,
  Plus, 
  Minus, 
  X, 
  Loader2,
  Banknote, 
  CreditCard, 
  Wallet,
  Building2,
  PackageX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProductsSortedBySales } from '@/hooks/useProductsSortedBySales';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { processSaleWithDiscount, showSaleResultToast, PaymentMethod } from '@/services/saleProcessor';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/hooks/useProducts';

interface Participant {
  client_id: string;
  name: string;
}

interface TrainingQuickSaleProps {
  trainingId: string;
  participants: Participant[];
  primaryClientId: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', shortLabel: 'Hot.', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kred.', icon: Wallet },
  { value: 'card', label: 'Kartou', shortLabel: 'Kart.', icon: CreditCard },
  { value: 'bank', label: 'Převod', shortLabel: 'Přev.', icon: Building2 },
];

export function TrainingQuickSale({ 
  trainingId,
  participants, 
  primaryClientId 
}: TrainingQuickSaleProps) {
  const queryClient = useQueryClient();
  
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    participants.length === 1 ? participants[0].client_id : primaryClientId
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hooks
  const { data: allProducts = [], isLoading: productsLoading } = useProductsSortedBySales(true);
  const cart = useSalesCartWithDiscount({ clientId: selectedParticipantId });
  const { data: sharedBudget } = useSharedBudgetBalance(selectedParticipantId);
  
  // Filter products - only inventory and service, no credit_topup
  const products = useMemo(() => 
    allProducts.filter(p => p.kind !== 'credit_topup'),
    [allProducts]
  );
  
  // Get effective balance for selected participant
  const effectiveBalance = sharedBudget?.displayBalance ?? 0;
  
  // Selected participant data
  const selectedParticipant = participants.find(p => p.client_id === selectedParticipantId);
  
  // Add product to cart
  const handleAddProduct = useCallback((product: Product) => {
    cart.addItem(product, 1);
  }, [cart]);
  
  // Process sale
  const handleSale = useCallback(async () => {
    if (!selectedParticipantId || cart.isEmpty) return;
    if (!cart.validation.isValid) return;
    
    setIsProcessing(true);
    try {
      const result = await processSaleWithDiscount({
        clientId: selectedParticipantId,
        paymentMethod,
        items: cart.items,
        orderDiscount: cart.orderDiscount,
      });
      
      showSaleResultToast(result, cart.totals.totalAfterDiscount);
      
      if (result.success) {
        cart.clear();
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['products_sorted_by_sales'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['clients'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['sales_orders'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', selectedParticipantId], refetchType: 'all' });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedParticipantId, cart, paymentMethod, queryClient]);
  
  // Don't render if no participants
  if (participants.length === 0) return null;
  
  return (
    <div className="relative rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors touch-target"
      >
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Rychlý prodej</span>
          {cart.totals.itemCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {cart.totals.itemCount}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180'
          )} 
        />
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Participant Selector - only if multiple */}
              {participants.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Komu?</Label>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((participant) => (
                      <button
                        key={participant.client_id}
                        onClick={() => setSelectedParticipantId(participant.client_id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          "border focus:outline-none focus:ring-2 focus:ring-primary/50",
                          selectedParticipantId === participant.client_id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card/50 text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                        )}
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected participant info */}
              {selectedParticipant && paymentMethod === 'credit' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 text-xs">
                  <span className="text-muted-foreground">Kredit {selectedParticipant.name}:</span>
                  <span className={cn(
                    "font-semibold",
                    effectiveBalance < 0 ? "text-destructive" : 
                    effectiveBalance < 500 ? "text-warning" : "text-success"
                  )}>
                    {formatCurrency(effectiveBalance)}
                  </span>
                </div>
              )}
              
              {/* Products Grid */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Produkty</Label>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <PackageX className="w-8 h-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Žádné produkty k prodeji</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {products.map((product) => {
                      const inCart = cart.hasItem(product.id);
                      const isOutOfStock = product.kind === 'inventory' && product.stock_quantity <= 0;
                      
                      return (
                        <button
                          key={product.id}
                          onClick={() => !isOutOfStock && handleAddProduct(product)}
                          disabled={isOutOfStock}
                          className={cn(
                            "relative flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all duration-200",
                            "border focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 overflow-hidden",
                            isOutOfStock
                              ? "opacity-50 cursor-not-allowed border-border/30 bg-secondary/20"
                              : inCart
                                ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                                : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-border"
                          )}
                        >
                          <span className="text-xs font-medium text-foreground truncate w-full">
                            {product.name}
                          </span>
                          <span className="text-xs text-primary font-semibold">
                            {formatCurrency(product.price)}
                          </span>
                          {product.kind === 'inventory' && (
                            <span className={cn(
                              "text-[10px]",
                              product.stock_quantity <= (product.low_stock_threshold || 5)
                                ? "text-warning"
                                : "text-muted-foreground"
                            )}>
                              {product.stock_quantity} ks
                            </span>
                          )}
                          {inCart && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary-foreground">
                                {cart.getItem(product.id)?.quantity}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Cart */}
              {!cart.isEmpty && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Košík ({cart.totals.itemCount})</Label>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {cart.items.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-2.5 bg-secondary/30">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{item.product.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(item.product.price)} × {item.quantity} = {' '}
                            <span className="font-medium text-foreground">
                              {formatCurrency(item.product.price * item.quantity)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => cart.decrementQuantity(item.product.id)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => cart.incrementQuantity(item.product.id)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => cart.removeItem(item.product.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Payment Methods */}
              {!cart.isEmpty && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Platba</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.value;
                      
                      return (
                        <button
                          key={method.value}
                          onClick={() => setPaymentMethod(method.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border/50 hover:border-border hover:bg-secondary/30"
                          )}
                        >
                          <Icon className={cn(
                            "w-4 h-4",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "text-[10px] font-medium",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}>
                            <span className="hidden sm:inline">{method.label}</span>
                            <span className="sm:hidden">{method.shortLabel}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Validation Errors */}
              {!cart.validation.isValid && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                  {cart.validation.errors.map((error, idx) => (
                    <p key={idx} className="text-xs text-destructive">
                      {error.productName}: {error.message}
                    </p>
                  ))}
                </div>
              )}
              
              {/* Total & Submit */}
              {!cart.isEmpty && (
                <div className="space-y-3">
                  {/* Credit balance preview */}
                  {paymentMethod === 'credit' && selectedParticipant && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                      <span className="text-muted-foreground">Nový zůstatek:</span>
                      <span className={cn(
                        "font-semibold",
                        (effectiveBalance - cart.totals.totalAfterDiscount) < 0 
                          ? "text-destructive" 
                          : "text-foreground"
                      )}>
                        {formatCurrency(effectiveBalance - cart.totals.totalAfterDiscount)}
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSale}
                    disabled={cart.isEmpty || isProcessing || !cart.validation.isValid}
                    className="w-full h-11"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Package className="w-4 h-4 mr-2" />
                    )}
                    {isProcessing 
                      ? 'Zpracovávám...' 
                      : `Prodat ${formatCurrency(cart.totals.totalAfterDiscount)}`
                    }
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
