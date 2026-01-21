import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, Link, Mail, Send, Zap, User } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateClient } from "@/hooks/useClients";
import { useCreateClientPreDiagnostic, useCreatePreDiagnosticInvite } from "@/hooks/usePreDiagnosticForms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Schema for optional pre-fill form - all fields optional
const sendInviteSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Neplatná emailová adresa").optional().or(z.literal('')),
  phone: z.string().optional(),
});

type SendInviteFormValues = z.infer<typeof sendInviteSchema>;

interface SendInviteFlowProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type InviteMode = 'select' | 'quick' | 'prefilled' | 'success';

export function SendInviteFlow({ onSuccess, onCancel }: SendInviteFlowProps) {
  const [mode, setMode] = useState<InviteMode>('select');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  const createClient = useCreateClient();
  const createPreDiagnostic = useCreateClientPreDiagnostic();
  const createInvite = useCreatePreDiagnosticInvite();
  
  const form = useForm<SendInviteFormValues>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  });

  const isLoading = createClient.isPending || createPreDiagnostic.isPending || createInvite.isPending;

  // Quick link - no client data, just generate invite
  const handleQuickLink = async () => {
    try {
      const preDiag = await createInvite.mutateAsync();
      
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/pre-diagnostic/${preDiag.token}`;
      
      setGeneratedLink(link);
      setClientName('');
      setMode('success');
      
      toast.success("Odkaz vygenerován");
    } catch (error: any) {
      toast.error(error.message || "Chyba při vytváření odkazu");
    }
  };

  // Prefilled - create client first, then generate link
  const handlePrefilledSubmit = async (data: SendInviteFormValues) => {
    try {
      // Must have at least name and email for prefilled mode
      if (!data.first_name || !data.last_name || !data.email) {
        toast.error("Pro předvyplnění vyplňte jméno a email");
        return;
      }
      
      const fullName = `${data.first_name} ${data.last_name}`.trim();
      const client = await createClient.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
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

      const preDiag = await createPreDiagnostic.mutateAsync(client.id);
      
      if (!preDiag) {
        throw new Error("Nepodařilo se vytvořit pre-diagnostiku");
      }

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/pre-diagnostic/${preDiag.token}`;
      
      setGeneratedLink(link);
      setClientName(fullName);
      setMode('success');
      
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

  // Success screen
  if (mode === 'success') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-medium">
            {clientName ? 'Klient vytvořen' : 'Odkaz vytvořen'}
          </h3>
          {clientName && (
            <p className="text-sm text-muted-foreground">
              {clientName} byl úspěšně vytvořen
            </p>
          )}
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
                copied && "bg-success/10 border-success/50"
              )}
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Platnost: 7 dní • {clientName 
              ? 'Po vyplnění se data propojí s klientem'
              : 'Klient vyplní všechny údaje sám'}
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

  // Mode selection
  if (mode === 'select') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vyberte způsob vytvoření odkazu pro klienta.
        </p>
        
        {/* Quick link option */}
        <button
          type="button"
          onClick={handleQuickLink}
          disabled={isLoading}
          className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Rychlý odkaz</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vygenerovat odkaz ihned. Klient vyplní všechny údaje sám včetně jména a emailu.
            </p>
          </div>
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </button>

        {/* Prefilled option */}
        <button
          type="button"
          onClick={() => setMode('prefilled')}
          disabled={isLoading}
          className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">S předvyplněním</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Předvyplnit údaje klienta (jméno, email). Klient pak jen doplní zbylé informace.
            </p>
          </div>
        </button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onCancel}
        >
          Zrušit
        </Button>
      </div>
    );
  }

  // Prefilled form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handlePrefilledSubmit)} className="space-y-4">
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">
                Předvyplnit údaje klienta
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Tyto údaje budou předvyplněny ve formuláři. Klient je uvidí a doplní zbytek.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Křestní jméno *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jan"
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
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Příjmení *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Novák"
                    className="bg-secondary border-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
            onClick={() => setMode('select')}
          >
            Zpět
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
                Vytvořit odkaz
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
