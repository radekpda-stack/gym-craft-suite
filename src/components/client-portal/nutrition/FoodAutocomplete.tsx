import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Clock, Utensils, Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMMON_FOODS } from './constants';
import { useMealTemplatesSearch } from '@/hooks/useNutritionMealTemplates';

interface FoodSuggestion {
  description: string;
  portion_size?: string;
  meal_type?: string;
  use_count?: number;
  source: 'template' | 'history' | 'common';
  // AI enriched nutrition data
  calories_per_portion?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ai_enriched?: boolean;
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

  // Query meal templates (favorites/frequently used)
  const { data: templateResults = [] } = useMealTemplatesSearch(clientId, inputValue);

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

  // Convert templates to suggestions format
  const templateSuggestions: FoodSuggestion[] = templateResults.map(t => ({
    description: t.description,
    portion_size: t.portion_size || undefined,
    meal_type: t.meal_type || undefined,
    use_count: t.use_count,
    source: 'template' as const,
    // AI nutrition data
    calories_per_portion: t.calories_per_portion,
    protein_g: t.protein_g,
    carbs_g: t.carbs_g,
    fat_g: t.fat_g,
    ai_enriched: t.ai_enriched,
  }));

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

  // Combine results with priority: Templates > History > Common
  // Remove duplicates by description (case-insensitive)
  const seenDescriptions = new Set<string>();
  const suggestions: FoodSuggestion[] = [];

  // 1. Templates first (favorites ⭐)
  for (const item of templateSuggestions) {
    const key = item.description.toLowerCase().trim();
    if (!seenDescriptions.has(key)) {
      seenDescriptions.add(key);
      suggestions.push(item);
    }
  }

  // 2. History second (recent ⏰)
  for (const item of historyResults) {
    const key = item.description.toLowerCase().trim();
    if (!seenDescriptions.has(key)) {
      seenDescriptions.add(key);
      suggestions.push(item);
    }
  }

  // 3. Common foods last (📖)
  for (const item of commonResults) {
    const key = item.description.toLowerCase().trim();
    if (!seenDescriptions.has(key) && suggestions.length < 8) {
      seenDescriptions.add(key);
      suggestions.push(item);
    }
  }

  // Limit to 8 suggestions
  const limitedSuggestions = suggestions.slice(0, 8);

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

      {isOpen && limitedSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="py-1 max-h-[280px] overflow-y-auto">
            {limitedSuggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion.description}-${idx}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-accent/50 transition-colors text-sm",
                  idx > 0 && "border-t border-border/50"
                )}
              >
                {suggestion.source === 'template' ? (
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : suggestion.source === 'history' ? (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{suggestion.description}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Show nutrition data if AI enriched */}
                    {suggestion.source === 'template' && suggestion.ai_enriched && suggestion.calories_per_portion && (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        ~{suggestion.calories_per_portion} kcal
                        {suggestion.protein_g && ` • ${Math.round(suggestion.protein_g)}g B`}
                        {suggestion.carbs_g && ` • ${Math.round(suggestion.carbs_g)}g S`}
                        {suggestion.fat_g && ` • ${Math.round(suggestion.fat_g)}g T`}
                      </span>
                    )}
                    {suggestion.source === 'template' && suggestion.use_count && suggestion.use_count > 1 && (
                      <span className="text-[10px] text-amber-600">
                        použito {suggestion.use_count}×
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {suggestion.source === 'template' ? 'oblíbené' : 
                   suggestion.source === 'history' ? 'nedávné' : 'běžné'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
