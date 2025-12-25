import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Utensils, 
  Search, 
  Copy, 
  ExternalLink, 
  Filter,
  RefreshCw,
  MoreHorizontal,
  Users,
  Calendar,
  FileText,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAllNutritionSessions, NutritionSessionWithClient } from '@/hooks/useAllNutritionSessions';
import { 
  useUpdateNutritionLogSession, 
  useRegenerateToken,
  useDeleteNutritionSession,
  useDeleteMultipleNutritionSessions,
} from '@/hooks/useNutritionLog';
import { DeleteSessionDialog } from '@/components/nutrition/DeleteSessionDialog';

type StatusFilter = 'all' | 'active' | 'completed' | 'expired' | 'empty';

export default function NutritionQuestionnaires() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const updateSession = useUpdateNutritionLogSession();
  const regenerateToken = useRegenerateToken();
  const deleteSession = useDeleteNutritionSession();
  const deleteMultipleSessions = useDeleteMultipleNutritionSessions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<NutritionSessionWithClient | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      const matchesSearch = session.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesStatus = true;
      
      if (statusFilter === 'empty') {
        matchesStatus = session.entries_count === 0;
      } else if (statusFilter !== 'all') {
        matchesStatus = session.status === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  const emptySessionsCount = useMemo(() => {
    return sessions?.filter(s => s.entries_count === 0).length || 0;
  }, [sessions]);

  const isAllSelected = filteredSessions.length > 0 && selectedIds.size === filteredSessions.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/nutrition-log/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz zkopírován');
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await updateSession.mutateAsync({ sessionId, status: 'completed' });
      toast.success('Dotazník označen jako dokončený');
    } catch {
      toast.error('Nepodařilo se aktualizovat dotazník');
    }
  };

  const handleRegenerateToken = async (sessionId: string) => {
    try {
      await regenerateToken.mutateAsync(sessionId);
      toast.success('Token byl regenerován');
    } catch {
      toast.error('Nepodařilo se regenerovat token');
    }
  };

  const handleDeleteClick = (session: NutritionSessionWithClient) => {
    setSessionToDelete(session);
    setIsBulkDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) {
      toast.error('Vyberte dotazníky k smazání');
      return;
    }
    setSessionToDelete(null);
    setIsBulkDelete(true);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (isBulkDelete) {
        await deleteMultipleSessions.mutateAsync(Array.from(selectedIds));
        toast.success(`Smazáno ${selectedIds.size} dotazníků`);
        setSelectedIds(new Set());
      } else if (sessionToDelete) {
        await deleteSession.mutateAsync(sessionToDelete.id);
        toast.success('Dotazník smazán');
      }
      setDeleteDialogOpen(false);
    } catch {
      toast.error('Nepodařilo se smazat dotazník');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">Aktivní</Badge>;
      case 'completed':
        return <Badge variant="secondary">Dokončeno</Badge>;
      case 'expired':
        return <Badge variant="destructive">Vypršel</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Stravovací dotazníky
          </h1>
          <p className="text-muted-foreground mt-1">
            Přehled všech 7denních stravovacích logů
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          Vytvořit u klienta
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat podle jména klienta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="completed">Dokončené</SelectItem>
                <SelectItem value="expired">Vypršelé</SelectItem>
                <SelectItem value="empty">
                  <span className="flex items-center gap-2">
                    Prázdné (0 záznamů)
                    {emptySessionsCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {emptySessionsCount}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDeleteClick}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Smazat vybrané ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Žádné dotazníky</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Zkuste změnit filtry' 
                  : 'Vytvořte první dotazník u klienta'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Vybrat vše"
                    />
                  </TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Období</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-center">Záznamy</TableHead>
                  <TableHead className="text-center">Jídla</TableHead>
                  <TableHead className="text-center">Nápoje</TableHead>
                  <TableHead className="text-center">Káva</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow 
                    key={session.id}
                    className={selectedIds.has(session.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(session.id)}
                        onCheckedChange={() => toggleSelect(session.id)}
                        aria-label={`Vybrat ${session.client_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button 
                        className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                        onClick={() => navigate(`/clients/${session.client_id}`)}
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {session.client_name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(session.start_date), 'd. M.', { locale: cs })}
                        {' – '}
                        {format(parseISO(session.end_date), 'd. M. yyyy', { locale: cs })}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-center">
                      <span className={session.entries_count === 0 ? 'text-muted-foreground' : 'font-medium'}>
                        {session.entries_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{session.food_count}</TableCell>
                    <TableCell className="text-center">{session.drink_count}</TableCell>
                    <TableCell className="text-center">{session.coffee_count}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${session.client_id}`)}>
                            <Users className="h-4 w-4 mr-2" />
                            Zobrazit klienta
                          </DropdownMenuItem>
                          {session.status === 'active' && (
                            <>
                              <DropdownMenuItem onClick={() => copyLink(session.token)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Kopírovat odkaz
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => window.open(`/nutrition-log/${session.token}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Otevřít formulář
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRegenerateToken(session.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerovat token
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCompleteSession(session.id)}>
                                Označit jako dokončený
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(session)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Smazat dotazník
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <DeleteSessionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteSession.isPending || deleteMultipleSessions.isPending}
        sessionInfo={sessionToDelete ? {
          clientName: sessionToDelete.client_name,
          entriesCount: sessionToDelete.entries_count,
        } : undefined}
        bulkCount={isBulkDelete ? selectedIds.size : undefined}
      />
    </div>
  );
}
