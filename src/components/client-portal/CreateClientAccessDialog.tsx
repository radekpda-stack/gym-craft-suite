import { useState } from 'react';
import { Copy, Check, Key, AlertTriangle, Mail, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CreateClientAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  onSuccess?: () => void;
}

interface AccessCredentials {
  email: string;
  password: string;
  isNewAccount: boolean;
}

export function CreateClientAccessDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  onSuccess,
}: CreateClientAccessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<AccessCredentials | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccess = async () => {
    if (!clientEmail) {
      setError('Klient nemá vyplněný email. Přidejte email do profilu klienta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'create-client-portal-access',
        {
          body: { client_id: clientId },
        }
      );

      if (invokeError) {
        console.error('Create access invoke error:', invokeError);
        setError('Nepodařilo se připojit k serveru');
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.success) {
        setCredentials({
          email: data.email,
          password: data.password,
          isNewAccount: data.isNewAccount,
        });
        toast.success(data.isNewAccount ? 'Přístup vytvořen!' : 'Heslo resetováno!');
        onSuccess?.();
      }
    } catch (err) {
      console.error('Create access error:', err);
      setError('Neočekávaná chyba');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    
    const text = `Email: ${credentials.email}\nHeslo: ${credentials.password}`;
    await navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    toast.success('Údaje zkopírovány');
    setTimeout(() => setCopiedCredentials(false), 2000);
  };

  const handleCopyMessage = async () => {
    if (!credentials) return;
    
    const message = `Dobrý den,

vaše přihlašovací údaje do klientského portálu:

Email: ${credentials.email}
Heslo: ${credentials.password}

Přihlaste se na: ${window.location.origin}/zona/login

Po přihlášení si můžete heslo změnit v nastavení.

S pozdravem,
Váš trenér`;

    await navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    toast.success('Zpráva zkopírována');
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleClose = () => {
    setCredentials(null);
    setError(null);
    setCopiedCredentials(false);
    setCopiedMessage(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {credentials ? 'Přihlašovací údaje' : 'Přístup do klientské zóny'}
          </DialogTitle>
          <DialogDescription>
            {credentials 
              ? `Údaje pro ${clientName}` 
              : `Vytvořte přístup pro ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!clientEmail ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Klient nemá vyplněný email. Přidejte email do profilu klienta.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Email klienta</Label>
                  <Input value={clientEmail} disabled className="bg-muted" />
                </div>

                <p className="text-sm text-muted-foreground">
                  Kliknutím vytvoříte přístup a vygenerujete heslo.
                  Heslo se zobrazí pouze jednou.
                </p>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Zrušit
                  </Button>
                  <Button onClick={handleCreateAccess} disabled={loading}>
                    {loading ? 'Vytvářím...' : 'Vytvořit přístup'}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-warning/10 border-warning text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Heslo se zobrazuje pouze jednou!</strong>
                <br />
                Pokud ho ztratíte, použijte "Resetovat heslo".
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input 
                  value={credentials.email} 
                  readOnly 
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Heslo
                </Label>
                <Input 
                  value={credentials.password} 
                  readOnly 
                  className="font-mono text-lg tracking-wider bg-muted"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCopyCredentials}
                variant="outline"
                className="w-full gap-2"
              >
                {copiedCredentials ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Kopírovat údaje
              </Button>

              <Button
                onClick={handleCopyMessage}
                className="w-full gap-2"
              >
                {copiedMessage ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Kopírovat zprávu pro klienta
              </Button>
            </div>

            <div className="pt-2">
              <Button variant="ghost" onClick={handleClose} className="w-full">
                Zavřít
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
