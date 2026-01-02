import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Square,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { useAllNutritionSessions } from '@/hooks/useAllNutritionSessions';
import { useUpdateNutritionLogSession, useDeleteMultipleNutritionSessions } from '@/hooks/useNutritionLog';
import { CampaignCard } from '@/components/nutrition/CampaignCard';
import { NewCampaignModal } from '@/components/nutrition/NewCampaignModal';
import { usePageTracking } from '@/hooks/useFeatureTracking';

type StatusFilter = 'all' | 'active' | 'completed' | 'expired';

export default function NutritionCampaigns() {
  usePageTracking('nutrition_campaigns');
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const updateSession = useUpdateNutritionLogSession();
  const deleteSessions = useDeleteMultipleNutritionSessions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'complete' | null>(null);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      const matchesSearch = session.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!sessions) return { active: 0, completed: 0, total: 0 };
    return {
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      total: sessions.length,
    };
  }, [sessions]);

  const handleComplete = async (sessionId: string) => {
    try {
      await updateSession.mutateAsync({ sessionId, status: 'completed' });
      toast.success('Kampaň ukončena');
    } catch {
      toast.error('Nepodařilo se ukončit kampaň');
    }
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleOpenDetail = (sessionId: string) => {
    navigate(`/nutrition/campaigns/${sessionId}`);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBulkComplete = async () => {
    try {
      const promises = Array.from(selectedIds).map(id => 
        updateSession.mutateAsync({ sessionId: id, status: 'completed' })
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} kampaní ukončeno`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Nepodařilo se ukončit kampaně');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteSessions.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} kampaní smazáno`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch {
      toast.error('Nepodařilo se smazat kampaně');
    }
  };

  const hasSelection = selectedIds.size > 0;
  const allSelected = filteredSessions.length > 0 && selectedIds.size === filteredSessions.length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Stravovací kampaně
          </h1>
          <p className="text-muted-foreground mt-1">
            Centrální přehled všech kampaní
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nová kampaň
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Celkem kampaní</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Aktivních</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Dokončených</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Bulk Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
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
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stav" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="completed">Dokončené</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions Bar */}
            {filteredSessions.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectAll}
                    className="gap-2"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {allSelected ? 'Zrušit výběr' : 'Vybrat vše'}
                  </Button>
                  {hasSelection && (
                    <span className="text-sm text-muted-foreground">
                      Vybráno: {selectedIds.size}
                    </span>
                  )}
                </div>
                
                {hasSelection && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBulkComplete}
                      disabled={updateSession.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Ukončit vybrané
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Smazat vybrané
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Žádné kampaně</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== 'all' 
                ? 'Zkuste změnit filtry' 
                : 'Vytvořte první kampaň pro sledování stravy klienta'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => setShowNewModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Vytvořit kampaň
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((campaign) => (
            <div key={campaign.id} className="relative">
              {/* Checkbox overlay */}
              <div 
                className="absolute top-3 left-3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(campaign.id);
                }}
              >
                <Checkbox 
                  checked={selectedIds.has(campaign.id)}
                  className="bg-background"
                />
              </div>
              <CampaignCard
                campaign={campaign}
                onComplete={handleComplete}
                onViewClient={handleViewClient}
                onOpenDetail={handleOpenDetail}
                selected={selectedIds.has(campaign.id)}
              />
            </div>
          ))}
        </div>
      )}

      <NewCampaignModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat kampaně?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} vybraných kampaní? 
              Tato akce je nevratná a smaže i všechny záznamy stravy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
