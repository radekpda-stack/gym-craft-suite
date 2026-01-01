import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';

interface ClientPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ClientPicker({ value, onChange, placeholder = 'Vyberte klienta', className, disabled }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: clients, isLoading } = useClients();

  const activeClients = useMemo(() => {
    return clients?.filter(c => !c.is_archived) || [];
  }, [clients]);

  const selectedClient = activeClients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn('justify-between', className)}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {selectedClient ? selectedClient.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Hledat klienta..." />
          <CommandList>
            <CommandEmpty>Žádný klient nenalezen</CommandEmpty>
            <CommandGroup>
              {activeClients.map(client => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id === value ? null : client.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === client.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
