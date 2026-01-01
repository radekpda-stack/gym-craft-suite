import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface ExerciseClientToggleProps {
  value: string | null; // null = all clients
  onChange: (clientId: string | null) => void;
}

export function ExerciseClientToggle({ value, onChange }: ExerciseClientToggleProps) {
  const { data: clients = [] } = useClients();
  const activeClients = clients.filter(c => !c.is_archived);

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

      <ClientSearchSelect
        clients={activeClients}
        value={value || ''}
        onValueChange={(v) => onChange(v || null)}
        placeholder="Konkrétní klient"
        filterArchived
        className={cn(
          "w-[180px] h-8",
          value && "bg-primary text-primary-foreground"
        )}
      />
    </div>
  );
}
