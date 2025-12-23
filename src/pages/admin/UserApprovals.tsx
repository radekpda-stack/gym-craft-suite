import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, X, Pause, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';

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

export default function UserApprovals() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'suspended' | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    subscriptionType: 'free' as SubscriptionType,
    trialUntil: '',
    clientLimit: 5,
    note: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-user-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, account_status, subscription_type, trial_until, client_limit, admin_note, created_at, approved_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: !!isAdmin,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action, subscriptionType, trialUntil, clientLimit, note }: ApprovalAction) => {
      // Update profile
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

      // Log the action
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
      queryClient.invalidateQueries({ queryKey: ['admin-user-approvals'] });
      const actionText = {
        approved: 'schválen',
        rejected: 'zamítnut',
        suspended: 'pozastaven',
      }[variables.action];
      toast({
        title: 'Akce provedena',
        description: `Uživatel byl ${actionText}.`,
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = (userProfile: UserProfile, action: 'approved' | 'rejected' | 'suspended') => {
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

    actionMutation.mutate({
      userId: selectedUser.id,
      action: actionType,
      subscriptionType: approvalForm.subscriptionType,
      trialUntil: approvalForm.trialUntil || null,
      clientLimit: approvalForm.clientLimit,
      note: approvalForm.note,
    });
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

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Link to="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Zpět do nastavení
        </Link>
        <h1 className="text-2xl font-bold">Schvalování uživatelů</h1>
        <p className="text-muted-foreground mt-1">Správa registrací a přístupů uživatelů</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seznam uživatelů</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !users?.length ? (
            <p className="text-center text-muted-foreground py-8">Žádní uživatelé k zobrazení</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Registrace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Limit klientů</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{userProfile.email}</div>
                          {userProfile.display_name && (
                            <div className="text-sm text-muted-foreground">{userProfile.display_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(userProfile.created_at), 'd. M. yyyy', { locale: cs })}
                      </TableCell>
                      <TableCell>{getStatusBadge(userProfile.account_status)}</TableCell>
                      <TableCell>{getSubscriptionBadge(userProfile.subscription_type)}</TableCell>
                      <TableCell>{userProfile.client_limit}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {userProfile.account_status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAction(userProfile, 'approved')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {userProfile.account_status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(userProfile, 'rejected')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {userProfile.account_status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(userProfile, 'suspended')}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser && !!actionType} onOpenChange={() => { setSelectedUser(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' && 'Schválit uživatele'}
              {actionType === 'rejected' && 'Zamítnout uživatele'}
              {actionType === 'suspended' && 'Pozastavit uživatele'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{selectedUser?.email}</div>
              {selectedUser?.display_name && (
                <div className="text-sm text-muted-foreground">{selectedUser.display_name}</div>
              )}
            </div>

            {actionType === 'approved' && (
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
            <Button variant="outline" onClick={() => { setSelectedUser(null); setActionType(null); }}>
              Zrušit
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              variant={actionType === 'rejected' ? 'destructive' : 'default'}
            >
              {actionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
