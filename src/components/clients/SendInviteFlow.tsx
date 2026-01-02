import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, Link, Mail, Send } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateClient } from "@/hooks/useClients";
import { useCreateClientPreDiagnostic } from "@/hooks/usePreDiagnosticForms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const sendInviteSchema = z.object({
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  email: z.string().email("Neplatná emailová adresa"),
  phone: z.string().optional(),
});

type SendInviteFormValues = z.infer<typeof sendInviteSchema>;

interface SendInviteFlowProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SendInviteFlow({ onSuccess, onCancel }: SendInviteFlowProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  const createClient = useCreateClient();
  const createPreDiagnostic = useCreateClientPreDiagnostic();
  
  const form = useForm<SendInviteFormValues>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const isLoading = createClient.isPending || createPreDiagnostic.isPending;

  const handleSubmit = async (data: SendInviteFormValues) => {
    try {
      // Create client first
      const client = await createClient.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        trainingGoals: [],
        notes: '',
        healthRestrictions: '',
        creditBalance: 0,
        feedbackEnabled: true,
      });
      
      if (!client) {
        throw new Error("Nepodařilo se vytvořit klienta");
      }

      // Create pre-diagnostic for the client
      const preDiag = await createPreDiagnostic.mutateAsync(client.id);
      
      if (!preDiag) {
        throw new Error("Nepodařilo se vytvořit pre-diagnostiku");
      }

      // Generate link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/pre-diagnostic/${preDiag.token}`;
      
      setGeneratedLink(link);
      setClientName(data.name);
      setStep('success');
      
      toast.success("Klient vytvořen a odkaz vygenerován");
    } catch (error: any) {
      toast.error(error.message || "Chyba při vytváření klienta");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Odkaz zkopírován");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nepodařilo se zkopírovat odkaz");
    }
  };

  if (step === 'success') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-medium">Klient vytvořen</h3>
          <p className="text-sm text-muted-foreground">
            {clientName} byl úspěšně vytvořen
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4 text-muted-foreground" />
            Odkaz na pre-diagnostiku
          </label>
          <div className="flex gap-2">
            <Input
              value={generatedLink}
              readOnly
              className="bg-secondary text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className={cn(
                "shrink-0 transition-colors",
                copied && "bg-emerald-500/10 border-emerald-500/50"
              )}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Platnost: 7 dní • Po vyplnění se data propojí s klientem
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={copyToClipboard}
          >
            <Copy className="w-4 h-4 mr-2" />
            Zkopírovat odkaz
          </Button>
          <Button
            className="flex-1"
            onClick={onSuccess}
          >
            Zavřít
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Odkaz pro klienta
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Klient obdrží odkaz a vyplní pre-diagnostiku sám. 
                Po vyplnění se data automaticky propojí s jeho kartou.
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jméno *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Jan Novák"
                  className="bg-secondary border-border"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="jan@example.com"
                  className="bg-secondary border-border"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input
                  placeholder="+420 123 456 789"
                  className="bg-secondary border-border"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Zrušit
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vytvářím...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Vytvořit a vygenerovat odkaz
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
