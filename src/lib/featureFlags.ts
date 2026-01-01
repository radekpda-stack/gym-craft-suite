/**
 * Feature Flags System
 * 
 * Allows enabling/disabling features per user without code deployment.
 * Features can be toggled in Settings → Modules.
 */

import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlags {
  // Core Modules (can be disabled)
  challenges_enabled: boolean;
  badges_enabled: boolean;
  leaderboard_enabled: boolean;
  nutrition_campaigns_enabled: boolean;
  workout_diary_enabled: boolean;
  
  // AI Features
  ai_chat_enabled: boolean;
  ai_nutrition_analysis_enabled: boolean;
  ai_diagnostic_analysis_enabled: boolean;
  ai_plan_generation_enabled: boolean;
  
  // Client Portal Modules
  portal_progress_enabled: boolean;
  portal_challenges_enabled: boolean;
  portal_nutrition_enabled: boolean;
  portal_badges_enabled: boolean;
  portal_leaderboard_enabled: boolean;
  portal_workout_log_enabled: boolean;
  
  // Experimental
  new_calendar_view: boolean;
  advanced_analytics: boolean;
  realtime_notifications: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  // Core Modules - enabled by default
  challenges_enabled: true,
  badges_enabled: true,
  leaderboard_enabled: true,
  nutrition_campaigns_enabled: true,
  workout_diary_enabled: true,
  
  // AI Features - enabled by default
  ai_chat_enabled: true,
  ai_nutrition_analysis_enabled: true,
  ai_diagnostic_analysis_enabled: true,
  ai_plan_generation_enabled: true,
  
  // Client Portal - enabled by default
  portal_progress_enabled: true,
  portal_challenges_enabled: true,
  portal_nutrition_enabled: true,
  portal_badges_enabled: true,
  portal_leaderboard_enabled: true,
  portal_workout_log_enabled: true,
  
  // Experimental - disabled by default
  new_calendar_view: false,
  advanced_analytics: false,
  realtime_notifications: false,
};

export const FLAG_LABELS: Record<keyof FeatureFlags, string> = {
  challenges_enabled: 'Výzvy',
  badges_enabled: 'Odznaky',
  leaderboard_enabled: 'Žebříček',
  nutrition_campaigns_enabled: 'Nutriční kampaně',
  workout_diary_enabled: 'Deník tréninků',
  
  ai_chat_enabled: 'AI Chat',
  ai_nutrition_analysis_enabled: 'AI Analýza stravy',
  ai_diagnostic_analysis_enabled: 'AI Diagnostika',
  ai_plan_generation_enabled: 'AI Generování plánů',
  
  portal_progress_enabled: 'Portál - Progres',
  portal_challenges_enabled: 'Portál - Výzvy',
  portal_nutrition_enabled: 'Portál - Strava',
  portal_badges_enabled: 'Portál - Odznaky',
  portal_leaderboard_enabled: 'Portál - Žebříček',
  portal_workout_log_enabled: 'Portál - Deník tréninků',
  
  new_calendar_view: 'Nový kalendář (beta)',
  advanced_analytics: 'Pokročilá analytika (beta)',
  realtime_notifications: 'Real-time notifikace (beta)',
};

export const FLAG_CATEGORIES = {
  core: ['challenges_enabled', 'badges_enabled', 'leaderboard_enabled', 'nutrition_campaigns_enabled', 'workout_diary_enabled'] as (keyof FeatureFlags)[],
  ai: ['ai_chat_enabled', 'ai_nutrition_analysis_enabled', 'ai_diagnostic_analysis_enabled', 'ai_plan_generation_enabled'] as (keyof FeatureFlags)[],
  portal: ['portal_progress_enabled', 'portal_challenges_enabled', 'portal_nutrition_enabled', 'portal_badges_enabled', 'portal_leaderboard_enabled', 'portal_workout_log_enabled'] as (keyof FeatureFlags)[],
  experimental: ['new_calendar_view', 'advanced_analytics', 'realtime_notifications'] as (keyof FeatureFlags)[],
};

/**
 * Get feature flag value for current user
 * Falls back to DEFAULT_FLAGS if not set
 */
export async function getFeatureFlag(
  userId: string, 
  flagKey: keyof FeatureFlags
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', `feature_flag_${flagKey}`)
      .maybeSingle();
    
    if (data?.value !== undefined) {
      return Boolean(data.value);
    }
    
    return DEFAULT_FLAGS[flagKey];
  } catch {
    return DEFAULT_FLAGS[flagKey];
  }
}

/**
 * Get all feature flags for current user
 */
export async function getAllFeatureFlags(userId: string): Promise<FeatureFlags> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('user_id', userId)
      .like('key', 'feature_flag_%');
    
    const flags = { ...DEFAULT_FLAGS };
    
    if (data) {
      for (const row of data) {
        const flagKey = row.key.replace('feature_flag_', '') as keyof FeatureFlags;
        if (flagKey in DEFAULT_FLAGS) {
          flags[flagKey] = Boolean(row.value);
        }
      }
    }
    
    return flags;
  } catch {
    return DEFAULT_FLAGS;
  }
}

/**
 * Set feature flag value for current user
 */
export async function setFeatureFlag(
  userId: string,
  flagKey: keyof FeatureFlags,
  value: boolean
): Promise<void> {
  const key = `feature_flag_${flagKey}`;
  
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('app_settings')
      .update({ value: value })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('app_settings')
      .insert({
        user_id: userId,
        key,
        value: value,
        description: FLAG_LABELS[flagKey],
      });
  }
}

/**
 * Check if a module is enabled (for conditional rendering)
 */
export function isModuleEnabled(
  flags: FeatureFlags | undefined,
  module: keyof FeatureFlags
): boolean {
  if (!flags) return DEFAULT_FLAGS[module];
  return flags[module];
}
