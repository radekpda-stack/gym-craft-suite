import { Outlet } from "react-router-dom";
import { ClientPortalProvider, useClientPortal } from "@/contexts/ClientPortalContext";
import { ClientPortalLayout } from "@/components/client-portal/ClientPortalLayout";
import { CelebrationProvider } from "@/contexts/CelebrationContext";
import { SmartCelebrationProvider } from "@/contexts/SmartCelebrationContext";
import { useCelebrationDetector } from "@/hooks/useCelebrationDetector";
import { useChallengeNotifications } from "@/hooks/useChallengeNotifications";
import { CelebrationToastContainer } from "@/components/client-portal/celebrations";

// Inner component that uses the context
function ClientPortalContent() {
  const { clientId } = useClientPortal();
  
  // Enable smart celebration detection (badges, level ups)
  useCelebrationDetector(clientId ?? undefined);
  
  // Enable challenge notifications
  useChallengeNotifications();
  
  return (
    <>
      <ClientPortalLayout>
        <Outlet />
      </ClientPortalLayout>
      <CelebrationToastContainer />
    </>
  );
}

export function ClientPortalShell() {
  return (
    <ClientPortalProvider>
      <SmartCelebrationProvider>
        <CelebrationProvider>
          <ClientPortalContent />
        </CelebrationProvider>
      </SmartCelebrationProvider>
    </ClientPortalProvider>
  );
}

