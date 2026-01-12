import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { User, LayoutDashboard, History, Settings } from 'lucide-react';
import { ClientPRsCard } from '@/components/clients/ClientPRsCard';
import { MyProfileProgress } from '@/components/my-profile/MyProfileProgress';
import { MyProfileWorkoutDiary } from '@/components/my-profile/MyProfileWorkoutDiary';
import { TrainerProfileSettings } from '@/components/settings/TrainerProfileSettings';
import { ModernProfileHeader } from '@/components/my-profile/ModernProfileHeader';
import { QuickWorkoutInput } from '@/components/my-profile/QuickWorkoutInput';
import { CompactPRsSection } from '@/components/my-profile/CompactPRsSection';
import { RecentActivityFeed } from '@/components/my-profile/RecentActivityFeed';
import { TrainerLeaderboards } from '@/components/my-profile/TrainerLeaderboards';

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
    <div className="space-y-4 p-4 md:p-6 pb-24">
      {/* Simplified 3-tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12 bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2 text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historie</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Nastavení</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview - Main dashboard with quick input */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Profile header with stats */}
          <ModernProfileHeader clientId={profile.clientId} />
          
          {/* Quick workout input - prominent placement */}
          <QuickWorkoutInput clientId={profile.clientId} />
          
          {/* Two column grid for PRs and recent activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompactPRsSection 
              clientId={profile.clientId} 
              onViewAll={() => setActiveTab('history')}
            />
            <RecentActivityFeed 
              clientId={profile.clientId}
              onViewDiary={() => setActiveTab('history')}
            />
          </div>
          
          {/* Leaderboards */}
          <TrainerLeaderboards />
        </TabsContent>

        {/* History - Diary, PRs, Progress */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <ClientPRsCard clientId={profile.clientId} />
            </div>
            <div className="space-y-4">
              <MyProfileProgress clientId={profile.clientId} trainerId={profile.trainerId} />
            </div>
          </div>
          
          <MyProfileWorkoutDiary clientId={profile.clientId} />
        </TabsContent>

        {/* Settings - Profile settings */}
        <TabsContent value="settings" className="mt-4">
          <TrainerProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
