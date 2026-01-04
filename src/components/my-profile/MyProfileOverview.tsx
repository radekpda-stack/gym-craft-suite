import { TrainerProfileCard } from './TrainerProfileCard';
import { TrainerQuickStats } from './TrainerQuickStats';
import { TrainerRecentPerformance } from './TrainerRecentPerformance';
import { TrainerMeasurementSummary } from './TrainerMeasurementSummary';
import { TrainerTopPRs } from './TrainerTopPRs';

interface MyProfileOverviewProps {
  clientId: string;
}

export function MyProfileOverview({ clientId }: MyProfileOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Profile Card / Vizitka */}
      <TrainerProfileCard clientId={clientId} />
      
      {/* Quick Stats */}
      <TrainerQuickStats clientId={clientId} />
      
      {/* Recent Performance */}
      <TrainerRecentPerformance clientId={clientId} />
      
      {/* Two column grid for measurements and top PRs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrainerMeasurementSummary clientId={clientId} />
        <TrainerTopPRs clientId={clientId} />
      </div>
    </div>
  );
}
