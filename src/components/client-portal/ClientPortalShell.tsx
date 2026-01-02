import { Outlet } from "react-router-dom";
import { ClientPortalProvider } from "@/contexts/ClientPortalContext";
import { ClientPortalLayout } from "@/components/client-portal/ClientPortalLayout";
import { CelebrationProvider } from "@/contexts/CelebrationContext";

export function ClientPortalShell() {
  return (
    <ClientPortalProvider>
      <CelebrationProvider>
        <ClientPortalLayout>
          <Outlet />
        </ClientPortalLayout>
      </CelebrationProvider>
    </ClientPortalProvider>
  );
}

