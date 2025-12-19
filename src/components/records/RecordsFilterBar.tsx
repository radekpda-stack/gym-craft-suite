import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { RecordsFeedFilters, PeriodFilter, RecordType } from '@/hooks/useRecordsFeed';
import { User, Calendar, Filter } from 'lucide-react';

interface RecordsFilterBarProps {
  filters: RecordsFeedFilters;
  onFiltersChange: (filters: RecordsFeedFilters) => void;
  counts: {
    training: number;
    measurement: number;
    diagnostic: number;
    total: number;
  };
  className?: string;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: 'week', label: 'Tento týden' },
  { value: 'month', label: 'Tento měsíc' },
  { value: 'all', label: 'Vše' },
];

const typeOptions: { value: RecordType | 'all'; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'training', label: 'Tréninky' },
  { value: 'measurement', label: 'Měření' },
  { value: 'diagnostic', label: 'Diagnostika' },
];

export function RecordsFilterBar({ 
  filters, 
  onFiltersChange, 
  counts,
  className 
}: RecordsFilterBarProps) {
  const { data: clients = [] } = useClients();
  const activeClients = clients.filter(c => !c.is_archived);
  
  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      {/* Client filter */}
      <Select
        value={filters.clientId || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ ...filters, clientId: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[160px] sm:w-[200px] h-9 rounded-lg glass">
          <User className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Všichni klienti" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všichni klienti</SelectItem>
          {activeClients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Period filter */}
      <Select
        value={filters.period}
        onValueChange={(value: PeriodFilter) => 
          onFiltersChange({ ...filters, period: value })
        }
      >
        <SelectTrigger className="w-[140px] h-9 rounded-lg glass">
          <Calendar className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Type filter */}
      <Select
        value={filters.recordType}
        onValueChange={(value: RecordType | 'all') => 
          onFiltersChange({ ...filters, recordType: value })
        }
      >
        <SelectTrigger className="w-[140px] h-9 rounded-lg glass">
          <Filter className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.value !== 'all' && (
                <span className="ml-2 text-muted-foreground">
                  ({counts[option.value as RecordType]})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Total count indicator */}
      <span className="text-sm text-muted-foreground ml-auto">
        {counts.total} {counts.total === 1 ? 'záznam' : counts.total < 5 ? 'záznamy' : 'záznamů'}
      </span>
    </div>
  );
}
