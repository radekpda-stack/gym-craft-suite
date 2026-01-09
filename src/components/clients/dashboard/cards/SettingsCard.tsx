/**
 * Settings Dashboard Card
 * Shows: Admin settings for the client
 */
import { Settings } from 'lucide-react';
import { ClientDashboardCard } from '../ClientDashboardCard';
import { ClientAdminBlock } from '@/components/clients/ClientAdminBlock';

interface SettingsCardProps {
  client: any;
  isSharedBudget: boolean;
  budgetGroupId?: string;
  onArchive: () => Promise<void>;
}

export function SettingsCard({ 
  client, 
  isSharedBudget, 
  budgetGroupId, 
  onArchive,
}: SettingsCardProps) {
  return (
    <ClientDashboardCard
      id="settings"
      icon={<Settings className="w-5 h-5" />}
      title="Nastavení"
      metrics={[]}
    >
      <ClientAdminBlock
        client={client}
        isSharedBudget={isSharedBudget}
        budgetGroupId={budgetGroupId}
        onArchive={onArchive}
        defaultExpanded={true}
      />
    </ClientDashboardCard>
  );
}
