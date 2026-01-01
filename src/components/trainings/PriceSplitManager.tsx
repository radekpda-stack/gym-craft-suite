/**
 * PriceSplitManager Component
 * 
 * Allows users to add multiple clients to a training and split the price between them.
 * Supports automatic equal split and manual ratio adjustment.
 */
import { useState, useEffect } from 'react';
import { Plus, X, Users, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export interface ParticipantShare {
  client_id: string;
  client_name: string;
  price_share: number;
  percentage: number;
}

interface PriceSplitManagerProps {
  clients: Client[];
  totalPrice: number;
  primaryClientId: string;
  onChange: (participants: ParticipantShare[]) => void;
  initialParticipants?: ParticipantShare[];
  /** Optional function to calculate price based on participant count */
  getPriceForCount?: (count: number) => number;
}

export function PriceSplitManager({
  clients,
  totalPrice: initialTotalPrice,
  primaryClientId,
  onChange,
  initialParticipants,
  getPriceForCount,
}: PriceSplitManagerProps) {
  const [participants, setParticipants] = useState<ParticipantShare[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Calculate the actual total price based on participant count if pricing function is provided
  const totalPrice = getPriceForCount 
    ? getPriceForCount(participants.length || 1) 
    : initialTotalPrice;

  // Initialize with primary client
  useEffect(() => {
    if (initialParticipants && initialParticipants.length > 0) {
      setParticipants(initialParticipants);
      // Check if manual mode
      const isManual = initialParticipants.some((p, i, arr) => {
        const expectedPct = 100 / arr.length;
        return Math.abs(p.percentage - expectedPct) > 0.1;
      });
      setIsManualMode(isManual);
    } else {
      const primaryClient = clients.find(c => c.id === primaryClientId);
      if (primaryClient) {
        setParticipants([{
          client_id: primaryClient.id,
          client_name: primaryClient.name,
          price_share: totalPrice,
          percentage: 100,
        }]);
      }
    }
  }, [primaryClientId, clients, initialParticipants]);

  // Update prices when totalPrice changes (only in auto mode)
  useEffect(() => {
    if (!isManualMode && participants.length > 0) {
      const equalShare = totalPrice / participants.length;
      const updated = participants.map(p => ({
        ...p,
        price_share: Math.round(equalShare),
        percentage: 100 / participants.length,
      }));
      setParticipants(updated);
      onChange(updated);
    }
  }, [totalPrice, isManualMode]);

  const addParticipant = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || participants.some(p => p.client_id === clientId)) return;

    const newCount = participants.length + 1;
    // Calculate the correct price for the NEW participant count
    const newTotalPrice = getPriceForCount ? getPriceForCount(newCount) : initialTotalPrice;
    const equalPercentage = 100 / newCount;
    const equalShare = newTotalPrice / newCount;

    const updated = [
      ...participants.map(p => ({
        ...p,
        price_share: Math.round(equalShare),
        percentage: equalPercentage,
      })),
      {
        client_id: client.id,
        client_name: client.name,
        price_share: Math.round(equalShare),
        percentage: equalPercentage,
      },
    ];

    setParticipants(updated);
    onChange(updated);
    setIsManualMode(false);
  };

  const removeParticipant = (clientId: string) => {
    // Don't allow removing the last participant
    if (participants.length <= 1) return;

    const newParticipants = participants.filter(p => p.client_id !== clientId);
    const newCount = newParticipants.length;
    // Calculate the correct price for the NEW participant count
    const newTotalPrice = getPriceForCount ? getPriceForCount(newCount) : initialTotalPrice;
    const equalPercentage = 100 / newCount;
    const equalShare = newTotalPrice / newCount;

    const updated = newParticipants.map(p => ({
      ...p,
      price_share: Math.round(equalShare),
      percentage: equalPercentage,
    }));

    setParticipants(updated);
    onChange(updated);
    setIsManualMode(false);
  };

  const updateParticipantShare = (clientId: string, value: number, type: 'price' | 'percentage') => {
    setIsManualMode(true);
    
    const updated = participants.map(p => {
      if (p.client_id === clientId) {
        if (type === 'price') {
          const newPrice = Math.max(0, value);
          return {
            ...p,
            price_share: newPrice,
            percentage: totalPrice > 0 ? (newPrice / totalPrice) * 100 : 0,
          };
        } else {
          const newPercentage = Math.max(0, Math.min(100, value));
          return {
            ...p,
            percentage: newPercentage,
            price_share: Math.round((newPercentage / 100) * totalPrice),
          };
        }
      }
      return p;
    });

    setParticipants(updated);
    onChange(updated);
  };

  const distributeEvenly = () => {
    const equalShare = totalPrice / participants.length;
    const equalPercentage = 100 / participants.length;

    const updated = participants.map(p => ({
      ...p,
      price_share: Math.round(equalShare),
      percentage: equalPercentage,
    }));

    setParticipants(updated);
    onChange(updated);
    setIsManualMode(false);
  };

  const availableClients = clients.filter(
    c => !participants.some(p => p.client_id === c.id)
  );

  const totalAssigned = participants.reduce((sum, p) => sum + p.price_share, 0);
  const difference = totalPrice - totalAssigned;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Rozdělení ceny ({participants.length} {participants.length === 1 ? 'účastník' : participants.length < 5 ? 'účastníci' : 'účastníků'})
        </Label>
        {participants.length > 1 && isManualMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={distributeEvenly}
            className="text-xs"
          >
            Rozdělit rovnoměrně
          </Button>
        )}
      </div>

      {/* Participants list */}
      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div
            key={participant.client_id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border"
          >
            <ClientAvatar name={participant.client_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{participant.client_name}</p>
            </div>
            
            {/* Price input */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={participant.price_share}
                onChange={(e) => updateParticipantShare(
                  participant.client_id,
                  parseInt(e.target.value) || 0,
                  'price'
                )}
                className="w-20 h-8 text-right text-sm"
              />
              <span className="text-xs text-muted-foreground">Kč</span>
            </div>

            {/* Percentage */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={Math.round(participant.percentage)}
                onChange={(e) => updateParticipantShare(
                  participant.client_id,
                  parseInt(e.target.value) || 0,
                  'percentage'
                )}
                className="w-14 h-8 text-right text-sm"
                step="1"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>

            {/* Remove button (only if more than 1 participant) */}
            {participants.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeParticipant(participant.client_id)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add participant */}
      {availableClients.length > 0 && (
        <div className="flex items-center gap-2">
          <ClientSearchSelect
            clients={availableClients}
            value=""
            onValueChange={addParticipant}
            placeholder="Přidat účastníka..."
            filterArchived
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" disabled>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className={cn(
        "p-3 rounded-lg border",
        Math.abs(difference) > 1 ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"
      )}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Celková cena:</span>
          <span className="font-bold">{formatCurrency(totalPrice)}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-muted-foreground">Přiřazeno:</span>
          <span className="font-medium">{formatCurrency(totalAssigned)}</span>
        </div>
        {Math.abs(difference) > 1 && (
          <div className="flex justify-between items-center text-sm mt-1 text-warning">
            <span>Rozdíl:</span>
            <span className="font-medium">{difference > 0 ? '+' : ''}{formatCurrency(difference, false)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
