import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkoutFiltersProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterSource: string;
  setFilterSource: (value: string) => void;
}

export function WorkoutFilters({
  filterType,
  setFilterType,
  filterSource,
  setFilterSource,
}: WorkoutFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-[140px]">
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
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Zdroj" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vše</SelectItem>
          <SelectItem value="coached">S trenérem</SelectItem>
          <SelectItem value="self">Samostatně</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
