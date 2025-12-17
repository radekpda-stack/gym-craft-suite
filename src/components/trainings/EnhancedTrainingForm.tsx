import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Tag, Search, Check, AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateTimePicker, DurationPicker } from "@/components/ui/date-time-picker";
import { TrainingTagsSelector } from "./TrainingTagsSelector";
import { Client } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { useSharedBudgetBalance } from "@/hooks/useSharedBudgetBalance";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  participant_count: z.number().min(1, "Minimálně 1 účastník").max(10, "Maximálně 10 účastníků"),
  notes: z.string().optional(),
  training_type: z.string().optional(),
  price_override: z.number().optional(),
});

export type EnhancedTrainingFormValues = z.infer<typeof trainingFormSchema>;

interface EnhancedTrainingFormProps {
  onSubmit: (data: EnhancedTrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultValues?: Partial<EnhancedTrainingFormValues>;
  defaultTagIds?: string[];
  trainingPrices: Record<string, number>;
  submitLabel?: string;
}

// Helper to remove diacritics for search
const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function EnhancedTrainingForm({
  onSubmit,
  isLoading,
  clients,
  defaultValues,
  defaultTagIds = [],
  trainingPrices,
  submitLabel = "Vytvořit trénink",
}: EnhancedTrainingFormProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultTagIds);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);
  
  // Helper to format date as local datetime string
  const getLocalDateTimeString = () => {
    const now = new Date();
    // Round to next hour
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const form = useForm<EnhancedTrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      client_id: defaultValues?.client_id || "",
      date: defaultValues?.date || getLocalDateTimeString(),
      duration: defaultValues?.duration || 60,
      participant_count: defaultValues?.participant_count || 1,
      notes: defaultValues?.notes || "",
      training_type: defaultValues?.training_type || "",
      price_override: undefined,
    },
  });

  const selectedClientId = form.watch("client_id");
  const participantCount = form.watch("participant_count");
  const priceOverride = form.watch("price_override");

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  // Get shared budget info
  const { data: sharedBudget } = useSharedBudgetBalance(selectedClientId);
  
  // Calculate auto price based on participant count
  const autoPrice = useMemo(() => {
    const key = participantCount >= 3 ? '3' : participantCount.toString();
    return trainingPrices[key] || 800;
  }, [participantCount, trainingPrices]);
  
  const finalPrice = priceOverrideEnabled && priceOverride !== undefined ? priceOverride : autoPrice;
  
  // Calculate available credit
  const availableCredit = useMemo(() => {
    if (sharedBudget?.isShared) {
      return sharedBudget.sharedBalance || 0;
    }
    return selectedClient?.credit_balance || 0;
  }, [selectedClient, sharedBudget]);

  // Filtered clients with diacritics-insensitive search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.filter(c => !c.is_archived);
    const searchNorm = removeDiacritics(clientSearch);
    return clients
      .filter(c => !c.is_archived)
      .filter(c => removeDiacritics(c.name).includes(searchNorm));
  }, [clients, clientSearch]);

  const handleSubmit = async (data: EnhancedTrainingFormValues) => {
    // Set final price in data
    const submitData = {
      ...data,
      price_override: finalPrice,
    };
    await onSubmit(submitData, selectedTagIds);
  };

  // Credit status indicator
  const getCreditStatus = () => {
    if (!selectedClient) return null;
    
    if (availableCredit >= finalPrice) {
      return { color: "text-success", bg: "bg-success/10", label: "Dostatečný kredit", icon: Check };
    } else if (availableCredit > 0) {
      return { color: "text-warning", bg: "bg-warning/10", label: `Částečný kredit (chybí ${(finalPrice - availableCredit).toLocaleString('cs-CZ')} Kč)`, icon: AlertTriangle };
    } else {
      return { color: "text-destructive", bg: "bg-destructive/10", label: "Bez kreditu", icon: AlertTriangle };
    }
  };

  const creditStatus = getCreditStatus();


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* 1. Client Selection */}
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Klient *</FormLabel>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between bg-secondary border-border h-12 text-base",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedClient?.name || "Vyberte klienta..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Hledat klienta..." 
                      value={clientSearch}
                      onValueChange={setClientSearch}
                      className="h-11"
                    />
                    <CommandList>
                      <CommandEmpty>Žádný klient nenalezen.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => {
                              field.onChange(client.id);
                              setClientSearch("");
                              setClientPopoverOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <span>{client.name}</span>
                            </div>
                            <span className={cn(
                              "text-sm font-medium",
                              (client.credit_balance || 0) >= autoPrice ? "text-success" :
                              (client.credit_balance || 0) > 0 ? "text-warning" : "text-destructive"
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Credit Status Banner */}
        {selectedClient && creditStatus && (
          <div className={cn("p-3 rounded-xl flex items-center gap-3", creditStatus.bg)}>
            <creditStatus.icon className={cn("w-5 h-5", creditStatus.color)} />
            <div className="flex-1">
              <p className={cn("text-sm font-medium", creditStatus.color)}>{creditStatus.label}</p>
              <p className="text-xs text-muted-foreground">
                Kredit: {availableCredit.toLocaleString('cs-CZ')} Kč
                {sharedBudget?.isShared && " (sdílený účet)"}
              </p>
            </div>
          </div>
        )}

        {/* 2. Date and Time */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum a čas *</FormLabel>
              <FormControl>
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Vyberte datum a čas"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3 & 4. Participant count + Duration in row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="participant_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Počet osob</FormLabel>
                <Select 
                  onValueChange={(v) => field.onChange(parseInt(v))} 
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border h-11">
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osob'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Délka</FormLabel>
                <FormControl>
                  <DurationPicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 5. Price - Auto with override option */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Cena tréninku</FormLabel>
            <button
              type="button"
              onClick={() => setPriceOverrideEnabled(!priceOverrideEnabled)}
              className="text-xs text-primary hover:underline"
            >
              {priceOverrideEnabled ? "Použít automatickou cenu" : "Upravit ručně"}
            </button>
          </div>
          
          {priceOverrideEnabled ? (
            <FormField
              control={form.control}
              name="price_override"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={autoPrice.toString()}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="bg-secondary border-border h-11"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Automatická cena: {autoPrice.toLocaleString('cs-CZ')} Kč
                  </FormDescription>
                </FormItem>
              )}
            />
          ) : (
            <div className="h-11 px-4 rounded-lg bg-secondary border border-border flex items-center justify-between">
              <span className="text-lg font-semibold">{finalPrice.toLocaleString('cs-CZ')} Kč</span>
              <span className="text-xs text-muted-foreground">
                {participantCount} {participantCount === 1 ? 'osoba' : participantCount < 5 ? 'osoby' : 'osob'}
              </span>
            </div>
          )}
        </div>


        {/* Training Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Štítky tréninku
          </label>
          <TrainingTagsSelector
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Poznámky k tréninku..."
                  className="bg-secondary border-border min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}