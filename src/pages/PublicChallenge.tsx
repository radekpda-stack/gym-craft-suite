import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, Users, BarChart3, MessageCircle, Clock, Calendar } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicChallenge, useIsRegistered } from '@/hooks/usePublicChallenge';
import PublicChallengeLeaderboard from '@/components/public-challenge/PublicChallengeLeaderboard';
import PublicChallengeStats from '@/components/public-challenge/PublicChallengeStats';
import PublicChallengeChat from '@/components/public-challenge/PublicChallengeChat';
import PublicChallengeRegistration from '@/components/public-challenge/PublicChallengeRegistration';
import PublicChallengeResultForm from '@/components/public-challenge/PublicChallengeResultForm';

export default function PublicChallenge() {
  const { slug } = useParams<{ slug: string }>();
  const { data: challenge, isLoading, error } = usePublicChallenge(slug);
  const isRegistered = useIsRegistered(challenge?.id);
  const [activeTab, setActiveTab] = useState('leaderboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Výzva nenalezena</CardTitle>
            <CardDescription>
              Tato výzva neexistuje nebo není veřejně dostupná.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isEnded = isPast(new Date(challenge.end_at));
  const isActive = !isEnded && new Date(challenge.start_at) <= new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold">{challenge.title}</h1>
              </div>
              {challenge.description && (
                <p className="text-muted-foreground max-w-2xl">{challenge.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(challenge.start_at), 'd. M. yyyy', { locale: cs })}</span>
                  <span>–</span>
                  <span>{format(new Date(challenge.end_at), 'd. M. yyyy', { locale: cs })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {isEnded ? (
                    <span className="text-muted-foreground">Ukončeno</span>
                  ) : (
                    <span>
                      Zbývá {formatDistanceToNow(new Date(challenge.end_at), { locale: cs })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Badge variant="default" className="bg-green-500">
                  Aktivní
                </Badge>
              )}
              {isEnded && (
                <Badge variant="secondary">Ukončeno</Badge>
              )}
              {challenge.require_photo_proof && (
                <Badge variant="outline">📷 Vyžaduje foto</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">Žebříček</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Statistiky</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard" className="mt-4">
                <PublicChallengeLeaderboard 
                  challengeId={challenge.id} 
                  metricsConfig={challenge.metrics_config}
                  leaderboardConfig={challenge.leaderboard_config}
                />
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <PublicChallengeStats 
                  challengeId={challenge.id}
                  metricsConfig={challenge.metrics_config}
                  leaderboardConfig={challenge.leaderboard_config}
                />
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <PublicChallengeChat 
                  challengeId={challenge.id}
                  isRegistered={isRegistered}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column - Registration & Result submission */}
          <div className="space-y-6">
            {!isRegistered && !isEnded && (
              <PublicChallengeRegistration 
                challengeId={challenge.id}
                challengeTitle={challenge.title}
              />
            )}

            {isRegistered && !isEnded && (
              <PublicChallengeResultForm
                challengeId={challenge.id}
                metricsConfig={challenge.metrics_config}
                requirePhotoProof={challenge.require_photo_proof}
              />
            )}

            {isEnded && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Výzva ukončena
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tato výzva již skončila. Prohlédněte si výsledky v žebříčku.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {challenge.instructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pravidla</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {challenge.instructions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Video */}
            {challenge.vod_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={challenge.vod_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Zobrazit video ukázku →
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
