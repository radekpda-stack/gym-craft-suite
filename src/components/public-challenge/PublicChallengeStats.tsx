import { Users, TrendingUp, Medal, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicChallengeStats, type MetricConfig, type LeaderboardConfig } from '@/hooks/usePublicChallenge';

interface Props {
  challengeId: string;
  metricsConfig: MetricConfig[];
  leaderboardConfig: LeaderboardConfig;
}

function formatStatValue(value: number | null, metric: MetricConfig | undefined): string {
  if (value === null || value === undefined) return '-';
  
  if (metric?.type === 'time') {
    const totalSeconds = Math.floor(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }
  
  if (metric?.type === 'integer') {
    return Math.round(value).toString();
  }
  
  return value.toFixed(2);
}

export default function PublicChallengeStats({ challengeId, metricsConfig, leaderboardConfig }: Props) {
  const { data: stats, isLoading, error } = usePublicChallengeStats(challengeId);

  const primaryMetric = metricsConfig.find(m => m.key === leaderboardConfig.primary_metric_key);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nepodařilo se načíst statistiky
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Účastníci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_participants}</div>
            <div className="text-xs text-muted-foreground">
              {stats.guest_count} hostů, {stats.client_count} klientů
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Výsledků
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_results}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Nejlepší
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboardConfig.direction === 'min' 
                ? formatStatValue(stats.primary_metric_stats?.min, primaryMetric)
                : formatStatValue(stats.primary_metric_stats?.max, primaryMetric)
              }
            </div>
            {primaryMetric && (
              <div className="text-xs text-muted-foreground">{primaryMetric.unit}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Průměr
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStatValue(stats.primary_metric_stats?.avg, primaryMetric)}
            </div>
            {primaryMetric && (
              <div className="text-xs text-muted-foreground">{primaryMetric.unit}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gender breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Rozdělení podle pohlaví
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.gender_breakdown?.male || 0}</div>
              <div className="text-sm text-muted-foreground">Muži</div>
            </div>
            <div className="flex-1 text-center p-4 bg-pink-500/10 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{stats.gender_breakdown?.female || 0}</div>
              <div className="text-sm text-muted-foreground">Ženy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary metric stats */}
      {primaryMetric && stats.primary_metric_stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{primaryMetric.label} - Statistiky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {formatStatValue(stats.primary_metric_stats.min, primaryMetric)}
                </div>
                <div className="text-xs text-muted-foreground">Minimum</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {formatStatValue(stats.primary_metric_stats.max, primaryMetric)}
                </div>
                <div className="text-xs text-muted-foreground">Maximum</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {formatStatValue(stats.primary_metric_stats.avg, primaryMetric)}
                </div>
                <div className="text-xs text-muted-foreground">Průměr</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {formatStatValue(stats.primary_metric_stats.median, primaryMetric)}
                </div>
                <div className="text-xs text-muted-foreground">Medián</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
