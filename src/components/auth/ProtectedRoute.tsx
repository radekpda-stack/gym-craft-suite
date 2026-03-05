import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { isLoading: statusLoading, isApproved, isPending, isRejected, isSuspended } = useAccountStatus();

  const isLoading = authLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Account not approved - redirect to waiting page
  // Only redirect if we have data and the status is explicitly not approved
  if (isPending || isRejected || isSuspended) {
    return <Navigate to="/waiting-for-approval" replace />;
  }

  return <>{children}</>;
}
