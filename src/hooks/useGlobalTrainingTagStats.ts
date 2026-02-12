import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import { Tag, TagType, useTags } from "./useTags";

export interface GlobalTagStat {
  tagId: string;
  tagName: string;
  tagType: TagType;
  tagColor: string;
  count: number;
  percentage: number;
}

export interface TrainingTypeStat {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export interface GlobalTrainingStats {
  focusDistribution: GlobalTagStat[];
  bodyPartDistribution: GlobalTagStat[];
  intensityDistribution: GlobalTagStat[];
  trainingTypeDistribution: TrainingTypeStat[];
  totalTrainings: number;
  trainingsThisMonth: number;
  avgTrainingsPerWeek: number;
  mostFrequentType: string | null;
}

export type GlobalDateRange = 7 | 30 | 90 | 365 | 'all';

export const TRAINING_TYPE_LABELS: Record<string, string> = {
  strength: 'Silový',
  conditioning: 'Kondiční',
  hiit: 'HIIT',
  cardio: 'Kardio',
  running: 'Běh',
  mobility: 'Mobilita',
  flexibility: 'Flexibilita',
  regeneration: 'Regenerace',
  functional: 'Funkční',
  diagnostic: 'Diagnostický',
  other: 'Jiný',
};

export function useGlobalTrainingTagStats(dateRange: GlobalDateRange = 30) {
  const { data: allTags = [] } = useTags();

  const { data, isLoading } = useQuery({
    queryKey: ["global_training_tag_stats", dateRange],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Build date filter
      let dateFilter: string | undefined;
      if (dateRange !== 'all') {
        dateFilter = subDays(new Date(), dateRange).toISOString();
      }

      // Fetch completed training sessions
      let sessionsQuery = supabase
        .from("training_sessions")
        .select("id, date, training_type")
        .eq("user_id", userData.user.id)
        .eq("status", "completed");

      if (dateFilter) {
        sessionsQuery = sessionsQuery.gte("date", dateFilter);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      const sessionIds = (sessions || []).map(s => s.id);

      // Fetch tags for these sessions
      let tags: { training_session_id: string; tag_id: string }[] = [];
      if (sessionIds.length > 0) {
        const { data: tagData, error: tagsError } = await supabase
          .from("training_session_tags")
          .select("training_session_id, tag_id")
          .in("training_session_id", sessionIds);

        if (tagsError) throw tagsError;
        tags = tagData || [];
      }

      // Calculate trainings this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const trainingsThisMonth = (sessions || []).filter(s => 
        new Date(s.date) >= startOfMonth
      ).length;

      // Calculate avg per week - for 'all', compute actual days from oldest session
       let totalDays: number;
       if (dateRange === 'all' && (sessions || []).length > 0) {
         const sortedDates = (sessions || []).map(s => new Date(s.date).getTime()).sort((a, b) => a - b);
         totalDays = Math.max(1, Math.ceil((Date.now() - sortedDates[0]) / (1000 * 60 * 60 * 24)));
       } else if (dateRange === 'all') {
         totalDays = 365;
       } else {
         totalDays = dateRange;
       }
      const weeks = Math.max(1, totalDays / 7);
      const avgPerWeek = (sessions || []).length / weeks;

      return {
        sessions: sessions || [],
        tags,
        trainingsThisMonth,
        avgPerWeek: Math.round(avgPerWeek * 10) / 10,
      };
    },
  });

  const stats = useMemo((): GlobalTrainingStats => {
    const sessions = data?.sessions || [];
    const tags = data?.tags || [];
    const totalTrainings = sessions.length;

    // Count tags by id
    const tagCounts: Record<string, number> = {};
    tags.forEach(t => {
      tagCounts[t.tag_id] = (tagCounts[t.tag_id] || 0) + 1;
    });

    // Build distribution for a tag type, sorted by count DESC
    const buildDistribution = (type: TagType): GlobalTagStat[] => {
      const typeTags = allTags.filter(t => t.tag_type === type);
      return typeTags
        .map(tag => ({
          tagId: tag.id,
          tagName: tag.name,
          tagType: tag.tag_type,
          tagColor: tag.color,
          count: tagCounts[tag.id] || 0,
          percentage: totalTrainings > 0 
            ? Math.round((tagCounts[tag.id] || 0) / totalTrainings * 100) 
            : 0,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);
    };

    // Count training types
    const typeCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const type = s.training_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const trainingTypeDistribution: TrainingTypeStat[] = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        label: TRAINING_TYPE_LABELS[type] || type,
        count,
        percentage: totalTrainings > 0 ? Math.round(count / totalTrainings * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequentType = trainingTypeDistribution[0]?.label || null;

    return {
      focusDistribution: buildDistribution("focus"),
      bodyPartDistribution: buildDistribution("body_part"),
      intensityDistribution: buildDistribution("intensity"),
      trainingTypeDistribution,
      totalTrainings,
      trainingsThisMonth: data?.trainingsThisMonth || 0,
      avgTrainingsPerWeek: data?.avgPerWeek || 0,
      mostFrequentType,
    };
  }, [data, allTags]);

  return {
    ...stats,
    isLoading,
  };
}
