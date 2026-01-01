/**
 * Feature Flags React Hooks
 * 
 * Provides hooks for checking and managing feature flags in React components.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { 
  getAllFeatureFlags, 
  setFeatureFlag, 
  DEFAULT_FLAGS,
  type FeatureFlags 
} from '@/lib/featureFlags';

/**
 * Hook to get all feature flags for the current user
 */
export function useFeatureFlags() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['feature-flags', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_FLAGS;
      return getAllFeatureFlags(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: DEFAULT_FLAGS,
  });
}

/**
 * Hook to check a single feature flag
 */
export function useFeatureFlag(flagKey: keyof FeatureFlags): boolean {
  const { data: flags } = useFeatureFlags();
  return flags?.[flagKey] ?? DEFAULT_FLAGS[flagKey];
}

/**
 * Hook to check multiple feature flags at once
 */
export function useFeatureFlagsMultiple<K extends keyof FeatureFlags>(
  flagKeys: K[]
): Record<K, boolean> {
  const { data: flags } = useFeatureFlags();
  
  const result = {} as Record<K, boolean>;
  for (const key of flagKeys) {
    result[key] = flags?.[key] ?? DEFAULT_FLAGS[key];
  }
  
  return result;
}

/**
 * Hook to update a feature flag
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      flagKey, 
      value 
    }: { 
      flagKey: keyof FeatureFlags; 
      value: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await setFeatureFlag(user.id, flagKey, value);
    },
    onMutate: async ({ flagKey, value }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['feature-flags', user?.id] });
      
      const previousFlags = queryClient.getQueryData<FeatureFlags>(['feature-flags', user?.id]);
      
      queryClient.setQueryData<FeatureFlags>(['feature-flags', user?.id], (old) => ({
        ...(old ?? DEFAULT_FLAGS),
        [flagKey]: value,
      }));
      
      return { previousFlags };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousFlags) {
        queryClient.setQueryData(['feature-flags', user?.id], context.previousFlags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags', user?.id] });
    },
  });
}

/**
 * Hook for module visibility check
 * Returns a function that checks if a specific module is enabled
 */
export function useModuleCheck() {
  const { data: flags, isLoading } = useFeatureFlags();
  
  const isModuleEnabled = (module: keyof FeatureFlags): boolean => {
    if (isLoading) return true; // Default to enabled while loading
    return flags?.[module] ?? DEFAULT_FLAGS[module];
  };
  
  return { isModuleEnabled, isLoading };
}

interface FeatureGateProps {
  flag: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component for feature-flagged content
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);
  
  if (!isEnabled) {
    return fallback;
  }
  
  return children;
}
