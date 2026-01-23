import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Clock, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMMON_FOODS } from './constants';

interface FoodSuggestion {
  description: string;
  portion_size?: string;
  source: 'history' | 'common';
}

interface FoodAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  clientId: string;
  onSelectSuggestion: (food: { description: string; portion_size?: string }) => void;
  placeholder?: string;
}

export function FoodAutocomplete({
  value,
  onChange,
  clientId,
  onSelectSuggestion,
  placeholder = 'např. kuřecí prsa, rýže, zelenina',
}: FoodAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Query client's food history
  const { data: historyResults = [] } = useQuery({
    queryKey: ['food-history-search', clientId, inputValue],
    queryFn: async () => {
      if (!clientId || inputValue.length < 2) return [];

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .select('description, portion_size')
        .eq('client_id', clientId)
        .ilike('description', `%${inputValue}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Deduplicate by description (case-insensitive)
      const seen = new Set<string>();
      const unique: FoodSuggestion[] = [];
      
      for (const entry of data || []) {
        const key = entry.description.toLowerCase().trim();
        if (!seen.has(key) && unique.length < 5) {
          seen.add(key);
          unique.push({
            description: entry.description,
            portion_size: entry.portion_size || undefined,
            source: 'history',
          });
        }
      }

      return unique;
    },
    enabled: !!clientId && inputValue.length >= 2,
    staleTime: 30000,
  });

  // Filter common foods based on input
  const commonResults: FoodSuggestion[] = inputValue.length >= 2
    ? COMMON_FOODS
        .filter(food => 
          food.description.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 5)
        .map(food => ({
          description: food.description,
          source: 'common' as const,
        }))
    : [];

  // Combine results, prioritizing history
  const suggestions: FoodSuggestion[] = [
    ...historyResults,
    ...commonResults.filter(
      common => !historyResults.some(
        h => h.description.toLowerCase() === common.description.toLowerCase()
      )
    ),
  ].slice(0, 8);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleSelect = (suggestion: FoodSuggestion) => {
    setInputValue(suggestion.description);
    onChange(suggestion.description);
    onSelectSuggestion({
      description: suggestion.description,
      portion_size: suggestion.portion_size,
    });
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="py-1 max-h-[200px] overflow-y-auto">
            {suggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion.description}-${idx}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent/50 transition-colors text-sm",
                  idx > 0 && "border-t border-border/50"
                )}
              >
                {suggestion.source === 'history' ? (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <Utensils className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{suggestion.description}</span>
                {suggestion.source === 'history' && (
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    nedávné
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
