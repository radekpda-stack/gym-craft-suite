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

const PAYMENT_METHODS: { value: PaymentMethod | 'all'; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Všechny platby' },
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', icon: Wallet },
  { value: 'card', label: 'Kartou', icon: CreditCard },
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Prodeje</h1>
          <p className="text-muted-foreground mt-1">
            Přehled a správa prodejů produktů
          </p>
        </div>
        <Button onClick={() => setNewSaleOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nový prodej
        </Button>
      </div>

      {/* New Sale Dialog */}
      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />

      {/* Compact Stats Row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span><strong className="text-foreground">{stats.totalSales}</strong> prodejů</span>
        <span>•</span>
        <span><strong className="text-foreground">{stats.totalAmount.toLocaleString('cs-CZ')} Kč</strong> celkem</span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentMethod | 'all')}>
          <SelectTrigger className="w-[180px]">
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
        <span className="text-sm text-muted-foreground">
          {filteredSales.length} {filteredSales.length === 1 ? 'prodej' : filteredSales.length < 5 ? 'prodeje' : 'prodejů'}
        </span>
      </div>

      {/* Sales List */}
      {filteredSales.length > 0 ? (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const PaymentIcon = getPaymentMethodIcon(sale.payment_method as PaymentMethod | null);
            const isEditing = editingId === sale.id;
            
            return (
              <div
                key={sale.id}
                className="glass rounded-xl p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground">
                        {sale.products?.name || sale.description || 'Produkt'}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {Math.abs(sale.amount).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <Link 
                          to={`/clients/${sale.client_id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {sale.clients?.name || 'Neznámý klient'}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(sale.created_at), 'd. M. yyyy HH:mm', { locale: cs })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Select 
                          value={editPaymentMethod} 
                          onValueChange={(v) => setEditPaymentMethod(v as PaymentMethod)}
                        >
                          <SelectTrigger className="w-[130px]">
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
                          className="h-8 w-8 text-success"
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
                          className="h-8 w-8 text-destructive"
                          onClick={handleEditCancel}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                          (sale.payment_method as PaymentMethod) === 'cash' 
                            ? "bg-success/10 text-success" 
                            : (sale.payment_method as PaymentMethod) === 'card'
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-primary/10 text-primary"
                        )}>
                          <PaymentIcon className="w-3.5 h-3.5" />
                          {getPaymentMethodLabel(sale.payment_method as PaymentMethod | null)}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
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
        <div className="glass rounded-2xl p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Zatím žádné prodeje
          </h3>
          <p className="text-muted-foreground mt-1">
            Prodeje se zobrazí po prvním prodeji produktu
          </p>
        </div>
      )}
    </div>
  );
}