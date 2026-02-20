import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  History, 
  ChevronRight, 
  Banknote, 
  CreditCard, 
  Wallet, 
  Building2,
  Loader2,
  Package,
  Sparkles,
  Tag,
  Search,
  X,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  clients?: { id: string; name: string } | null;
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

const PAYMENT_FILTERS = [
  { value: 'all', label: 'Vše' },
  { value: 'cash', label: 'Hotově' },
  { value: 'card', label: 'Kartou' },
  { value: 'credit', label: 'Kredit' },
  { value: 'bank', label: 'Převodem' },
];

const PERIOD_FILTERS = [
  { value: 'all', label: 'Vše' },
  { value: 'today', label: 'Dnes' },
  { value: 'week', label: 'Tento týden' },
  { value: 'month', label: 'Tento měsíc' },
];

const PAGE_SIZE = 50;

export function SalesHistory() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales_orders_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`id, client_id, total_amount, payment_method, payment_status, products_subtotal, services_subtotal, total_discount, xp_earned, created_at, clients (id, name)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as SalesOrder[];
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = orders;

    // Payment filter
    if (paymentFilter !== 'all') {
      result = result.filter(o => o.payment_method === paymentFilter);
    }

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (periodFilter) {
        case 'today': cutoff = startOfDay(now); break;
        case 'week': cutoff = startOfWeek(now, { weekStartsOn: 1 }); break;
        case 'month': cutoff = startOfMonth(now); break;
        default: cutoff = new Date(0);
      }
      result = result.filter(o => new Date(o.created_at) >= cutoff);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(order => {
        if (order.clients?.name?.toLowerCase().includes(query)) return true;
        if (PAYMENT_LABELS[order.payment_method]?.toLowerCase().includes(query)) return true;
        if (order.total_amount.toString().includes(query)) return true;
        const dateStr = format(new Date(order.created_at), 'd. MMMM yyyy', { locale: cs }).toLowerCase();
        if (dateStr.includes(query)) return true;
        return false;
      });
    }

    return result;
  }, [orders, searchQuery, paymentFilter, periodFilter]);

  // Summary
  const summary = useMemo(() => ({
    count: filteredOrders.length,
    total: filteredOrders.reduce((s, o) => s + o.total_amount, 0),
  }), [filteredOrders]);

  const visibleOrders = useMemo(() => filteredOrders.slice(0, visibleCount), [filteredOrders, visibleCount]);

  const groupedOrders = useMemo(() => {
    return visibleOrders.reduce((acc, order) => {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {} as Record<string, SalesOrder[]>);
  }, [visibleOrders]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="card-floating rounded-xl py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
          <History className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Zatím žádné prodeje</h3>
        <p className="text-muted-foreground text-sm">Zde se zobrazí historie vašich prodejů</p>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="space-y-3 mb-4">
        {/* Payment method chips */}
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={paymentFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => setPaymentFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Period chips */}
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={periodFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => setPeriodFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Hledat dle klienta, data, částky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-card/60 backdrop-blur-sm border-border/50"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
        <Badge variant="secondary" className="text-xs">{summary.count} {summary.count === 1 ? 'prodej' : summary.count < 5 ? 'prodeje' : 'prodejů'}</Badge>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(summary.total)}</span>
      </div>

      {/* No results */}
      {filteredOrders.length === 0 && (
        <div className="card-floating rounded-xl py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Žádné výsledky</p>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-480px)] pr-2">
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([date, dayOrders]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 mb-3">
                <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-semibold capitalize">
                      {format(new Date(date), 'EEEE d. MMMM yyyy', { locale: cs })}
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-secondary/50">
                    {dayOrders.length} {dayOrders.length === 1 ? 'prodej' : dayOrders.length < 5 ? 'prodeje' : 'prodejů'}
                  </Badge>
                </div>
              </div>
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
                        "flex items-center gap-3 sm:gap-4"
                      )}
                    >
                      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PaymentIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
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
                              <Tag className="w-3 h-3" />-{formatCurrency(order.total_discount)}
                            </span>
                          )}
                          {hasXP && (
                            <span className="flex items-center gap-1 text-warning font-medium">
                              <Sparkles className="w-3 h-3" />+{order.xp_earned} XP
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className="font-bold text-base sm:text-lg tabular-nums">{formatCurrency(order.total_amount)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {visibleCount < filteredOrders.length && (
          <div className="flex justify-center py-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
              <ChevronDown className="w-4 h-4" />
              Načíst další ({filteredOrders.length - visibleCount} zbývá)
            </Button>
          </div>
        )}
      </ScrollArea>

      <SalesOrderDetailModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </>
  );
}
