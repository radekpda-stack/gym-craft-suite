import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Repeat, Search, Check, ChevronDown, X, UserPlus } from "lucide-react";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Switch } from "@/components/ui/switch";
import { DateTimePicker, DurationPicker } from "@/components/ui/date-time-picker";
import { PreviousTrainingPreview } from "./PreviousTrainingPreview";
import { Client } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  additional_client_ids: z.array(z.string()).optional(),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  participant_count: z.number().min(1, "Minimálně 1 účastník").max(5, "Maximálně 5 účastníků"),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "canceled"]),
  training_type: z.string().optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_type: z.enum(["weekly", "biweekly", "monthly"]).optional().nullable(),
  recurrence_count: z.number().min(1).max(52).optional(),
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;

interface TrainingFormProps {
  onSubmit: (data: TrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultValues?: Partial<TrainingFormValues>;
  submitLabel?: string;
  showRecurrence?: boolean;
}

// Helper to remove diacritics for search
const removeDiacritics = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function TrainingForm({
  onSubmit,
  isLoading,
  clients,
  defaultValues,
  submitLabel = "Vytvořit trénink",
  showRecurrence = true,
}: TrainingFormProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [additionalClientSearch, setAdditionalClientSearch] = useState("");
  const [additionalClientPopoverOpen, setAdditionalClientPopoverOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  
  // Helper to format date as local datetime string
  const getLocalDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      client_id: defaultValues?.client_id || "",
      additional_client_ids: defaultValues?.additional_client_ids || [],
      date: defaultValues?.date || getLocalDateTimeString(),
      duration: defaultValues?.duration || 60,
      participant_count: defaultValues?.participant_count || 1,
      notes: defaultValues?.notes || "",
      status: defaultValues?.status || "scheduled",
      training_type: defaultValues?.training_type || null,
      is_recurring: false,
      recurrence_type: null,
      recurrence_count: 4,
    },
  });

  // Track unsaved changes (form dirty state)
  const isDirty = form.formState.isDirty;
  useUnsavedChanges(isDirty);

  const participantCount = form.watch("participant_count");
  const primaryClientId = form.watch("client_id");
  const additionalClientIds = form.watch("additional_client_ids") || [];

  // Filtered clients with diacritics-insensitive search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.filter(c => !c.is_archived);
    const searchNorm = removeDiacritics(clientSearch);
    return clients
      .filter(c => !c.is_archived)
      .filter(c => removeDiacritics(c.name).includes(searchNorm));
  }, [clients, clientSearch]);

  // Filtered clients for additional participants (exclude primary and already selected)
  const filteredAdditionalClients = useMemo(() => {
    const excludeIds = [primaryClientId, ...additionalClientIds].filter(Boolean);
    let filtered = clients.filter(c => !c.is_archived && !excludeIds.includes(c.id));
    
    if (additionalClientSearch) {
      const searchNorm = removeDiacritics(additionalClientSearch);
      filtered = filtered.filter(c => removeDiacritics(c.name).includes(searchNorm));
    }
    return filtered;
  }, [clients, additionalClientSearch, primaryClientId, additionalClientIds]);

  const selectedClient = clients.find(c => c.id === primaryClientId);
  const selectedAdditionalClients = clients.filter(c => additionalClientIds.includes(c.id));

  const isRecurring = form.watch("is_recurring");

  // Calculate how many additional clients can be added
  const maxAdditionalClients = Math.max(0, participantCount - 1);
  const canAddMore = additionalClientIds.length < maxAdditionalClients;

  const handleAddAdditionalClient = (clientId: string) => {
    if (!canAddMore) return;
    const current = form.getValues("additional_client_ids") || [];
    form.setValue("additional_client_ids", [...current, clientId], { shouldDirty: true });
    setAdditionalClientSearch("");
    setAdditionalClientPopoverOpen(false);
  };

  const handleRemoveAdditionalClient = (clientId: string) => {
    const current = form.getValues("additional_client_ids") || [];
    form.setValue("additional_client_ids", current.filter(id => id !== clientId), { shouldDirty: true });
  };

  const handleSubmit = async (data: TrainingFormValues) => {
    await onSubmit(data, []);
    form.reset(data); // Mark as clean after successful submit
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                        "w-full justify-between bg-secondary border-border h-11",
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
                      className="h-10"
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
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.name}
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

        {/* Previous Training Preview - shows when client is selected */}
        <PreviousTrainingPreview clientId={form.watch("client_id")} />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="col-span-2">
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

          <FormField
            control={form.control}
            name="participant_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Počet osob</FormLabel>
                <Select 
                  onValueChange={(v) => {
                    const newCount = parseInt(v);
                    field.onChange(newCount);
                    // Trim additional clients if new count is lower
                    const currentAdditional = form.getValues("additional_client_ids") || [];
                    if (currentAdditional.length > newCount - 1) {
                      form.setValue("additional_client_ids", currentAdditional.slice(0, newCount - 1));
                    }
                  }} 
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {[1, 2, 3, 4, 5].map((num) => (
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
        </div>

        {/* Additional Participants Section */}
        {participantCount > 1 && (
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="w-4 h-4" />
              <span>Další účastníci ({additionalClientIds.length}/{maxAdditionalClients})</span>
            </div>
            
            {/* Selected additional clients */}
            {selectedAdditionalClients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedAdditionalClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    <span>{client.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalClient(client.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more clients */}
            {canAddMore && (
              <Popover open={additionalClientPopoverOpen} onOpenChange={setAdditionalClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start bg-secondary border-border text-muted-foreground"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Přidat klienta...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Hledat klienta..." 
                      value={additionalClientSearch}
                      onValueChange={setAdditionalClientSearch}
                      className="h-10"
                    />
                    <CommandList>
                      <CommandEmpty>Žádný klient nenalezen.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {filteredAdditionalClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => handleAddAdditionalClient(client.id)}
                          >
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Délka tréninku</FormLabel>
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stav</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="scheduled">Naplánováno</SelectItem>
                  <SelectItem value="completed">Dokončeno</SelectItem>
                  <SelectItem value="canceled">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="training_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ tréninku</FormLabel>
              <FormControl>
                <TrainingTypeSelector
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurrence Settings */}
        {showRecurrence && form.watch("status") === "scheduled" && (
          <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Opakující se trénink
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Automaticky vytvořit sérii tréninků
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="recurrence_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frekvence</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Vyberte" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="weekly">Každý týden</SelectItem>
                          <SelectItem value="biweekly">Každé 2 týdny</SelectItem>
                          <SelectItem value="monthly">Každý měsíc</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurrence_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Počet opakování</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          className="bg-secondary border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Notes - Collapsible */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full justify-between px-0 hover:bg-transparent"
            >
              <span className="text-sm font-medium">Poznámky</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                notesOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Poznámky k tréninku - popište průběh, cviky, pokroky..."
                      className="bg-secondary border-border min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <Button type="submit" className="w-full" disabled={isLoading}>
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
