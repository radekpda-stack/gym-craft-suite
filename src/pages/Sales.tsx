import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  ShoppingCart, 
  Banknote, 
  Wallet, 
  CreditCard, 
  Filter,
  Package,
  User,
  Calendar,
  Edit2,
  Check,
  X,
  Loader2,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useProductSales, 
  useUpdateTransactionPaymentMethod,
  PaymentMethod 
} from '@/hooks/useCreditTransactions';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { formatCurrency } from '@/lib/formatters';

const PAYMENT_METHODS: { value: PaymentMethod | 'all'; label: string; shortLabel?: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Všechny platby', shortLabel: 'Vše' },
  { value: 'cash', label: 'Hotově', shortLabel: 'Hot.', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kred.', icon: Wallet },
  { value: 'card', label: 'Kartou', shortLabel: 'Kart.', icon: CreditCard },
];

const getPaymentMethodIcon = (method: PaymentMethod | null) => {
  switch (method) {
    case 'cash':
      return Banknote;
    case 'credit':
      return Wallet;
    case 'card':
      return CreditCard;
    default:
      return Wallet;
  }
};

const getPaymentMethodLabel = (method: PaymentMethod | null) => {
  switch (method) {
    case 'cash':
      return 'Hotově';
    case 'credit':
      return 'Z kreditu';
    case 'card':
      return 'Kartou';
    default:
      return 'Z kreditu';
  }
};

const getPaymentMethodShortLabel = (method: PaymentMethod | null) => {
  switch (method) {
    case 'cash':
      return 'Hot.';
    case 'credit':
      return 'Kred.';
    case 'card':
      return 'Kart.';
    default:
      return 'Kred.';
  }
};

export default function Sales() {
  usePageTracking('sales');
  
  const { data: sales = [], isLoading } = useProductSales();
  const updatePaymentMethod = useUpdateTransactionPaymentMethod();
  
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');
  const [newSaleOpen, setNewSaleOpen] = useState(false);

  const filteredSales = useMemo(() => {
    if (paymentFilter === 'all') return sales;
    return sales.filter(sale => (sale.payment_method || 'credit') === paymentFilter);
  }, [sales, paymentFilter]);

  const handleEditStart = (saleId: string, currentMethod: PaymentMethod | null) => {
    setEditingId(saleId);
    setEditPaymentMethod(currentMethod || 'credit');
  };

  const handleEditSave = async (sale: any) => {
    await updatePaymentMethod.mutateAsync({
      id: sale.id,
      clientId: sale.client_id,
      amount: sale.amount,
      oldPaymentMethod: sale.payment_method,
      newPaymentMethod: editPaymentMethod,
    });
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Stats
  const stats = useMemo(() => {
    const totalSales = sales.length;
    const cashSales = sales.filter(s => s.payment_method === 'cash').length;
    const creditSales = sales.filter(s => s.payment_method === 'credit' || !s.payment_method).length;
    const cardSales = sales.filter(s => s.payment_method === 'card').length;
    const totalAmount = sales.reduce((sum, s) => sum + Math.abs(s.amount), 0);
    
    return { totalSales, cashSales, creditSales, cardSales, totalAmount };
  }, [sales]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Prodeje</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            <span className="hidden sm:inline">Přehled a správa prodejů produktů</span>
            <span className="sm:hidden">Správa prodejů</span>
          </p>
        </div>
        {/* Desktop button - hidden on mobile, replaced by FAB */}
        <Button onClick={() => setNewSaleOpen(true)} className="gap-2 hidden sm:flex">
          <Plus className="w-4 h-4" />
          Nový prodej
        </Button>
      </div>

      {/* New Sale Dialog */}
      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />

      {/* Compact Stats Row */}
      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
        <span><strong className="text-foreground">{stats.totalSales}</strong> prodejů</span>
        <span className="text-border">•</span>
        <span><strong className="text-foreground">{formatCurrency(stats.totalAmount)}</strong></span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentMethod | 'all')}>
          <SelectTrigger className="w-full xs:w-[160px] sm:w-[180px] h-10 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                <div className="flex items-center gap-2">
                  {method.icon && <method.icon className="w-4 h-4" />}
                  {method.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          {filteredSales.length} položek
        </span>
      </div>

      {/* Sales List */}
      {filteredSales.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {filteredSales.map((sale) => {
            const PaymentIcon = getPaymentMethodIcon(sale.payment_method as PaymentMethod | null);
            const isEditing = editingId === sale.id;
            
            return (
              <div
                key={sale.id}
                className="glass rounded-xl p-3 sm:p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:gap-3">
                  {/* Product info + price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1 min-w-0">
                      <Package className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground text-sm sm:text-base truncate">
                        {sale.products?.name || sale.description || 'Produkt'}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(Math.abs(sale.amount))}
                    </span>
                  </div>
                  
                  {/* Client + date */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <Link 
                      to={`/clients/${sale.client_id}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="truncate max-w-[120px] sm:max-w-none">
                        {sale.clients?.name || 'Neznámý'}
                      </span>
                    </Link>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {format(new Date(sale.created_at), 'd.M. HH:mm', { locale: cs })}
                    </span>
                  </div>
                  
                  {/* Payment badge + edit */}
                  <div className="flex items-center justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <Select 
                          value={editPaymentMethod} 
                          onValueChange={(v) => setEditPaymentMethod(v as PaymentMethod)}
                        >
                          <SelectTrigger className="flex-1 xs:w-[140px] xs:flex-initial h-10 sm:h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.filter(m => m.value !== 'all').map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                <div className="flex items-center gap-2">
                                  {method.icon && <method.icon className="w-4 h-4" />}
                                  {method.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-8 sm:w-8 text-success"
                          onClick={() => handleEditSave(sale)}
                          disabled={updatePaymentMethod.isPending}
                        >
                          {updatePaymentMethod.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-8 sm:w-8 text-destructive"
                          onClick={handleEditCancel}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium",
                          (sale.payment_method as PaymentMethod) === 'cash' 
                            ? "bg-success/10 text-success" 
                            : (sale.payment_method as PaymentMethod) === 'card'
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-primary/10 text-primary"
                        )}>
                          <PaymentIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden xs:inline">
                            {getPaymentMethodLabel(sale.payment_method as PaymentMethod | null)}
                          </span>
                          <span className="xs:hidden">
                            {getPaymentMethodShortLabel(sale.payment_method as PaymentMethod | null)}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-8 sm:w-8"
                          onClick={() => handleEditStart(sale.id, sale.payment_method as PaymentMethod | null)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
          <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-foreground">
            Zatím žádné prodeje
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Prodeje se zobrazí po prvním prodeji
          </p>
          <Button onClick={() => setNewSaleOpen(true)} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Vytvořit první</span> prodej
          </Button>
        </div>
      )}

      {/* Mobile FAB */}
      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg sm:hidden z-40"
        onClick={() => setNewSaleOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}