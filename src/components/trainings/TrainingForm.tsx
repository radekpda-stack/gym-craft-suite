import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingInput } from "@/components/ui/rating-input";
import { DateTimePicker, DurationPicker } from "@/components/ui/date-time-picker";
import { Client } from "@/hooks/useClients";

const trainingFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  duration: z.number().min(15, "Minimálně 15 minut").max(300, "Maximálně 300 minut"),
  notes: z.string().optional(),
  subjective_rating: z.number().min(1).max(10).optional().nullable(),
  status: z.enum(["scheduled", "completed", "canceled"]),
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;

interface TrainingFormProps {
  onSubmit: (data: TrainingFormValues) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultValues?: Partial<TrainingFormValues>;
  submitLabel?: string;
}

export function TrainingForm({
  onSubmit,
  isLoading,
  clients,
  defaultValues,
  submitLabel = "Vytvořit trénink",
}: TrainingFormProps) {
  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      client_id: defaultValues?.client_id || "",
      date: defaultValues?.date || new Date().toISOString().slice(0, 16),
      duration: defaultValues?.duration || 60,
      notes: defaultValues?.notes || "",
      subjective_rating: defaultValues?.subjective_rating || null,
      status: defaultValues?.status || "scheduled",
    },
  });

  const handleSubmit = async (data: TrainingFormValues) => {
    await onSubmit(data);
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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Poznámky k tréninku..."
                  className="bg-secondary border-border min-h-[100px]"
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