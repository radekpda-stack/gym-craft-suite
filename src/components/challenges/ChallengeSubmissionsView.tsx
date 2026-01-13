import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Challenge, useChallengeSubmissions } from '@/hooks/useChallenges';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Medal, Award, Users, Image as ImageIcon } from 'lucide-react';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { SubmissionMediaGallery } from './SubmissionMediaGallery';

interface ChallengeSubmissionsViewProps {
  challenge: Challenge;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChallengeSubmissionsView({ challenge, open, onOpenChange }: ChallengeSubmissionsViewProps) {
  const { data: submissions, isLoading } = useChallengeSubmissions(challenge.id);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ urls: string[]; clientName: string; score: string } | null>(null);

  // Sort submissions
  const sortedSubmissions = [...(submissions || [])].sort((a, b) => {
    if (challenge.scoring_type === 'time_lower_better') {
      return a.score_primary - b.score_primary;
    }
    return b.score_primary - a.score_primary;
  });

  // Get best per client
  const bestPerClient = new Map<string, typeof sortedSubmissions[0]>();
  for (const sub of sortedSubmissions) {
    const clientId = sub.client_id;
    const existing = bestPerClient.get(clientId);
    if (!existing) {
      bestPerClient.set(clientId, sub);
    } else {
      const isBetter = challenge.scoring_type === 'time_lower_better'
        ? sub.score_primary < existing.score_primary
        : sub.score_primary > existing.score_primary;
      if (isBetter) {
        bestPerClient.set(clientId, sub);
      }
    }
  }

  const rankedSubmissions = Array.from(bestPerClient.values()).sort((a, b) => {
    if (challenge.scoring_type === 'time_lower_better') {
      return a.score_primary - b.score_primary;
    }
    return b.score_primary - a.score_primary;
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-warning" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="h-5 w-5 text-warning/70" />;
    return <span className="text-muted-foreground font-medium">{rank}.</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Výsledky: {challenge.title}
          </DialogTitle>
          <DialogDescription>
            {rankedSubmissions.length} účastníků, {sortedSubmissions.length} celkem odeslaných výsledků
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rankedSubmissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Zatím žádné výsledky</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rankedSubmissions.map((sub, index) => {
              const mediaUrls = (sub as any).media_urls as string[] | null;
              const hasMedia = mediaUrls && mediaUrls.length > 0;
              const clientName = (sub as any).clients?.name || 'Neznámý';
              
              return (
                <div
                  key={sub.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    index < 3 ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sub.submitted_at), 'd. MMM yyyy HH:mm', { locale: cs })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatChallengeScore(sub.score_primary, challenge.primary_metric)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                      </span>
                    </p>
                  </div>
                  {hasMedia && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMedia({
                          urls: mediaUrls!,
                          clientName,
                          score: formatChallengeScore(sub.score_primary, challenge.primary_metric),
                        });
                        setMediaGalleryOpen(true);
                      }}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      {mediaUrls!.length}
                    </Button>
                  )}
                  <Badge variant={sub.status === 'approved' ? 'default' : 'secondary'}>
                    {sub.status === 'approved' ? 'OK' : sub.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Media Gallery Dialog */}
        {selectedMedia && (
          <SubmissionMediaGallery
            open={mediaGalleryOpen}
            onOpenChange={setMediaGalleryOpen}
            mediaUrls={selectedMedia.urls}
            clientName={selectedMedia.clientName}
            score={selectedMedia.score}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
