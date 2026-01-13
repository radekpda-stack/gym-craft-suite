import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPurchaseHistory, useClientPurchaseStats } from '@/hooks/useClientPurchaseHistory';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { ShoppingBag, Package, Calendar, CreditCard, Banknote, Wallet, Building2, Percent } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { motion } from 'framer-motion';

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
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

export default function ClientPortalPurchases() {
  const { clientId } = useClientPortal();
  const { data: purchases, isLoading } = useClientPurchaseHistory(clientId ?? undefined);
  const { data: stats, isLoading: statsLoading } = useClientPurchaseStats(clientId ?? undefined);
  const { trackPageMount } = useClientPortalPageTracking('client_portal_purchases');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  if (isLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Moje nákupy</h1>
          <p className="text-muted-foreground">Historie nákupů produktů</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Moje nákupy</h1>
        <p className="text-muted-foreground">Historie nákupů produktů</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Celkem utraceno</p>
                  <p className="text-xl font-bold">{formatCurrency(stats?.totalSpent || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Počet nákupů</p>
                  <p className="text-xl font-bold">{stats?.orderCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Purchase List */}
      {!purchases || purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Zatím žádné nákupy</h3>
            <p className="text-muted-foreground text-sm">
              Zde se zobrazí historie vašich nákupů produktů
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase, index) => {
            const PaymentIcon = PAYMENT_ICONS[purchase.paymentMethod] || CreditCard;
            
            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(purchase.date), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                        </span>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <PaymentIcon className="w-3 h-3" />
                        {PAYMENT_LABELS[purchase.paymentMethod] || purchase.paymentMethod}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-3">
                      {purchase.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span>{item.productName}</span>
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground">×{item.quantity}</span>
                            )}
                            {/* Item discount badge */}
                            {(item.discountAmount ?? 0) > 0 && (
                              <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success">
                                <Percent className="w-3 h-3" />
                                {item.discountType === 'percent' && item.discountValue
                                  ? `-${item.discountValue}%`
                                  : `-${formatCurrency(item.discountAmount)}`}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            {(item.discountAmount ?? 0) > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(item.total)}
                                </span>
                                <span className="font-medium text-success">
                                  {formatCurrency(item.totalAfterDiscount || item.total - item.discountAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium">{formatCurrency(item.total)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order-level discount */}
                    {(purchase.totalDiscount ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-sm py-2 border-t border-dashed">
                        <div className="flex items-center gap-2 text-success">
                          <Percent className="w-4 h-4" />
                          <span>
                            Sleva na objednávku
                            {purchase.orderDiscountType === 'percent' && purchase.orderDiscountValue
                              ? ` (${purchase.orderDiscountValue}%)`
                              : ''}
                          </span>
                        </div>
                        <span className="font-medium text-success">
                          -{formatCurrency(purchase.totalDiscount)}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="font-medium">Celkem</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(purchase.totalAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
