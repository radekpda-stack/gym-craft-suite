import { useState } from 'react';
import { Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface ExerciseClientToggleProps {
  value: string | null; // null = all clients
  onChange: (clientId: string | null) => void;
}

export function ExerciseClientToggle({ value, onChange }: ExerciseClientToggleProps) {
  const { data: clients = [] } = useClients();
  const activeClients = clients.filter(c => !c.is_archived);

  const selectedClient = value ? clients.find(c => c.id === value) : null;

  return (
    <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg">
      <Button
        variant={value === null ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange(null)}
        className={cn(
          'flex items-center gap-2',
          value === null && 'shadow-sm'
        )}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Všichni klienti</span>
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={value || ''}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger 
            className={cn(
              "w-[180px] h-8",
              value && "bg-primary text-primary-foreground"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Konkrétní klient">
              {selectedClient?.name || 'Konkrétní klient'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {activeClients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
