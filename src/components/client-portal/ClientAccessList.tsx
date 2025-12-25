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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePortalClients, useResetClientPassword, useDisableClientAccess } from '@/hooks/useClientPortalAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { User, MoreHorizontal, Key, UserCheck, UserX, Copy, Check, Plus } from 'lucide-react';
import { InviteClientDialog } from './InviteClientDialog';
import { toast } from '@/hooks/use-toast';

export function ClientAccessList() {
  const { data: clients, isLoading } = usePortalClients();
  const resetPassword = useResetClientPassword();
  const disableAccess = useDisableClientAccess();
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; email: string; password: string }>({
    open: false,
    email: '',
    password: '',
  });
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

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

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: 'Zkopírováno',
      description: field === 'email' ? 'Email zkopírován' : 'Heslo zkopírováno',
    });
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Klienti s přístupem</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {clients?.length || 0} klientů s přístupem do portálu
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Přidat klienta
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
            <>
              {/* Mobile: Card Layout */}
              <div className="space-y-3 md:hidden">
                {clients?.map((account) => (
                  <div 
                    key={account.id} 
                    className="p-4 rounded-lg border bg-card"
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
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                      <TableHead>Stav</TableHead>
                      <TableHead>Poslední přihlášení</TableHead>
                      <TableHead>Poslední reset hesla</TableHead>
                      <TableHead className="w-[70px]">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients?.map((account) => (
                      <TableRow key={account.id}>
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
                          {account.last_password_reset_at ? (
                            <span className="text-sm">
                              {format(new Date(account.last_password_reset_at), 'd. M. yyyy', { locale: cs })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                  onClick={() => copyToClipboard(passwordDialog.email, 'email')}
                >
                  {copiedField === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                  onClick={() => copyToClipboard(passwordDialog.password, 'password')}
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
    </>
  );
}
