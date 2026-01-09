import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'low_credit' 
  | 'negative_credit' 
  | 'birthday' 
  | 'milestone_100' 
  | 'milestone_500' 
  | 'milestone_1000'
  | 'incomplete_training'
  | 'feedback_received'
  | 'feedback_red_flag'
  | 'feedback_trend_alert'
  | 'feedback_pending'
  | 'client_anniversary'
  | 'client_profile_updated'
  | 'client_nutrition_started'
  | 'pr_created'
  | 'pr_updated'
  | 'pr_achieved'
  | 'package_low'
  | 'package_expiring'
  | 'inactivity_warning'
  | 'training_streak'
  | 'diagnostic_completed';

export interface Notification {
  id: string;
  client_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  user_id: string | null;
  reference_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  severity?: string | null;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      client_id?: string;
      type: NotificationType;
      title: string;
      message: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("notifications")
        .insert({ ...notification, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
