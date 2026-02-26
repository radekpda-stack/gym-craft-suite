import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Check, AlertTriangle, Dumbbell, Plus, X, Users } from "lucide-react";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Client } from "@/hooks/useClients";
import { TrainingPrices } from "@/hooks/useAppSettings";
import { cn } from "@/lib/utils";
import { useSharedBudgetBalance } from "@/hooks/useSharedBudgetBalance";
import { useFormTracking } from "@/hooks/useFormTracking";
import { Badge } from "@/components/ui/badge";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  additional_client_ids: z.array(z.string()).optional(),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  notes: z.string().optional(),
  training_type: z.string().optional(),
});

export type EnhancedTrainingFormValues = z.infer<typeof trainingFormSchema>;

interface EnhancedTrainingFormProps {
  onSubmit: (data: EnhancedTrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultValues?: Partial<EnhancedTrainingFormValues>;
  defaultTagIds?: string[];
  trainingPrices: TrainingPrices;
  submitLabel?: string;
  stickySubmit?: boolean;
  onClientChange?: (clientId: string | undefined) => void;
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
  stickySubmit = false,
  onClientChange,
}: EnhancedTrainingFormProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [additionalClientIds, setAdditionalClientIds] = useState<string[]>(
    defaultValues?.additional_client_ids || []
  );
  const [addClientPopoverOpen, setAddClientPopoverOpen] = useState(false);
  const [addClientSearch, setAddClientSearch] = useState("");
  
  // Form analytics tracking
  const { completeForm } = useFormTracking({
    formType: 'training_form',
  });
  
  // Use next available slot passed from parent, or fallback to next full hour
  const getLocalDateTimeString = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const nextHour = now.getHours() + 1;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(nextHour).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:00`;
  };

  const form = useForm<EnhancedTrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      client_id: defaultValues?.client_id || "",
      additional_client_ids: defaultValues?.additional_client_ids || [],
      date: defaultValues?.date || getLocalDateTimeString(),
      duration: defaultValues?.duration || 60,
      notes: defaultValues?.notes || "",
      training_type: defaultValues?.training_type || "",
    },
  });

  const selectedClientId = form.watch("client_id");
  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  // Notify parent when client changes (for dynamic pricing)
  useEffect(() => {
    onClientChange?.(selectedClientId || undefined);
  }, [selectedClientId, onClientChange]);
  
  // Calculate participant count from selected clients
  const participantCount = 1 + additionalClientIds.length;
  
  // Get shared budget info for primary client
  const { data: sharedBudget } = useSharedBudgetBalance(selectedClientId);
  
  // Calculate available credit
  const availableCredit = useMemo(() => {
    if (sharedBudget?.isShared) {
      return sharedBudget.sharedBalance || 0;
    }
    return selectedClient?.credit_balance || 0;
  }, [selectedClient, sharedBudget]);

  // Filtered clients with diacritics-insensitive search (excluding already selected)
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.filter(c => !c.is_archived);
    const searchNorm = removeDiacritics(clientSearch);
    return clients
      .filter(c => !c.is_archived)
      .filter(c => removeDiacritics(c.name).includes(searchNorm));
  }, [clients, clientSearch]);

  // Clients available for adding (excluding primary and already added)
  const availableClientsForAdd = useMemo(() => {
    const excludeIds = new Set([selectedClientId, ...additionalClientIds]);
    let filtered = clients.filter(c => !c.is_archived && !excludeIds.has(c.id));
    
    if (addClientSearch) {
      const searchNorm = removeDiacritics(addClientSearch);
      filtered = filtered.filter(c => removeDiacritics(c.name).includes(searchNorm));
    }
    
    return filtered;
  }, [clients, selectedClientId, additionalClientIds, addClientSearch]);

  const handleSubmit = async (data: EnhancedTrainingFormValues) => {
    // Include participant count calculated from clients
    const submitData = {
      ...data,
      additional_client_ids: additionalClientIds,
    };
    await onSubmit(submitData, []);
    completeForm();
  };

  const handleAddClient = (clientId: string) => {
    if (!additionalClientIds.includes(clientId)) {
      setAdditionalClientIds([...additionalClientIds, clientId]);
    }
    setAddClientSearch("");
    setAddClientPopoverOpen(false);
  };

  const handleRemoveAdditionalClient = (clientId: string) => {
    setAdditionalClientIds(additionalClientIds.filter(id => id !== clientId));
  };

  // Credit status indicator
  const getCreditStatus = () => {
    if (!selectedClient) return null;
    
    // Just show credit info, no price comparison needed during creation
    if (availableCredit > 0) {
      return { color: "text-success", bg: "bg-success/10", label: "Kredit k dispozici", icon: Check };
    } else {
      return { color: "text-warning", bg: "bg-warning/10", label: "Bez kreditu", icon: AlertTriangle };
    }
  };

  const creditStatus = getCreditStatus();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={stickySubmit ? "flex flex-col h-full" : "space-y-5"}>
        <div className={stickySubmit ? "flex-1 overflow-y-auto space-y-5" : "space-y-5"}>
          {/* 1. Client Selection */}
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-2">
                  Klient *
                  {participantCount > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {participantCount}
                    </Badge>
                  )}
                </FormLabel>
                <div className="flex gap-2">
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "flex-1 justify-between bg-secondary border-border h-12 text-base",
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
                                  // Remove from additional if selected as primary
                                  setAdditionalClientIds(prev => prev.filter(id => id !== client.id));
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
                                  (client.credit_balance || 0) > 0 ? "text-success" : "text-muted-foreground"
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
                  
                  {/* Add client button */}
                  <Popover open={addClientPopoverOpen} onOpenChange={setAddClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 shrink-0 bg-secondary border-border"
                        disabled={!selectedClientId}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0 pointer-events-auto" align="end">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Přidat dalšího klienta..." 
                          value={addClientSearch}
                          onValueChange={setAddClientSearch}
                          className="h-11"
                        />
                        <CommandList>
                          <CommandEmpty>Žádný klient k přidání.</CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-auto">
                            {availableClientsForAdd.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.id}
                                onSelect={() => handleAddClient(client.id)}
                                className="py-2"
                              >
                                <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{client.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional clients chips */}
          {additionalClientIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {additionalClientIds.map(clientId => {
                const client = clients.find(c => c.id === clientId);
                if (!client) return null;
                return (
                  <Badge 
                    key={clientId} 
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 gap-2"
                  >
                    {client.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalClient(clientId)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

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

          {/* Training Type */}
          <FormField
            control={form.control}
            name="training_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Typ tréninku
                </FormLabel>
                <FormControl>
                  <TrainingTypeSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Submit button - sticky on mobile when stickySubmit is true */}
        <div className={stickySubmit ? "sticky bottom-0 pt-4 pb-safe bg-card border-t border-border -mx-4 px-4" : ""}>
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
        </div>
      </form>
    </Form>
  );
}
