import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  History,
  Banknote,
  CreditCard,
  Wallet,
  Building2,
  Search,
  X,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { SalesOrderDetailModal } from './SalesOrderDetailModal';
import { ClientAvatar, SalesChipFilter, SalesEmptyState, SalesListSkeleton } from './ui/SalesUI';

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
  sales_order_items?: { name_snapshot: string }[];
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

type PeriodValue = 'today' | '7d' | '30d' | 'custom';

const PERIOD_FILTERS: { value: PeriodValue; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: '7d', label: '7 dní' },
  { value: '30d', label: '30 dní' },
  { value: 'custom', label: 'Vlastní rozsah' },
];

const PAGE_SIZE = 50;

export function SalesHistory() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodValue>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales_orders_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`id, client_id, total_amount, payment_method, payment_status, products_subtotal, services_subtotal, total_discount, xp_earned, created_at, clients (id, name), sales_order_items (name_snapshot)`)
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

    // Period filter
    const now = new Date();
    if (periodFilter === 'today') {
      const cutoff = startOfDay(now);
      result = result.filter(o => isAfter(new Date(o.created_at), cutoff));
    } else if (periodFilter === '7d') {
      const cutoff = startOfDay(subDays(now, 7));
      result = result.filter(o => isAfter(new Date(o.created_at), cutoff));
    } else if (periodFilter === '30d') {
      const cutoff = startOfDay(subDays(now, 30));
      result = result.filter(o => isAfter(new Date(o.created_at), cutoff));
    } else if (periodFilter === 'custom' && (customFrom || customTo)) {
      const from = customFrom ? startOfDay(new Date(customFrom)) : null;
      const to = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : null;
      result = result.filter(o => {
        const d = new Date(o.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // Search (client or product name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(order => {
        if (order.clients?.name?.toLowerCase().includes(query)) return true;
        if (order.sales_order_items?.some(i => i.name_snapshot.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    return result;
  }, [orders, searchQuery, periodFilter, customFrom, customTo]);

  const visibleOrders = useMemo(() => filteredOrders.slice(0, visibleCount), [filteredOrders, visibleCount]);

  const groupedOrders = useMemo(() => {
    const groups: { date: string; orders: SalesOrder[] }[] = [];
    const map = new Map<string, SalesOrder[]>();
    for (const order of visibleOrders) {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd');
      if (!map.has(date)) {
        map.set(date, []);
        groups.push({ date, orders: map.get(date)! });
      }
      map.get(date)!.push(order);
    }
    return groups;
  }, [visibleOrders]);

  const itemsSummary = (order: SalesOrder) => {
    const names = order.sales_order_items?.map(i => i.name_snapshot) ?? [];
    if (names.length === 0) return 'Bez položek';
    if (names.length === 1) return names[0];
    return `${names[0]} + ${names.length - 1} další`;
  };

  if (isLoading) {
    return <SalesListSkeleton count={6} />;
  }

  if (!orders || orders.length === 0) {
    return (
      <SalesEmptyState
        icon={History}
        title="Zatím žádné prodeje"
        description="Zde se zobrazí historie vašich prodejů"
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="space-y-2.5 mb-4">
        <SalesChipFilter options={PERIOD_FILTERS} value={periodFilter} onChange={(v) => setPeriodFilter(v as PeriodValue)} />

        {periodFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-card/60 backdrop-blur-sm border-border/50 h-11"
            />
            <span className="text-xs text-muted-foreground shrink-0">do</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-card/60 backdrop-blur-sm border-border/50 h-11"
            />
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Hledat dle klienta nebo produktu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-card/60 backdrop-blur-sm border-border/50 h-11"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* No results */}
      {filteredOrders.length === 0 ? (
        <SalesEmptyState
          icon={Search}
          title="Žádné výsledky"
          description="Zkuste upravit filtry nebo hledaný výraz"
        />
      ) : (
        <div className="space-y-5">
          {groupedOrders.map(({ date, orders: dayOrders }) => {
            const dayTotal = dayOrders.reduce((s, o) => s + o.total_amount, 0);
            return (
              <div key={date}>
                <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 mb-2 bg-background/80 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold capitalize text-foreground truncate">
                      {format(new Date(date), 'EEEE d. MMMM', { locale: cs })}
                    </h3>
                    <span className="text-xs sm:text-sm font-bold tabular-nums text-muted-foreground shrink-0">
                      {formatCurrency(dayTotal)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {dayOrders.map((order) => {
                    const PaymentIcon = PAYMENT_ICONS[order.payment_method] || Banknote;
                    const isUnpaid = order.payment_status !== 'completed';

                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          'w-full p-3 rounded-2xl text-left transition-all duration-200 min-h-[44px]',
                          'bg-card border border-border/50 shadow-sm press-feedback',
                          'flex items-center gap-3',
                          isUnpaid && 'border-l-2 border-l-destructive'
                        )}
                      >
                        <ClientAvatar name={order.clients?.name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">
                              {order.clients?.name || 'Bez klienta'}
                            </span>
                            {isUnpaid && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                                Nezaplaceno
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {itemsSummary(order)} · {format(new Date(order.created_at), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-sm sm:text-base tabular-nums">
                            {formatCurrency(order.total_amount)}
                          </span>
                          <div className="w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center" title={PAYMENT_LABELS[order.payment_method]}>
                            <PaymentIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {visibleCount < filteredOrders.length && (
            <div className="flex justify-center py-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
                <ChevronDown className="w-4 h-4" />
                Načíst další ({filteredOrders.length - visibleCount} zbývá)
              </Button>
            </div>
          )}
        </div>
      )}

      <SalesOrderDetailModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
      />
    </>
  );
}
