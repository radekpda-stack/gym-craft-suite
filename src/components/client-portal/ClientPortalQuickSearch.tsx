import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalClients, PortalClient } from '@/hooks/useClientPortalAdmin';
import { Search, User, Plus, X, Users } from 'lucide-react';
import { InviteClientDialog } from './InviteClientDialog';
import { ClientPortalDetailSheet } from './ClientPortalDetailSheet';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function ClientPortalQuickSearch() {
  const { data: clients, isLoading } = usePortalClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<PortalClient | null>(null);

  const activeCount = clients?.filter(c => c.is_active && c.auth_user_id).length || 0;

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim() || !clients) return [];
    const query = removeDiacritics(searchQuery);
    return clients.filter(account => 
      removeDiacritics(account.client?.name || '').includes(query) ||
      removeDiacritics(account.client?.email || '').includes(query) ||
      removeDiacritics(account.login_identifier || '').includes(query)
    ).slice(0, 8);
  }, [clients, searchQuery]);

  const getStatusBadge = (account: PortalClient) => {
    if (!account.auth_user_id) {
      return <Badge variant="outline" className="text-muted-foreground text-xs">Bez přístupu</Badge>;
    }
    if (account.is_active) {
      return <Badge variant="default" className="bg-green-600 text-xs">Aktivní</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Neaktivní</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Vyhledat klienta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Vyhledat klienta
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {activeCount} aktivních z {clients?.length || 0} klientů
            </p>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Přidat</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zadejte jméno klienta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="mt-3 border rounded-lg divide-y max-h-[320px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Žádný klient nenalezen</p>
                </div>
              ) : (
                filteredClients.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedClient(account);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{account.client?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {account.last_portal_login 
                            ? `Přihlášen ${formatDistanceToNow(new Date(account.last_portal_login), { addSuffix: true, locale: cs })}`
                            : 'Nikdy nepřihlášen'
                          }
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(account)}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Empty state when no search */}
          {!searchQuery.trim() && clients?.length === 0 && (
            <div className="mt-4 text-center py-6 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Zatím žádní klienti v portálu</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3"
                onClick={() => setInviteOpen(true)}
              >
                Pozvat prvního klienta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      
      <ClientPortalDetailSheet 
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      />
    </>
  );
}
