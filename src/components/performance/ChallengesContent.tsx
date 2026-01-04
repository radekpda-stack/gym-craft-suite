import { useState, useEffect } from 'react';
import { Plus, Trophy, Archive, Clock, MoreVertical, Users, Play, Pause, Sparkles, Copy, Download, Award, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChallenges, useUpdateChallenge, useDeleteChallenge, Challenge } from '@/hooks/useChallenges';
import { useDuplicateChallenge, useArchiveExpiredChallenges, useExportChallengeResults } from '@/hooks/useChallengeActions';
import { ChallengeEditor } from '@/components/challenges/ChallengeEditor';
import { ChallengeSubmissionsView } from '@/components/challenges/ChallengeSubmissionsView';
import { ChallengeWinnerManager } from '@/components/challenges/ChallengeWinnerManager';
import { ChallengeStatsCard } from '@/components/challenges/ChallengeStatsCard';
import { useSeedChallenges } from '@/hooks/useSeedChallenges';
import { format, isAfter, isBefore } from 'date-fns';
import { cs } from 'date-fns/locale';

export function ChallengesContent() {
  const { data: challenges, isLoading } = useChallenges();
  const updateChallenge = useUpdateChallenge();
  const deleteChallenge = useDeleteChallenge();
  const duplicateChallenge = useDuplicateChallenge();
  const archiveExpired = useArchiveExpiredChallenges();
  const exportResults = useExportChallengeResults();
  const seedChallenges = useSeedChallenges();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<Challenge | null>(null);
  const [managingWinners, setManagingWinners] = useState<Challenge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStats, setSelectedStats] = useState<Challenge | null>(null);

  // Auto-archive expired challenges on mount
  useEffect(() => {
    archiveExpired.mutate();
  }, []);

  // Filter challenges by search
  const filterBySearch = (list: Challenge[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.description?.toLowerCase().includes(q)
    );
  };

  const draftChallenges = filterBySearch(challenges?.filter(c => c.status === 'draft') || []);
  const publishedChallenges = filterBySearch(challenges?.filter(c => c.status === 'published') || []);
  const archivedChallenges = filterBySearch(challenges?.filter(c => c.status === 'archived') || []);

  const getStatusBadge = (challenge: Challenge) => {
    const now = new Date();
    const start = new Date(challenge.start_at);
    const end = new Date(challenge.end_at);

    if (challenge.status === 'draft') {
      return <Badge variant="outline">Koncept</Badge>;
    }
    if (challenge.status === 'archived') {
      return <Badge variant="secondary">Archiv</Badge>;
    }
    if (isBefore(now, start)) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Plánováno</Badge>;
    }
    if (isAfter(now, end)) {
      return <Badge variant="secondary">Ukončeno</Badge>;
    }
    return <Badge className="bg-green-500">Aktivní</Badge>;
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      time_seconds: 'Čas',
      reps: 'Opakování',
      rounds: 'Kola',
      weight_kg: 'Váha (kg)',
      distance_m: 'Vzdálenost (m)',
      calories: 'Kalorie',
    };
    return labels[metric] || metric;
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setEditorOpen(true);
  };

  const handlePublish = (challenge: Challenge) => {
    updateChallenge.mutate({ id: challenge.id, status: 'published' });
  };

  const handleArchive = (challenge: Challenge) => {
    updateChallenge.mutate({ id: challenge.id, status: 'archived' });
  };

  const handleDelete = (challenge: Challenge) => {
    if (confirm('Opravdu smazat výzvu?')) {
      deleteChallenge.mutate(challenge.id);
    }
  };

  const renderChallengeCard = (challenge: Challenge) => (
    <Card key={challenge.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{challenge.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {challenge.description || 'Bez popisu'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(challenge)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(challenge)}>
                  Upravit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewingSubmissions(challenge)}>
                  <Users className="h-4 w-4 mr-2" />
                  Výsledky
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManagingWinners(challenge)}>
                  <Award className="h-4 w-4 mr-2" />
                  Správa vítězů
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStats(challenge)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  Statistiky
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => duplicateChallenge.mutate(challenge)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplikovat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportResults.mutate(challenge.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {challenge.status === 'draft' && (
                  <DropdownMenuItem onClick={() => handlePublish(challenge)}>
                    <Play className="h-4 w-4 mr-2" />
                    Publikovat
                  </DropdownMenuItem>
                )}
                {challenge.status === 'published' && (
                  <DropdownMenuItem onClick={() => handleArchive(challenge)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archivovat
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => handleDelete(challenge)}
                  className="text-destructive"
                >
                  Smazat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Metrika:</span>
            <p className="font-medium">{getMetricLabel(challenge.primary_metric)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Hodnocení:</span>
            <p className="font-medium">
              {challenge.scoring_type === 'time_lower_better' ? 'Nižší = lepší' : 'Vyšší = lepší'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Od:</span>
            <p className="font-medium">
              {format(new Date(challenge.start_at), 'd. MMM yyyy', { locale: cs })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Do:</span>
            <p className="font-medium">
              {format(new Date(challenge.end_at), 'd. MMM yyyy', { locale: cs })}
            </p>
          </div>
        </div>
        {challenge.vod_url && (
          <div className="mt-3 pt-3 border-t">
            <Badge variant="outline" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Video instrukce
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat výzvu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {challenges?.length === 0 && (
          <Button 
            variant="outline" 
            onClick={() => seedChallenges.mutate()}
            disabled={seedChallenges.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {seedChallenges.isPending ? 'Vytvářím...' : 'Vzorové výzvy'}
          </Button>
        )}
        <Button onClick={() => { setEditingChallenge(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nová výzva
        </Button>
      </div>

      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published" className="gap-2">
            <Play className="h-4 w-4" />
            Aktivní ({publishedChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-2">
            <Clock className="h-4 w-4" />
            Koncepty ({draftChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archiv ({archivedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="mt-4">
          {publishedChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Žádné aktivní výzvy</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setEditingChallenge(null); setEditorOpen(true); }}
              >
                Vytvořit první výzvu
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publishedChallenges.map(renderChallengeCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          {draftChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Žádné koncepty</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftChallenges.map(renderChallengeCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedChallenges.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Žádné archivované výzvy</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedChallenges.map(renderChallengeCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ChallengeEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        challenge={editingChallenge}
      />

      {viewingSubmissions && (
        <ChallengeSubmissionsView
          challenge={viewingSubmissions}
          open={!!viewingSubmissions}
          onOpenChange={(open) => !open && setViewingSubmissions(null)}
        />
      )}

      {managingWinners && (
        <ChallengeWinnerManager
          challenge={managingWinners}
          open={!!managingWinners}
          onOpenChange={(open) => !open && setManagingWinners(null)}
        />
      )}

      {/* Stats Dialog */}
      {selectedStats && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl border max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Statistiky: {selectedStats.title}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedStats(null)}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <ChallengeStatsCard challenge={selectedStats} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
