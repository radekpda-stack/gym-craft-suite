import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type GenderFilter = 'all' | 'male' | 'female';
type SortOption = 'name' | 'trainings' | 'credit' | 'recent';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ClientFiltersDialogProps {
  genderFilter: GenderFilter;
  setGenderFilter: (value: GenderFilter) => void;
  selectedGoal: string | null;
  setSelectedGoal: (value: string | null) => void;
  selectedTagId: string | null;
  setSelectedTagId: (value: string | null) => void;
  lowCreditFilter: boolean;
  setLowCreditFilter: (value: boolean) => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  allGoals: string[];
  allTags: Tag[];
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

export function ClientFiltersDialog({
  genderFilter,
  setGenderFilter,
  selectedGoal,
  setSelectedGoal,
  selectedTagId,
  setSelectedTagId,
  lowCreditFilter,
  setLowCreditFilter,
  sortBy,
  setSortBy,
  allGoals,
  allTags,
  hasActiveFilters,
  onClearAll,
}: ClientFiltersDialogProps) {
  const activeFiltersCount = [
    genderFilter !== 'all',
    selectedGoal,
    selectedTagId,
    lowCreditFilter,
  ].filter(Boolean).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-12">
          <Filter className="w-4 h-4" />
          Filtry
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filtry a řazení</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1 text-xs">
                <X className="w-3 h-3" />
                Zrušit vše
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Sort */}
          <div className="space-y-2">
            <Label>Řazení</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Podle jména</SelectItem>
                <SelectItem value="trainings">Podle tréninků</SelectItem>
                <SelectItem value="credit">Podle kreditu</SelectItem>
                <SelectItem value="recent">Nejnovější</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Pohlaví</Label>
            <div className="flex gap-2">
              {(['all', 'male', 'female'] as const).map((g) => (
                <Button
                  key={g}
                  variant={genderFilter === g ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGenderFilter(g)}
                  className="flex-1"
                >
                  {g === 'all' ? 'Všichni' : g === 'male' ? '♂ Muži' : '♀ Ženy'}
                </Button>
              ))}
            </div>
          </div>

          {/* Goals */}
          {allGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Tréninkový cíl</Label>
              <Select
                value={selectedGoal || 'all'}
                onValueChange={(v) => setSelectedGoal(v === 'all' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cíl" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny cíle</SelectItem>
                  {allGoals.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label>Štítek</Label>
              <Select
                value={selectedTagId || 'all'}
                onValueChange={(v) => setSelectedTagId(v === 'all' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte štítek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny štítky</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Low Credit */}
          <div className="flex items-center justify-between">
            <Label>Pouze nízký kredit (&lt;500 Kč)</Label>
            <Button
              variant={lowCreditFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowCreditFilter(!lowCreditFilter)}
            >
              {lowCreditFilter ? 'Aktivní' : 'Neaktivní'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
