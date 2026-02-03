import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  History, 
  ChevronRight, 
  User, 
  Banknote, 
  CreditCard, 
  Wallet, 
  Building2,
  Loader2,
  Package,
  Sparkles,
  Tag,
  Search,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { SalesOrderDetailModal } from './SalesOrderDetailModal';

interface SalesOrder {
  id: string;
  client_id: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  products_subtotal: number;
  services_subtotal: number;
  total_discount: number;
  xp_earned: number;
  created_at: string;
  clients?: {
    id: string;
    name: string;
  } | null;
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

export function SalesHistory() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales_orders_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

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
          total_discount,
          xp_earned,
          created_at,
          clients (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SalesOrder[];
    },
  });

  // Filter orders based on search query - MUST be before any early returns
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase().trim();
    return orders.filter(order => {
      // Search by client name
      if (order.clients?.name?.toLowerCase().includes(query)) return true;
      // Search by payment method
      const paymentLabel = PAYMENT_LABELS[order.payment_method]?.toLowerCase();
      if (paymentLabel?.includes(query)) return true;
      // Search by amount
      if (order.total_amount.toString().includes(query)) return true;
      // Search by date
      const dateStr = format(new Date(order.created_at), 'd. MMMM yyyy', { locale: cs }).toLowerCase();
      if (dateStr.includes(query)) return true;
      
      return false;
    });
  }, [orders, searchQuery]);

  // Group orders by date - MUST be before any early returns
  const groupedOrders = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(order);
      return acc;
    }, {} as Record<string, SalesOrder[]>);
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="card-floating">
        <CardContent className="py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <History className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Zatím žádné prodeje</h3>
          <p className="text-muted-foreground text-sm">
            Zde se zobrazí historie vašich prodejů
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Hledat dle klienta, data, částky..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "pl-9 pr-9 bg-card/60 backdrop-blur-sm border-border/50",
            "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "transition-all duration-200"
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* No results message */}
      {filteredOrders.length === 0 && searchQuery && (
        <Card className="card-floating">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Žádné výsledky pro "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-380px)] pr-2">
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([date, dayOrders]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-md py-2 px-3 rounded-lg z-10 border border-border/30">
                {format(new Date(date), 'EEEE d. MMMM yyyy', { locale: cs })}
              </h3>
              <div className="space-y-2">
                {dayOrders.map((order) => {
                  const PaymentIcon = PAYMENT_ICONS[order.payment_method] || Banknote;
                  const hasDiscount = order.total_discount > 0;
                  const hasXP = order.xp_earned > 0;

                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all duration-200",
                        "bg-card/80 backdrop-blur-md border border-border/50 shadow-sm",
                        "hover:shadow-md hover:-translate-y-0.5",
                        "flex items-center gap-4"
                      )}
                    >
                      {/* Payment icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PaymentIcon className="w-5 h-5 text-primary" />
                      </div>

                      {/* Order info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {order.clients ? (
                            <span className="font-medium truncate">{order.clients.name}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Bez klienta</span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-secondary/50">
                            {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(new Date(order.created_at), 'HH:mm')}</span>
                          {hasDiscount && (
                            <span className="flex items-center gap-1 text-destructive font-medium">
                              <Tag className="w-3 h-3" />
                              -{formatCurrency(order.total_discount)}
                            </span>
                          )}
                          {hasXP && (
                            <span className="flex items-center gap-1 text-warning font-medium">
                              <Sparkles className="w-3 h-3" />
                              +{order.xp_earned} XP
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg tabular-nums">
                          {formatCurrency(order.total_amount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Order Detail Modal */}
      <SalesOrderDetailModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </>
  );
}
