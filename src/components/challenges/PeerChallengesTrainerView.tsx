import { useState } from 'react';
import { useTrainerPeerChallenges, TrainerPeerChallenge } from '@/hooks/useTrainerPeerChallenges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Search, 
  Swords, 
  Globe, 
  Lock,
  MoreVertical,
  MessageSquare,
  UserPlus,
  Download,
  Eye,
  Clock
} from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PeerChallengeTrainerDetailModal } from './PeerChallengeTrainerDetailModal';

export function PeerChallengesTrainerView() {
  const { data: challenges = [], isLoading } = useTrainerPeerChallenges();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.created_by_client_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || c.challenge_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'duel': return <Swords className="h-4 w-4 text-orange-500" />;
      case 'private': return <Lock className="h-4 w-4 text-purple-500" />;
      case 'public': return <Globe className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      duel: 'Duel',
      private: 'Privátní',
      public: 'Veřejná',
    };
    const colors: Record<string, string> = {
      duel: 'bg-orange-500/10 text-orange-500',
      private: 'bg-purple-500/10 text-purple-500',
      public: 'bg-green-500/10 text-green-500',
    };
    return (
      <Badge variant="secondary" className={colors[type]}>
        {getTypeIcon(type)}
        <span className="ml-1">{labels[type]}</span>
      </Badge>
    );
  };

  const getStatusBadge = (challenge: TrainerPeerChallenge) => {
    if (challenge.status === 'cancelled') {
      return <Badge variant="destructive">Zrušeno</Badge>;
    }
    if (challenge.status === 'completed' || isPast(new Date(challenge.end_at))) {
      return <Badge variant="secondary">Dokončeno</Badge>;
    }
    return <Badge className="bg-green-500">Aktivní</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat výzvu nebo klienta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            <SelectItem value="duel">Duel</SelectItem>
            <SelectItem value="private">Privátní</SelectItem>
            <SelectItem value="public">Veřejná</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="completed">Dokončené</SelectItem>
            <SelectItem value="cancelled">Zrušené</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredChallenges.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Žádné klientské výzvy</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vaši klienti zatím nevytvořili žádné peer výzvy
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredChallenges.map((challenge) => (
            <Card 
              key={challenge.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedChallengeId(challenge.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(challenge.challenge_type)}
                      {getStatusBadge(challenge)}
                    </div>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <CardDescription>
                      Vytvořil: <span className="font-medium">{challenge.created_by_client_name}</span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallengeId(challenge.id);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Zobrazit detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Komentovat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Přidat klienty
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {challenge.participant_count} účastníků
                    </span>
                    <span className="flex items-center gap-1">
                      {challenge.submission_count} výsledků
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {isPast(new Date(challenge.end_at)) 
                      ? 'Ukončeno'
                      : `Končí ${formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })}`
                    }
                  </div>
                </div>
                {challenge.trainer_comment && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {challenge.trainer_comment.substring(0, 100)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedChallengeId && (
        <PeerChallengeTrainerDetailModal
          challengeId={selectedChallengeId}
          open={!!selectedChallengeId}
          onClose={() => setSelectedChallengeId(null)}
        />
      )}
    </div>
  );
}
