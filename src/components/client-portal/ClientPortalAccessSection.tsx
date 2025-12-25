import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Key, 
  KeyRound, 
  Shield, 
  ShieldOff, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateClientAccessDialog } from './CreateClientAccessDialog';

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
}

export function ClientPortalAccessSection({
  clientId,
  clientName,
  clientEmail,
}: ClientPortalAccessSectionProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data: accountInfo, isLoading } = useQuery({
    queryKey: ['client-portal-access', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('id, status, last_portal_login, last_password_reset_at, created_at, auth_user_id')
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
            <Key className="w-5 h-5" />
            Klientská zóna
          </CardTitle>
          <CardDescription>
            Přístup klienta do portálu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stav</span>
            {!hasAccess ? (
              <Badge variant="outline" className="gap-1">
                <XCircle className="w-3 h-3" />
                Bez přístupu
              </Badge>
            ) : isActive ? (
              <Badge className="gap-1 bg-success/10 text-success border-success/20">
                <CheckCircle2 className="w-3 h-3" />
                Aktivní
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <ShieldOff className="w-3 h-3" />
                Deaktivovaný
              </Badge>
            )}
          </div>

          {/* Email */}
          {clientEmail && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email pro login</span>
              <span className="text-sm text-muted-foreground">{clientEmail}</span>
            </div>
          )}

          {/* Last login */}
          {hasAccess && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Poslední přihlášení</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {accountInfo?.last_portal_login 
                  ? format(new Date(accountInfo.last_portal_login), 'd. M. yyyy HH:mm', { locale: cs })
                  : 'Nikdy'}
              </span>
            </div>
          )}

          {/* Last password reset */}
          {hasAccess && accountInfo?.last_password_reset_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Poslední reset hesla</span>
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
                  variant={isActive ? 'destructive' : 'default'}
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
              </>
            )}

            {!clientEmail && (
              <p className="text-xs text-destructive">
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
    </>
  );
}
