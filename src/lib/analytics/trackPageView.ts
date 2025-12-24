import { trackEvent, updateReferrerRoute, getReferrerRoute } from './trackEvent';

// Store page view start times
let currentPageStart: number | null = null;
let currentPageName: string | null = null;

/**
 * Track a page view with automatic duration measurement
 */
export async function trackPageView(pageName: string): Promise<void> {
  const now = Date.now();
  const currentRoute = window.location.pathname;

  // End previous page view if exists
  if (currentPageStart && currentPageName) {
    const duration = now - currentPageStart;
    
    // Only track duration if it's meaningful (> 500ms)
    if (duration > 500) {
      await trackEvent(`page_view_end_${currentPageName}`, 'navigation', {
        metadata: {
          page_name: currentPageName,
        },
        duration_ms: duration,
        debounceMs: 0 // No debounce for page end
      });
    }
  }

  // Update referrer before tracking new page
  if (currentPageName) {
    updateReferrerRoute(window.location.pathname);
  }

  // Track new page view
  await trackEvent(`page_view_${pageName}`, 'navigation', {
    metadata: {
      page_name: pageName,
      referrer_route: getReferrerRoute(),
    }
  });

  // Update current page tracking
  currentPageStart = now;
  currentPageName = pageName;
}

/**
 * Get page name from route path
 */
export function getPageNameFromRoute(pathname: string): string {
  // Remove leading slash and split
  const parts = pathname.slice(1).split('/');
  
  // Route mapping
  const routeMap: Record<string, string> = {
    '': 'dashboard',
    'clients': 'clients',
    'calendar': 'calendar',
    'trainings': 'trainings',
    'exercises': 'exercises',
    'plans': 'plans',
    'finance': 'finance',
    'sales': 'sales',
    'feedback': 'feedback',
    'settings': 'settings',
    'demo': 'demo',
    'login': 'login',
    'signup': 'signup',
  };

  // Check for dynamic routes
  if (parts[0] === 'client' && parts[1]) {
    return 'client_detail';
  }
  if (parts[0] === 'training' && parts[1]) {
    return 'training_detail';
  }
  if (parts[0] === 'feedback' && parts[1]) {
    return 'feedback_form';
  }

  // Use mapped name or first part
  return routeMap[parts[0]] || parts[0] || 'unknown';
}

/**
 * End current page view (call on unmount/navigation)
 */
export function endCurrentPageView(): void {
  if (currentPageStart && currentPageName) {
    const duration = Date.now() - currentPageStart;
    
    if (duration > 500) {
      // Fire and forget - don't await
      trackEvent(`page_view_end_${currentPageName}`, 'navigation', {
        metadata: {
          page_name: currentPageName,
        },
        duration_ms: duration,
        debounceMs: 0
      }).catch(() => {});
    }
  }

  currentPageStart = null;
  currentPageName = null;
}
