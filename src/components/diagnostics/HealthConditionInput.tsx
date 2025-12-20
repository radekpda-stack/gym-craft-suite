import { useState, useRef, useEffect } from 'react';
import { X, Plus, Search, Stethoscope, Syringe, AlertTriangle, Activity, Apple } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHealthConditions, HealthConditionCategory } from '@/hooks/useHealthConditions';
import { cn } from '@/lib/utils';

interface HealthConditionInputProps {
  category: HealthConditionCategory;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
}

const categoryIcons: Record<HealthConditionCategory, React.ReactNode> = {
  disease: <Stethoscope className="h-3.5 w-3.5" />,
  surgery: <Syringe className="h-3.5 w-3.5" />,
  injury: <AlertTriangle className="h-3.5 w-3.5" />,
  pain: <Activity className="h-3.5 w-3.5" />,
  allergy: <Apple className="h-3.5 w-3.5" />,
};

const categoryLabels: Record<HealthConditionCategory, string> = {
  disease: 'Nemoc',
  surgery: 'Operace',
  injury: 'Úraz',
  pain: 'Bolest',
  allergy: 'Alergie',
};

export function HealthConditionInput({
  category,
  value,
  onChange,
  placeholder = 'Začněte psát...',
}: HealthConditionInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { conditions, searchConditions, addCondition, incrementUsage, isLoading } = useHealthConditions();

  // Show filtered suggestions - if no input, show top items for category
  const suggestions = inputValue.trim() 
    ? searchConditions(inputValue, category)
    : conditions.filter(c => c.category === category).slice(0, 8);
    
  const trimmedInput = inputValue.trim();
  const canAddNew = trimmedInput.length > 1 && 
    !suggestions.some(s => s.name.toLowerCase() === trimmedInput.toLowerCase()) &&
    !value.some(v => v.toLowerCase() === trimmedInput.toLowerCase());

  const handleSelect = async (conditionName: string, conditionId?: string) => {
    if (!value.includes(conditionName)) {
      onChange([...value, conditionName]);
      if (conditionId) {
        incrementUsage(conditionId);
      }
    }
    setInputValue('');
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (!canAddNew) return;
    
    try {
      const newCondition = await addCondition({ name: trimmedInput, category });
      handleSelect(newCondition.name, newCondition.id);
    } catch (error) {
      // If adding fails, still add to local value
      handleSelect(trimmedInput);
    }
  };

  const handleRemove = (item: string) => {
    onChange(value.filter(v => v !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && trimmedInput) {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelect(suggestions[0].name, suggestions[0].id);
      } else if (canAddNew) {
        handleAddNew();
      }
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemove(value[value.length - 1]);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {/* Selected items */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 pr-1 text-sm"
            >
              {categoryIcons[category]}
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (!open && e.target.value) setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="pl-9"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Načítání...
                </div>
              ) : suggestions.length === 0 && !canAddNew ? (
                <CommandEmpty>
                  {inputValue ? 'Žádné výsledky' : `Vyberte ${categoryLabels[category].toLowerCase()}`}
                </CommandEmpty>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <CommandGroup heading={categoryLabels[category]}>
                      {suggestions.map((condition) => (
                        <CommandItem
                          key={condition.id}
                          value={condition.name}
                          onSelect={() => handleSelect(condition.name, condition.id)}
                          className="flex items-center justify-between"
                          disabled={value.includes(condition.name)}
                        >
                          <div className="flex items-center gap-2">
                            {categoryIcons[category]}
                            <span>{condition.name}</span>
                            {condition.is_system && (
                              <span className="text-xs text-muted-foreground">•</span>
                            )}
                          </div>
                          {condition.usage_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {condition.usage_count}×
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {canAddNew && (
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleAddNew}
                        className="text-primary"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Přidat "{trimmedInput}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
