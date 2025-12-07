/**
 * ClientBudgetGroupCard Component
 * 
 * Displays shared budget group info for a client with quick add/remove functionality.
 */
import { useState } from 'react';
import { Users, Plus, X, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  useBudgetGroups, 
  useClientBudgetGroup, 
  useCreateBudgetGroup 
} from '@/hooks/useClientBudgetGroups';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ClientBudgetGroupCardProps {
  clientId: string;
  clientName: string;
}

// Hook for adding member to group
function useAddBudgetMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, clientId }: { groupId: string; clientId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("client_budget_members")
        .insert({ group_id: groupId, client_id: clientId, user_id: user.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Člen přidán", description: "Klient byl přidán do skupiny." });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se přidat člena.", variant: "destructive" });
    },
  });
}

// Hook for removing member from group
function useRemoveBudgetMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("client_budget_members")
        .delete()
        .eq("id", membershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Člen odebrán", description: "Klient byl odebrán ze skupiny." });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodařilo se odebrat člena.", variant: "destructive" });
    },
  });
}

export function ClientBudgetGroupCard({ clientId, clientName }: ClientBudgetGroupCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { data: allClients = [] } = useClients();
  const { data: allGroups = [], isLoading: groupsLoading } = useBudgetGroups();
  const { data: clientGroupData, isLoading: clientGroupLoading } = useClientBudgetGroup(clientId);
  const createGroup = useCreateBudgetGroup();
  const addMember = useAddBudgetMember();
  const removeMember = useRemoveBudgetMember();

  const isLoading = groupsLoading || clientGroupLoading;
  const clientGroup = clientGroupData?.group;
  const groupMembers = clientGroupData?.members || [];
  
  // Get member client data with their membership IDs
  const memberClients = groupMembers.map(m => {
    const memberClient = m.clients as { id: string; name: string; credit_balance: number } | null;
    return memberClient ? { 
      id: memberClient.id, 
      name: memberClient.name, 
      credit_balance: memberClient.credit_balance,
      membershipId: m.id 
    } : null;
  }).filter(Boolean) as { id: string; name: string; credit_balance: number; membershipId: string }[];

  // Clients not in the current group
  const availableClients = allClients.filter(
    c => c.id !== clientId && !memberClients.some(m => m.id === c.id)
  );

  // Groups that this client is not part of
  const availableGroups = allGroups.filter(g => g.id !== clientGroup?.id);

  const handleCreateNewGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      await createGroup.mutateAsync({
        name: newGroupName.trim(),
        clientIds: [clientId],
      });
      setNewGroupName('');
      setIsCreateMode(false);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleJoinGroup = async () => {
    if (!selectedGroupId) return;
    
    try {
      await addMember.mutateAsync({
        groupId: selectedGroupId,
        clientId,
      });
      setSelectedGroupId('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleAddMember = async () => {
    if (!clientGroup || !selectedClientId) return;
    
    try {
      await addMember.mutateAsync({
        groupId: clientGroup.id,
        clientId: selectedClientId,
      });
      setSelectedClientId('');
      setIsAddMemberDialogOpen(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await removeMember.mutateAsync(membershipId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleLeaveGroup = async () => {
    const myMembership = memberClients.find(m => m.id === clientId);
    if (!myMembership) return;
    
    try {
      await removeMember.mutateAsync(myMembership.membershipId);
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <Users className="w-4 h-4" />
          <span className="text-sm">Sdílený budget</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Client is not in any group
  if (!clientGroup) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <Users className="w-4 h-4" />
          <span className="text-sm">Sdílený budget</span>
        </div>
        <p className="text-muted-foreground text-sm mb-3">
          Klient není součástí sdíleného budgetu
        </p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat do skupiny
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat do sdíleného budgetu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {!isCreateMode && availableGroups.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Vyberte existující skupinu:</p>
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vybrat skupinu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.members.length} členů)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleJoinGroup}
                    disabled={!selectedGroupId || addMember.isPending}
                    className="w-full"
                  >
                    {addMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Přidat do skupiny
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">nebo</span>
                    </div>
                  </div>
                </div>
              )}
              
              {isCreateMode || availableGroups.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Vytvořit novou skupinu:</p>
                  <Input
                    placeholder="Název skupiny (např. Rodina Novákovi)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateNewGroup();
                    }}
                  />
                  <div className="flex gap-2">
                    {availableGroups.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateMode(false)}
                        className="flex-1"
                      >
                        Zpět
                      </Button>
                    )}
                    <Button
                      onClick={handleCreateNewGroup}
                      disabled={!newGroupName.trim() || createGroup.isPending}
                      className="flex-1"
                    >
                      {createGroup.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Vytvořit skupinu
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsCreateMode(true)}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Vytvořit novou skupinu
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Client is in a group - show members
  return (
    <div className="glass rounded-2xl p-5 border-l-4 border-l-primary">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-primary">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">{clientGroup.name}</span>
          <Badge variant="secondary" className="text-xs">
            Sdílený budget
          </Badge>
        </div>
      </div>
      
      {/* Group members */}
      <div className="space-y-2 mb-4">
        {memberClients.map((member) => (
          <div
            key={member.id}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg',
              member.id === clientId ? 'bg-primary/10' : 'bg-secondary/50'
            )}
          >
            <div className="flex items-center gap-2">
              <ClientAvatar name={member.name} size="sm" />
              <span className="text-sm font-medium text-foreground">
                {member.name}
              </span>
              {member.id === clientId && (
                <Badge variant="outline" className="text-xs">Tento klient</Badge>
              )}
            </div>
            {member.id !== clientId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveMember(member.membershipId)}
                disabled={removeMember.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {availableClients.length > 0 && (
          <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Přidat člena
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Přidat člena do skupiny</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vybrat klienta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedClientId || addMember.isPending}
                  className="w-full"
                >
                  {addMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Přidat do skupiny
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLeaveGroup}
          disabled={removeMember.isPending}
        >
          <X className="w-4 h-4" />
          Opustit skupinu
        </Button>
      </div>
    </div>
  );
}
