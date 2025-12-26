import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Key, 
  Shield, 
  ShieldOff, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateClientAccessDialog } from './CreateClientAccessDialog';
import { EditCredentialsDialog } from './EditCredentialsDialog';

interface ClientPortalAccessSectionProps {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
}

interface ClientAccountInfo {
  id: string;
  status: string;
  last_portal_login: string | null;
  last_password_reset_at: string | null;
  created_at: string;
  auth_user_id: string | null;
  portal_password: string | null;
}

export function ClientPortalAccessSection({
  clientId,
  clientName,
  clientEmail,
}: ClientPortalAccessSectionProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: accountInfo, isLoading } = useQuery({
    queryKey: ['client-portal-access', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('id, status, last_portal_login, last_password_reset_at, created_at, auth_user_id, portal_password')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientAccountInfo | null;
    },
  });

  const hasAccess = !!accountInfo?.auth_user_id;
  const isActive = accountInfo?.status === 'active';

  const handleToggleAccess = async () => {
    if (!accountInfo) return;

    setToggling(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'disable-client-portal-access',
        {
          body: { 
            client_id: clientId, 
            disabled: isActive 
          },
        }
      );

      if (error) {
        console.error('Toggle access error:', error);
        toast.error('Nepodařilo se změnit stav přístupu');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      toast.success(isActive ? 'Přístup deaktivován' : 'Přístup aktivován');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Neočekávaná chyba');
    } finally {
      setToggling(false);
    }
  };

  const handleRemoveAccess = async () => {
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'remove-client-portal-access',
        {
          body: { client_id: clientId },
        }
      );

      if (error) {
        console.error('Remove access error:', error);
        toast.error('Nepodařilo se odebrat přístup');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      toast.success('Přístup do portálu byl odebrán');
      setRemoveDialogOpen(false);
    } catch (err) {
      console.error('Remove error:', err);
      toast.error('Neočekávaná chyba');
    } finally {
      setRemoving(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!accountInfo?.portal_password) return;
    
    try {
      await navigator.clipboard.writeText(accountInfo.portal_password);
      setCopied(true);
      toast.success('Heslo zkopírováno');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Nepodařilo se zkopírovat heslo');
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
    queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5 shrink-0" />
            Klientská zóna
          </CardTitle>
          <CardDescription>
            Přístup klienta do portálu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium shrink-0">Stav</span>
            {!hasAccess ? (
              <Badge variant="outline" className="gap-1 shrink-0">
                <XCircle className="w-3 h-3" />
                Bez přístupu
              </Badge>
            ) : isActive ? (
              <Badge className="gap-1 bg-success/10 text-success border-success/20 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Aktivní
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 shrink-0">
                <ShieldOff className="w-3 h-3" />
                Deaktivovaný
              </Badge>
            )}
          </div>

          {/* Email */}
          {clientEmail && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Email pro login</span>
              <span className="text-sm text-muted-foreground truncate">{clientEmail}</span>
            </div>
          )}

          {/* Password */}
          {hasAccess && accountInfo?.portal_password && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Heslo</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {showPassword ? accountInfo.portal_password : '••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyPassword}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditDialogOpen(true)}
                  title="Upravit přihlašovací údaje"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Last login */}
          {hasAccess && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Poslední přihlášení</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                {accountInfo?.last_portal_login 
                  ? format(new Date(accountInfo.last_portal_login), 'd. M. yyyy HH:mm', { locale: cs })
                  : 'Nikdy'}
              </span>
            </div>
          )}

          {/* Last password reset */}
          {hasAccess && accountInfo?.last_password_reset_at && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Poslední reset hesla</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(accountInfo.last_password_reset_at), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {!hasAccess ? (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="w-full gap-2"
                disabled={!clientEmail}
              >
                <Key className="w-4 h-4" />
                Vytvořit přístup
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resetovat heslo
                </Button>

                <Button 
                  onClick={handleToggleAccess}
                  variant={isActive ? 'secondary' : 'default'}
                  className="w-full gap-2"
                  disabled={toggling}
                >
                  {isActive ? (
                    <>
                      <ShieldOff className="w-4 h-4" />
                      {toggling ? 'Deaktivuji...' : 'Deaktivovat přístup'}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      {toggling ? 'Aktivuji...' : 'Aktivovat přístup'}
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setRemoveDialogOpen(true)}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Odebrat přístup
                </Button>
              </>
            )}

            {!clientEmail && (
              <p className="text-xs text-destructive text-center">
                Pro vytvoření přístupu přidejte klientovi email.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateClientAccessDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        onSuccess={handleSuccess}
      />

      {hasAccess && clientEmail && (
        <EditCredentialsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          clientId={clientId}
          clientName={clientName}
          currentEmail={clientEmail}
          currentPassword={accountInfo?.portal_password || null}
          onSuccess={handleSuccess}
        />
      )}

      {/* Remove access confirmation dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat přístup do portálu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tímto zcela odeberete přístup klienta <strong>{clientName}</strong> do klientského portálu. 
              Účet bude smazán a klient se již nebude moci přihlásit. 
              Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAccess}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Odebírám...' : 'Odebrat přístup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
