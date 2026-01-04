/**
 * Settings Dashboard Card
 * Shows: Portal access, settings quick access
 */
import { Settings, UserCheck, Shield } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { ClientAdminBlock } from '@/components/clients/ClientAdminBlock';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface SettingsCardProps {
  client: any;
  isSharedBudget: boolean;
  budgetGroupId?: string;
  onArchive: () => Promise<void>;
  portalAccess?: any;
}

export function SettingsCard({ 
  client, 
  isSharedBudget, 
  budgetGroupId, 
  onArchive,
  portalAccess,
}: SettingsCardProps) {
  const isPortalActive = portalAccess?.status === 'active' && !!portalAccess?.auth_user_id;
  
  const formatLastLogin = () => {
    if (!portalAccess?.last_portal_login) return '–';
    try {
      return formatDistanceToNow(new Date(portalAccess.last_portal_login), { addSuffix: true, locale: cs });
    } catch {
      return '–';
    }
  };

  const metrics: DashboardMetric[] = [
    {
      label: 'Klientský portál',
      value: isPortalActive ? 'Aktivní' : 'Neaktivní',
      icon: <UserCheck className="w-4 h-4" />,
      highlight: isPortalActive,
    },
    {
      label: 'Poslední přihlášení',
      value: formatLastLogin(),
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  return (
    <ClientDashboardCard
      id="settings"
      icon={<Settings className="w-5 h-5" />}
      title="Nastavení"
      metrics={metrics}
    >
      <ClientAdminBlock
        client={client}
        isSharedBudget={isSharedBudget}
        budgetGroupId={budgetGroupId}
        onArchive={onArchive}
        defaultExpanded={true}
        portalAccess={portalAccess}
      />
    </ClientDashboardCard>
  );
}
