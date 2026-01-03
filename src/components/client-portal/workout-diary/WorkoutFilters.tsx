import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkoutFiltersProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterSource: string;
  setFilterSource: (value: string) => void;
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
}

export function WorkoutFilters({
  filterType,
  setFilterType,
  filterSource,
  setFilterSource,
  searchQuery = '',
  setSearchQuery,
}: WorkoutFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      {setSearchQuery && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat cviky, poznámky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Filter selects */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] sm:w-[140px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            <SelectItem value="strength">Síla</SelectItem>
            <SelectItem value="cardio">Kardio</SelectItem>
            <SelectItem value="run">Běh</SelectItem>
            <SelectItem value="hiit">HIIT</SelectItem>
            <SelectItem value="conditioning">Kondice</SelectItem>
            <SelectItem value="mobility">Mobilita</SelectItem>
            <SelectItem value="recovery">Regenerace</SelectItem>
            <SelectItem value="other">Ostatní</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[130px] sm:w-[140px]">
            <SelectValue placeholder="Zdroj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vše</SelectItem>
            <SelectItem value="coached">S trenérem</SelectItem>
            <SelectItem value="self">Samostatně</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
