import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Dumbbell,
  Calendar,
  Settings,
  Stethoscope,
  Activity,
  Sparkles,
  Command,
  LayoutDashboard,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: trainings = [] } = useTrainingSessions();
  const [search, setSearch] = useState('');

  const runCommand = useCallback((command: () => void, resultType?: string) => {
    featureTracker.track('search_result_select', 'search', { result_type: resultType });
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  const upcomingTrainings = trainings
    .filter(t => t.status === 'scheduled' && new Date(t.date) >= new Date())
    .slice(0, 5);

  const pages = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Klienti', icon: Users, path: '/clients' },
    { name: 'Tréninky', icon: Dumbbell, path: '/trainings' },
    { name: 'Kalendář', icon: Calendar, path: '/calendar' },
    { name: 'Diagnostika', icon: Stethoscope, path: '/diagnostics' },
    { name: 'Měření', icon: Activity, path: '/measurements' },
    { name: 'AI Asistent', icon: Sparkles, path: '/ai-assistant' },
    { name: 'Nastavení', icon: Settings, path: '/settings' },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Hledat klienty, stránky..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nic nenalezeno.</CommandEmpty>
        
        {filteredClients.length > 0 && (
          <CommandGroup heading="Klienti">
            {filteredClients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.name}
                onSelect={() => runCommand(() => navigate(`/clients/${client.id}`), 'client')}
                className="flex items-center gap-3"
              >
                <ClientAvatar name={client.name} size="sm" />
                <div className="flex-1">
                  <span>{client.name}</span>
                  {client.is_favorite && (
                    <span className="ml-2 text-yellow-500">★</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Stránky">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              value={page.name}
              onSelect={() => runCommand(() => navigate(page.path), 'page')}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {upcomingTrainings.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Nadcházející tréninky">
              {upcomingTrainings.map((training) => {
                const client = clients.find(c => c.id === training.client_id);
                return (
                  <CommandItem
                    key={training.id}
                    value={`${client?.name} ${new Date(training.date).toLocaleDateString('cs-CZ')}`}
                    onSelect={() => runCommand(() => navigate('/calendar'), 'training')}
                  >
                    <Dumbbell className="mr-2 h-4 w-4" />
                    <span className="flex-1">{client?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(training.date).toLocaleDateString('cs-CZ', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">↑↓</kbd>
          <span>navigace</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd>
          <span>otevřít</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Esc</kbd>
          <span>zavřít</span>
        </div>
      </div>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        featureTracker.track('search_open_keyboard', 'search');
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
