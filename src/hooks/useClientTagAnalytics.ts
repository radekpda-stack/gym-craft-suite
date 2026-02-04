import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, isAfter, parseISO } from "date-fns";
import { Tag, TagType, useTags } from "./useTags";

export interface TagDistribution {
  tagId: string;
  tagName: string;
  tagColor: string;
  tagType: TagType;
  count: number;
  percentage: number;
}

// Derive intensity from RPE for backward compatibility
export type DerivedIntensity = 'Lehký' | 'Střední' | 'Těžký';

export function getIntensityFromRPE(rpe: number | null | undefined): DerivedIntensity | null {
  if (rpe == null) return null;
  if (rpe <= 3) return 'Lehký';
  if (rpe <= 6) return 'Střední';
  return 'Těžký';
}

export interface TagAnalytics {
  focusDistribution: TagDistribution[];
  bodyPartDistribution: TagDistribution[];
  intensityDistribution: TagDistribution[];
  totalTrainings: number;
  consecutiveHeavyWarning: boolean;
  missingMobilityWarning: boolean;
  unbalancedBodyPartWarning: string | null;
}

export type DateRangeOption = 7 | 30 | 90 | 180 | 365;

interface TrainingSessionTag {
  training_session_id: string;
  tag_id: string;
  training_sessions: {
    id: string;
    date: string;
    status: string;
  } | null;
}

export function useClientTagAnalytics(
  clientId: string | undefined,
  dateRange: DateRangeOption = 30
) {
  const { data: allTags = [] } = useTags();

  const { data: sessionTags = [], isLoading } = useQuery({
    queryKey: ["client_tag_analytics", clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return [];

      const cutoffDate = subDays(new Date(), dateRange).toISOString();

      const { data, error } = await supabase
        .from("training_session_tags")
        .select(`
          training_session_id,
          tag_id,
          training_sessions!inner (
            id,
            date,
            status
          )
        `)
        .gte("training_sessions.date", cutoffDate)
        .eq("training_sessions.status", "completed");

      if (error) throw error;

      // Filter by client - need to join with training_sessions
      const { data: clientSessions } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("client_id", clientId)
        .eq("status", "completed")
        .gte("date", cutoffDate);

      const clientSessionIds = new Set((clientSessions || []).map(s => s.id));
      
      return (data || []).filter(st => 
        clientSessionIds.has(st.training_session_id)
      ) as TrainingSessionTag[];
    },
    enabled: !!clientId,
  });

  const analytics = useMemo((): TagAnalytics => {
    const tagCounts: Record<string, number> = {};
    const sessionDates: { date: string; tags: Tag[] }[] = [];

    // Count tag occurrences
    const uniqueSessions = new Set(sessionTags.map(st => st.training_session_id));
    const totalTrainings = uniqueSessions.size;

    // Group tags by session
    const sessionTagMap: Record<string, string[]> = {};
    sessionTags.forEach(st => {
      if (!sessionTagMap[st.training_session_id]) {
        sessionTagMap[st.training_session_id] = [];
      }
      sessionTagMap[st.training_session_id].push(st.tag_id);
      tagCounts[st.tag_id] = (tagCounts[st.tag_id] || 0) + 1;
    });

    // Build distributions by type
    const buildDistribution = (type: TagType): TagDistribution[] => {
      const typeTags = allTags.filter(t => t.tag_type === type);
      return typeTags
        .map(tag => ({
          tagId: tag.id,
          tagName: tag.name,
          tagColor: tag.color,
          tagType: tag.tag_type,
          count: tagCounts[tag.id] || 0,
          percentage: totalTrainings > 0 
            ? Math.round((tagCounts[tag.id] || 0) / totalTrainings * 100) 
            : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);
    };

    // Check for consecutive heavy trainings
    const sortedSessionTags = [...sessionTags]
      .filter(st => st.training_sessions)
      .sort((a, b) => 
        new Date(b.training_sessions!.date).getTime() - 
        new Date(a.training_sessions!.date).getTime()
      );

    const heavyTag = allTags.find(t => 
      t.tag_type === "intensity" && t.name.toLowerCase() === "těžký"
    );

    let consecutiveHeavyCount = 0;
    let lastSessionId = "";
    for (const st of sortedSessionTags) {
      if (st.training_session_id !== lastSessionId) {
        if (heavyTag && st.tag_id === heavyTag.id) {
          consecutiveHeavyCount++;
          if (consecutiveHeavyCount >= 2) break;
        } else {
          break;
        }
        lastSessionId = st.training_session_id;
      }
    }

    // Check for missing mobility
    const mobilityTag = allTags.find(t => 
      t.tag_type === "focus" && t.name.toLowerCase() === "mobilita"
    );
    const mobilityCount = mobilityTag ? (tagCounts[mobilityTag.id] || 0) : 0;
    const missingMobilityWarning = totalTrainings >= 5 && mobilityCount === 0;

    // Check for unbalanced body parts
    const bodyPartDist = buildDistribution("body_part");
    let unbalancedBodyPartWarning: string | null = null;
    
    if (bodyPartDist.length >= 2) {
      const maxCount = Math.max(...bodyPartDist.map(d => d.count));
      const minCount = Math.min(...bodyPartDist.map(d => d.count));
      
      if (maxCount > 0 && minCount > 0 && maxCount / minCount > 3) {
        const dominant = bodyPartDist.find(d => d.count === maxCount);
        const neglected = bodyPartDist.find(d => d.count === minCount);
        if (dominant && neglected) {
          unbalancedBodyPartWarning = `Nerovnoměrné rozložení: ${dominant.tagName} (${dominant.count}×) vs ${neglected.tagName} (${neglected.count}×)`;
        }
      }
    }

    return {
      focusDistribution: buildDistribution("focus"),
      bodyPartDistribution: buildDistribution("body_part"),
      intensityDistribution: buildDistribution("intensity"),
      totalTrainings,
      consecutiveHeavyWarning: consecutiveHeavyCount >= 2,
      missingMobilityWarning,
      unbalancedBodyPartWarning,
    };
  }, [sessionTags, allTags]);

  return {
    ...analytics,
    isLoading,
  };
}
