import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-challenge`;

// Types
export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'integer' | 'time';
  required: boolean;
  min?: number;
  max?: number;
  order: number;
}

export interface LeaderboardConfig {
  primary_metric_key: string | null;
  direction: 'max' | 'min';
  tie_breakers: string[];
}

export interface PublicChallenge {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  start_at: string;
  end_at: string;
  public_slug: string;
  require_photo_proof: boolean;
  metrics_config: MetricConfig[];
  leaderboard_config: LeaderboardConfig;
  public_settings: Record<string, unknown>;
  status: string;
  vod_url: string | null;
}

export interface LeaderboardEntry {
  result_id: string;
  challenge_id: string;
  metrics_data: Record<string, number>;
  photo_urls: string[];
  submitted_at: string;
  is_verified: boolean;
  display_initials: string;
  participant_type: 'guest' | 'client';
  sex: string | null;
  guest_age: number | null;
  like_count: number;
  muscle_count: number;
  fire_count: number;
  clap_count: number;
  mind_blown_count: number;
  smile_count: number;
}

export interface ChallengeStats {
  total_participants: number;
  total_results: number;
  guest_count: number;
  client_count: number;
  gender_breakdown: {
    male: number;
    female: number;
    unknown: number;
  };
  primary_metric_stats: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
  };
}

export interface ChatMessage {
  id: string;
  challenge_id: string;
  message: string;
  created_at: string;
  author_initials: string;
  author_type: 'guest' | 'client';
}

// Local storage helpers
const VISITOR_TOKEN_KEY = 'public_challenge_visitor_token';
const PARTICIPANT_TOKENS_KEY = 'public_challenge_participant_tokens';

export function getVisitorToken(): string {
  let token = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(VISITOR_TOKEN_KEY, token);
  }
  return token;
}

export function getParticipantToken(challengeId: string): string | null {
  const tokens = JSON.parse(localStorage.getItem(PARTICIPANT_TOKENS_KEY) || '{}');
  return tokens[challengeId] || null;
}

export function setParticipantToken(challengeId: string, token: string): void {
  const tokens = JSON.parse(localStorage.getItem(PARTICIPANT_TOKENS_KEY) || '{}');
  tokens[challengeId] = token;
  localStorage.setItem(PARTICIPANT_TOKENS_KEY, JSON.stringify(tokens));
}

// Hooks
export function usePublicChallenge(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-challenge', slug],
    queryFn: async (): Promise<PublicChallenge> => {
      const response = await fetch(
        `${FUNCTION_URL}?action=get_challenge&slug=${encodeURIComponent(slug!)}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch challenge');
      }
      
      return response.json();
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePublicLeaderboard(
  challengeId: string | undefined,
  options?: { page?: number; pageSize?: number; sex?: string }
) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const sex = options?.sex;

  return useQuery({
    queryKey: ['public-leaderboard', challengeId, page, pageSize, sex],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: 'get_leaderboard',
        challenge_id: challengeId!,
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (sex) params.set('sex', sex);

      const response = await fetch(`${FUNCTION_URL}?${params}`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch leaderboard');
      }

      return response.json() as Promise<{
        data: LeaderboardEntry[];
        total: number;
        page: number;
        pageSize: number;
      }>;
    },
    enabled: !!challengeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function usePublicChallengeStats(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['public-challenge-stats', challengeId],
    queryFn: async (): Promise<ChallengeStats> => {
      const response = await fetch(
        `${FUNCTION_URL}?action=get_stats&challenge_id=${challengeId}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }

      return response.json();
    },
    enabled: !!challengeId,
    staleTime: 1000 * 60,
  });
}

export function usePublicChallengeChat(challengeId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initial fetch
  const query = useQuery({
    queryKey: ['public-challenge-chat', challengeId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const response = await fetch(
        `${FUNCTION_URL}?action=get_chat&challenge_id=${challengeId}&limit=100`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch chat');
      }

      const data = await response.json();
      setMessages(data);
      return data;
    },
    enabled: !!challengeId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel(`public-chat-${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'challenge_public_chat',
          filter: `challenge_id=eq.${challengeId}`,
        },
        async () => {
          // Refetch chat on new message
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, query]);

  return { ...query, messages: query.data || [] };
}

export function useGuestRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      challenge_id: string;
      first_name: string;
      last_name: string;
      sex?: 'male' | 'female';
      age?: number;
      weight_kg?: number;
      height_cm?: number;
      email?: string;
    }) => {
      const response = await fetch(`${FUNCTION_URL}?action=register_guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const result = await response.json();
      
      // Store token in localStorage
      setParticipantToken(data.challenge_id, result.participant_token);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-challenge-stats', variables.challenge_id] });
    },
  });
}

export function useSubmitPublicResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      challenge_id: string;
      metrics_data: Record<string, number>;
      photo_urls?: string[];
    }) => {
      const participantToken = getParticipantToken(data.challenge_id);
      if (!participantToken) {
        throw new Error('Not registered for this challenge');
      }

      const response = await fetch(`${FUNCTION_URL}?action=submit_result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          ...data,
          participant_token: participantToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-leaderboard', variables.challenge_id] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge-stats', variables.challenge_id] });
    },
  });
}

export function useReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      result_id: string;
      challenge_id: string;
      reaction_type: 'like' | '💪' | '🔥' | '👏' | '🤯' | '😄';
      action: 'add' | 'remove';
    }) => {
      const action = data.action === 'add' ? 'react' : 'unreact';
      const response = await fetch(`${FUNCTION_URL}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          result_id: data.result_id,
          reaction_type: data.reaction_type,
          visitor_token: getVisitorToken(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Reaction failed');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-leaderboard', variables.challenge_id] });
    },
  });
}

export function useSendPublicChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { challenge_id: string; message: string }) => {
      const participantToken = getParticipantToken(data.challenge_id);
      if (!participantToken) {
        throw new Error('Not registered for this challenge');
      }

      const response = await fetch(`${FUNCTION_URL}?action=send_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          ...data,
          participant_token: participantToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-challenge-chat', variables.challenge_id] });
    },
  });
}

// Check if current visitor is registered for a challenge
export function useIsRegistered(challengeId: string | undefined): boolean {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (challengeId) {
      setIsRegistered(!!getParticipantToken(challengeId));
    }
  }, [challengeId]);

  return isRegistered;
}
