import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAllNutritionSessions } from '@/hooks/useAllNutritionSessions';
import { useUpdateNutritionLogSession } from '@/hooks/useNutritionLog';
import { CampaignCard } from '@/components/nutrition/CampaignCard';
import { NewCampaignModal } from '@/components/nutrition/NewCampaignModal';

type StatusFilter = 'all' | 'active' | 'completed' | 'expired';

export default function NutritionCampaigns() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const updateSession = useUpdateNutritionLogSession();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showNewModal, setShowNewModal] = useState(false);

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

  // Navigate to campaign detail instead of analysis
  const handleOpenDetail = (sessionId: string) => {
    navigate(`/nutrition/campaigns/${sessionId}`);
  };

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
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onComplete={handleComplete}
              onViewClient={handleViewClient}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>
      )}

      <NewCampaignModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal} 
      />
    </div>
  );
}
