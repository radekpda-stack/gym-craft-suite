/**
 * InteractionTracker - Comprehensive interaction tracking component
 * 
 * Tracks: clicks, scroll depth, rage clicks, hover, focus/blur
 * Wrap your app with this component to enable automatic tracking.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '../SessionManager';

interface ClickRecord {
  timestamp: number;
  x: number;
  y: number;
}

interface InteractionTrackerProps {
  children: React.ReactNode;
  enabled?: boolean;
  trackClicks?: boolean;
  trackScroll?: boolean;
  trackRageClicks?: boolean;
  trackHover?: boolean;
  trackFocus?: boolean;
  rageClickThreshold?: number; // clicks within timespan
  rageClickTimespan?: number;  // ms
  hoverThreshold?: number;     // ms to count as significant hover
  scrollSampleRate?: number;   // ms between scroll samples
}

// Get element info for tracking
function getElementInfo(element: HTMLElement) {
  const trackId = element.getAttribute('data-track-id') || element.id || null;
  const trackCategory = element.getAttribute('data-track-category') || null;
  
  // Determine element type
  let elementType = element.tagName.toLowerCase();
  if (element.getAttribute('role')) {
    elementType = element.getAttribute('role') || elementType;
  }
  if (element.classList.contains('btn') || element.tagName === 'BUTTON') {
    elementType = 'button';
  }
  if (element.tagName === 'A') {
    elementType = 'link';
  }
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    elementType = 'input';
  }

  // Get text content (truncated)
  let text = element.textContent?.trim().slice(0, 100) || null;
  if (element.tagName === 'INPUT') {
    text = (element as HTMLInputElement).placeholder || null;
  }

  // Build CSS path
  const path = buildCSSPath(element);

  return {
    elementType,
    elementId: trackId,
    elementText: text,
    elementPath: path,
    trackCategory,
  };
}

function buildCSSPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body && parts.length < 5) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c && !c.startsWith('__')).slice(0, 2);
      if (classes.length) {
        selector += `.${classes.join('.')}`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  
  return parts.join(' > ');
}

export function InteractionTracker({
  children,
  enabled = true,
  trackClicks = true,
  trackScroll = true,
  trackRageClicks = true,
  trackHover = true,
  trackFocus = true,
  rageClickThreshold = 3,
  rageClickTimespan = 500,
  hoverThreshold = 2000,
  scrollSampleRate = 1000,
}: InteractionTrackerProps) {
  const location = useLocation();
  const pageLoadTime = useRef(Date.now());
  const recentClicks = useRef<ClickRecord[]>([]);
  const scrollState = useRef({
    maxPercent: 0,
    scrollCount: 0,
    scrollUpCount: 0,
    lastScrollY: 0,
    milestones: { 25: 0, 50: 0, 75: 0, 100: 0 } as Record<number, number>,
  });
  const hoverTimers = useRef<Map<HTMLElement, NodeJS.Timeout>>(new Map());
  const lastScrollSave = useRef(0);
  const userId = useRef<string | null>(null);

  // Reset on route change
  useEffect(() => {
    pageLoadTime.current = Date.now();
    scrollState.current = {
      maxPercent: 0,
      scrollCount: 0,
      scrollUpCount: 0,
      lastScrollY: 0,
      milestones: { 25: 0, 50: 0, 75: 0, 100: 0 },
    };
    recentClicks.current = [];
  }, [location.pathname]);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userId.current = data.user?.id || null;
    });
  }, []);

  // Save interaction event
  const saveInteraction = useCallback(async (
    eventType: string,
    element: HTMLElement | null,
    position?: { x: number; y: number },
    metadata?: Record<string, any>
  ) => {
    if (!enabled || !userId.current) return;

    const info = element ? getElementInfo(element) : null;
    
    try {
      await supabase.from('interaction_events').insert({
        user_id: userId.current,
        session_id: sessionManager.getSessionId(),
        event_type: eventType,
        element_type: info?.elementType,
        element_id: info?.elementId,
        element_text: info?.elementText,
        element_path: info?.elementPath,
        x_position: position?.x,
        y_position: position?.y,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        route: location.pathname,
        route_params: Object.fromEntries(new URLSearchParams(location.search)),
        time_on_page_ms: Date.now() - pageLoadTime.current,
        metadata: {
          ...metadata,
          trackCategory: info?.trackCategory,
        },
      });
    } catch (error) {
      console.error('Failed to save interaction:', error);
    }
  }, [enabled, location.pathname, location.search]);

  // Save rage click
  const saveRageClick = useCallback(async (
    element: HTMLElement,
    clickCount: number,
    timeSpan: number,
    position: { x: number; y: number }
  ) => {
    if (!enabled || !userId.current) return;

    const info = getElementInfo(element);
    
    try {
      const insertData = {
        user_id: userId.current,
        session_id: sessionManager.getSessionId(),
        route: location.pathname,
        element_type: info.elementType,
        element_id: info.elementId,
        element_text: info.elementText,
        element_path: info.elementPath,
        click_count: clickCount,
        time_span_ms: timeSpan,
        x_position: position.x,
        y_position: position.y,
        previous_actions: JSON.parse(JSON.stringify(recentClicks.current.slice(-5))),
      };
      await (supabase.from('rage_clicks') as any).insert(insertData);
    } catch (error) {
      console.error('Failed to save rage click:', error);
    }
  }, [enabled, location.pathname]);

  // Save scroll analytics
  const saveScrollAnalytics = useCallback(async () => {
    if (!enabled || !userId.current) return;
    
    const state = scrollState.current;
    if (state.maxPercent === 0) return;

    try {
      await supabase.from('scroll_analytics').insert({
        user_id: userId.current,
        session_id: sessionManager.getSessionId(),
        route: location.pathname,
        max_scroll_percent: state.maxPercent,
        scroll_count: state.scrollCount,
        scroll_up_count: state.scrollUpCount,
        time_to_25_percent_ms: state.milestones[25] || null,
        time_to_50_percent_ms: state.milestones[50] || null,
        time_to_75_percent_ms: state.milestones[75] || null,
        time_to_100_percent_ms: state.milestones[100] || null,
        content_height: document.documentElement.scrollHeight,
        viewport_height: window.innerHeight,
      });
    } catch (error) {
      console.error('Failed to save scroll analytics:', error);
    }
  }, [enabled, location.pathname]);

  // Click handler
  useEffect(() => {
    if (!enabled || !trackClicks) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('button, a, [role="button"], [data-track-id], input, select, textarea');
      
      if (!clickable) return;

      const position = { x: e.clientX, y: e.clientY };
      const now = Date.now();

      // Track for rage click detection
      recentClicks.current.push({ timestamp: now, ...position });
      recentClicks.current = recentClicks.current.filter(c => now - c.timestamp < rageClickTimespan * 2);

      // Check for rage clicks
      if (trackRageClicks) {
        const recentInTimespan = recentClicks.current.filter(c => now - c.timestamp < rageClickTimespan);
        if (recentInTimespan.length >= rageClickThreshold) {
          saveRageClick(clickable as HTMLElement, recentInTimespan.length, rageClickTimespan, position);
        }
      }

      // Save click
      saveInteraction('click', clickable as HTMLElement, position);
    };

    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [enabled, trackClicks, trackRageClicks, rageClickThreshold, rageClickTimespan, saveInteraction, saveRageClick]);

  // Scroll handler
  useEffect(() => {
    if (!enabled || !trackScroll) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0;
      const timeOnPage = Date.now() - pageLoadTime.current;

      // Update state
      scrollState.current.scrollCount++;
      
      if (scrollY < scrollState.current.lastScrollY) {
        scrollState.current.scrollUpCount++;
      }
      scrollState.current.lastScrollY = scrollY;

      if (percent > scrollState.current.maxPercent) {
        scrollState.current.maxPercent = percent;

        // Record milestones
        [25, 50, 75, 100].forEach(milestone => {
          if (percent >= milestone && !scrollState.current.milestones[milestone]) {
            scrollState.current.milestones[milestone] = timeOnPage;
          }
        });
      }

      // Periodically save
      const now = Date.now();
      if (now - lastScrollSave.current > scrollSampleRate) {
        lastScrollSave.current = now;
        // Don't await, fire and forget
        saveScrollAnalytics();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Save final scroll state on unmount
      saveScrollAnalytics();
    };
  }, [enabled, trackScroll, scrollSampleRate, saveScrollAnalytics]);

  // Hover handler
  useEffect(() => {
    if (!enabled || !trackHover) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const hoverable = target.closest('[data-track-hover], [data-track-id]');
      
      if (!hoverable || hoverTimers.current.has(hoverable as HTMLElement)) return;

      const timer = setTimeout(() => {
        saveInteraction('hover', hoverable as HTMLElement, {
          x: e.clientX,
          y: e.clientY,
        }, { hoverDuration: hoverThreshold });
        hoverTimers.current.delete(hoverable as HTMLElement);
      }, hoverThreshold);

      hoverTimers.current.set(hoverable as HTMLElement, timer);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const hoverable = target.closest('[data-track-hover], [data-track-id]');
      
      if (hoverable && hoverTimers.current.has(hoverable as HTMLElement)) {
        clearTimeout(hoverTimers.current.get(hoverable as HTMLElement));
        hoverTimers.current.delete(hoverable as HTMLElement);
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, { passive: true, capture: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, { capture: true });
      document.removeEventListener('mouseleave', handleMouseLeave, { capture: true });
      hoverTimers.current.forEach(timer => clearTimeout(timer));
      hoverTimers.current.clear();
    };
  }, [enabled, trackHover, hoverThreshold, saveInteraction]);

  // Focus/blur handler
  useEffect(() => {
    if (!enabled || !trackFocus) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        saveInteraction('focus', target);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        saveInteraction('blur', target);
      }
    };

    document.addEventListener('focusin', handleFocus, { passive: true });
    document.addEventListener('focusout', handleBlur, { passive: true });
    
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [enabled, trackFocus, saveInteraction]);

  return <>{children}</>;
}
