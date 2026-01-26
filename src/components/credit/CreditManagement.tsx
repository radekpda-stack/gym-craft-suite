import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Minus, Trash2, Package, Dumbbell, CreditCard, Edit3, Download, FileText, Users, AlertTriangle, History, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useCreditTransactions, useCreateTransaction, useDeleteTransaction, CreditTransaction } from '@/hooks/useCreditTransactions';
import { useSharedBudgetBalance, useSharedBudgetTransactions } from '@/hooks/useSharedBudgetBalance';
import { useProducts } from '@/hooks/useProducts';
import { useUndoTransaction } from '@/hooks/useUndoActions';
import { useClientTrainingPrice } from '@/hooks/usePriceTransition';
import { cn } from '@/lib/utils';
import { exportTransactionsToCSV, exportTransactionsToPDF, TransactionExportData } from '@/lib/export';
import { formatCurrency } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/empty-state';
import { CreditLedgerExportDialog } from './CreditLedgerExportDialog';

interface CreditManagementProps {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  currentBalance: number;
}

export function CreditManagement({ clientId, clientName, clientEmail, currentBalance }: CreditManagementProps) {
  const { data: individualTransactions = [] } = useCreditTransactions(clientId);
  const { data: products = [] } = useProducts(true);
  const { effectivePrices, usesLegacyPricing } = useClientTrainingPrice(clientId);
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { registerTransactionUndo } = useUndoTransaction();

  // Shared budget info
  const { data: sharedBudgetInfo, isLoading: sharedLoading } = useSharedBudgetBalance(clientId);
  const { data: sharedTransactions = [] } = useSharedBudgetTransactions(sharedBudgetInfo?.groupId);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualIsDeduction, setManualIsDeduction] = useState(false);

  // Use shared balance if in a group, otherwise individual balance
  const isShared = sharedBudgetInfo?.isShared ?? false;
  const displayBalance = isShared ? sharedBudgetInfo?.displayBalance ?? 0 : Math.max(0, currentBalance);
  const actualBalance = isShared ? sharedBudgetInfo?.sharedBalance ?? 0 : currentBalance;
  const isExhausted = isShared ? sharedBudgetInfo?.isExhausted ?? false : currentBalance <= 0;

  // Use shared transactions if in a group
  const transactions = isShared ? sharedTransactions : individualTransactions;

  const remainingTrainings = Math.floor(actualBalance / effectivePrices["1"]);

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = await createTransaction.mutateAsync({
      client_id: clientId,
      amount: amount,
      type: 'payment',
      description: paymentDescription || 'Platba kreditu',
    });

    // Register undo action
    registerTransactionUndo(
      { id: result.undoData.transactionId, amount: result.undoData.amount, client_id: result.undoData.clientId },
      'Platba přidána',
      `${formatCurrency(amount)}`
    );

    setPaymentAmount('');
    setPaymentDescription('');
    setIsPaymentOpen(false);
  };

  const handleProductPurchase = async () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const totalAmount = product.price * productQuantity;

    const result = await createTransaction.mutateAsync({
      client_id: clientId,
      amount: -totalAmount,
      type: 'product',
      description: `${product.name}${productQuantity > 1 ? ` (${productQuantity}x)` : ''}`,
      product_id: product.id,
    });

    // Register undo action
    registerTransactionUndo(
      { id: result.undoData.transactionId, amount: result.undoData.amount, client_id: result.undoData.clientId },
      'Produkt prodán',
      `${product.name} - ${formatCurrency(totalAmount)}`
    );

    setSelectedProduct('');
    setProductQuantity(1);
    setIsProductOpen(false);
  };

  const handleManualAdjustment = async () => {
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount === 0) return;

    const finalAmount = manualIsDeduction ? -Math.abs(amount) : Math.abs(amount);

    const result = await createTransaction.mutateAsync({
      client_id: clientId,
      amount: finalAmount,
      type: 'manual',
      description: manualDescription || 'Manuální úprava',
    });

    // Register undo action
    registerTransactionUndo(
      { id: result.undoData.transactionId, amount: result.undoData.amount, client_id: result.undoData.clientId },
      manualIsDeduction ? 'Kredit odečten' : 'Kredit přidán',
      `${formatCurrency(Math.abs(finalAmount))}`
    );

    setManualAmount('');
    setManualDescription('');
    setIsManualOpen(false);
  };

  const handleDeleteTransaction = async (transaction: CreditTransaction) => {
    await deleteTransaction.mutateAsync({
      id: transaction.id,
      clientId: transaction.client_id,
      amount: transaction.amount,
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <Plus className="w-4 h-4 text-success" />;
      case 'training':
        return <Dumbbell className="w-4 h-4 text-primary" />;
      case 'canceled_training':
        return <Dumbbell className="w-4 h-4 text-destructive" />;
      case 'product':
        return <Package className="w-4 h-4 text-warning" />;
      default:
        return <Edit3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      {/* Shared Budget Alert */}
      {isShared && sharedBudgetInfo && (
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{sharedBudgetInfo.groupName}</span>
            <Badge variant="secondary">Sdílený budget</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {sharedBudgetInfo.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/50">
                <ClientAvatar name={member.name} size="sm" />
                <span className="text-sm text-foreground">{member.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Exhausted Warning */}
      {isExhausted && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Kredit je vyčerpaný. Doplňte kredit pro další tréninky.
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            {isShared ? <Users className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            <span className="text-sm">{isShared ? 'Sdílený kredit' : 'Aktuální kredit'}</span>
          </div>
          <p className={cn(
            "font-bold text-2xl",
            isExhausted ? "text-destructive" : actualBalance < 500 ? "text-warning" : "text-success"
          )}>
            {formatCurrency(displayBalance)}
          </p>
          {isExhausted && actualBalance < 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              (skutečný stav: {formatCurrency(actualBalance)})
            </p>
          )}
        </div>
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Dumbbell className="w-4 h-4" />
            <span className="text-sm">Zbývající tréninky</span>
          </div>
          <p className="font-bold text-2xl text-foreground">
            ~{Math.max(0, remainingTrainings)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            při ceně {formatCurrency(effectivePrices["1"])}/trénink
            {usesLegacyPricing && <span className="ml-1 text-primary">(fixace)</span>}
          </p>
        </div>
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Package className="w-4 h-4" />
            <span className="text-sm">Ceny tréninků</span>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>1 osoba: {formatCurrency(effectivePrices["1"])}</p>
            <p>2 osoby: {formatCurrency(effectivePrices["2"])}</p>
            <p>3+ osoby: {formatCurrency(effectivePrices["3"])}</p>
          </div>
          {usesLegacyPricing && (
            <p className="text-xs text-primary mt-2">Fixovaná cena</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat platbu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Přidat platbu {isShared && `(${sharedBudgetInfo?.groupName})`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {isShared && (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    Platba bude přičtena ke sdílenému kreditu skupiny.
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label>Částka (Kč)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setPaymentAmount(value);
                  }}
                  placeholder="Zadejte částku"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Popis (volitelné)</Label>
                <Input
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="Platba kreditu"
                  className="mt-2"
                />
              </div>
              <Button onClick={handleAddPayment} disabled={createTransaction.isPending} className="w-full">
                Přidat platbu
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Package className="w-4 h-4" />
              Prodat produkt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Prodat produkt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Produkt</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Vyberte produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.price} Kč
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Počet</Label>
                <Input
                  type="number"
                  min="1"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
              </div>
              {selectedProductData && (
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Celkem k odečtení:</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(selectedProductData.price * productQuantity)}
                  </p>
                </div>
              )}
              <Button onClick={handleProductPurchase} disabled={!selectedProduct || createTransaction.isPending} className="w-full">
                Odečíst z kreditu
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Manuální úprava
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manuální úprava kreditu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  variant={!manualIsDeduction ? 'default' : 'outline'}
                  onClick={() => setManualIsDeduction(false)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat
                </Button>
                <Button
                  variant={manualIsDeduction ? 'default' : 'outline'}
                  onClick={() => setManualIsDeduction(true)}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Odečíst
                </Button>
              </div>
              <div>
                <Label>Částka (Kč)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={manualAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setManualAmount(value);
                  }}
                  placeholder="Zadejte částku"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Důvod</Label>
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Důvod úpravy"
                  className="mt-2"
                />
              </div>
              <Button onClick={handleManualAdjustment} disabled={createTransaction.isPending} className="w-full">
                Provést úpravu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Historie transakcí {isShared && '(sdílený účet)'}
          </h3>
          {transactions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <CreditLedgerExportDialog
                  clientId={clientId}
                  clientName={clientName}
                  clientEmail={clientEmail}
                  isGroupBudget={isShared}
                  budgetGroupId={sharedBudgetInfo?.groupId || undefined}
                  groupName={sharedBudgetInfo?.groupName || undefined}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Výpis kreditu (PDF)
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const data: TransactionExportData[] = transactions.map(t => ({
                    date: format(new Date(t.created_at), 'd.M.yyyy HH:mm'),
                    type: t.type,
                    description: t.description || '',
                    amount: t.amount,
                    clientName: (t as any).clients?.name || clientName,
                  }));
                  const exportName = isShared ? sharedBudgetInfo?.groupName || 'sdileny-budget' : clientName;
                  exportTransactionsToCSV(data, `transakce-${exportName.toLowerCase().replace(/\s+/g, '-')}`);
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export do CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const data: TransactionExportData[] = transactions.map(t => ({
                    date: format(new Date(t.created_at), 'd.M.yyyy HH:mm'),
                    type: t.type,
                    description: t.description || '',
                    amount: t.amount,
                    clientName: (t as any).clients?.name || clientName,
                  }));
                  const exportName = isShared ? sharedBudgetInfo?.groupName || 'Sdílený budget' : clientName;
                  exportTransactionsToPDF(data, `Transakce - ${exportName}`, `transakce-${exportName.toLowerCase().replace(/\s+/g, '-')}`);
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export do PDF (jednoduchý)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-background">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {transaction.description || transaction.type}
                      </p>
                      {isShared && (transaction as any).clients?.name && (
                        <Badge variant="outline" className="text-xs">
                          {(transaction as any).clients.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={cn(
                    "font-bold text-lg",
                    transaction.amount > 0 ? "text-success" : "text-destructive"
                  )}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount, false)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTransaction(transaction)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="Zatím žádné transakce"
            description="Historie transakcí se zobrazí po přidání platby nebo odečtu kreditu"
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
