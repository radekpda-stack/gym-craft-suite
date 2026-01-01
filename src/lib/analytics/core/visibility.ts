/**
 * Page Visibility Tracking
 * 
 * Tracks active vs inactive time based on page visibility.
 * Essential for accurate duration measurements.
 */

import type { PageViewState } from './types';

// Maximum duration cap (30 minutes)
const MAX_PAGE_DURATION_MS = 30 * 60 * 1000;

let currentPageView: PageViewState | null = null;
let visibilityHandler: (() => void) | null = null;

/**
 * Start tracking a new page view
 */
export function startPageTracking(pageName: string): PageViewState {
  // End previous tracking if exists
  if (currentPageView) {
    endPageTracking();
  }
  
  const now = Date.now();
  currentPageView = {
    pageName,
    startTime: now,
    activeTime: 0,
    lastActiveTime: now,
    visibilityInterruptions: 0,
    isActive: document.visibilityState === 'visible'
  };
  
  // Setup visibility listener
  if (!visibilityHandler) {
    visibilityHandler = handleVisibilityChange;
    document.addEventListener('visibilitychange', visibilityHandler);
  }
  
  return currentPageView;
}

/**
 * Handle visibility changes
 */
function handleVisibilityChange(): void {
  if (!currentPageView) return;
  
  const now = Date.now();
  
  if (document.visibilityState === 'hidden') {
    // Page going to background - accumulate active time
    if (currentPageView.isActive) {
      currentPageView.activeTime += now - currentPageView.lastActiveTime;
    }
    currentPageView.isActive = false;
    currentPageView.visibilityInterruptions++;
  } else if (document.visibilityState === 'visible') {
    // Page coming back to foreground
    currentPageView.isActive = true;
    currentPageView.lastActiveTime = now;
  }
}

/**
 * Get current page view state
 */
export function getCurrentPageState(): PageViewState | null {
  if (!currentPageView) return null;
  
  // Calculate current active time if page is active
  const now = Date.now();
  let activeTime = currentPageView.activeTime;
  
  if (currentPageView.isActive) {
    activeTime += now - currentPageView.lastActiveTime;
  }
  
  // Apply cap
  activeTime = Math.min(activeTime, MAX_PAGE_DURATION_MS);
  
  return {
    ...currentPageView,
    activeTime
  };
}

/**
 * End page tracking and return final state
 */
export function endPageTracking(): PageViewState | null {
  if (!currentPageView) return null;
  
  const finalState = getCurrentPageState();
  currentPageView = null;
  
  return finalState;
}

/**
 * Get total duration since page start (for comparison)
 */
export function getTotalDuration(): number {
  if (!currentPageView) return 0;
  return Math.min(Date.now() - currentPageView.startTime, MAX_PAGE_DURATION_MS);
}

/**
 * Check if tracking is active
 */
export function isTrackingActive(): boolean {
  return currentPageView !== null;
}

/**
 * Get current page name
 */
export function getCurrentPageName(): string | null {
  return currentPageView?.pageName || null;
}

// Cleanup on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
  });
}
