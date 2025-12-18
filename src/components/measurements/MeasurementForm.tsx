import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RatingInput } from "@/components/ui/rating-input";
import { DatePicker } from "@/components/ui/date-time-picker";
import { ClientSearchSelect } from "@/components/ui/client-search-select";
import { Client } from "@/hooks/useClients";

const measurementFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  weight: z.number().min(0.1, "Váha musí být kladná").optional(),
  body_fat_percentage: z.number().min(0).max(100, "Max 100%").optional(),
  muscle_mass: z.number().min(0.1, "Hodnota musí být kladná").optional(),
  basal_metabolism: z.number().min(1, "Hodnota musí být kladná").optional(),
  waist: z.number().min(0.1, "Hodnota musí být kladná").optional(),
  chest: z.number().min(0.1, "Hodnota musí být kladná").optional(),
  hips: z.number().min(0.1, "Hodnota musí být kladná").optional(),
  mental_state: z.number().min(1).max(10).optional().nullable(),
  notes: z.string().max(500, "Max 500 znaků").optional(),
});

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center gap-1">
    {children}
    <span className="text-destructive">*</span>
  </span>
);

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

interface MeasurementFormProps {
  onSubmit: (data: MeasurementFormValues) => Promise<string | void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function MeasurementForm({
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: MeasurementFormProps) {
  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      client_id: defaultClientId || "",
      date: new Date().toISOString().split('T')[0],
      weight: undefined,
      body_fat_percentage: undefined,
      muscle_mass: undefined,
      basal_metabolism: undefined,
      waist: undefined,
      chest: undefined,
      hips: undefined,
      mental_state: null,
      notes: "",
    },
  });

  const handleSubmit = async (data: MeasurementFormValues) => {
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
              <FormLabel><RequiredLabel>Klient</RequiredLabel></FormLabel>
              <FormControl>
                <ClientSearchSelect
                  clients={clients}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Vyhledat klienta..."
                  filterArchived={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel><RequiredLabel>Datum</RequiredLabel></FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Vyberte datum"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Váha (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="75.5"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body_fat_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tuk (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15.5"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="muscle_mass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Svalová hmota (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="35.0"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basal_metabolism"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bazální metabolismus (kcal)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1800"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="chest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hrudník (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="waist"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pas (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hips"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Boky (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    className="bg-secondary border-border"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="mental_state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mentální stav (1-10)</FormLabel>
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
                  placeholder="Poznámky k měření..."
                  className="bg-secondary border-border min-h-[80px]"
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
            "Uložit měření"
          )}
        </Button>
      </form>
    </Form>
  );
}
