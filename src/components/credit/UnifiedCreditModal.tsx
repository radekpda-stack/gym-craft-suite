import { useState, useMemo, useEffect } from 'react';
import { CreditCard, Search, Check, Wallet, Banknote, Building2, Receipt, AlertCircle, Users, Plus, Minus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { useUnpaidTrainings, usePayTraining } from '@/hooks/useUnpaidTrainings';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

interface UnifiedCreditModalProps {
  collapsed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  defaultClientId?: string;
  triggerClassName?: string;
  triggerLabel?: string;
}

type PaymentMethodType = 'cash' | 'bank' | 'card' | 'credit';
type OperationType = 'add' | 'subtract';

const paymentMethods = [
  { value: 'bank', label: 'Převod', icon: Building2 },
  { value: 'cash', label: 'Hotovost', icon: Banknote },
  { value: 'card', label: 'Karta', icon: CreditCard },
] as const;

// Remove diacritics for search
const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function UnifiedCreditModal({ 
  collapsed = false, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
  defaultClientId,
  triggerClassName,
  triggerLabel = 'Rychlý kredit',
}: UnifiedCreditModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  const { data: clients = [] } = useClients();
  const createTransaction = useCreateTransaction();
  const payTraining = usePayTraining();
  
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('add');
  
  // Step 2 state - unpaid trainings
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState<string[]>([]);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'add' | 'adjust'>('add');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  // Get shared budget info for selected client
  const { data: sharedBudgetInfo, isLoading: budgetLoading } = useSharedBudgetBalance(selectedClientId || undefined);
  
  // Get unpaid trainings for selected client
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(selectedClientId || undefined);
  
  // Determine the effective credit balance to display
  const effectiveCreditBalance = useMemo(() => {
    if (!selectedClient) return 0;
    if (sharedBudgetInfo?.isShared) {
      return sharedBudgetInfo.sharedBalance;
    }
    return selectedClient.credit_balance || 0;
  }, [selectedClient, sharedBudgetInfo]);
  
  // Personal debt that would need to be transferred (only for shared budget clients)
  const personalDebt = useMemo(() => {
    if (!selectedClient || !sharedBudgetInfo?.isShared) return 0;
    const personalBalance = selectedClient.credit_balance || 0;
    return personalBalance < 0 ? Math.abs(personalBalance) : 0;
  }, [selectedClient, sharedBudgetInfo]);
  
  const totalUnpaid = useMemo(() => {
    return unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  }, [unpaidTrainings]);

  // Filter clients based on search query (diacritics-insensitive)
  const filteredClients = useMemo(() => {
    const activeClients = clients.filter(c => !c.is_archived);
    if (!clientSearchQuery.trim()) return activeClients;
    const query = removeDiacritics(clientSearchQuery);
    return activeClients.filter(client => 
      removeDiacritics(client.name).includes(query)
    );
  }, [clients, clientSearchQuery]);

  // Set default client on open
  useEffect(() => {
    if (open && defaultClientId) {
      setSelectedClientId(defaultClientId);
      const client = clients.find(c => c.id === defaultClientId);
      if (client) {
        setClientSearchQuery(client.name);
      }
    }
  }, [open, defaultClientId, clients]);

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast({
        title: 'Chyba',
        description: 'Vyberte klienta.',
        variant: 'destructive',
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: 'Chyba',
        description: 'Zadejte platnou kladnou částku.',
        variant: 'destructive',
      });
      return;
    }

    // For add tab - check unpaid trainings before processing
    if (activeTab === 'add' && unpaidTrainings.length > 0 && step === 1) {
      setStep(2);
      return;
    }

    await processTransaction();
  };

  const processTransaction = async () => {
    setIsProcessing(true);
    try {
      const numericAmount = parseFloat(amount);
      const finalAmount = activeTab === 'add' 
        ? Math.abs(numericAmount) 
        : (operationType === 'add' ? Math.abs(numericAmount) : -Math.abs(numericAmount));
      
      // Create description with payment method
      const methodLabel = paymentMethods.find(m => m.value === paymentMethod)?.label || paymentMethod;
      let description = note || (activeTab === 'add' ? 'Dobití kreditu' : 'Manuální úprava');
      if (activeTab === 'add') {
        description = `[${methodLabel}] ${description}`;
      }

      // Create the transaction
      await createTransaction.mutateAsync({
        client_id: selectedClientId,
        amount: finalAmount,
        type: activeTab === 'add' ? 'payment' : 'manual',
        description,
        clearPersonalDebt: activeTab === 'add' && personalDebt > 0,
      });

      // Pay selected unpaid trainings from new credit (only for add tab)
      if (activeTab === 'add' && selectedUnpaidIds.length > 0) {
        for (const trainingId of selectedUnpaidIds) {
          await payTraining.mutateAsync({
            trainingId,
            paymentMethod: 'credit',
            deductCredit: true,
          });
        }
      }

      const budgetType = sharedBudgetInfo?.isShared ? 'Sdílený kredit' : 'Kredit';
      let successMessage = activeTab === 'add' 
        ? `Přičteno ${formatCurrency(Math.abs(finalAmount))}`
        : `${operationType === 'add' ? 'Přičteno' : 'Odečteno'} ${formatCurrency(Math.abs(finalAmount))}`;
      
      if (activeTab === 'add' && personalDebt > 0) {
        successMessage += ` (vyrovnán dluh ${formatCurrency(personalDebt)})`;
      }
      
      if (selectedUnpaidIds.length > 0) {
        successMessage += ` a uhrazeno ${selectedUnpaidIds.length} tréninků`;
      }

      toast({
        title: `${budgetType} upraven`,
        description: successMessage,
      });

      featureTracker.track('unified_credit', 'finance', { 
        tab: activeTab, 
        paymentMethod, 
        paidTrainings: selectedUnpaidIds.length, 
        isShared: sharedBudgetInfo?.isShared 
      });

      resetForm();
      setOpen(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se provést transakci.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedClientId(defaultClientId || '');
    setClientSearchQuery('');
    setAmount('');
    setPaymentMethod('bank');
    setNote('');
    setStep(1);
    setSelectedUnpaidIds([]);
    setActiveTab('add');
    setOperationType('add');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientSearchQuery(client.name);
    }
    setClientSearchOpen(false);
  };

  const toggleUnpaidTraining = (trainingId: string) => {
    setSelectedUnpaidIds(prev => 
      prev.includes(trainingId) 
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    );
  };

  const selectAllUnpaid = () => {
    setSelectedUnpaidIds(unpaidTrainings.map(t => t.id));
  };

  const selectedUnpaidTotal = useMemo(() => {
    return unpaidTrainings
      .filter(t => selectedUnpaidIds.includes(t.id))
      .reduce((sum, t) => sum + (t.final_price || 0), 0);
  }, [unpaidTrainings, selectedUnpaidIds]);

  // Calculate final balance after transaction
  const calculatedNewBalance = useMemo(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return null;
    
    let change = activeTab === 'add' 
      ? numericAmount 
      : (operationType === 'add' ? numericAmount : -numericAmount);
    
    let newBalance = effectiveCreditBalance + change;
    
    // If there's personal debt in shared budget, it will be transferred
    if (activeTab === 'add' && personalDebt > 0) {
      newBalance -= personalDebt;
    }
    
    // Subtract unpaid trainings that will be paid
    if (activeTab === 'add') {
      newBalance -= selectedUnpaidTotal;
    }
    
    return newBalance;
  }, [effectiveCreditBalance, amount, personalDebt, selectedUnpaidTotal, activeTab, operationType]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      {showTrigger && (
        <DialogTrigger asChild>
          <button
            className={triggerClassName || cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group w-full',
              'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <CreditCard className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-105" strokeWidth={1.5} />
            {!collapsed && (
              <span className="text-sm font-medium truncate">{triggerLabel}</span>
            )}
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {step === 1 ? 'Práce s kreditem' : 'Uhradit neuhrazené tréninky'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 1 ? (
          <div className="space-y-4 mt-4">
            {/* Client search */}
            <div className="space-y-2">
              <Label>Klient *</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-full justify-between font-normal h-11"
                  >
                    {selectedClient ? selectedClient.name : "Vyhledat klienta..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 pointer-events-auto" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Zadejte jméno klienta..." 
                      value={clientSearchQuery}
                      onValueChange={setClientSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Klient nenalezen.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => handleClientSelect(client.id)}
                            className="flex items-center justify-between py-3"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{client.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Credit info */}
            {selectedClient && !budgetLoading && (
              <div className="p-3 rounded-xl bg-secondary/50 space-y-2">
                {sharedBudgetInfo?.isShared && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full w-fit">
                    <Users className="w-3 h-3" />
                    {sharedBudgetInfo.groupName || 'Sdílený účet'}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {sharedBudgetInfo?.isShared ? 'Sdílený kredit:' : 'Kredit:'}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    effectiveCreditBalance < 0 ? "text-destructive" : 
                    effectiveCreditBalance < 500 ? "text-warning" : "text-success"
                  )}>
                    {formatCurrency(effectiveCreditBalance)}
                  </span>
                </div>
                
                {personalDebt > 0 && activeTab === 'add' && (
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      Osobní dluh:
                    </span>
                    <span className="font-semibold text-warning">
                      -{formatCurrency(personalDebt, false)}
                    </span>
                  </div>
                )}
                
                {unpaidTrainings.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      Neuhrazené tréninky:
                    </span>
                    <span className="font-semibold text-warning">
                      {unpaidTrainings.length}× ({formatCurrency(totalUnpaid)})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tabs for Add / Adjust */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'add' | 'adjust')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Přidat kredit
                </TabsTrigger>
                <TabsTrigger value="adjust" className="gap-2">
                  <History className="w-4 h-4" />
                  Manuální úprava
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="add" className="space-y-4 mt-4">
                {/* Amount input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Částka (Kč) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Zadejte částku"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    className="text-lg h-12"
                  />
                </div>

                {/* Payment method selection */}
                <div className="space-y-2">
                  <Label>Způsob platby</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                          paymentMethod === method.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <method.icon className="w-5 h-5" />
                        <span className="text-xs">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note input */}
                <div className="space-y-2">
                  <Label htmlFor="note">Poznámka (volitelné)</Label>
                  <Textarea
                    id="note"
                    placeholder="Poznámka k transakci..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="adjust" className="space-y-4 mt-4">
                {/* Operation type toggle */}
                <div className="space-y-2">
                  <Label>Typ operace</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={operationType === 'add' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setOperationType('add')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Přičíst
                    </Button>
                    <Button
                      type="button"
                      variant={operationType === 'subtract' ? 'destructive' : 'outline'}
                      className="flex-1"
                      onClick={() => setOperationType('subtract')}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Odečíst
                    </Button>
                  </div>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <Label htmlFor="adjustAmount">Částka (Kč) *</Label>
                  <Input
                    id="adjustAmount"
                    type="number"
                    placeholder="Zadejte částku"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    className="text-lg h-12"
                  />
                </div>

                {/* Reason input - required for manual adjustments */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Důvod úpravy *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Zadejte důvod úpravy..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    required
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Preview of new balance */}
            {selectedClient && calculatedNewBalance !== null && (
              <div className={cn(
                "p-4 rounded-xl border space-y-1",
                (activeTab === 'add' || operationType === 'add')
                  ? "bg-success/10 border-success/20" 
                  : "bg-destructive/10 border-destructive/20"
              )}>
                <p className="text-sm text-muted-foreground">
                  {sharedBudgetInfo?.isShared ? 'Nový sdílený zůstatek:' : 'Nový zůstatek:'} 
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  calculatedNewBalance < 0 ? "text-destructive" : "text-success"
                )}>
                  {formatCurrency(calculatedNewBalance)}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Step 2 - Pay unpaid trainings */
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Vyberte tréninky k uhrazení z nového kreditu:
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllUnpaid}
              >
                Vybrat vše
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-2">
                {unpaidTrainings.map((training) => (
                  <div
                    key={training.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedUnpaidIds.includes(training.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-secondary/30 border-border hover:bg-secondary/50"
                    )}
                    onClick={() => toggleUnpaidTraining(training.id)}
                  >
                    <Checkbox
                      checked={selectedUnpaidIds.includes(training.id)}
                      onCheckedChange={() => toggleUnpaidTraining(training.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {training.participant_count} osob
                      </p>
                    </div>
                    <span className="font-semibold text-warning">
                      {formatCurrency(training.final_price)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Balance preview after paying trainings */}
            <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Přidávaný kredit:</span>
                <span className="font-semibold text-success">+{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
              {personalDebt > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vyrovnání dluhu:</span>
                  <span className="font-semibold text-warning">-{formatCurrency(personalDebt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Úhrada tréninků:</span>
                <span className="font-semibold text-warning">
                  -{formatCurrency(selectedUnpaidTotal)} ({selectedUnpaidIds.length}×)
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-medium">Výsledný zůstatek:</span>
                  <span className={cn(
                    "font-bold text-lg",
                    (calculatedNewBalance || 0) < 0 ? "text-destructive" : "text-success"
                  )}>
                    {formatCurrency(calculatedNewBalance || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 gap-2">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
            >
              Zpět
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
          >
            Zrušit
          </Button>
          <Button
            onClick={step === 2 ? processTransaction : handleSubmit}
            disabled={
              !selectedClientId || 
              !amount || 
              parseFloat(amount) <= 0 || 
              isProcessing ||
              (activeTab === 'adjust' && !note.trim())
            }
          >
            {isProcessing ? 'Zpracovávám...' : 
             step === 2 ? `Potvrdit (${selectedUnpaidIds.length > 0 ? `uhradit ${selectedUnpaidIds.length}×` : 'pokračovat'})` : 
             'Potvrdit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
