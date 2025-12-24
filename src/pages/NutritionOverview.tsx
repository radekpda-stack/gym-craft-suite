import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Utensils, 
  Plus, 
  Copy, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAllNutritionSessions, useNutritionStats, NutritionSessionWithClient } from '@/hooks/useAllNutritionSessions';

export default function NutritionOverview() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const { stats } = useNutritionStats();

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];
  const recentCompleted = sessions?.filter(s => s.status === 'completed').slice(0, 5) || [];

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/nutrition-log/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz zkopírován');
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Aktivní</Badge>;
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
            <Utensils className="h-6 w-6 text-primary" />
            Přehled stravy
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa stravovacích dotazníků a analýz
          </p>
        </div>
        <Button onClick={() => navigate('/nutrition/questionnaires')}>
          <Plus className="h-4 w-4 mr-2" />
          Nový dotazník
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Celkem dotazníků</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Clock className="h-5 w-5 text-green-600" />
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
              <div className="p-3 rounded-lg bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.completedSessions}</p>
                <p className="text-sm text-muted-foreground">Dokončených</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stats.totalEntries}</p>
                <p className="text-sm text-muted-foreground">Celkem záznamů</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Aktivní dotazníky
            </CardTitle>
            <CardDescription>
              Probíhající 7denní stravovací logy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Utensils className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Žádné aktivní dotazníky</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/clients')}
                >
                  Přejít ke klientům
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {activeSessions.map((session) => (
                    <SessionCard 
                      key={session.id} 
                      session={session} 
                      onCopyLink={copyLink}
                      onNavigate={() => navigate(`/clients/${session.client_id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Nedávno dokončené
            </CardTitle>
            <CardDescription>
              Poslední vyplněné dotazníky k analýze
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentCompleted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Žádné dokončené dotazníky</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 pr-4">
                  {recentCompleted.map((session) => (
                    <SessionCard 
                      key={session.id} 
                      session={session} 
                      onCopyLink={copyLink}
                      onNavigate={() => navigate(`/clients/${session.client_id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/nutrition/questionnaires')}
            >
              <FileText className="h-6 w-6" />
              <span>Všechny dotazníky</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/nutrition/infographics')}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Infografika</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/nutrition/settings')}
            >
              <Utensils className="h-6 w-6" />
              <span>Nastavení dotazníku</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionCard({ 
  session, 
  onCopyLink, 
  onNavigate 
}: { 
  session: NutritionSessionWithClient;
  onCopyLink: (token: string) => void;
  onNavigate: () => void;
}) {
  const isActive = session.status === 'active';
  const endDate = parseISO(session.end_date);
  const daysLeft = isActive ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
          <Users className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-medium">{session.client_name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(parseISO(session.start_date), 'd. M.', { locale: cs })}</span>
            <span>–</span>
            <span>{format(endDate, 'd. M. yyyy', { locale: cs })}</span>
            {isActive && daysLeft > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {daysLeft} {daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní'}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {session.entries_count} záznamů
        </Badge>
        {isActive && (
          <Button variant="ghost" size="icon" onClick={() => onCopyLink(session.token)}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onNavigate}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
