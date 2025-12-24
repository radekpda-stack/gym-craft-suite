import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { isLoading: statusLoading, isApproved, isPending, isRejected, isSuspended } = useAccountStatus();
  const { deviceError, isChecking: deviceChecking } = useDeviceTracking();

  const isLoading = authLoading || statusLoading || deviceChecking;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Device limit exceeded
  if (deviceError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Překročen limit zařízení</h1>
          <p className="text-muted-foreground">{deviceError}</p>
          <Button variant="outline" onClick={() => signOut()}>
            Odhlásit se
          </Button>
        </div>
      </div>
    );
  }

  // Account not approved - redirect to waiting page
  // Only redirect if we have data and the status is explicitly not approved
  if (isPending || isRejected || isSuspended) {
    return <Navigate to="/waiting-for-approval" replace />;
  }

  return <>{children}</>;
}
