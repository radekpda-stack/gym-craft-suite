/**
 * SharedBudgetManager Component
 * Allows linking clients to shared budget groups
 */
import { useState } from 'react';
import { Users, Link, Unlink, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useBudgetGroups,
  useCreateBudgetGroup,
  useUpdateBudgetGroupMembers,
  useDeleteBudgetGroup,
} from '@/hooks/useClientBudgetGroups';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface SharedBudgetManagerProps {
  clients: Client[];
  selectedClientIds: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function SharedBudgetManager({
  clients,
  selectedClientIds,
  onSelectionChange,
}: SharedBudgetManagerProps) {
  const { data: budgetGroups = [], isLoading } = useBudgetGroups();
  const createGroup = useCreateBudgetGroup();
  const updateMembers = useUpdateBudgetGroupMembers();
  const deleteGroup = useDeleteBudgetGroup();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedClients.length < 2) return;
    
    // Check if any selected client is already in a group (shouldn't happen due to UI, but double-check)
    const clientsInGroups = selectedClients.filter(clientId =>
      budgetGroups.some(g => g.members.some(m => m.client_id === clientId))
    );
    
    if (clientsInGroups.length > 0) {
      toast({
        title: "Chyba",
        description: "Některý z vybraných klientů je již v jiné skupině. Klient může být pouze v jedné skupině.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createGroup.mutateAsync({
        name: newGroupName,
        clientIds: selectedClients,
      });
      
      setShowCreateDialog(false);
      setNewGroupName('');
      setSelectedClients([]);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.message?.includes('unique') || error?.code === '23505') {
        toast({
          title: "Chyba",
          description: "Klient už je členem jiné skupiny.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Chyba",
          description: "Nepodařilo se vytvořit skupinu.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleRemoveFromGroup = async (groupId: string, clientId: string) => {
    const group = budgetGroups.find(g => g.id === groupId);
    if (!group) return;

    const newMemberIds = group.members
      .filter(m => m.client_id !== clientId)
      .map(m => m.client_id);

    if (newMemberIds.length < 2) {
      // Delete group if less than 2 members
      await deleteGroup.mutateAsync(groupId);
    } else {
      await updateMembers.mutateAsync({
        groupId,
        clientIds: newMemberIds,
      });
    }
  };

  // Get clients that are not in any group
  const ungroupedClients = clients.filter(
    c => !budgetGroups.some(g => g.members.some(m => m.client_id === c.id))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Sdílené budgety</h3>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Propojit klienty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vytvořit sdílený budget</DialogTitle>
              <DialogDescription>
                Vyberte klienty, kteří budou sdílet společný kreditový budget.
                <span className="block mt-1 text-warning">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Každý klient může být pouze v jedné skupině.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Název skupiny</Label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="např. Rodina Novákových"
                />
              </div>
              <div className="space-y-2">
                <Label>Vyberte klienty (minimálně 2)</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {clients.map((client) => {
                    const isInGroup = budgetGroups.some(
                      g => g.members.some(m => m.client_id === client.id)
                    );
                    
                    return (
                      <label
                        key={client.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedClients.includes(client.id)
                            ? "bg-primary/10 border-primary"
                            : "bg-secondary/50 hover:bg-secondary",
                          isInGroup && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => !isInGroup && toggleClientSelection(client.id)}
                          disabled={isInGroup}
                        />
                        <ClientAvatar name={client.name} size="sm" />
                        <div className="flex-1">
                          <span className="font-medium">{client.name}</span>
                          {isInGroup && (
                            <span className="text-xs text-destructive ml-2">
                              (již v jiné skupině)
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          (client.credit_balance || 0) >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(client.credit_balance || 0)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {selectedClients.length >= 2 && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    Kredity vybraných klientů budou synchronizovány. Při odečtení
                    kreditu jednomu klientovi se stejná částka odečte i ostatním
                    členům skupiny.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Zrušit
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedClients.length < 2 || createGroup.isPending}
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vytvářím...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Vytvořit skupinu
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing groups */}
      {budgetGroups.length > 0 ? (
        <div className="space-y-4">
          {budgetGroups.map((group) => {
            const groupClients = group.members.map(m => 
              clients.find(c => c.id === m.client_id)
            ).filter(Boolean) as Client[];
            
            // Use the shared_balance from the group, not client balance
            const sharedBalance = group.shared_balance || 0;
            const isNegative = sharedBalance < 0;

            return (
              <div
                key={group.id}
                className={cn(
                  "glass rounded-xl p-4 space-y-3",
                  isNegative && "border-destructive/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-primary" />
                    <span className="font-medium">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupClients.length} členů
                    </Badge>
                    {isNegative && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Dluh
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    sharedBalance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatCurrency(sharedBalance)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border"
                    >
                      <ClientAvatar name={client.name} size="sm" />
                      <span className="text-sm">{client.name}</span>
                      <button
                        onClick={() => handleRemoveFromGroup(group.id, client.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Odebrat ze skupiny"
                      >
                        <Unlink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sdílený kredit • Osobní kredit členů se nepoužívá
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Zatím nemáte žádné propojené klienty.</p>
          <p className="text-sm">
            Propojte klienty, kteří sdílejí společný kreditový budget.
          </p>
        </div>
      )}
    </div>
  );
}

// Badge component for displaying shared budget status on client card
export function SharedBudgetBadge({ clientId, onClick }: { clientId: string; onClick?: () => void }) {
  const { data: budgetGroups = [] } = useBudgetGroups();
  
  const group = budgetGroups.find(g => 
    g.members.some(m => m.client_id === clientId)
  );
  
  if (!group) return null;

  return (
    <Badge 
      variant="outline" 
      className="gap-1 cursor-pointer hover:bg-primary/10"
      onClick={onClick}
    >
      <Link className="w-3 h-3" />
      {group.name}
    </Badge>
  );
}
