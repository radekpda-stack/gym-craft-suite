import { Outlet } from "react-router-dom";
import { ClientPortalProvider, useClientPortal } from "@/contexts/ClientPortalContext";
import { ClientPortalLayout } from "@/components/client-portal/ClientPortalLayout";
import { CelebrationProvider } from "@/contexts/CelebrationContext";
import { useBadgeNotifications } from "@/hooks/useBadgeNotifications";
import { useChallengeNotifications } from "@/hooks/useChallengeNotifications";

// Inner component that uses the context
function ClientPortalContent() {
  const { clientId } = useClientPortal();
  
  // Enable badge/level notifications
  useBadgeNotifications(clientId ?? undefined);
  
  // Enable challenge notifications
  useChallengeNotifications();
  
  return (
    <ClientPortalLayout>
      <Outlet />
    </ClientPortalLayout>
  );
}

export function ClientPortalShell() {
  return (
    <ClientPortalProvider>
      <CelebrationProvider>
        <ClientPortalContent />
      </CelebrationProvider>
    </ClientPortalProvider>
  );
}

