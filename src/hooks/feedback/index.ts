/**
 * Feedback hooks - all hooks related to client feedback
 */

export { useFeedbackRequests, useCreateFeedbackRequest } from '../useFeedbackRequests';
export { useFeedbackAnalytics } from '../useFeedbackAnalytics';
export { useFeedbackTrends } from '../useFeedbackTrends';
export { useFeedbackEvaluation } from '../useFeedbackEvaluation';
export { useFeedbackRecommendation, calculateRecommendation } from '../useFeedbackRecommendation';
export { usePendingFeedbackTrainings } from '../usePendingFeedbackTrainings';
export { useClientFeedbackSummary } from '../useClientFeedbackSummary';
export { 
  useRecoveryAnalytics, 
  calculateRecoveryScore,
  scoreSleepQuality,
  type RecoveryScore,
  type SleepImpact,
  type PainAreaHistory,
  type EnjoymentTrend,
} from '../useRecoveryAnalytics';
