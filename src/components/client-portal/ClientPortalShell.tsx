import { Outlet } from "react-router-dom";
import { ClientPortalProvider } from "@/contexts/ClientPortalContext";
import { ClientPortalLayout } from "@/components/client-portal/ClientPortalLayout";

export function ClientPortalShell() {
  return (
    <ClientPortalProvider>
      <ClientPortalLayout>
        <Outlet />
      </ClientPortalLayout>
    </ClientPortalProvider>
  );
}
