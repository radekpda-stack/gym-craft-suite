import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Plus, 
  Copy, 
  ExternalLink, 
  Check, 
  Mail, 
  QrCode,
  Calendar,
  Loader2,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import { useCreateNutritionLogSession } from '@/hooks/useNutritionLog';
import { cn } from '@/lib/utils';

interface NewCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}

type DurationOption = 3 | 5 | 7 | 14;
type StartOption = 'today' | 'tomorrow' | 'custom';

export function NewCampaignModal({ open, onOpenChange, preselectedClientId }: NewCampaignModalProps) {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const createSession = useCreateNutritionLogSession();
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null);
  const [duration, setDuration] = useState<DurationOption>(7);
  const [startOption, setStartOption] = useState<StartOption>('today');
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [generateLink, setGenerateLink] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients.filter(c => !c.is_archived);
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      !c.is_archived && c.name.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const getStartDate = (): Date => {
    switch (startOption) {
      case 'today': return new Date();
      case 'tomorrow': return addDays(new Date(), 1);
      case 'custom': return new Date(customDate);
      default: return new Date();
    }
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error('Vyberte klienta');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDate = getStartDate();
      const result = await createSession.mutateAsync({ 
        clientId: selectedClientId, 
        startDate 
      });
      
      setCreatedToken(result.token);
      setShowSuccess(true);
      
      toast.success('Kampaň vytvořena');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Nepodařilo se vytvořit kampaň');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!createdToken) return;
    const url = `${window.location.origin}/nutrition-log/${createdToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz zkopírován');
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
  };

  const openForm = () => {
    if (!createdToken) return;
    window.open(`/nutrition-log/${createdToken}`, '_blank');
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setSelectedClientId(preselectedClientId || null);
      setDuration(7);
      setStartOption('today');
      setSearchQuery('');
      setCreatedToken(null);
      setShowSuccess(false);
    }, 300);
  };

  if (showSuccess && createdToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Kampaň vytvořena
            </DialogTitle>
            <DialogDescription>
              Stravovací kampaň pro {selectedClient?.name} byla úspěšně vytvořena.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Detail kampaně:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Klient: <span className="text-foreground">{selectedClient?.name}</span></p>
                <p>Délka: <span className="text-foreground">{duration} dní</span></p>
                <p>Start: <span className="text-foreground">{format(getStartDate(), 'd. MMMM yyyy', { locale: cs })}</span></p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={copyLink} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Kopírovat odkaz
              </Button>
              <Button variant="outline" onClick={openForm} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Otevřít formulář
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleClose}>
              Zavřít
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nová stravovací kampaň
          </DialogTitle>
          <DialogDescription>
            Vytvořte 7denní stravovací log pro klienta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Selection */}
          <div className="space-y-3">
            <Label>Klient</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                <span className="font-medium">{selectedClient.name}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedClientId(null)}
                >
                  Změnit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Hledat klienta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[160px] border rounded-lg">
                  {clientsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Žádní klienti nenalezeni
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                            "hover:bg-muted",
                            selectedClientId === client.id && "bg-primary/10 text-primary"
                          )}
                        >
                          {client.name}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <Label>Délka kampaně</Label>
            <RadioGroup
              value={duration.toString()}
              onValueChange={(v) => setDuration(parseInt(v) as DurationOption)}
              className="grid grid-cols-4 gap-2"
            >
              {[3, 5, 7, 14].map((d) => (
                <div key={d}>
                  <RadioGroupItem
                    value={d.toString()}
                    id={`duration-${d}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`duration-${d}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all",
                      "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                      d === 7 && "ring-1 ring-primary/30"
                    )}
                  >
                    <span className="text-lg font-bold">{d}</span>
                    <span className="text-xs text-muted-foreground">
                      {d === 1 ? 'den' : d < 5 ? 'dny' : 'dní'}
                    </span>
                    {d === 7 && (
                      <span className="text-[10px] text-primary mt-1">doporučeno</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Start Date Selection */}
          <div className="space-y-3">
            <Label>Start kampaně</Label>
            <RadioGroup
              value={startOption}
              onValueChange={(v) => setStartOption(v as StartOption)}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { value: 'today', label: 'Dnes' },
                { value: 'tomorrow', label: 'Zítra' },
                { value: 'custom', label: 'Vlastní' },
              ].map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={`start-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`start-${option.value}`}
                    className={cn(
                      "flex items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all",
                      "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {startOption === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
          </div>

          {/* Send Options */}
          <div className="space-y-3">
            <Label>Odeslání</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="generate-link" 
                  checked={generateLink}
                  onCheckedChange={(c) => setGenerateLink(c === true)}
                />
                <label
                  htmlFor="generate-link"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Vygenerovat odkaz
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="send-email" 
                  checked={sendEmail}
                  onCheckedChange={(c) => setSendEmail(c === true)}
                  disabled={!selectedClient?.email}
                />
                <label
                  htmlFor="send-email"
                  className={cn(
                    "text-sm font-medium leading-none cursor-pointer",
                    !selectedClient?.email && "text-muted-foreground"
                  )}
                >
                  Odeslat e-mailem
                  {!selectedClient?.email && selectedClientId && (
                    <span className="text-xs ml-1">(klient nemá email)</span>
                  )}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-qr" 
                  checked={showQR}
                  onCheckedChange={(c) => setShowQR(c === true)}
                />
                <label
                  htmlFor="show-qr"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Zobrazit QR kód
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Zrušit
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedClientId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vytvářím...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Vytvořit & Odeslat
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
