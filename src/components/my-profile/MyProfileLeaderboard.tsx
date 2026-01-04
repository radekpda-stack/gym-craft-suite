import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyProfileLeaderboardProps {
  clientId: string;
}

// Generate anonymous name from client ID
function generateAnonymousName(clientId: string): string {
  const adjectives = ['Rychlý', 'Silný', 'Vytrvalý', 'Odhodlaný', 'Aktivní', 'Energický', 'Fit', 'Sportovní'];
  const animals = ['Lev', 'Orel', 'Vlk', 'Tygr', 'Medvěd', 'Sokol', 'Jelen', 'Panter'];
  
  // Use client ID to generate consistent anonymous name
  const hash = clientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const adjective = adjectives[hash % adjectives.length];
  const animal = animals[(hash * 7) % animals.length];
  const number = (hash % 99) + 1;
  
  return `${adjective} ${animal} #${number}`;
}

export function MyProfileLeaderboard({ clientId }: MyProfileLeaderboardProps) {
  // Get workout leaderboard (confirmed workouts this month)
  const { data: workoutLeaderboard, isLoading } = useQuery({
    queryKey: ['workout-leaderboard'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('client_confirmed_workouts')
        .select('client_id')
        .gte('performed_at', startOfMonth.toISOString());

      if (error) throw error;

      // Count workouts by client
      const workoutsByClient: Record<string, number> = {};
      data?.forEach(w => {
        workoutsByClient[w.client_id] = (workoutsByClient[w.client_id] || 0) + 1;
      });

      // Get client names
      const clientIds = Object.keys(workoutsByClient);
      if (clientIds.length === 0) return [];

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, gender, is_self_profile')
        .in('id', clientIds);

      // Get leaderboard settings for all clients
      const { data: leaderboardSettings } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds);

      const clientMap = new Map(clients?.map(c => [c.id, { name: c.name, gender: c.gender, isSelfProfile: c.is_self_profile }]) || []);
      const settingsMap = new Map(leaderboardSettings?.map(s => [s.client_id, s]) || []);

      return Object.entries(workoutsByClient)
        .map(([id, count]) => {
          const settings = settingsMap.get(id);
          const clientInfo = clientMap.get(id);
          
          // Trainer's self-profile can see their own name, otherwise only nickname
          const isSelfProfile = clientInfo?.isSelfProfile === true;
          const isVisible = settings?.leaderboard_visible === true;
          
          let displayName: string;
          if (isSelfProfile) {
            // Trainer sees their own name
            displayName = clientInfo?.name || 'Trenér';
          } else if (isVisible && settings?.leaderboard_nickname) {
            // Client opted in AND has set a nickname - show it
            displayName = settings.leaderboard_nickname;
          } else {
            // Anonymous name - never show real client name
            displayName = generateAnonymousName(id);
          }

          // Get gender
          const rawGender = clientInfo?.gender;
          const gender: 'male' | 'female' | null = 
            rawGender === 'male' ? 'male' : 
            rawGender === 'female' ? 'female' : 
            null;

          return {
            clientId: id,
            name: displayName,
            count,
            isAnonymous: !(isVisible && settings?.leaderboard_nickname),
            gender,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-[400px]" />;
  }

  const data = workoutLeaderboard || [];

  if (data.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím nejsou žádná data v žebříčku.</p>
        </CardContent>
      </Card>
    );
  }

  const myPosition = data.findIndex(d => d.clientId === clientId) + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          <span className="font-semibold">Tréninky tento měsíc</span>
        </div>
        {myPosition > 0 && (
          <p className="text-sm text-muted-foreground">
            Vaše pozice: <span className="font-bold text-primary">#{myPosition}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((item, index) => {
          const isMe = item.clientId === clientId;
          const position = index + 1;

          return (
            <div
              key={item.clientId}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg transition-colors',
                isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50',
                position <= 3 && 'font-semibold'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  position === 1 && 'bg-yellow-500/20 text-yellow-600',
                  position === 2 && 'bg-slate-400/20 text-slate-600',
                  position === 3 && 'bg-orange-500/20 text-orange-600',
                  position > 3 && 'bg-muted text-muted-foreground'
                )}>
                  {position}
                </span>
                <span className={cn(isMe ? 'text-primary' : '', item.isAnonymous && 'italic text-muted-foreground')}>
                  {item.name}
                  {item.isAnonymous && item.gender && (
                    <span className="ml-1 not-italic">
                      {item.gender === 'male' ? '♂' : '♀'}
                    </span>
                  )}
                  {isMe && ' (vy)'}
                </span>
              </div>
              <span className="text-sm">
                {item.count} tréninků
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
