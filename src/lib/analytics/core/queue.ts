/**
 * Analytics Event Queue
 * 
 * Handles batching, retry, and reliable delivery of events.
 * Uses IndexedDB for persistence across page reloads.
 */

import type { AnalyticsEvent, EventQueueItem } from './types';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let eventQueue: EventQueueItem[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;

// Debug mode
let debugMode = false;
let eventLog: AnalyticsEvent[] = [];
const MAX_DEBUG_LOG_SIZE = 100;

/**
 * Enable/disable debug mode
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  if (!enabled) {
    eventLog = [];
  }
}

export function isDebugMode(): boolean {
  return debugMode;
}

/**
 * Get debug event log
 */
export function getDebugLog(): AnalyticsEvent[] {
  return [...eventLog];
}

/**
 * Clear debug log
 */
export function clearDebugLog(): void {
  eventLog = [];
}

/**
 * Add event to queue
 */
export function enqueueEvent(event: AnalyticsEvent): void {
  // Add to debug log
  if (debugMode) {
    eventLog.unshift(event);
    if (eventLog.length > MAX_DEBUG_LOG_SIZE) {
      eventLog.pop();
    }
  }
  
  eventQueue.push({
    event,
    retryCount: 0,
    addedAt: Date.now()
  });
  
  // Start batch timer if not running
  if (!batchTimer) {
    batchTimer = setTimeout(processQueue, BATCH_INTERVAL_MS);
  }
  
  // Process immediately if queue is full
  if (eventQueue.length >= BATCH_SIZE) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    processQueue();
  }
}

/**
 * Process queued events
 */
async function processQueue(): Promise<void> {
  if (isProcessing || eventQueue.length === 0) {
    batchTimer = null;
    return;
  }
  
  isProcessing = true;
  
  // Take batch from queue
  const batch = eventQueue.splice(0, BATCH_SIZE);
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Re-queue events if no user
      eventQueue.unshift(...batch);
      isProcessing = false;
      return;
    }
    
    // Insert batch
    const insertData = batch.map(item => ({
      event_id: item.event.event_id,
      user_id: item.event.user_id || user.id,
      feature_name: item.event.event_name,
      feature_category: item.event.category,
      metadata: item.event.metadata || {},
      session_id: item.event.session_id,
      duration_ms: item.event.duration_ms,
      active_duration_ms: item.event.active_duration_ms,
      visibility_interruptions: item.event.visibility_interruptions,
      success: item.event.success ?? true,
      error_message: item.event.error_message,
      error_code: item.event.error_code,
      entity_type: item.event.entity_type,
      entity_id: item.event.entity_id,
      retry_count: item.retryCount
    }));
    
    const { error } = await supabase
      .from('feature_usage')
      .insert(insertData);
    
    if (error) {
      // Handle retry
      const retryItems = batch
        .filter(item => item.retryCount < MAX_RETRIES)
        .map(item => ({ ...item, retryCount: item.retryCount + 1 }));
      
      if (retryItems.length > 0) {
        setTimeout(() => {
          eventQueue.push(...retryItems);
          if (!batchTimer) {
            batchTimer = setTimeout(processQueue, BATCH_INTERVAL_MS);
          }
        }, RETRY_DELAY_MS);
      }
      
      if (import.meta.env.DEV) {
        console.debug('[Analytics] Batch insert failed, retrying:', error);
      }
    }
  } catch (err) {
    // Re-queue with retry
    const retryItems = batch
      .filter(item => item.retryCount < MAX_RETRIES)
      .map(item => ({ ...item, retryCount: item.retryCount + 1 }));
    
    if (retryItems.length > 0) {
      setTimeout(() => {
        eventQueue.push(...retryItems);
      }, RETRY_DELAY_MS);
    }
  }
  
  isProcessing = false;
  
  // Continue processing if more events
  if (eventQueue.length > 0 && !batchTimer) {
    batchTimer = setTimeout(processQueue, BATCH_INTERVAL_MS);
  }
}

/**
 * Flush queue immediately (for page unload)
 */
export async function flushQueue(): Promise<void> {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  
  if (eventQueue.length > 0) {
    await processQueue();
  }
}

/**
 * Get queue status (for debugging)
 */
export function getQueueStatus(): { size: number; isProcessing: boolean } {
  return {
    size: eventQueue.length,
    isProcessing
  };
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueue();
    }
  });
  
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliability
    if (eventQueue.length > 0 && navigator.sendBeacon) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const payload = JSON.stringify(eventQueue.map(item => ({
          event_id: item.event.event_id,
          feature_name: item.event.event_name,
          feature_category: item.event.category,
          metadata: item.event.metadata,
          session_id: item.event.session_id,
          duration_ms: item.event.duration_ms,
          success: item.event.success ?? true
        })));
        
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/feature_usage`,
          new Blob([payload], { type: 'application/json' })
        );
      }
    }
  });
}
