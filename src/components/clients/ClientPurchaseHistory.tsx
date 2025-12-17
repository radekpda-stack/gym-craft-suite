import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Package, 
  Banknote, 
  Wallet, 
  CreditCard,
  ShoppingCart,
  Calendar,
  Edit2,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useCreditTransactions, 
  useUpdateTransactionPaymentMethod,
  PaymentMethod 
} from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';

interface ClientPurchaseHistoryProps {
  clientId: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', icon: Wallet },
  { value: 'card', label: 'Kartou', icon: CreditCard },
];

const getPaymentMethodIcon = (method: string | null) => {
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

const getPaymentMethodLabel = (method: string | null) => {
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

export function ClientPurchaseHistory({ clientId }: ClientPurchaseHistoryProps) {
  const { data: transactions = [], isLoading } = useCreditTransactions(clientId);
  const updatePaymentMethod = useUpdateTransactionPaymentMethod();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');

  // Filter only product transactions
  const productTransactions = transactions.filter(t => t.type === 'product');

  const handleEditStart = (transactionId: string, currentMethod: string | null) => {
    setEditingId(transactionId);
    setEditPaymentMethod((currentMethod as PaymentMethod) || 'credit');
  };

  const handleEditSave = async (transaction: any) => {
    await updatePaymentMethod.mutateAsync({
      id: transaction.id,
      clientId: transaction.client_id,
      amount: transaction.amount,
      oldPaymentMethod: transaction.payment_method,
      newPaymentMethod: editPaymentMethod,
    });
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (productTransactions.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground">
          Žádné nákupy
        </h3>
        <p className="text-muted-foreground mt-1">
          Klient zatím nemá žádné nákupy produktů
        </p>
      </div>
    );
  }

  // Stats
  const totalSpent = productTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const cashPurchases = productTransactions.filter(t => t.payment_method === 'cash').length;
  const creditPurchases = productTransactions.filter(t => t.payment_method === 'credit' || !t.payment_method).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Celkem nákupů</p>
          <p className="text-lg font-bold text-foreground">{productTransactions.length}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Celkem utraceno</p>
          <p className="text-lg font-bold text-foreground">{totalSpent.toLocaleString('cs-CZ')} Kč</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Hotově / Kredit</p>
          <p className="text-lg font-bold text-foreground">{cashPurchases} / {creditPurchases}</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {productTransactions.map((transaction) => {
          const PaymentIcon = getPaymentMethodIcon(transaction.payment_method);
          const isEditing = editingId === transaction.id;
          
          return (
            <div
              key={transaction.id}
              className="glass rounded-xl p-3 sm:p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground text-sm sm:text-base truncate">
                      {transaction.description || 'Produkt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(transaction.created_at), 'd. M. yyyy', { locale: cs })}</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {Math.abs(transaction.amount).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isEditing ? (
                    <>
                      <Select 
                        value={editPaymentMethod} 
                        onValueChange={(v) => setEditPaymentMethod(v as PaymentMethod)}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              <div className="flex items-center gap-2">
                                <method.icon className="w-3 h-3" />
                                {method.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-success"
                        onClick={() => handleEditSave(transaction)}
                        disabled={updatePaymentMethod.isPending}
                      >
                        {updatePaymentMethod.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={handleEditCancel}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        transaction.payment_method === 'cash' 
                          ? "bg-success/10 text-success" 
                          : transaction.payment_method === 'card'
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-primary/10 text-primary"
                      )}>
                        <PaymentIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{getPaymentMethodLabel(transaction.payment_method)}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEditStart(transaction.id, transaction.payment_method)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}