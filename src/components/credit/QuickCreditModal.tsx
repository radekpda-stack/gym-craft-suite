import { useState, useMemo } from 'react';
import { CreditCard, Search, Plus, Minus, Check, Wallet, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { useAppSettings } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { formatCurrency } from '@/lib/formatters';

interface QuickCreditModalProps {
  collapsed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

type OperationType = 'add' | 'subtract';

// Default credit tags
const DEFAULT_PAYMENT_TAGS = ['hotovost', 'účet 1', 'účet 2'];

export function QuickCreditModal({ 
  collapsed = false, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true 
}: QuickCreditModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  
  const { data: clients = [] } = useClients();
  const { data: settings } = useAppSettings();
  const createTransaction = useCreateTransaction();

  // Get payment tags from settings or use defaults
  const paymentTags = useMemo(() => {
    if (settings?.payment_tags && Array.isArray(settings.payment_tags)) {
      return settings.payment_tags as string[];
    }
    return DEFAULT_PAYMENT_TAGS;
  }, [settings]);

  
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('add');
  const [note, setNote] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  // Get shared budget info for selected client
  const { data: sharedBudgetInfo, isLoading: budgetLoading } = useSharedBudgetBalance(selectedClientId || undefined);
  
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

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query)
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
    if (isNaN(numericAmount) || numericAmount === 0) {
      toast({
        title: 'Chyba',
        description: 'Zadejte platnou nenulovou částku.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const finalAmount = operationType === 'add' ? Math.abs(numericAmount) : -Math.abs(numericAmount);
      
      // Create description with tag info if selected
      let description = note || (operationType === 'add' ? 'Dobití kreditu' : 'Odečtení kreditu');
      if (selectedTag) {
        description = `[${selectedTag}] ${description}`;
      }

      await createTransaction.mutateAsync({
        client_id: selectedClientId,
        amount: finalAmount,
        type: operationType === 'add' ? 'payment' : 'manual',
        description,
        // Clear personal debt when adding to shared budget
        clearPersonalDebt: operationType === 'add' && personalDebt > 0,
      });

      const budgetType = sharedBudgetInfo?.isShared ? 'Sdílený kredit' : 'Kredit';
      toast({
        title: 'Transakce provedena',
        description: `${operationType === 'add' ? 'Přičteno' : 'Odečteno'} ${formatCurrency(Math.abs(finalAmount))} (${budgetType.toLowerCase()})`,
      });

      featureTracker.track('quick_credit', 'finance', { operationType, isShared: sharedBudgetInfo?.isShared });

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
    setSelectedClientId('');
    setClientSearchQuery('');
    setAmount('');
    setOperationType('add');
    setNote('');
    setSelectedTag('');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientSearchQuery(client.name);
    }
    setClientSearchOpen(false);
  };

  // Calculate new balance after operation
  const calculatedNewBalance = useMemo(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) return null;
    
    let newBalance = effectiveCreditBalance;
    const change = operationType === 'add' ? Math.abs(numericAmount) : -Math.abs(numericAmount);
    newBalance += change;
    
    // If adding and there's personal debt, it will be cleared from the new balance
    if (operationType === 'add' && personalDebt > 0) {
      newBalance -= personalDebt;
    }
    
    return newBalance;
  }, [effectiveCreditBalance, amount, operationType, personalDebt]);

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
            Rychlá práce s kreditem
          </DialogTitle>
        </DialogHeader>
        
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
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.name : "Vyhledat klienta..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Zadejte jméno klienta..." 
                    value={clientSearchQuery}
                    onValueChange={setClientSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Klient nenalezen.</CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => handleClientSelect(client.id)}
                          className="flex items-center justify-between"
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

          {/* Show client credit if selected - unified display */}
          {selectedClient && !budgetLoading && (
            <div className="p-3 rounded-xl bg-secondary/50 space-y-2">
              {/* Shared budget indicator */}
              {sharedBudgetInfo?.isShared && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full w-fit">
                  <Users className="w-3 h-3" />
                  {sharedBudgetInfo.groupName || 'Sdílený účet'}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {sharedBudgetInfo?.isShared ? 'Sdílený kredit:' : 'Aktuální kredit:'}
                </span>
                <span className={cn(
                  "font-semibold",
                  effectiveCreditBalance < 0 ? "text-destructive" : 
                  effectiveCreditBalance < 500 ? "text-warning" : "text-success"
                )}>
                  {formatCurrency(effectiveCreditBalance)}
                </span>
              </div>
              
              {/* Personal debt warning */}
              {personalDebt > 0 && operationType === 'add' && (
                <div className="text-xs text-warning p-2 rounded bg-warning/10">
                  Osobní dluh {formatCurrency(personalDebt)} bude automaticky vyrovnán
                </div>
              )}
            </div>
          )}

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
            <Label htmlFor="amount">Částka (Kč) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Zadejte částku"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              className="text-lg"
            />
          </div>

          {/* Tag selection */}
          <div className="space-y-2">
            <Label>Způsob platby</Label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte způsob platby" />
              </SelectTrigger>
              <SelectContent>
                {paymentTags.length > 0 ? (
                  paymentTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3 h-3 text-primary" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Žádné tagy - vytvořte je v nastavení
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tagy můžete spravovat v Nastavení → Platební tagy
            </p>
          </div>

          {/* Note input */}
          <div className="space-y-2">
            <Label htmlFor="note">Poznámka (volitelné)</Label>
            <Textarea
              id="note"
              placeholder="Zadejte poznámku k transakci..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Preview of new balance - unified calculation */}
          {selectedClient && calculatedNewBalance !== null && (
            <div className={cn(
              "p-4 rounded-xl border",
              operationType === 'add' 
                ? "bg-success/10 border-success/20" 
                : "bg-destructive/10 border-destructive/20"
            )}>
              <p className="text-sm text-muted-foreground">
                {sharedBudgetInfo?.isShared ? 'Nový sdílený zůstatek:' : 'Nový zůstatek:'}
              </p>
              <p className={cn(
                "text-2xl font-bold",
                calculatedNewBalance < 0 ? "text-destructive" : operationType === 'add' ? "text-success" : "text-foreground"
              )}>
                {formatCurrency(calculatedNewBalance)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
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
            onClick={handleSubmit}
            disabled={!selectedClientId || !amount || parseFloat(amount) === 0 || isProcessing}
          >
            {isProcessing ? 'Zpracovávám...' : 'Potvrdit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}