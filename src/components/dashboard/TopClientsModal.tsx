import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  ArrowUpDown, 
  ChevronRight,
  Trophy,
  Dumbbell,
  Wallet,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface TopClient {
  id: string;
  name: string;
  trainingsCount: number;
  revenue: number;
  unpaidAmount?: number;
  lastTraining?: string;
}

interface TopClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: TopClient[];
  periodLabel: string;
}

type SortField = 'trainings' | 'revenue' | 'unpaid' | 'name';
type SortDirection = 'asc' | 'desc';

export function TopClientsModal({
  open,
  onOpenChange,
  clients,
  periodLabel,
}: TopClientsModalProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('trainings');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<'all' | 'trainings' | 'products'>('all');

  // Normalize search string (remove diacritics)
  const normalizeString = (str: string) => 
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Filter by search
    if (search) {
      const normalizedSearch = normalizeString(search);
      result = result.filter(c => 
        normalizeString(c.name).includes(normalizedSearch)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'trainings':
          comparison = a.trainingsCount - b.trainingsCount;
          break;
        case 'revenue':
          comparison = a.revenue - b.revenue;
          break;
        case 'unpaid':
          comparison = (a.unpaidAmount || 0) - (b.unpaidAmount || 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'cs');
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [clients, search, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Jméno', 'Počet tréninků', 'Příjem (Kč)', 'Nezaplaceno (Kč)', 'Poslední trénink'];
    const rows = filteredAndSortedClients.map(c => [
      c.name,
      c.trainingsCount,
      c.revenue,
      c.unpaidAmount || 0,
      c.lastTraining ? format(new Date(c.lastTraining), 'd.M.yyyy') : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `klienti-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-7 px-2 text-xs font-medium',
        sortField === field && 'text-primary'
      )}
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className={cn(
        'w-3 h-3 ml-1',
        sortField === field && sortDirection === 'asc' && 'rotate-180'
      )} />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Přehled klientů – {periodLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat klienta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
              {(['all', 'trainings', 'products'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' && 'Vše'}
                  {type === 'trainings' && 'Tréninky'}
                  {type === 'products' && 'Produkty'}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1 py-2">
          <span className="text-xs text-muted-foreground mr-2">Řadit:</span>
          <SortButton field="name" label="Jméno" />
          <SortButton field="trainings" label="Tréninky" />
          <SortButton field="revenue" label="Příjem" />
          <SortButton field="unpaid" label="Nezaplaceno" />
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filteredAndSortedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>Žádní klienti nenalezeni</p>
            </div>
          ) : (
            filteredAndSortedClients.map((client, index) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
              >
                {/* Rank */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                    index === 0 && 'bg-warning/20 text-warning',
                    index === 1 && 'bg-muted text-muted-foreground',
                    index === 2 && 'bg-orange-500/20 text-orange-500',
                    index > 2 && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {index + 1}
                </div>

                <ClientAvatar name={client.name} size="sm" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{client.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      {client.trainingsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      {formatCurrency(client.revenue)}
                    </span>
                    {(client.unpaidAmount || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatCurrency(client.unpaidAmount)}
                      </Badge>
                    )}
                  </div>
                </div>

                {client.lastTraining && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {format(new Date(client.lastTraining), 'd.M.', { locale: cs })}
                  </span>
                )}

                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredAndSortedClients.length} klientů
          </span>
          <span className="text-muted-foreground">
            Celkem: {formatCurrency(filteredAndSortedClients.reduce((sum, c) => sum + c.revenue, 0))}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
