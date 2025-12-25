import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortalClients, useToggleClientAccess } from '@/hooks/useClientPortalAdmin';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { User, Mail, Phone, Clock } from 'lucide-react';
import { InviteClientDialog } from './InviteClientDialog';

export function ClientAccessList() {
  const { data: clients, isLoading } = usePortalClients();
  const toggleAccess = useToggleClientAccess();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Klienti s přístupem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Klienti s přístupem</CardTitle>
          <Button onClick={() => setInviteOpen(true)}>
            Pozvat klienta
          </Button>
        </CardHeader>
        <CardContent>
          {clients?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Zatím žádní klienti nemají přístup do portálu.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setInviteOpen(true)}
              >
                Pozvat prvního klienta
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {clients?.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{account.client?.name}</p>
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? 'Aktivní' : 'Neaktivní'}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {account.client?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {account.client.email}
                          </span>
                        )}
                        {account.client?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {account.client.phone}
                          </span>
                        )}
                        {account.last_portal_login && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Naposledy: {formatDistanceToNow(new Date(account.last_portal_login), { 
                              addSuffix: true, 
                              locale: cs 
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {account.is_active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                      <Switch
                        checked={account.is_active}
                        onCheckedChange={(checked) =>
                          toggleAccess.mutate({ accountId: account.id, isActive: checked })
                        }
                        disabled={toggleAccess.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
