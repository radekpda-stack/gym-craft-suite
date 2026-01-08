import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Banknote, 
  CreditCard, 
  Wallet, 
  Building2,
  Save,
  Package,
  Wrench,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface EditSalesOrderDialogProps {
  order: {
    id: string;
    payment_method: string;
    total_amount: number;
    sales_order_items: {
      id: string;
      name_snapshot: string;
      unit_price: number;
      quantity: number;
      line_total: number;
      line_total_after_discount: number | null;
      product_kind: string;
      payment_method: string | null;
    }[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'card', label: 'Kartou', icon: CreditCard },
  { value: 'credit', label: 'Kredit', icon: Wallet },
  { value: 'bank', label: 'Převodem', icon: Building2 },
];

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  service: Wrench,
  credit_topup: Coins,
};

export function EditSalesOrderDialog({ order, open, onOpenChange }: EditSalesOrderDialogProps) {
  const queryClient = useQueryClient();
  
  // State for order-level payment method
  const [orderPaymentMethod, setOrderPaymentMethod] = useState(order?.payment_method || 'cash');
  
  // State for per-item payment methods (null means use order-level)
  const [itemPaymentMethods, setItemPaymentMethods] = useState<Record<string, string | null>>({});
  
  // Track if we're using split payment (per-item)
  const [useSplitPayment, setUseSplitPayment] = useState(false);

  // Initialize state when order changes
  useEffect(() => {
    if (order) {
      setOrderPaymentMethod(order.payment_method);
      
      // Check if any item has a custom payment method
      const hasCustomPayments = order.sales_order_items.some(item => item.payment_method !== null);
      setUseSplitPayment(hasCustomPayments);
      
      // Initialize item payment methods
      const methods: Record<string, string | null> = {};
      order.sales_order_items.forEach(item => {
        methods[item.id] = item.payment_method;
      });
      setItemPaymentMethods(methods);
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order');

      // Build item payments array for split payments
      const itemPayments = useSplitPayment
        ? order.sales_order_items.map(item => ({
            itemId: item.id,
            paymentMethod: itemPaymentMethods[item.id] || orderPaymentMethod
          }))
        : null;

      // Call the RPC function that handles credit recalculation
      const { data, error } = await supabase.rpc('rpc_update_sale_payment', {
        p_order_id: order.id,
        p_order_payment_method: orderPaymentMethod,
        p_item_payments: itemPayments
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; credit_diff?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Nepodařilo se aktualizovat objednávku');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders_history'] });
      queryClient.invalidateQueries({ queryKey: ['sales_order_detail', order?.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-purchase-history'] });
      
      const creditDiff = (result as any)?.credit_diff || 0;
      if (creditDiff !== 0) {
        toast.success(`Objednávka aktualizována. Kredit ${creditDiff < 0 ? 'stržen' : 'vrácen'}: ${formatCurrency(Math.abs(creditDiff))}`);
      } else {
        toast.success('Objednávka byla aktualizována');
      }
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Nepodařilo se aktualizovat objednávku');
    },
  });

  const handleItemPaymentChange = (itemId: string, method: string) => {
    setItemPaymentMethods(prev => ({
      ...prev,
      [itemId]: method
    }));
  };

  // Calculate payment summary
  const getPaymentSummary = () => {
    if (!order || !useSplitPayment) return null;

    const summary: Record<string, number> = {};
    order.sales_order_items.forEach(item => {
      const method = itemPaymentMethods[item.id] || orderPaymentMethod;
      const amount = item.line_total_after_discount ?? item.line_total;
      summary[method] = (summary[method] || 0) + amount;
    });

    return summary;
  };

  const paymentSummary = getPaymentSummary();

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit platební metodu</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order-level payment method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {useSplitPayment ? 'Výchozí platební metoda' : 'Platební metoda'}
            </Label>
            <RadioGroup
              value={orderPaymentMethod}
              onValueChange={setOrderPaymentMethod}
              className="grid grid-cols-2 gap-2"
            >
              {PAYMENT_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                    orderPaymentMethod === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <option.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Split payment toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Rozdělit platbu po položkách</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Každá položka může mít jinou platební metodu
              </p>
            </div>
            <Button
              variant={useSplitPayment ? "default" : "outline"}
              size="sm"
              onClick={() => setUseSplitPayment(!useSplitPayment)}
            >
              {useSplitPayment ? 'Aktivní' : 'Aktivovat'}
            </Button>
          </div>

          {/* Per-item payment methods */}
          {useSplitPayment && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Platba podle položek</Label>
              <div className="space-y-2">
                {order.sales_order_items.map(item => {
                  const KindIcon = KIND_ICONS[item.product_kind] || Package;
                  const currentMethod = itemPaymentMethods[item.id] || orderPaymentMethod;
                  const CurrentPaymentIcon = PAYMENT_OPTIONS.find(o => o.value === currentMethod)?.icon || Banknote;
                  const amount = item.line_total_after_discount ?? item.line_total;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-secondary/30 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <KindIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name_snapshot}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(amount)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {PAYMENT_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleItemPaymentChange(item.id, option.value)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                              currentMethod === option.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/80"
                            )}
                          >
                            <option.icon className="w-3 h-3" />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment summary */}
          {useSplitPayment && paymentSummary && Object.keys(paymentSummary).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Souhrn plateb</Label>
                <div className="space-y-1.5">
                  {Object.entries(paymentSummary).map(([method, amount]) => {
                    const option = PAYMENT_OPTIONS.find(o => o.value === method);
                    if (!option) return null;
                    return (
                      <div key={method} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between font-bold">
                    <span>Celkem</span>
                    <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
