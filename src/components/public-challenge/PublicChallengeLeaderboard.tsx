import { useState } from 'react';
import { Trophy, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  usePublicLeaderboard, 
  useReaction,
  type MetricConfig, 
  type LeaderboardConfig,
  type LeaderboardEntry 
} from '@/hooks/usePublicChallenge';
import { cn } from '@/lib/utils';

interface Props {
  challengeId: string;
  metricsConfig: MetricConfig[];
  leaderboardConfig: LeaderboardConfig;
}

const REACTION_TYPES = [
  { type: 'like' as const, emoji: '👍', label: 'Líbí se' },
  { type: '💪' as const, emoji: '💪', label: 'Síla' },
  { type: '🔥' as const, emoji: '🔥', label: 'Oheň' },
  { type: '👏' as const, emoji: '👏', label: 'Potlesk' },
  { type: '🤯' as const, emoji: '🤯', label: 'Wow' },
  { type: '😄' as const, emoji: '😄', label: 'Super' },
];

function formatMetricValue(value: number, metric: MetricConfig): string {
  if (metric.type === 'time') {
    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.round((value - totalSeconds) * 100);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${ms.toString().padStart(2, '0')} s`;
  }
  if (metric.type === 'integer') {
    return `${Math.round(value)} ${metric.unit}`;
  }
  return `${value.toFixed(2)} ${metric.unit}`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-muted-foreground font-medium">{rank}.</span>;
}

export default function PublicChallengeLeaderboard({ 
  challengeId, 
  metricsConfig, 
  leaderboardConfig 
}: Props) {
  const [page, setPage] = useState(1);
  const [sexFilter, setSexFilter] = useState<string | undefined>();
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  
  const { data, isLoading, error } = usePublicLeaderboard(challengeId, { 
    page, 
    pageSize: 20,
    sex: sexFilter 
  });
  
  const reactionMutation = useReaction();

  const primaryMetric = metricsConfig.find(m => m.key === leaderboardConfig.primary_metric_key);

  // Sort entries by primary metric
  const sortedEntries = [...(data?.data || [])].sort((a, b) => {
    const aValue = a.metrics_data[leaderboardConfig.primary_metric_key || ''] || 0;
    const bValue = b.metrics_data[leaderboardConfig.primary_metric_key || ''] || 0;
    
    if (leaderboardConfig.direction === 'min') {
      return aValue - bValue;
    }
    return bValue - aValue;
  });

  const handleReaction = (entry: LeaderboardEntry, reactionType: typeof REACTION_TYPES[number]['type']) => {
    reactionMutation.mutate({
      result_id: entry.result_id,
      challenge_id: challengeId,
      reaction_type: reactionType,
      action: 'add',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Žebříček
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nepodařilo se načíst žebříček
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Žebříček
            </CardTitle>
            <Select value={sexFilter || 'all'} onValueChange={v => setSexFilter(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Všichni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni</SelectItem>
                <SelectItem value="male">Muži</SelectItem>
                <SelectItem value="female">Ženy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Zatím žádné výsledky
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry, index) => {
                const rank = (page - 1) * 20 + index + 1;
                const primaryValue = entry.metrics_data[leaderboardConfig.primary_metric_key || ''];
                const totalReactions = entry.like_count + entry.muscle_count + 
                  entry.fire_count + entry.clap_count + entry.mind_blown_count + entry.smile_count;

                return (
                  <div
                    key={entry.result_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                      rank <= 3 && "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="w-10 flex justify-center">
                      {getRankIcon(rank)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{entry.display_initials}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.submitted_at), 'd. M. yyyy HH:mm', { locale: cs })}
                      </div>
                    </div>

                    {entry.photo_urls.length > 0 && (
                      <div className="text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}

                    {primaryMetric && primaryValue !== undefined && (
                      <div className="text-right font-bold text-primary">
                        {formatMetricValue(primaryValue, primaryMetric)}
                      </div>
                    )}

                    {totalReactions > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {totalReactions} reakcí
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Strana {page} z {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry?.display_initials}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {/* Metrics */}
              <div className="space-y-2">
                {metricsConfig.map(metric => {
                  const value = selectedEntry.metrics_data[metric.key];
                  if (value === undefined) return null;
                  
                  return (
                    <div key={metric.key} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                      <span className="font-medium">{formatMetricValue(value, metric)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Photos */}
              {selectedEntry.photo_urls.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Fotky</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEntry.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={url} 
                          alt={`Důkaz ${i + 1}`}
                          className="rounded-lg w-full h-32 object-cover hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Reakce</h4>
                <div className="flex flex-wrap gap-2">
                  {REACTION_TYPES.map(({ type, emoji, label }) => {
                    const countKey = type === 'like' ? 'like_count' : 
                      type === '💪' ? 'muscle_count' :
                      type === '🔥' ? 'fire_count' :
                      type === '👏' ? 'clap_count' :
                      type === '🤯' ? 'mind_blown_count' : 'smile_count';
                    const count = selectedEntry[countKey];

                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleReaction(selectedEntry, type)}
                        disabled={reactionMutation.isPending}
                      >
                        <span>{emoji}</span>
                        <span className="text-xs">{count}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Odesláno: {format(new Date(selectedEntry.submitted_at), 'd. M. yyyy HH:mm', { locale: cs })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
