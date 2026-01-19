import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Dumbbell, Search } from 'lucide-react';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (name: string, exerciseId?: string) => void;
  placeholder?: string;
}

export function ExerciseAutocomplete({ value, onChange, placeholder = "Název cviku *" }: ExerciseAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search exercises
  const { data: suggestions = [] } = useQuery({
    queryKey: ['exercise-suggestions', inputValue],
    enabled: inputValue.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .or(`name.ilike.%${inputValue}%,name_cs.ilike.%${inputValue}%`)
        .eq('is_archived', false)
        .limit(8);

      if (error) throw error;
      return data || [];
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Only show dropdown, don't call onChange - user must explicitly select from dropdown
    setIsOpen(newValue.length >= 2);
  };

  const handleSelect = (exercise: { id: string; name: string; name_cs: string | null }) => {
    const displayName = exercise.name_cs || exercise.name;
    setInputValue(displayName);
    onChange(displayName, exercise.id);
    setIsOpen(false);
    // Clear input after selection for next search
    setInputValue('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => handleSelect(exercise)}
              className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
            >
              <Dumbbell className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">{exercise.name_cs || exercise.name}</div>
                <div className="text-xs text-muted-foreground">{exercise.category}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
