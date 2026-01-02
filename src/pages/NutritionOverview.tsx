import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  Plus, 
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllNutritionSessions, useNutritionStats } from '@/hooks/useAllNutritionSessions';
import { useUpdateNutritionLogSession } from '@/hooks/useNutritionLog';
import { CampaignCard } from '@/components/nutrition/CampaignCard';
import { NewCampaignModal } from '@/components/nutrition/NewCampaignModal';
import { toast } from 'sonner';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function NutritionOverview() {
  usePageTracking('nutrition_overview');
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const { stats } = useNutritionStats();
  const updateSession = useUpdateNutritionLogSession();
  const [showNewModal, setShowNewModal] = useState(false);

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with sticky CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            Přehled stravy
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa stravovacích kampaní
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/nutrition/campaigns')}>
            <FileText className="h-4 w-4 mr-2" />
            Všechny kampaně
          </Button>
          <Button size="lg" onClick={() => setShowNewModal(true)} className="shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            <span className="sm:inline">Nová kampaň</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - reduced to 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Celkem kampaní</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.activeSessions}</p>
                <p className="text-sm text-muted-foreground">Aktivních</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.completedSessions}</p>
                <p className="text-sm text-muted-foreground">Dokončených</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Aktivní kampaně
          </CardTitle>
          <CardDescription>
            Probíhající stravovací kampaně
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-12">
              <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">Žádné aktivní kampaně</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Vytvořte novou kampaň pro sledování stravy klienta. Kampaň vygeneruje odkaz, který pošlete klientovi.
              </p>
              <Button className="mt-4" onClick={() => setShowNewModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Vytvořit kampaň
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((campaign) => (
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
        </CardContent>
      </Card>

      <NewCampaignModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal} 
      />
    </div>
  );
}
