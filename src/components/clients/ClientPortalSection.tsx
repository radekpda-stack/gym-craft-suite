/**
 * ClientPortalSection Component
 * 
 * Shows client portal (zone) status:
 * - Active/Inactive/Pending status
 * - Last login date
 * - Invite / Reset password actions
 */
import { useState } from 'react';
import { 
  Globe, 
  Key, 
  Send, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ClientAccountInfo } from '@/hooks/useClientPortalAccess';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ClientPortalSectionProps {
  clientId: string;
  clientEmail?: string | null;
  portalAccess: ClientAccountInfo | null;
}

export function ClientPortalSection({
  clientId,
  clientEmail,
  portalAccess,
}: ClientPortalSectionProps) {
  const queryClient = useQueryClient();

  // Determine status
  const getStatus = () => {
    if (!portalAccess) return 'none';
    if (portalAccess.auth_user_id && portalAccess.status === 'active') return 'active';
    if (portalAccess.status === 'pending' || !portalAccess.auth_user_id) return 'pending';
    return 'inactive';
  };

  const status = getStatus();

  // Mutation to create/invite to portal
  const inviteMutation = useMutation({
    mutationFn: async () => {
      // Check if client_account exists
      if (portalAccess) {
        // Reset password logic - just update timestamp
        const { error } = await supabase
          .from('client_accounts')
          .update({ 
            last_password_reset_at: new Date().toISOString(),
            status: 'pending'
          })
          .eq('client_id', clientId);
        
        if (error) throw error;
        return { action: 'reset' };
      } else {
        // Create new client account
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('client_accounts')
          .insert({
            client_id: clientId,
            trainer_id: user.id,
            user_id: user.id,
            status: 'pending',
            is_active: true,
          });
        
        if (error) throw error;
        return { action: 'invite' };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      toast({ 
        title: data.action === 'reset' ? 'Heslo resetováno' : 'Pozvánka odeslána',
        description: data.action === 'reset' 
          ? 'Klient obdrží email s novým heslem'
          : 'Klient byl pozván do klientské zóny'
      });
    },
    onError: () => {
      toast({ 
        title: 'Chyba', 
        description: 'Nepodařilo se provést akci',
        variant: 'destructive'
      });
    },
  });

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aktivní
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
            <Clock className="w-3 h-3 mr-1" />
            Čeká na aktivaci
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            Neaktivní
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Nepřipojen
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Klientská zóna</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Last login info */}
      {portalAccess?.last_portal_login && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            Poslední přihlášení:{' '}
            <span className="text-foreground">
              {formatDistanceToNow(new Date(portalAccess.last_portal_login), { 
                locale: cs, 
                addSuffix: true 
              })}
            </span>
          </span>
        </div>
      )}

      {/* Credit history start date */}
      {portalAccess?.credit_history_start_at && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Vidí kredit od:{' '}
            <span className="text-foreground">
              {format(new Date(portalAccess.credit_history_start_at), 'd.M.yyyy', { locale: cs })}
            </span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'none' ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !clientEmail}
          >
            {inviteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Pozvat do zóny
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            Reset hesla
          </Button>
        )}
      </div>

      {!clientEmail && status === 'none' && (
        <p className="text-xs text-muted-foreground">
          Pro pozvání je nutný email klienta
        </p>
      )}
    </div>
  );
}
