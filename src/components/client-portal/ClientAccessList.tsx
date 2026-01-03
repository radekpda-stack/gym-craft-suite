import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalClients, PortalClient, useResetClientPassword, useDisableClientAccess, useUpdateClientCredentials } from '@/hooks/useClientPortalAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { User, MoreHorizontal, Key, UserCheck, UserX, Copy, Check, Plus, Eye, EyeOff, Pencil, Search, X } from 'lucide-react';
import { InviteClientDialog } from './InviteClientDialog';
import { ClientPortalDetailSheet } from './ClientPortalDetailSheet';
import { toast } from '@/hooks/use-toast';
import { BulkCreatePortalsButton } from './BulkCreatePortalsButton';

export function ClientAccessList() {
  const { data: clients, isLoading } = usePortalClients();
  const resetPassword = useResetClientPassword();
  const disableAccess = useDisableClientAccess();
  const updateCredentials = useUpdateClientCredentials();
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; email: string; password: string }>({
    open: false,
    email: '',
    password: '',
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [selectedClient, setSelectedClient] = useState<PortalClient | null>(null);
  
  // Edit credentials dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    clientId: string;
    clientName: string;
    loginIdentifier: string;
    newLoginIdentifier: string;
    newPassword: string;
  }>({
    open: false,
    clientId: '',
    clientName: '',
    loginIdentifier: '',
    newLoginIdentifier: '',
    newPassword: '',
  });

  // Filter clients based on search query
  const filteredClients = clients?.filter(account => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.client?.name?.toLowerCase().includes(query) ||
      account.client?.email?.toLowerCase().includes(query) ||
      account.login_identifier?.toLowerCase().includes(query)
    );
  });

  const handleResetPassword = async (clientId: string) => {
    try {
      const result = await resetPassword.mutateAsync(clientId);
      setPasswordDialog({
        open: true,
        email: result.email,
        password: result.password,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleToggleAccess = async (clientId: string, currentlyActive: boolean) => {
    await disableAccess.mutateAsync({ clientId, disable: currentlyActive });
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: 'Zkopírováno',
    });
  };

  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const openEditDialog = (account: {
    client_id: string;
    client?: { name: string } | null;
    login_identifier: string | null;
  }) => {
    setEditDialog({
      open: true,
      clientId: account.client_id,
      clientName: account.client?.name || '',
      loginIdentifier: account.login_identifier || '',
      newLoginIdentifier: account.login_identifier || '',
      newPassword: '',
    });
  };

  const handleSaveCredentials = async () => {
    const changes: { clientId: string; newLoginIdentifier?: string; newPassword?: string } = {
      clientId: editDialog.clientId,
    };

    if (editDialog.newLoginIdentifier !== editDialog.loginIdentifier) {
      changes.newLoginIdentifier = editDialog.newLoginIdentifier;
    }
    if (editDialog.newPassword) {
      changes.newPassword = editDialog.newPassword;
    }

    if (!changes.newLoginIdentifier && !changes.newPassword) {
      setEditDialog(prev => ({ ...prev, open: false }));
      return;
    }

    try {
      await updateCredentials.mutateAsync(changes);
      setEditDialog(prev => ({ ...prev, open: false }));
    } catch (error) {
      // Error handled by hook
    }
  };

  const getStatusBadge = (account: { is_active: boolean; auth_user_id: string | null }) => {
    if (!account.auth_user_id) {
      return <Badge variant="outline" className="text-muted-foreground">Bez přístupu</Badge>;
    }
    if (account.is_active) {
      return <Badge variant="default" className="bg-green-600">Aktivní</Badge>;
    }
    return <Badge variant="secondary">Deaktivovaný</Badge>;
  };

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
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <BulkCreatePortalsButton />
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Klienti s přístupem</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredClients?.length || 0} z {clients?.length || 0} klientů
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Přidat klienta
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          {(clients?.length || 0) > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat klienta podle jména, emailu nebo přihlášení..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
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
          )}
          
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
          ) : filteredClients?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Žádní klienti neodpovídají hledání „{searchQuery}"</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3"
                onClick={() => setSearchQuery('')}
              >
                Zrušit filtr
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="space-y-3 md:hidden">
                {filteredClients?.map((account) => (
                  <div 
                    key={account.id}
                    className="p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedClient(account)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{account.client?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{account.client?.email || 'Bez emailu'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(account)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(account)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Upravit údaje
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(account.client_id)}
                              disabled={resetPassword.isPending}
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Resetovat heslo
                            </DropdownMenuItem>
                            {account.auth_user_id && (
                              <DropdownMenuItem
                                onClick={() => handleToggleAccess(account.client_id, account.is_active)}
                                disabled={disableAccess.isPending}
                              >
                                {account.is_active ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Deaktivovat
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Aktivovat
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Credentials section */}
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Přihlášení:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{account.login_identifier || '-'}</code>
                          {account.login_identifier && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(account.login_identifier!, `login-${account.id}`)}
                            >
                              {copiedField === `login-${account.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Heslo:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {visiblePasswords.has(account.id) ? (account.portal_password || '-') : '••••••••'}
                          </code>
                          {account.portal_password && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => togglePasswordVisibility(account.id)}
                              >
                                {visiblePasswords.has(account.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(account.portal_password!, `pass-${account.id}`)}
                              >
                                {copiedField === `pass-${account.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {account.credentials_changed_at && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <Check className="h-3 w-3" />
                          <span>Změněno klientem</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Přihlášení: {account.last_portal_login ? formatDistanceToNow(new Date(account.last_portal_login), { addSuffix: true, locale: cs }) : 'Nikdy'}
                      </span>
                      {account.last_password_reset_at && (
                        <span>
                          Reset: {format(new Date(account.last_password_reset_at), 'd. M. yyyy', { locale: cs })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klient</TableHead>
                      <TableHead>Přihlašovací jméno</TableHead>
                      <TableHead>Heslo</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Poslední přihlášení</TableHead>
                      <TableHead className="w-[70px]">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients?.map((account) => (
                      <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClient(account)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{account.client?.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{account.client?.email || 'Bez emailu'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{account.login_identifier || '-'}</code>
                            {account.login_identifier && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(account.login_identifier!, `login-${account.id}`)}
                              >
                                {copiedField === `login-${account.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono min-w-[70px]">
                              {visiblePasswords.has(account.id) ? (account.portal_password || '-') : '••••••••'}
                            </code>
                            {account.portal_password && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => togglePasswordVisibility(account.id)}
                                >
                                  {visiblePasswords.has(account.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(account.portal_password!, `pass-${account.id}`)}
                                >
                                  {copiedField === `pass-${account.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </>
                            )}
                            {account.credentials_changed_at && (
                              <Badge variant="outline" className="ml-1 text-amber-600 dark:text-amber-500 border-amber-500/50 text-[10px] px-1">
                                Změněno
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(account)}
                        </TableCell>
                        <TableCell>
                          {account.last_portal_login ? (
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(account.last_portal_login), { 
                                addSuffix: true, 
                                locale: cs 
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nikdy</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(account)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Upravit údaje
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResetPassword(account.client_id)}
                                disabled={resetPassword.isPending}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Resetovat heslo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {account.auth_user_id && (
                                <DropdownMenuItem
                                  onClick={() => handleToggleAccess(account.client_id, account.is_active)}
                                  disabled={disableAccess.isPending}
                                >
                                  {account.is_active ? (
                                    <>
                                      <UserX className="w-4 h-4 mr-2" />
                                      Deaktivovat
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Aktivovat
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      
      <ClientPortalDetailSheet 
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      />

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nové přihlašovací údaje</DialogTitle>
            <DialogDescription>
              Zkopírujte přihlašovací údaje a předejte je klientovi. Heslo se zobrazuje pouze nyní.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex gap-2">
                <Input value={passwordDialog.email} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(passwordDialog.email, 'reset-email')}
                >
                  {copiedField === 'reset-email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Heslo</label>
              <div className="flex gap-2">
                <Input value={passwordDialog.password} readOnly className="font-mono text-lg tracking-wider" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(passwordDialog.password, 'reset-password')}
                >
                  {copiedField === 'reset-password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Heslo se zobrazuje pouze nyní. Po zavření dialogu ho již nebude možné zobrazit.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit přihlašovací údaje</DialogTitle>
            <DialogDescription>
              Změňte přihlašovací jméno nebo heslo pro klienta {editDialog.clientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-identifier">Přihlašovací jméno</Label>
              <Input
                id="login-identifier"
                value={editDialog.newLoginIdentifier}
                onChange={(e) => setEditDialog(prev => ({ ...prev, newLoginIdentifier: e.target.value }))}
                placeholder="Email nebo uživatelské jméno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nové heslo (ponechte prázdné pro zachování)</Label>
              <Input
                id="new-password"
                type="text"
                value={editDialog.newPassword}
                onChange={(e) => setEditDialog(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Nové heslo"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>
              Zrušit
            </Button>
            <Button onClick={handleSaveCredentials} disabled={updateCredentials.isPending}>
              {updateCredentials.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
