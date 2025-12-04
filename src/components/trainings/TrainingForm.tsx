import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Repeat, Tag } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { RatingInput } from "@/components/ui/rating-input";
import { DateTimePicker, DurationPicker } from "@/components/ui/date-time-picker";
import { TrainingTagsSelector } from "./TrainingTagsSelector";
import { Client } from "@/hooks/useClients";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  participant_count: z.number().min(1, "Minimálně 1 účastník").max(10, "Maximálně 10 účastníků"),
  notes: z.string().optional(),
  subjective_rating: z.number().min(1).max(10).optional().nullable(),
  status: z.enum(["scheduled", "completed", "canceled"]),
  // Recurrence fields
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
  defaultTagIds?: string[];
  submitLabel?: string;
  showRecurrence?: boolean;
}

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
  
  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      client_id: defaultValues?.client_id || "",
      date: defaultValues?.date || new Date().toISOString().slice(0, 16),
      duration: defaultValues?.duration || 60,
      participant_count: defaultValues?.participant_count || 1,
      notes: defaultValues?.notes || "",
      subjective_rating: defaultValues?.subjective_rating || null,
      status: defaultValues?.status || "scheduled",
      is_recurring: false,
      recurrence_type: null,
      recurrence_count: 4,
    },
  });

  useEffect(() => {
    setSelectedTagIds(defaultTagIds);
  }, [defaultTagIds]);

  const isRecurring = form.watch("is_recurring");

  const handleSubmit = async (data: TrainingFormValues) => {
    await onSubmit(data, selectedTagIds);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Klient *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Vyberte klienta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover border-border">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
            onChange={setSelectedTagIds}
          />
          <p className="text-xs text-muted-foreground">
            Přidejte štítky pro kategorizaci tréninku (např. horní část, síla, mobilita)
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