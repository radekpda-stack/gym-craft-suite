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
import { DatePicker } from "@/components/ui/date-time-picker";
import { Client } from "@/hooks/useClients";
import { JOINT_OPTIONS, MUSCLE_OPTIONS } from "@/hooks/useDiagnostics";

const diagnosticFormSchema = z.object({
  client_id: z.string().min(1, "Vyberte klienta"),
  date: z.string().min(1, "Zadejte datum"),
  area_type: z.enum(["joint", "muscle"], { required_error: "Vyberte typ oblasti" }),
  area_name: z.string().min(1, "Vyberte oblast"),
  findings: z.string().min(1, "Zadejte nález").max(2000, "Max 2000 znaků"),
  notes: z.string().optional(),
});

export type DiagnosticFormValues = z.infer<typeof diagnosticFormSchema>;

interface DiagnosticFormProps {
  onSubmit: (data: DiagnosticFormValues) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function DiagnosticForm({
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: DiagnosticFormProps) {
  const form = useForm<DiagnosticFormValues>({
    resolver: zodResolver(diagnosticFormSchema),
    defaultValues: {
      client_id: defaultClientId || "",
      date: new Date().toISOString().split('T')[0],
      area_type: undefined,
      area_name: "",
      findings: "",
      notes: "",
    },
  });

  const areaType = form.watch("area_type");
  const areaOptions = areaType === "joint" ? JOINT_OPTIONS : areaType === "muscle" ? MUSCLE_OPTIONS : [];

  const handleSubmit = async (data: DiagnosticFormValues) => {
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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum *</FormLabel>
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
            name="area_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typ oblasti *</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("area_name", "");
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Vyberte typ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="joint">Kloub</SelectItem>
                    <SelectItem value="muscle">Svalová skupina</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oblast *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!areaType}
                >
                  <FormControl>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={areaType ? "Vyberte oblast" : "Nejdřív vyberte typ"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {areaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
          name="findings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nález *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Popis nálezu, omezení, doporučení..."
                  className="bg-secondary border-border min-h-[120px]"
                  {...field}
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
                  placeholder="Další poznámky..."
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
            "Uložit diagnostiku"
          )}
        </Button>
      </form>
    </Form>
  );
}
