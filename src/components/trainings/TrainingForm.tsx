import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Repeat, Tag, Search, Check, AlertTriangle } from "lucide-react";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import { TrainingType } from "@/hooks/useTrainingProgress";
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
import { RatingInput } from "@/components/ui/rating-input";
import { DateTimePicker, DurationPicker } from "@/components/ui/date-time-picker";
import { TrainingTagsSelector } from "./TrainingTagsSelector";
import { PreviousTrainingPreview } from "./PreviousTrainingPreview";
import { Client } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Alert, AlertDescription } from "@/components/ui/alert";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  participant_count: z.number().min(1, "Minimálně 1 účastník").max(5, "Maximálně 5 účastníků"),
  notes: z.string().optional(),
  subjective_rating: z.number().min(1).max(10).optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "canceled"]),
  training_type: z.enum(["strength", "conditioning", "hiit", "cardio", "running", "mobility", "flexibility", "regeneration", "functional", "diagnostic", "other"]).optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_type: z.enum(["weekly", "biweekly", "monthly"]).optional().nullable(),
  recurrence_count: z.number().min(1).max(52).optional(),
  is_high_intensity_test: z.boolean().optional(), // Master Prompt: red flag brake
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;

interface TrainingFormProps {
  onSubmit: (data: TrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultValues?: Partial<TrainingFormValues>;
  defaultTagIds?: string[];
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
  defaultTagIds = [],
  submitLabel = "Vytvořit trénink",
  showRecurrence = true,
}: TrainingFormProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultTagIds);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [tagsChanged, setTagsChanged] = useState(false);
  
  
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
      date: defaultValues?.date || getLocalDateTimeString(),
      duration: defaultValues?.duration || 60,
      participant_count: defaultValues?.participant_count || 1,
      notes: defaultValues?.notes || "",
      subjective_rating: defaultValues?.subjective_rating || null,
      status: defaultValues?.status || "scheduled",
      training_type: defaultValues?.training_type || null,
      is_recurring: false,
      recurrence_type: null,
      recurrence_count: 4,
      is_high_intensity_test: defaultValues?.is_high_intensity_test || false,
    },
  });

  // Track unsaved changes (form dirty state + tags changed)
  const isDirty = form.formState.isDirty || tagsChanged;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    setSelectedTagIds(defaultTagIds);
  }, [defaultTagIds]);

  // Track tag changes
  const handleTagsChange = (newTagIds: string[]) => {
    setSelectedTagIds(newTagIds);
    setTagsChanged(true);
  };

  // Filtered clients with diacritics-insensitive search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.filter(c => !c.is_archived);
    const searchNorm = removeDiacritics(clientSearch);
    return clients
      .filter(c => !c.is_archived)
      .filter(c => removeDiacritics(c.name).includes(searchNorm));
  }, [clients, clientSearch]);

  const selectedClient = clients.find(c => c.id === form.watch("client_id"));

  const isRecurring = form.watch("is_recurring");

  const handleSubmit = async (data: TrainingFormValues) => {
    await onSubmit(data, selectedTagIds);
    form.reset(data); // Mark as clean after successful submit
    setTagsChanged(false);
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
                  onValueChange={(v) => field.onChange(parseInt(v))} 
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
                  onChange={(value) => field.onChange(value as TrainingType)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* High Intensity Test Toggle - Master Prompt: Red Flag Brake */}
        <FormField
          control={form.control}
          name="is_high_intensity_test"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/20">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Vědomě vyšší zátěž / testovací trénink
                </FormLabel>
                <FormDescription className="text-xs">
                  Red flags z feedbacku nebudou vyhodnoceny
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

        <FormField
          control={form.control}
          name="subjective_rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hodnocení tréninku (1-10)</FormLabel>
              <FormControl>
                <RatingInput
                  value={field.value}
                  onChange={field.onChange}
                  max={10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Training Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Štítky tréninku
          </label>
          <TrainingTagsSelector
            selectedTagIds={selectedTagIds}
            onChange={handleTagsChange}
          />
          <p className="text-xs text-muted-foreground">
            Volitelně přidejte štítky pro kategorizaci tréninku
          </p>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky</FormLabel>
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
