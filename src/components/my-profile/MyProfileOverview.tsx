import { useClientPRStats } from '@/hooks/useClientPRs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { XPLevelCard } from './XPLevelCard';
import { XPBreakdownCard } from './XPBreakdownCard';
import { LoyaltyCard } from './LoyaltyCard';

interface MyProfileOverviewProps {
  clientId: string;
}

export function MyProfileOverview({ clientId }: MyProfileOverviewProps) {
  const { stats: prStats, isLoading } = useClientPRStats(clientId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Osobní rekordy',
      value: prStats?.totalPRs || 0,
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Výhry ve výzvách',
      value: '-',
      icon: Award,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* XP Level Card */}
      <XPLevelCard clientId={clientId} />
      
      {/* Loyalty Points Card */}
      <LoyaltyCard clientId={clientId} />
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <CardTitle className="text-2xl font-bold">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* XP History */}
      <XPBreakdownCard clientId={clientId} />
    </div>
  );
}
