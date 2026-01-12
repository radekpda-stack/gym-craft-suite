import { useState, useCallback, useRef, useEffect } from 'react';

type TransitionState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

interface UseAnimatedTransitionOptions {
  enterDuration?: number;
  exitDuration?: number;
  onEnter?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExited?: () => void;
}

/**
 * Hook for managing animated transitions between states
 * Useful for replacing spinners with skeletons and content fade-ins
 */
export function useAnimatedTransition(
  isVisible: boolean,
  options: UseAnimatedTransitionOptions = {}
) {
  const {
    enterDuration = 300,
    exitDuration = 200,
    onEnter,
    onEntered,
    onExit,
    onExited,
  } = options;

  const [state, setState] = useState<TransitionState>(
    isVisible ? 'entered' : 'exited'
  );
  const timeoutRef = useRef<number | null>(null);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimeout();

    if (isVisible && (state === 'exited' || state === 'exiting')) {
      setState('entering');
      onEnter?.();
      
      timeoutRef.current = window.setTimeout(() => {
        setState('entered');
        onEntered?.();
      }, enterDuration);
    } else if (!isVisible && (state === 'entered' || state === 'entering')) {
      setState('exiting');
      onExit?.();
      
      timeoutRef.current = window.setTimeout(() => {
        setState('exited');
        onExited?.();
      }, exitDuration);
    }

    return clearTimeout;
  }, [isVisible, enterDuration, exitDuration, onEnter, onEntered, onExit, onExited, clearTimeout, state]);

  return {
    state,
    isEntering: state === 'entering',
    isEntered: state === 'entered',
    isExiting: state === 'exiting',
    isExited: state === 'exited',
    shouldRender: state !== 'exited',
    shouldShow: state === 'entering' || state === 'entered',
  };
}

/**
 * Hook for skeleton-to-content transitions
 */
export function useSkeletonTransition(isLoading: boolean) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [showContent, setShowContent] = useState(!isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      setShowSkeleton(true);
    } else {
      // Delay content show slightly for smooth transition
      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setShowContent(true);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return {
    showSkeleton,
    showContent,
    contentClassName: showContent ? 'skeleton-fade-in' : '',
  };
}
