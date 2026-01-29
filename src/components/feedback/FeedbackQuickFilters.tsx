/**
 * FeedbackQuickFilters - Advanced filtering for completed feedbacks
 * Includes severity filters, metric filters, and sorting options
 */

import { useState } from 'react';
import {
  AlertTriangle,
  Battery,
  Flame,
  MessageSquare,
  SortAsc,
  SortDesc,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SeverityFilter = 'all' | 'critical' | 'warning' | 'ok';
export type SortField = 'date' | 'pain' | 'body_feel' | 'energy';
export type SortOrder = 'asc' | 'desc';

export interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

interface FeedbackQuickFiltersProps {
  severity: SeverityFilter;
  onSeverityChange: (severity: SeverityFilter) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  quickFilters: QuickFilter[];
  onQuickFilterToggle: (filterId: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}

export function FeedbackQuickFilters({
  severity,
  onSeverityChange,
  sortField,
  sortOrder,
  onSortChange,
  quickFilters,
  onQuickFilterToggle,
  activeFilterCount,
  onClearFilters,
}: FeedbackQuickFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity Filter */}
        <Select value={severity} onValueChange={(v) => onSeverityChange(v as SeverityFilter)}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Severita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="critical">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Kritické
              </span>
            </SelectItem>
            <SelectItem value="warning">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Varování
              </span>
            </SelectItem>
            <SelectItem value="ok">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                V pořádku
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              {sortOrder === 'desc' ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
              Řazení
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Řadit podle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortField === 'date'}
              onCheckedChange={() => onSortChange('date', sortOrder)}
            >
              Datum
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortField === 'pain'}
              onCheckedChange={() => onSortChange('pain', sortOrder)}
            >
              Bolest
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortField === 'body_feel'}
              onCheckedChange={() => onSortChange('body_feel', sortOrder)}
            >
              Pocit v těle
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortField === 'energy'}
              onCheckedChange={() => onSortChange('energy', sortOrder)}
            >
              Energie
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Směr</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'desc'}
              onCheckedChange={() => onSortChange(sortField, 'desc')}
            >
              Sestupně (nejvyšší)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'asc'}
              onCheckedChange={() => onSortChange(sortField, 'asc')}
            >
              Vzestupně (nejnižší)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Zrušit ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onQuickFilterToggle(filter.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              filter.active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Default quick filter definitions
export function useDefaultQuickFilters() {
  const [filters, setFilters] = useState<QuickFilter[]>([
    {
      id: 'high_pain',
      label: 'Bolest ≥6',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />,
      active: false,
    },
    {
      id: 'low_energy',
      label: 'Nízká energie',
      icon: <Battery className="w-3.5 h-3.5 text-warning" />,
      active: false,
    },
    {
      id: 'high_soreness',
      label: 'Vysoká svalovka',
      icon: <Flame className="w-3.5 h-3.5 text-orange-500" />,
      active: false,
    },
    {
      id: 'has_comment',
      label: 'S komentářem',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      active: false,
    },
    {
      id: 'red_flags',
      label: 'Red Flags',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />,
      active: false,
    },
  ]);

  const toggleFilter = (id: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  const clearFilters = () => {
    setFilters((prev) => prev.map((f) => ({ ...f, active: false })));
  };

  const activeCount = filters.filter((f) => f.active).length;

  return { filters, toggleFilter, clearFilters, activeCount };
}
