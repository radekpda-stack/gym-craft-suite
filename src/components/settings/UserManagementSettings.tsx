import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, X, Pause, Search, Filter, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type SubscriptionType = 'free' | 'trial' | 'paid';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  account_status: AccountStatus;
  subscription_type: SubscriptionType;
  trial_until: string | null;
  client_limit: number;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
}

interface ApprovalAction {
  userId: string;
  action: 'approved' | 'rejected' | 'suspended';
  subscriptionType?: SubscriptionType;
  trialUntil?: string | null;
  clientLimit?: number;
  note?: string;
}

const STATUS_FILTERS: { value: AccountStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Všichni' },
  { value: 'pending', label: 'Čekající' },
  { value: 'approved', label: 'Schválení' },
  { value: 'rejected', label: 'Zamítnutí' },
  { value: 'suspended', label: 'Pozastavení' },
];

export function UserManagementSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'suspended' | 'edit' | null>(null);
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalForm, setApprovalForm] = useState({
    subscriptionType: 'free' as SubscriptionType,
    trialUntil: '',
    clientLimit: 5,
    note: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, account_status, subscription_type, trial_until, client_limit, admin_note, created_at, approved_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action, subscriptionType, trialUntil, clientLimit, note }: ApprovalAction) => {
      const updateData: Record<string, unknown> = {
        account_status: action,
        admin_note: note || null,
      };

      if (action === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
        updateData.subscription_type = subscriptionType;
        updateData.trial_until = trialUntil || null;
        updateData.client_limit = clientLimit;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('user_approval_log')
        .insert({
          user_id: userId,
          action,
          performed_by: user?.id,
          note: note || null,
        });

      if (logError) {
        console.error('Error logging approval action:', logError);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-management'] });
      const actionText = {
        approved: 'schválen',
        rejected: 'zamítnut',
        suspended: 'pozastaven',
      }[variables.action];
      toast({
        title: 'Akce provedena',
        description: `Uživatel byl ${actionText}.`,
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ userId, subscriptionType, trialUntil, clientLimit, note }: { 
      userId: string; 
      subscriptionType: SubscriptionType; 
      trialUntil: string | null; 
      clientLimit: number; 
      note: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_type: subscriptionType,
          trial_until: trialUntil || null,
          client_limit: clientLimit,
          admin_note: note || null,
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-management'] });
      toast({
        title: 'Uloženo',
        description: 'Nastavení uživatele bylo aktualizováno.',
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const closeDialog = () => {
    setSelectedUser(null);
    setActionType(null);
  };

  const handleAction = (userProfile: UserProfile, action: 'approved' | 'rejected' | 'suspended' | 'edit') => {
    setSelectedUser(userProfile);
    setActionType(action);
    setApprovalForm({
      subscriptionType: userProfile.subscription_type || 'free',
      trialUntil: userProfile.trial_until || '',
      clientLimit: userProfile.client_limit || 5,
      note: userProfile.admin_note || '',
    });
  };

  const confirmAction = () => {
    if (!selectedUser || !actionType) return;

    if (actionType === 'edit') {
      editMutation.mutate({
        userId: selectedUser.id,
        subscriptionType: approvalForm.subscriptionType,
        trialUntil: approvalForm.trialUntil || null,
        clientLimit: approvalForm.clientLimit,
        note: approvalForm.note,
      });
    } else {
      actionMutation.mutate({
        userId: selectedUser.id,
        action: actionType,
        subscriptionType: approvalForm.subscriptionType,
        trialUntil: approvalForm.trialUntil || null,
        clientLimit: approvalForm.clientLimit,
        note: approvalForm.note,
      });
    }
  };

  const getStatusBadge = (status: AccountStatus) => {
    const variants: Record<AccountStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Čeká' },
      approved: { variant: 'default', label: 'Schválen' },
      rejected: { variant: 'destructive', label: 'Zamítnut' },
      suspended: { variant: 'outline', label: 'Pozastaven' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getSubscriptionBadge = (type: SubscriptionType) => {
    const labels: Record<SubscriptionType, string> = {
      free: 'Free',
      trial: 'Trial',
      paid: 'Placený',
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  // Filter users
  const filteredUsers = users?.filter(u => {
    const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
    const matchesSearch = !searchQuery || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Stats
  const stats = {
    total: users?.length || 0,
    pending: users?.filter(u => u.account_status === 'pending').length || 0,
    approved: users?.filter(u => u.account_status === 'approved').length || 0,
    suspended: users?.filter(u => u.account_status === 'suspended').length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="glass-subtle rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Celkem</div>
        </div>
        <div className="glass-subtle rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Čekající</div>
        </div>
        <div className="glass-subtle rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.approved}</div>
          <div className="text-xs text-muted-foreground">Schválení</div>
        </div>
        <div className="glass-subtle rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.suspended}</div>
          <div className="text-xs text-muted-foreground">Pozastavení</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Hledat podle e-mailu nebo jména..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(filter.value)}
              className="whitespace-nowrap"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Žádní uživatelé k zobrazení</p>
      ) : isMobile ? (
        // Mobile: Cards
        <div className="space-y-2">
          {filteredUsers.map((userProfile) => (
            <Card key={userProfile.id} className="glass-subtle">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{userProfile.email}</div>
                    {userProfile.display_name && (
                      <div className="text-sm text-muted-foreground truncate">{userProfile.display_name}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(userProfile.account_status)}
                      {getSubscriptionBadge(userProfile.subscription_type)}
                      <span className="text-xs text-muted-foreground">
                        {userProfile.client_limit} klientů
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Registrace: {format(new Date(userProfile.created_at), 'd. M. yyyy', { locale: cs })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {userProfile.account_status !== 'approved' && (
                      <Button size="icon" variant="default" className="h-8 w-8" onClick={() => handleAction(userProfile, 'approved')}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {userProfile.account_status !== 'rejected' && (
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleAction(userProfile, 'rejected')}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {userProfile.account_status === 'approved' && (
                      <>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAction(userProfile, 'edit')}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAction(userProfile, 'suspended')}>
                          <Pause className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop: Table
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Registrace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{userProfile.email}</div>
                      {userProfile.display_name && (
                        <div className="text-sm text-muted-foreground">{userProfile.display_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(userProfile.created_at), 'd. M. yyyy', { locale: cs })}
                  </TableCell>
                  <TableCell>{getStatusBadge(userProfile.account_status)}</TableCell>
                  <TableCell>{getSubscriptionBadge(userProfile.subscription_type)}</TableCell>
                  <TableCell>{userProfile.client_limit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {userProfile.account_status !== 'approved' && (
                        <Button size="icon" variant="default" className="h-8 w-8" onClick={() => handleAction(userProfile, 'approved')}>
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {userProfile.account_status !== 'rejected' && (
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleAction(userProfile, 'rejected')}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {userProfile.account_status === 'approved' && (
                        <>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAction(userProfile, 'edit')}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAction(userProfile, 'suspended')}>
                            <Pause className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedUser && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' && 'Schválit uživatele'}
              {actionType === 'rejected' && 'Zamítnout uživatele'}
              {actionType === 'suspended' && 'Pozastavit uživatele'}
              {actionType === 'edit' && 'Upravit nastavení uživatele'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{selectedUser?.email}</div>
              {selectedUser?.display_name && (
                <div className="text-sm text-muted-foreground">{selectedUser.display_name}</div>
              )}
            </div>

            {(actionType === 'approved' || actionType === 'edit') && (
              <>
                <div className="space-y-2">
                  <Label>Tarif</Label>
                  <Select
                    value={approvalForm.subscriptionType}
                    onValueChange={(v) => setApprovalForm(f => ({ ...f, subscriptionType: v as SubscriptionType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free (5 klientů)</SelectItem>
                      <SelectItem value="trial">Trial (15 klientů)</SelectItem>
                      <SelectItem value="paid">Placený (neomezeno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {approvalForm.subscriptionType === 'trial' && (
                  <div className="space-y-2">
                    <Label>Trial do</Label>
                    <Input
                      type="date"
                      value={approvalForm.trialUntil}
                      onChange={(e) => setApprovalForm(f => ({ ...f, trialUntil: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Limit klientů</Label>
                  <Input
                    type="number"
                    min={1}
                    value={approvalForm.clientLimit}
                    onChange={(e) => setApprovalForm(f => ({ ...f, clientLimit: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Poznámka (interní)</Label>
              <Textarea
                placeholder="Interní poznámka pro adminy..."
                value={approvalForm.note}
                onChange={(e) => setApprovalForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Zrušit
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending || editMutation.isPending}
              variant={actionType === 'rejected' ? 'destructive' : 'default'}
            >
              {(actionMutation.isPending || editMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'edit' ? 'Uložit' : 'Potvrdit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
