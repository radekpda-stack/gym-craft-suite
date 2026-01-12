import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/PageLoader';

interface LazyRouteWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component for lazy-loaded routes that provides:
 * - Error boundary for catching component errors
 * - Suspense fallback for loading states
 */
export function LazyRouteWrapper({ children }: LazyRouteWrapperProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
