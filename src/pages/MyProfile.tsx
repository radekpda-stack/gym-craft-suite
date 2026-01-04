import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Trophy, TrendingUp, BarChart3, BookOpen, Plus } from 'lucide-react';
import { ClientPRsCard } from '@/components/clients/ClientPRsCard';
import { MyProfileProgress } from '@/components/my-profile/MyProfileProgress';
import { TrainerLeaderboards } from '@/components/my-profile/TrainerLeaderboards';
import { MyProfileWorkoutDiary } from '@/components/my-profile/MyProfileWorkoutDiary';
import { MyProfileOverview } from '@/components/my-profile/MyProfileOverview';
import { MyProfileInput } from '@/components/my-profile/MyProfileInput';

export default function MyProfile() {
  const { loading: authLoading } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const [activeTab, setActiveTab] = useState('overview');

  if (authLoading || isLoading) {
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
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 h-auto bg-muted/50 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="input" className="flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Zadávání
          </TabsTrigger>
          <TabsTrigger value="prs" className="flex items-center gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            Rekordy
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            Pokrok
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

        <TabsContent value="input" className="mt-6">
          <MyProfileInput clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="prs" className="mt-6">
          <ClientPRsCard clientId={profile.clientId} />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <MyProfileProgress clientId={profile.clientId} trainerId={profile.trainerId} />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <TrainerLeaderboards />
        </TabsContent>

        <TabsContent value="diary" className="mt-6">
          <MyProfileWorkoutDiary clientId={profile.clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
