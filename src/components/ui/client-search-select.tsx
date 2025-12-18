import { useState, useMemo } from 'react';
import { Check, Search, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  credit_balance?: number | null;
  is_archived?: boolean;
}

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCreditBalance?: boolean;
  filterArchived?: boolean;
  className?: string;
}

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function ClientSearchSelect({
  clients,
  value,
  onValueChange,
  placeholder = "Vyhledat klienta...",
  disabled = false,
  showCreditBalance = false,
  filterArchived = true,
  className,
}: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClient = clients.find(c => c.id === value);

  const filteredClients = useMemo(() => {
    let result = filterArchived 
      ? clients.filter(c => !c.is_archived) 
      : clients;
    
    if (!searchQuery.trim()) return result;
    
    const normalizedQuery = removeDiacritics(searchQuery);
    return result.filter(client => 
      removeDiacritics(client.name).includes(normalizedQuery)
    );
  }, [clients, searchQuery, filterArchived]);

  const handleSelect = (clientId: string) => {
    onValueChange(clientId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal h-10 sm:h-9", className)}
        >
          {selectedClient ? (
            <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
              <span className="truncate">{selectedClient.name}</span>
              {showCreditBalance && selectedClient.credit_balance !== undefined && (
                <span className={cn(
                  "text-xs shrink-0",
                  (selectedClient.credit_balance || 0) < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {(selectedClient.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Zadejte jméno klienta..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>Klient nenalezen.</CommandEmpty>
            <CommandGroup>
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => handleSelect(client.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{client.name}</span>
                  </div>
                  {showCreditBalance && client.credit_balance !== undefined && (
                    <span className={cn(
                      "text-xs shrink-0 ml-2",
                      (client.credit_balance || 0) < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
