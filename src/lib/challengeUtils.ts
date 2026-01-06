/**
 * Shared utilities for challenge formatting and display
 */

import { Trophy, Medal, Award } from 'lucide-react';
import { formatTimeMs, formatTimeMsFull } from '@/lib/timeUtils';

/**
 * Format score based on metric type
 */
export function formatChallengeScore(score: number, metric: string): string {
  if (metric === 'time_seconds' || metric === 'time_ms') {
    // For time_seconds, convert to ms first
    const ms = metric === 'time_seconds' ? score * 1000 : score;
    return formatTimeMs(ms);
  }
  return score.toLocaleString('cs-CZ');
}

/**
 * Format score for leaderboard (always show centiseconds for time)
 */
export function formatChallengeScoreFull(score: number, metric: string): string {
  if (metric === 'time_seconds' || metric === 'time_ms') {
    const ms = metric === 'time_seconds' ? score * 1000 : score;
    return formatTimeMsFull(ms);
  }
  return formatChallengeScore(score, metric);
}

/**
 * Get human-readable label for a metric
 */
export function getMetricLabel(metric: string, unitLabel?: string | null): string {
  if (unitLabel) return unitLabel;
  const labels: Record<string, string> = {
    time_seconds: '',
    time_ms: '',
    reps: 'opakování',
    rounds: 'kol',
    weight_kg: 'kg',
    distance_m: 'm',
    calories: 'kcal',
  };
  return labels[metric] || '';
}

/**
 * Get rank icon component for top 3 positions
 */
export function getRankIconType(rank: number): 'trophy' | 'medal' | 'award' | null {
  if (rank === 1) return 'trophy';
  if (rank === 2) return 'medal';
  if (rank === 3) return 'award';
  return null;
}

/**
 * Get rank icon classes for styling
 */
export function getRankIconClasses(rank: number): string {
  if (rank === 1) return 'text-amber-500';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-amber-700';
  return '';
}

/**
 * Format countdown with hours for precise time remaining
 */
export function formatCountdown(endDate: Date): string {
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ukončeno';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get badge color for countdown based on urgency
 */
export function getCountdownVariant(endDate: Date): 'destructive' | 'warning' | 'secondary' {
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const hoursLeft = diffMs / (1000 * 60 * 60);
  
  if (hoursLeft <= 24) return 'destructive';
  if (hoursLeft <= 72) return 'warning';
  return 'secondary';
}

/**
 * Parse time input (mm:ss or mm:ss.SS format) to seconds
 */
export function parseTimeInputToSeconds(input: string): number | null {
  const trimmed = input.trim();
  
  // Try mm:ss.SS format
  const fullMatch = trimmed.match(/^(\d{1,2}):(\d{2})\.(\d{2})$/);
  if (fullMatch) {
    const mins = parseInt(fullMatch[1]);
    const secs = parseInt(fullMatch[2]);
    const cs = parseInt(fullMatch[3]);
    if (secs >= 60) return null;
    return mins * 60 + secs + cs / 100;
  }
  
  // Try mm:ss format
  const simpleMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (simpleMatch) {
    const mins = parseInt(simpleMatch[1]);
    const secs = parseInt(simpleMatch[2]);
    if (secs >= 60) return null;
    return mins * 60 + secs;
  }
  
  // Try plain seconds
  const secondsMatch = trimmed.match(/^(\d+(?:\.\d+)?)s?$/);
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]);
  }
  
  return null;
}
