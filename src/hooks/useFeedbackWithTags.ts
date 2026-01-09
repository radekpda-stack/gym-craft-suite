/**
 * Hook for fetching feedback data enriched with training tags
 * This connects feedback metrics to training session tags for analysis
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from './useTags';
import { safeAverage, formatMetric } from '@/lib/feedbackCalculations';

// ============================================================================
// Types
// ============================================================================

export interface FeedbackWithTags {
  id: string;
  training_session_id: string;
  client_id: string;
  training_date: string;
  created_at: string;
  link_method: 'auto' | 'manual' | 'none' | null;
  link_confidence: 'high' | 'medium' | 'low' | null;
  
  // Feedback metrics (1-10 scale)
  body_feel: number | null;
  pain: number | null;
  energy_rating: number | null;
  soreness: number | null;
  session_fit: number | null;
  difficulty: number | null;
  fun: number | null;
  rpe_rating: number | null;
  
  // Red flags
  is_red_flag: boolean;
  red_flag_reasons: string[] | null;
  
  // Pain details
  pain_area: string | null;
  pain_area_intensities: Record<string, { intensity: number; isNew?: boolean }> | null;
  
  // Training session data
  training: {
    id: string;
    date: string;
    duration: number;
    status: string;
    notes: string | null;
    participant_count: number | null;
    template_name: string | null;
  } | null;
  
  // Tags from training session (NOT from feedback)
  tags: Tag[];
  
  // Computed status
  status: 'ok' | 'warning' | 'red_flag';
  statusReasons: string[];
}

export interface TagAggregation {
  tag: Tag;
  feedbackCount: number;
  avgBodyFeel: number | null;
  avgPain: number | null;
  avgEnergy: number | null;
  avgDifficulty: number | null;
  avgSessionFit: number | null;
  avgFun: number | null;
  redFlagCount: number;
  warningCount: number;
}

export interface FeedbackAnalysisByTags {
  byFocus: TagAggregation[];
  byBodyPart: TagAggregation[];
  byIntensity: TagAggregation[];
  totalFeedbacks: number;
  feedbacksWithTags: number;
}

// ============================================================================
// Status thresholds (configurable)
// ============================================================================

export const FEEDBACK_THRESHOLDS = {
  redFlag: {
    pain: 7,        // Pain >= 7
    bodyFeel: 3,    // Body feel <= 3
    energy: 3,      // Energy <= 3
    sessionFit: 3,  // Session fit <= 3
  },
  warning: {
    pain: 5,        // Pain 5-6
    bodyFeel: 4,    // Body feel == 4
    energy: 4,      // Energy == 4
    soreness: 7,    // Soreness >= 7
  },
};

// ============================================================================
// Helper functions
// ============================================================================

function calculateStatus(feedback: {
  is_red_flag: boolean;
  pain: number | null;
  body_feel: number | null;
  energy_rating: number | null;
  session_fit: number | null;
  soreness: number | null;
}): { status: 'ok' | 'warning' | 'red_flag'; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check red flags
  if (feedback.is_red_flag) {
    reasons.push('Označeno jako red flag');
    return { status: 'red_flag', reasons };
  }
  
  if (feedback.pain != null && feedback.pain >= FEEDBACK_THRESHOLDS.redFlag.pain) {
    reasons.push(`Bolest ${feedback.pain}/10`);
  }
  if (feedback.body_feel != null && feedback.body_feel <= FEEDBACK_THRESHOLDS.redFlag.bodyFeel) {
    reasons.push(`Pocit v těle ${feedback.body_feel}/10`);
  }
  if (feedback.energy_rating != null && feedback.energy_rating <= FEEDBACK_THRESHOLDS.redFlag.energy) {
    reasons.push(`Energie ${feedback.energy_rating}/10`);
  }
  if (feedback.session_fit != null && feedback.session_fit <= FEEDBACK_THRESHOLDS.redFlag.sessionFit) {
    reasons.push(`Jak sedl ${feedback.session_fit}/10`);
  }
  
  if (reasons.length > 0) {
    return { status: 'red_flag', reasons };
  }
  
  // Check warnings
  if (feedback.pain != null && feedback.pain >= FEEDBACK_THRESHOLDS.warning.pain && feedback.pain < FEEDBACK_THRESHOLDS.redFlag.pain) {
    reasons.push(`Bolest ${feedback.pain}/10`);
  }
  if (feedback.body_feel != null && feedback.body_feel === FEEDBACK_THRESHOLDS.warning.bodyFeel) {
    reasons.push(`Pocit v těle ${feedback.body_feel}/10`);
  }
  if (feedback.energy_rating != null && feedback.energy_rating === FEEDBACK_THRESHOLDS.warning.energy) {
    reasons.push(`Energie ${feedback.energy_rating}/10`);
  }
  if (feedback.soreness != null && feedback.soreness >= FEEDBACK_THRESHOLDS.warning.soreness) {
    reasons.push(`Svalovka ${feedback.soreness}/10`);
  }
  
  if (reasons.length > 0) {
    return { status: 'warning', reasons };
  }
  
  return { status: 'ok', reasons: [] };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useFeedbackWithTags(clientId: string | undefined, options?: {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: ['feedback-with-tags', clientId, options?.limit, options?.startDate?.toISOString(), options?.endDate?.toISOString()],
    queryFn: async (): Promise<FeedbackWithTags[]> => {
      if (!clientId) return [];
      
      // Fetch feedbacks with training session data
      let query = supabase
        .from('training_feedback')
        .select(`
          id,
          training_session_id,
          client_id,
          training_date,
          created_at,
          link_method,
          link_confidence,
          body_feel,
          pain,
          energy_rating,
          soreness,
          session_fit,
          difficulty,
          fun,
          rpe_rating,
          is_red_flag,
          red_flag_reasons,
          pain_area,
          pain_area_intensities,
          training_sessions!training_feedback_training_session_id_fkey (
            id,
            date,
            duration,
            status,
            notes,
            participant_count,
            training_templates (
              name
            )
          )
        `)
        .eq('client_id', clientId)
        .order('training_date', { ascending: false });
      
      if (options?.startDate) {
        query = query.gte('training_date', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('training_date', options.endDate.toISOString());
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data: feedbacks, error: feedbackError } = await query;
      
      if (feedbackError) throw feedbackError;
      if (!feedbacks || feedbacks.length === 0) return [];
      
      // Get all training session IDs
      const sessionIds = feedbacks
        .map(f => f.training_session_id)
        .filter((id): id is string => id != null);
      
      // Fetch tags for all sessions at once
      const { data: tagLinks, error: tagError } = await supabase
        .from('training_session_tags')
        .select(`
          training_session_id,
          tags:tag_id (id, name, color, tag_type)
        `)
        .in('training_session_id', sessionIds);
      
      if (tagError) throw tagError;
      
      // Create a map of session ID -> tags
      const tagsBySession = new Map<string, Tag[]>();
      (tagLinks || []).forEach(link => {
        const sessionId = link.training_session_id;
        const tag = link.tags as unknown as Tag;
        if (tag) {
          if (!tagsBySession.has(sessionId)) {
            tagsBySession.set(sessionId, []);
          }
          tagsBySession.get(sessionId)!.push(tag);
        }
      });
      
      // Transform feedbacks
      return feedbacks.map(f => {
        const training = f.training_sessions as any;
        const { status, reasons } = calculateStatus({
          is_red_flag: f.is_red_flag || false,
          pain: f.pain,
          body_feel: f.body_feel,
          energy_rating: f.energy_rating,
          session_fit: f.session_fit,
          soreness: f.soreness,
        });
        
        return {
          id: f.id,
          training_session_id: f.training_session_id,
          client_id: f.client_id,
          training_date: f.training_date,
          created_at: f.created_at,
          link_method: f.link_method as FeedbackWithTags['link_method'],
          link_confidence: f.link_confidence as FeedbackWithTags['link_confidence'],
          body_feel: f.body_feel,
          pain: f.pain,
          energy_rating: f.energy_rating,
          soreness: f.soreness,
          session_fit: f.session_fit,
          difficulty: f.difficulty,
          fun: f.fun,
          rpe_rating: f.rpe_rating,
          is_red_flag: f.is_red_flag || false,
          red_flag_reasons: f.red_flag_reasons,
          pain_area: f.pain_area,
          pain_area_intensities: f.pain_area_intensities as FeedbackWithTags['pain_area_intensities'],
          training: training ? {
            id: training.id,
            date: training.date,
            duration: training.duration,
            status: training.status,
            notes: training.notes,
            participant_count: training.participant_count,
            template_name: training.training_templates?.name || null,
          } : null,
          tags: tagsBySession.get(f.training_session_id) || [],
          status,
          statusReasons: reasons,
        };
      });
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Aggregation Hook
// ============================================================================

export function useFeedbackAnalysisByTags(clientId: string | undefined, options?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { data: feedbacks = [], isLoading, error } = useFeedbackWithTags(clientId, options);
  
  const analysis: FeedbackAnalysisByTags = {
    byFocus: [],
    byBodyPart: [],
    byIntensity: [],
    totalFeedbacks: feedbacks.length,
    feedbacksWithTags: feedbacks.filter(f => f.tags.length > 0).length,
  };
  
  if (feedbacks.length === 0) {
    return { data: analysis, isLoading, error };
  }
  
  // Group feedbacks by tag
  const tagFeedbacks = new Map<string, { tag: Tag; feedbacks: FeedbackWithTags[] }>();
  
  feedbacks.forEach(feedback => {
    feedback.tags.forEach(tag => {
      if (!tagFeedbacks.has(tag.id)) {
        tagFeedbacks.set(tag.id, { tag, feedbacks: [] });
      }
      tagFeedbacks.get(tag.id)!.feedbacks.push(feedback);
    });
  });
  
  // Calculate aggregations
  const aggregations: TagAggregation[] = [];
  
  tagFeedbacks.forEach(({ tag, feedbacks: tagFbs }) => {
    aggregations.push({
      tag,
      feedbackCount: tagFbs.length,
      avgBodyFeel: safeAverage(tagFbs.map(f => f.body_feel)),
      avgPain: safeAverage(tagFbs.map(f => f.pain)),
      avgEnergy: safeAverage(tagFbs.map(f => f.energy_rating)),
      avgDifficulty: safeAverage(tagFbs.map(f => f.difficulty)),
      avgSessionFit: safeAverage(tagFbs.map(f => f.session_fit)),
      avgFun: safeAverage(tagFbs.map(f => f.fun)),
      redFlagCount: tagFbs.filter(f => f.status === 'red_flag').length,
      warningCount: tagFbs.filter(f => f.status === 'warning').length,
    });
  });
  
  // Split by tag type
  analysis.byFocus = aggregations.filter(a => a.tag.tag_type === 'focus').sort((a, b) => b.feedbackCount - a.feedbackCount);
  analysis.byBodyPart = aggregations.filter(a => a.tag.tag_type === 'body_part').sort((a, b) => b.feedbackCount - a.feedbackCount);
  analysis.byIntensity = aggregations.filter(a => a.tag.tag_type === 'intensity').sort((a, b) => b.feedbackCount - a.feedbackCount);
  
  return { data: analysis, isLoading, error };
}

// ============================================================================
// Trend Detection
// ============================================================================

export interface FeedbackTrendData {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number; // percentage
  recentValue: number | null;
  previousValue: number | null;
}

export function useFeedbackTrendsByClient(clientId: string | undefined) {
  const { data: feedbacks = [], isLoading, error } = useFeedbackWithTags(clientId, { limit: 10 });
  
  const trends: FeedbackTrendData[] = [];
  
  if (feedbacks.length >= 3) {
    const recent = feedbacks.slice(0, 3);
    const previous = feedbacks.slice(3, 6);
    
    const metrics: { key: keyof FeedbackWithTags; label: string; invertBad?: boolean }[] = [
      { key: 'pain', label: 'Bolest', invertBad: true },
      { key: 'body_feel', label: 'Pocit v těle' },
      { key: 'energy_rating', label: 'Energie' },
      { key: 'session_fit', label: 'Jak sedl' },
      { key: 'difficulty', label: 'Obtížnost', invertBad: true },
      { key: 'fun', label: 'Zábava' },
    ];
    
    metrics.forEach(({ key, label, invertBad }) => {
      const recentAvg = safeAverage(recent.map(f => f[key] as number | null));
      const previousAvg = previous.length > 0 ? safeAverage(previous.map(f => f[key] as number | null)) : null;
      
      if (recentAvg != null && previousAvg != null && previousAvg !== 0) {
        const change = ((recentAvg - previousAvg) / previousAvg) * 100;
        let direction: 'up' | 'down' | 'stable' = 'stable';
        
        if (Math.abs(change) > 10) {
          direction = change > 0 ? 'up' : 'down';
        }
        
        trends.push({
          metric: label,
          direction,
          change: Math.round(change),
          recentValue: recentAvg,
          previousValue: previousAvg,
        });
      }
    });
  }
  
  return { data: trends, isLoading, error };
}

// ============================================================================
// Attention Reasons Generator
// ============================================================================

export function generateAttentionReasons(feedbacks: FeedbackWithTags[]): string[] {
  const reasons: string[] = [];
  
  if (feedbacks.length < 3) return reasons;
  
  const last3 = feedbacks.slice(0, 3);
  const last14Days = feedbacks.filter(f => {
    const date = new Date(f.training_date);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  });
  
  // Check pain trend
  const painTrend = last3.every((f, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return (f.pain ?? 0) >= (prev.pain ?? 0);
  }) && last3.some(f => (f.pain ?? 0) >= 5);
  
  if (painTrend) {
    reasons.push('Bolest ↑ poslední 3 feedbacky');
  }
  
  // Check energy trend (decreasing = bad)
  const energyTrend = last3.every((f, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return (f.energy_rating ?? 10) <= (prev.energy_rating ?? 10);
  }) && last3.some(f => (f.energy_rating ?? 10) <= 5);
  
  if (energyTrend) {
    reasons.push('Energie ↓ poslední 3 feedbacky');
  }
  
  // Check red flags in last 14 days
  const redFlagCount = last14Days.filter(f => f.status === 'red_flag').length;
  if (redFlagCount >= 2) {
    reasons.push(`${redFlagCount}× Red flag za 14 dní`);
  }
  
  return reasons;
}
