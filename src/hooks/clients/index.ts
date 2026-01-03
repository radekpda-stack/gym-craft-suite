/**
 * Client hooks - all hooks related to client data management
 */

export { useClients, useClient, useCreateClient, useUpdateClient, useDeleteClient, useArchiveClient, useUpdateClientFeedback, useUpdatePaymentMode } from '../useClients';
export type { Client, PaymentMode } from '../useClients';

export { useClientLimit } from '../useClientLimit';
export { useClientAnalytics } from '../useClientAnalytics';
export { useClientTags } from '../useClientTags';
export { useClientMedia } from '../useClientMedia';
export { useClientPackages } from '../useClientPackages';
export { useClientBudgetGroup } from '../useClientBudgetGroups';
export { useClientPreferences } from '../useClientPreferences';
export { useClientTimeline } from '../useClientTimeline';
export { useClientScheduleData } from '../useClientScheduleData';
export { useClientTrainingCounts } from '../useClientTrainingCounts';
export { useClientAnniversaryNotifier } from '../useClientAnniversaries';
export { useClientHealthSnapshot } from '../useClientHealthSnapshot';
export { useClientLTV } from '../useClientLTV';
export { useClientsAtRisk } from '../useClientsAtRisk';
export { useTopClients } from '../useTopClients';
export { useTopClientsData } from '../useTopClientsData';

// New audit hooks
export { useClientReadiness } from '../useClientReadiness';
export { useClientInjuryHistory } from '../useClientInjuryHistory';
export { useClientPeriodization, PHASE_CONFIG } from '../useClientPeriodization';
export { useClientCommunicationLog } from '../useClientCommunicationLog';
