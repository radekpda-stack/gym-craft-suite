-- Fix security definer views by explicitly setting SECURITY INVOKER
-- This ensures RLS policies of the querying user are respected

ALTER VIEW public.analytics_exercise_volume_daily SET (security_invoker = on);
ALTER VIEW public.analytics_muscle_group_distribution SET (security_invoker = on);
ALTER VIEW public.analytics_movement_patterns SET (security_invoker = on);
ALTER VIEW public.analytics_baseline_volume SET (security_invoker = on);
ALTER VIEW public.analytics_baseline_muscle_groups SET (security_invoker = on);
ALTER VIEW public.analytics_baseline_movement_patterns SET (security_invoker = on);
ALTER VIEW public.analytics_client_activity SET (security_invoker = on);
ALTER VIEW public.analytics_client_ltv SET (security_invoker = on);
ALTER VIEW public.analytics_revenue_daily SET (security_invoker = on);
ALTER VIEW public.analytics_revenue_by_source SET (security_invoker = on);