import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyProfile } from '@/hooks/useMyProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Trophy, TrendingUp, Flame, Award, BarChart3, BookOpen } from 'lucide-react';
import { ClientPRsCard } from '@/components/clients/ClientPRsCard';
import { MyProfileProgress } from '@/components/my-profile/MyProfileProgress';
import { MyProfileChallenges } from '@/components/my-profile/MyProfileChallenges';
import { MyProfileBadges } from '@/components/my-profile/MyProfileBadges';
import { MyProfileLeaderboard } from '@/components/my-profile/MyProfileLeaderboard';
import { MyProfileWorkoutDiary } from '@/components/my-profile/MyProfileWorkoutDiary';
import { MyProfileOverview } from '@/components/my-profile/MyProfileOverview';

export default function MyProfile() {
  const { data: profile, isLoading } = useMyProfile();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profil nenalezen</h2>
        <p className="text-muted-foreground">
          Nepodařilo se najít váš klientský profil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.clientName}</h1>
          <p className="text-sm text-muted-foreground">Můj profil</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 h-auto bg-muted/50 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="prs" className="flex items-center gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            Rekordy
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            Pokrok
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-1.5 text-xs">
            <Flame className="w-3.5 h-3.5" />
            Výzvy
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-1.5 text-xs">
            <Award className="w-3.5 h-3.5" />
            Odznaky
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Žebříčky
          </TabsTrigger>
          <TabsTrigger value="diary" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Deník
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <MyProfileOverview clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="prs" className="mt-6">
          <ClientPRsCard clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <MyProfileProgress clientId={profile.clientId} trainerId={profile.trainerId} />
        </TabsContent>

        <TabsContent value="challenges" className="mt-6">
          <MyProfileChallenges clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          <MyProfileBadges clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <MyProfileLeaderboard clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="diary" className="mt-6">
          <MyProfileWorkoutDiary clientId={profile.clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
