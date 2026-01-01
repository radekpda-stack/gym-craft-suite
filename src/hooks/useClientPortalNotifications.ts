import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortalAuth } from "./useClientPortalAuth";

export interface ClientPortalNotification {
  id: string;
  client_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  expires_at: string | null;
  action_url: string | null;
  action_completed: boolean;
}

export function useClientPortalNotifications() {
  const { clientAccount } = useClientPortalAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["client-portal-notifications", clientAccount?.client_id],
    queryFn: async () => {
      if (!clientAccount?.client_id) return [];

      const { data, error } = await supabase
        .from("client_portal_notifications")
        .select("*")
        .eq("client_id", clientAccount.client_id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientPortalNotification[];
    },
    enabled: !!clientAccount?.client_id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!clientAccount?.client_id) return;

    const channel = supabase
      .channel("client-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_portal_notifications",
          filter: `client_id=eq.${clientAccount.client_id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["client-portal-notifications", clientAccount.client_id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientAccount?.client_id, queryClient]);

  return query;
}

export function useUnreadNotificationsCount() {
  const { data: notifications } = useClientPortalNotifications();
  return notifications?.filter((n) => !n.is_read).length ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { clientAccount } = useClientPortalAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("client_portal_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-notifications", clientAccount?.client_id],
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { clientAccount } = useClientPortalAuth();

  return useMutation({
    mutationFn: async () => {
      if (!clientAccount?.client_id) return;

      const { error } = await supabase
        .from("client_portal_notifications")
        .update({ is_read: true })
        .eq("client_id", clientAccount.client_id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-notifications", clientAccount?.client_id],
      });
    },
  });
}

export function useCompleteNotificationAction() {
  const queryClient = useQueryClient();
  const { clientAccount } = useClientPortalAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("client_portal_notifications")
        .update({ action_completed: true, is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-notifications", clientAccount?.client_id],
      });
    },
  });
}
