import { useState, useMemo } from 'react';
import { CreditCard, Search, Check, Wallet, Banknote, Building2, Receipt, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { useUnpaidTrainings, usePayTraining } from '@/hooks/useUnpaidTrainings';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface EnhancedCreditModalProps {
  collapsed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  defaultClientId?: string;
}

type PaymentMethodType = 'cash' | 'bank' | 'card' | 'revolut' | 'invoice';

const paymentMethods = [
  { value: 'bank', label: 'Bankovní převod', icon: Building2 },
  { value: 'cash', label: 'Hotovost', icon: Banknote },
  { value: 'card', label: 'Karta', icon: CreditCard },
  { value: 'revolut', label: 'Revolut', icon: Wallet },
  { value: 'invoice', label: 'Faktura', icon: Receipt },
] as const;

// Remove diacritics for search
const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function EnhancedCreditModal({ 
  collapsed = false, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
  defaultClientId,
}: EnhancedCreditModalProps) {
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
  
  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState<string[]>([]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  // Get unpaid trainings for selected client
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(selectedClientId || undefined);
  
  const totalUnpaid = useMemo(() => {
    return unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  }, [unpaidTrainings]);

  // Filter clients based on search query (diacritics-insensitive)
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients.filter(c => !c.is_archived);
    const query = removeDiacritics(clientSearchQuery);
    return clients.filter(c => !c.is_archived).filter(client => 
      removeDiacritics(client.name).includes(query)
    );
  }, [clients, clientSearchQuery]);

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

    // Check if client has unpaid trainings
    if (unpaidTrainings.length > 0 && step === 1) {
      setStep(2);
      return;
    }

    await processTransaction();
  };

  const processTransaction = async () => {
    setIsProcessing(true);
    try {
      const numericAmount = parseFloat(amount);
      
      // Create description with payment method
      const methodLabel = paymentMethods.find(m => m.value === paymentMethod)?.label || paymentMethod;
      let description = note || 'Dobití kreditu';
      description = `[${methodLabel}] ${description}`;

      await createTransaction.mutateAsync({
        client_id: selectedClientId,
        amount: numericAmount,
        type: 'payment',
        description,
      });

      // Pay selected unpaid trainings from new credit
      if (selectedUnpaidIds.length > 0) {
        for (const trainingId of selectedUnpaidIds) {
          await payTraining.mutateAsync({
            trainingId,
            paymentMethod: 'credit',
            deductCredit: true,
          });
        }
      }

      toast({
        title: 'Kredit přidán',
        description: selectedUnpaidIds.length > 0 
          ? `Přičteno ${numericAmount.toLocaleString('cs-CZ')} Kč a uhrazeno ${selectedUnpaidIds.length} tréninků`
          : `Přičteno ${numericAmount.toLocaleString('cs-CZ')} Kč pro ${selectedClient?.name}`,
      });

      featureTracker.track('enhanced_credit', 'finance', { paymentMethod, paidTrainings: selectedUnpaidIds.length });

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

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      {showTrigger && (
        <DialogTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full',
              'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <CreditCard className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!collapsed && (
              <span className="font-medium truncate">Rychlý kredit</span>
            )}
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {step === 1 ? 'Přidat kredit' : 'Uhradit neuhrazené tréninky'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 1 ? (
          <div className="space-y-4 mt-4">
            {/* Client search with autocomplete */}
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
                            <span className={cn(
                              "text-sm font-medium",
                              (client.credit_balance || 0) < 0 ? "text-destructive" : 
                              (client.credit_balance || 0) < 500 ? "text-warning" : "text-success"
                            )}>
                              {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Show client credit and unpaid info */}
            {selectedClient && (
              <div className="p-3 rounded-xl bg-secondary/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aktuální kredit:</span>
                  <span className={cn(
                    "font-semibold",
                    (selectedClient.credit_balance || 0) < 0 ? "text-destructive" : 
                    (selectedClient.credit_balance || 0) < 500 ? "text-warning" : "text-success"
                  )}>
                    {(selectedClient.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
                {unpaidTrainings.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      Neuhrazené tréninky:
                    </span>
                    <span className="font-semibold text-warning">
                      {unpaidTrainings.length}× ({totalUnpaid.toLocaleString('cs-CZ')} Kč)
                    </span>
                  </div>
                )}
              </div>
            )}

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
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.slice(0, 4).map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all",
                      paymentMethod === method.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <method.icon className="w-4 h-4" />
                    <span className="text-sm">{method.label}</span>
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

            {/* Preview of new balance */}
            {selectedClient && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <p className="text-sm text-muted-foreground">Nový zůstatek po transakci:</p>
                <p className="text-2xl font-bold text-success">
                  {((selectedClient.credit_balance || 0) + parseFloat(amount)).toLocaleString('cs-CZ')} Kč
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Pay unpaid trainings */
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
              <p className="text-sm font-medium text-warning">
                Klient {selectedClient?.name} má {unpaidTrainings.length} neuhrazených tréninků
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Celkem: {totalUnpaid.toLocaleString('cs-CZ')} Kč
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Chcete je z nového kreditu ({parseFloat(amount).toLocaleString('cs-CZ')} Kč) uhradit?
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllUnpaid}>
                Vybrat vše
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedUnpaidIds([])}>
                Zrušit výběr
              </Button>
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {unpaidTrainings.map((training) => (
                  <div
                    key={training.id}
                    onClick={() => toggleUnpaidTraining(training.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedUnpaidIds.includes(training.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedUnpaidIds.includes(training.id)}
                      onCheckedChange={() => toggleUnpaidTraining(training.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(new Date(training.date), 'd. MMMM', { locale: cs })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {(training.final_price || 0).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedUnpaidIds.length > 0 && (
              <div className="p-3 rounded-xl bg-secondary/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">K uhrazení:</span>
                  <span className="font-semibold">{selectedUnpaidTotal.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Zbude na kreditu:</span>
                  <span className="font-semibold text-success">
                    {(parseFloat(amount) - selectedUnpaidTotal + (selectedClient?.credit_balance || 0)).toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6 gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Zpět
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (step === 2) {
                setSelectedUnpaidIds([]);
                processTransaction();
              } else {
                resetForm();
                setOpen(false);
              }
            }}
          >
            {step === 2 ? 'Přeskočit' : 'Zrušit'}
          </Button>
          <Button
            onClick={step === 2 ? processTransaction : handleSubmit}
            disabled={!selectedClientId || !amount || parseFloat(amount) <= 0 || isProcessing}
          >
            {isProcessing ? 'Zpracovávám...' : step === 2 ? 'Uhradit vybrané' : 'Pokračovat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}