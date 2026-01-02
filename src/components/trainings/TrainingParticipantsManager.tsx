/**
 * TrainingParticipantsManager Component
 * 
 * Allows adding/removing participants directly on training detail page.
 * Automatically recalculates price based on participant count.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients, Client } from '@/hooks/useClients';
import { useTrainingParticipants, useSaveTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';

interface TrainingParticipantsManagerProps {
  trainingId: string;
  primaryClientId: string;
  primaryClientName: string;
  currentParticipantCount: number;
  isEditable?: boolean;
}

export function TrainingParticipantsManager({
  trainingId,
  primaryClientId,
  primaryClientName,
  currentParticipantCount,
  isEditable = true,
}: TrainingParticipantsManagerProps) {
  const { data: clients = [] } = useClients();
  const { data: existingParticipants = [], isLoading: participantsLoading } = useTrainingParticipants(trainingId);
  const saveParticipants = useSaveTrainingParticipants();
  const updateTraining = useUpdateTrainingSession();
  const trainingPrices = useTrainingPrices();
  
  const [localParticipants, setLocalParticipants] = useState<Array<{ client_id: string; name: string }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize participants from database or with primary client
  useEffect(() => {
    if (existingParticipants.length > 0) {
      const mapped = existingParticipants.map(p => {
        const client = clients.find(c => c.id === p.client_id);
        return {
          client_id: p.client_id,
          name: client?.name || 'Neznámý klient',
        };
      });
      setLocalParticipants(mapped);
    } else if (primaryClientId) {
      // Initialize with primary client
      setLocalParticipants([{
        client_id: primaryClientId,
        name: primaryClientName,
      }]);
    }
  }, [existingParticipants, clients, primaryClientId, primaryClientName]);

  // Calculate price for current participant count
  const currentPrice = useMemo(() => {
    const count = localParticipants.length || 1;
    return getTrainingPrice(count, trainingPrices);
  }, [localParticipants.length, trainingPrices]);

  // Available clients (not already participants)
  const availableClients = useMemo(() => {
    return clients.filter(c => 
      !c.is_archived && 
      !localParticipants.some(p => p.client_id === c.id)
    );
  }, [clients, localParticipants]);

  const handleAddParticipant = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newParticipants = [
      ...localParticipants,
      { client_id: client.id, name: client.name },
    ];
    setLocalParticipants(newParticipants);

    // Calculate equal price shares
    const newCount = newParticipants.length;
    const newPrice = getTrainingPrice(newCount, trainingPrices);
    const equalShare = Math.round(newPrice / newCount);

    try {
      // Save to database
      await saveParticipants.mutateAsync({
        training_session_id: trainingId,
        participants: newParticipants.map(p => ({
          client_id: p.client_id,
          price_share: equalShare,
        })),
      });

      // Update training participant count
      await updateTraining.mutateAsync({
        id: trainingId,
        input: {
          participant_count: newCount,
          final_price: newPrice,
        },
      });

      toast({ title: `${client.name} přidán/a do tréninku` });
    } catch (error) {
      // Revert local state on error
      setLocalParticipants(prev => prev.filter(p => p.client_id !== clientId));
      console.error('Error adding participant:', error);
    }
  };

  const handleRemoveParticipant = async (clientId: string) => {
    // Don't allow removing the last participant
    if (localParticipants.length <= 1) {
      toast({ title: 'Nelze odebrat posledního účastníka', variant: 'destructive' });
      return;
    }

    const removedName = localParticipants.find(p => p.client_id === clientId)?.name;
    const newParticipants = localParticipants.filter(p => p.client_id !== clientId);
    setLocalParticipants(newParticipants);

    // Calculate new equal price shares
    const newCount = newParticipants.length;
    const newPrice = getTrainingPrice(newCount, trainingPrices);
    const equalShare = Math.round(newPrice / newCount);

    try {
      // Save to database
      await saveParticipants.mutateAsync({
        training_session_id: trainingId,
        participants: newParticipants.map(p => ({
          client_id: p.client_id,
          price_share: equalShare,
        })),
      });

      // Update training participant count
      await updateTraining.mutateAsync({
        id: trainingId,
        input: {
          participant_count: newCount,
          final_price: newPrice,
        },
      });

      toast({ title: `${removedName} odebrán/a z tréninku` });
    } catch (error) {
      // Revert local state on error
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setLocalParticipants(prev => [...prev, { client_id: client.id, name: client.name }]);
      }
      console.error('Error removing participant:', error);
    }
  };

  return (
    <div className="glass rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            Účastníci ({localParticipants.length})
          </span>
          <span className="text-sm text-muted-foreground">
            • {formatCurrency(currentPrice)}
          </span>
        </div>
        {isEditable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Skrýt' : 'Upravit'}
          </Button>
        )}
      </div>

      {/* Participants list - always visible */}
      <div className="flex flex-wrap gap-2 mb-3">
        {localParticipants.map((participant, index) => (
          <div
            key={participant.client_id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              index === 0 
                ? "bg-primary/10 border border-primary/20" 
                : "bg-secondary border border-border"
            )}
          >
            <ClientAvatar name={participant.name} size="xs" />
            <span className="text-sm font-medium">{participant.name}</span>
            {index === 0 && (
              <span className="text-[10px] text-primary font-medium">Hlavní</span>
            )}
            {isExpanded && localParticipants.length > 1 && (
              <button
                onClick={() => handleRemoveParticipant(participant.client_id)}
                className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                disabled={saveParticipants.isPending || updateTraining.isPending}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add participant section - only when expanded */}
      {isExpanded && isEditable && availableClients.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <ClientSearchSelect
              clients={availableClients}
              value=""
              onValueChange={handleAddParticipant}
              placeholder="Přidat účastníka..."
              filterArchived
              className="flex-1"
              disabled={saveParticipants.isPending || updateTraining.isPending}
            />
          </div>
          
          {/* Price info */}
          <div className="mt-3 p-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Cena za {localParticipants.length} {localParticipants.length === 1 ? 'osobu' : localParticipants.length < 5 ? 'osoby' : 'osob'}:</span>
              <span className="font-medium text-foreground">{formatCurrency(currentPrice)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Na osobu:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(Math.round(currentPrice / localParticipants.length))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
