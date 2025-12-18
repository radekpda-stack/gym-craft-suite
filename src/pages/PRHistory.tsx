import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Download, Filter, Trophy, ArrowUpDown, Search, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePRMetrics, PRPeriod, PRType } from '@/hooks/usePRMetrics';
import { useClients } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type SortField = 'date' | 'exerciseName' | 'value' | 'clientName';
type SortDirection = 'asc' | 'desc';

const PRHistory = () => {
  usePageTracking('pr_history');
  const [period, setPeriod] = useState<PRPeriod>('3months');
  const [prType, setPrType] = useState<PRType>('1rm');
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: prData, isLoading } = usePRMetrics(
    period,
    exerciseFilter,
    prType,
    customStartDate,
    customEndDate
  );

  const { data: clients } = useClients();
  const { exercises } = useExercises();

  // Filter and sort PR events
  const filteredAndSortedPRs = useMemo(() => {
    if (!prData?.prEvents) return [];

    let filtered = [...prData.prEvents];

    // Filter by client
    if (clientFilter) {
      filtered = filtered.filter(pr => pr.clientName === clientFilter);
    }

    // Filter by search term (exercise name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pr => 
        pr.exerciseName.toLowerCase().includes(term) ||
        pr.clientName.toLowerCase().includes(term)
      );
    }

    // Filter by PR type
    if (prType !== '1rm') {
      filtered = filtered.filter(pr => pr.prType === prType);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'exerciseName':
          comparison = a.exerciseName.localeCompare(b.exerciseName, 'cs');
          break;
        case 'value':
          comparison = (prType === '1rm' ? a.estimated1RM : a.value) - (prType === '1rm' ? b.estimated1RM : b.value);
          break;
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName, 'cs');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [prData?.prEvents, clientFilter, searchTerm, prType, sortField, sortDirection]);

  // Get unique clients from PR events
  const clientOptions = useMemo(() => {
    if (!prData?.prEvents) return [];
    const uniqueClients = [...new Set(prData.prEvents.map(pr => pr.clientName))];
    return uniqueClients.sort((a, b) => a.localeCompare(b, 'cs'));
  }, [prData?.prEvents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    if (!filteredAndSortedPRs.length) return;

    const exportData = filteredAndSortedPRs.map(pr => ({
      'Datum': format(new Date(pr.date), 'd. M. yyyy', { locale: cs }),
      'Cvik': pr.exerciseName,
      'Klient': pr.clientName,
      'Typ PR': pr.prType === '1rm' ? '1RM' : pr.prType === 'maxWeight' ? 'Max váha' : 'Max opakování',
      'Hodnota': prType === '1rm' ? `${pr.estimated1RM} kg (odhad)` : `${pr.value} ${pr.prType === 'maxReps' ? 'rep' : 'kg'}`,
      'Váha': `${pr.weight} kg`,
      'Opakování': pr.reps,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PR Historie');
    XLSX.writeFile(wb, `PR_historie_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getPRTypeBadgeVariant = (type: PRType) => {
    switch (type) {
      case '1rm': return 'default';
      case 'maxWeight': return 'secondary';
      case 'maxReps': return 'outline';
      default: return 'default';
    }
  };

  const getPRTypeLabel = (type: PRType) => {
    switch (type) {
      case '1rm': return '1RM';
      case 'maxWeight': return 'Max váha';
      case 'maxReps': return 'Max opak.';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Historie PR
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Detailní přehled všech osobních rekordů
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!filteredAndSortedPRs.length}>
          <Download className="h-4 w-4 mr-2" />
          Export XLSX
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat cvik nebo klienta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Period */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PRPeriod)}>
              <SelectTrigger>
                <SelectValue placeholder="Období" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Posledních 30 dní</SelectItem>
                <SelectItem value="3months">3 měsíce</SelectItem>
                <SelectItem value="6months">6 měsíců</SelectItem>
                <SelectItem value="12months">12 měsíců</SelectItem>
                <SelectItem value="custom">Vlastní období</SelectItem>
              </SelectContent>
            </Select>

            {/* PR Type */}
            <Select value={prType} onValueChange={(v) => setPrType(v as PRType)}>
              <SelectTrigger>
                <SelectValue placeholder="Typ PR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1rm">1RM (odhad)</SelectItem>
                <SelectItem value="maxWeight">Max váha</SelectItem>
                <SelectItem value="maxReps">Max opakování</SelectItem>
              </SelectContent>
            </Select>

            {/* Exercise */}
            <Select value={exerciseFilter || 'all'} onValueChange={(v) => setExerciseFilter(v === 'all' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Cvik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny cviky</SelectItem>
                {exercises?.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Client */}
            <Select value={clientFilter || 'all'} onValueChange={(v) => setClientFilter(v === 'all' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Klient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni klienti</SelectItem>
                {clientOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="flex flex-wrap gap-3 mt-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!customStartDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, 'd. M. yyyy', { locale: cs }) : 'Od'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!customEndDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, 'd. M. yyyy', { locale: cs }) : 'Do'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{filteredAndSortedPRs.length}</div>
            <div className="text-sm text-muted-foreground">Celkem PR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {prData?.biggestPR ? `${prData.biggestPR.estimated1RM} kg` : '—'}
            </div>
            <div className="text-sm text-muted-foreground">Největší PR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{prData?.exerciseOptions.length || 0}</div>
            <div className="text-sm text-muted-foreground">Cviků s PR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{clientOptions.length}</div>
            <div className="text-sm text-muted-foreground">Klientů s PR</div>
          </CardContent>
        </Card>
      </div>

      {/* PR Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Načítání...</div>
          ) : filteredAndSortedPRs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Žádné PR události pro vybrané filtry</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Datum
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('exerciseName')}
                    >
                      <div className="flex items-center gap-1">
                        Cvik
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('clientName')}
                    >
                      <div className="flex items-center gap-1">
                        Klient
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('value')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Hodnota
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Váha × Opak.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPRs.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">
                        {format(new Date(pr.date), 'd. M. yyyy', { locale: cs })}
                      </TableCell>
                      <TableCell>{pr.exerciseName}</TableCell>
                      <TableCell>{pr.clientName}</TableCell>
                      <TableCell>
                        <Badge variant={getPRTypeBadgeVariant(pr.prType)}>
                          {getPRTypeLabel(pr.prType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {prType === '1rm' ? pr.estimated1RM : pr.value} kg
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {pr.weight} kg × {pr.reps}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PRHistory;
