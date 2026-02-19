import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Package, 
  Wrench, 
  Coins, 
  Tag, 
  Sparkles,
  User,
  Banknote,
  CreditCard,
  Wallet,
  Building2,
  Pencil,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { EditSalesOrderDialog } from './EditSalesOrderDialog';

interface SalesOrderDetailModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItem {
  id: string;
  name_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  product_kind: string;
  line_discount_type: string | null;
  line_discount_value: number | null;
  line_discount_amount: number | null;
  line_total_after_discount: number | null;
  payment_method: string | null;
  product_id: string | null;
  products?: { purchase_price: number | null } | null;
}

interface OrderDetail {
  id: string;
  client_id: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  products_subtotal: number;
  services_subtotal: number;
  order_discount_type: string | null;
  order_discount_value: number | null;
  order_discount_amount: number | null;
  total_discount: number;
  xp_earned: number;
  note: string | null;
  created_at: string;
  clients?: {
    id: string;
    name: string;
  } | null;
  sales_order_items: OrderItem[];
}

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  credit: Wallet,
  bank: Building2,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Hotově',
  card: 'Kartou',
  credit: 'Kredit',
  bank: 'Převodem',
};

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  service: Wrench,
  credit_topup: Coins,
};

export function SalesOrderDetailModal({ orderId, open, onOpenChange }: SalesOrderDetailModalProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { data: order, isLoading } = useQuery({
    queryKey: ['sales_order_detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          client_id,
          total_amount,
          payment_method,
          payment_status,
          products_subtotal,
          services_subtotal,
          order_discount_type,
          order_discount_value,
          order_discount_amount,
          total_discount,
          xp_earned,
          note,
          created_at,
          clients (
            id,
            name
          ),
          sales_order_items (
            id,
            name_snapshot,
            unit_price,
            quantity,
            line_total,
            product_kind,
            line_discount_type,
            line_discount_value,
            line_discount_amount,
            line_total_after_discount,
            payment_method,
            product_id,
            products (
              purchase_price
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as OrderDetail;
    },
    enabled: !!orderId && open,
  });

  const PaymentIcon = order ? PAYMENT_ICONS[order.payment_method] || Banknote : Banknote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detail objednávky
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {order.clients?.name || 'Bez klienta'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "d. MMMM yyyy 'v' HH:mm", { locale: cs })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <PaymentIcon className="w-3 h-3" />
                  {PAYMENT_LABELS[order.payment_method]}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Položky</h4>
              {order.sales_order_items.map((item) => {
                const KindIcon = KIND_ICONS[item.product_kind] || Package;
                const hasDiscount = item.line_discount_amount && item.line_discount_amount > 0;
                const purchasePrice = item.products?.purchase_price ?? 0;
                const itemRevenue = item.line_total_after_discount ?? item.line_total;
                const itemCost = purchasePrice * item.quantity;
                const itemProfit = itemRevenue - itemCost;
                const itemMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mt-0.5">
                      <KindIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground truncate">{item.name_snapshot}</p>
                        {item.payment_method && item.payment_method !== order.payment_method && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                            {(() => {
                              const ItemPaymentIcon = PAYMENT_ICONS[item.payment_method] || Banknote;
                              return (
                                <span className="flex items-center gap-1">
                                  <ItemPaymentIcon className="w-3 h-3" />
                                  {PAYMENT_LABELS[item.payment_method]}
                                </span>
                              );
                            })()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatCurrency(item.unit_price)} × {item.quantity}</span>
                        {hasDiscount && (
                          <span className="text-destructive flex items-center gap-0.5">
                            <Tag className="w-3 h-3" />
                            -{item.line_discount_type === 'percent' 
                              ? `${item.line_discount_value}%` 
                              : formatCurrency(item.line_discount_amount || 0)}
                          </span>
                        )}
                      </div>
                      {/* Per-item profitability */}
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          Náklad: {formatCurrency(itemCost)}
                        </span>
                        <span className={cn(
                          'font-medium flex items-center gap-0.5',
                          itemProfit >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {itemProfit >= 0 
                            ? <TrendingUp className="w-3 h-3" /> 
                            : <TrendingDown className="w-3 h-3" />}
                          Zisk: {formatCurrency(itemProfit)} ({itemMargin.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {hasDiscount ? (
                        <div>
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(item.line_total)}
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(item.line_total_after_discount || item.line_total)}
                          </p>
                        </div>
                      ) : (
                        <p className="font-semibold text-foreground">{formatCurrency(item.line_total)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-2">
              {order.products_subtotal > 0 && order.services_subtotal > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Produkty</span>
                    <span>{formatCurrency(order.products_subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Služby</span>
                    <span>{formatCurrency(order.services_subtotal)}</span>
                  </div>
                </>
              )}

              {order.total_discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Celková sleva
                  </span>
                  <span className="text-destructive">-{formatCurrency(order.total_discount)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-lg text-foreground">
                <span>Celkem</span>
                <span className="text-primary">{formatCurrency(order.total_amount)}</span>
              </div>

              {order.xp_earned > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-warning" />
                    Získané XP
                  </span>
                  <span className="text-warning font-medium">+{order.xp_earned} XP</span>
                </div>
              )}
            </div>

            {/* Profitability section */}
            {(() => {
              const totalCost = order.sales_order_items.reduce((sum, item) => {
                const purchasePrice = item.products?.purchase_price ?? 0;
                return sum + purchasePrice * item.quantity;
              }, 0);
              const totalRevenue = order.total_amount;
              const grossProfit = totalRevenue - totalCost;
              const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
              const isProfit = grossProfit >= 0;

              return (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Ziskovost prodeje
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Náklady */}
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Náklady</span>
                        </div>
                        <p className="text-base font-bold text-foreground">{formatCurrency(totalCost)}</p>
                      </div>
                      {/* Tržba */}
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Tržba</span>
                        </div>
                        <p className="text-base font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                      </div>
                      {/* Hrubý zisk */}
                      <div className={cn(
                        'rounded-lg p-3',
                        isProfit ? 'bg-success/10' : 'bg-destructive/10'
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {isProfit 
                            ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                            : <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                          }
                          <span className="text-xs text-muted-foreground">Hrubý zisk</span>
                        </div>
                        <p className={cn(
                          'text-base font-bold',
                          isProfit ? 'text-success' : 'text-destructive'
                        )}>
                          {isProfit ? '+' : ''}{formatCurrency(grossProfit)}
                        </p>
                      </div>
                      {/* Marže */}
                      <div className={cn(
                        'rounded-lg p-3',
                        isProfit ? 'bg-success/10' : 'bg-destructive/10'
                      )}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Marže</span>
                        </div>
                        <p className={cn(
                          'text-base font-bold',
                          isProfit ? 'text-success' : 'text-destructive'
                        )}>
                          {margin.toFixed(1)} %
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {order.note && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Poznámka</h4>
                  <p className="text-sm">{order.note}</p>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
      
      {/* Edit Dialog */}
      {order && (
        <EditSalesOrderDialog
          order={order}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </Dialog>
  );
}
