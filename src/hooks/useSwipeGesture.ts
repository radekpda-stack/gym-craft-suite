import { useState, useRef, useCallback } from 'react';

interface SwipeState {
  offsetX: number;
  isDragging: boolean;
  direction: 'left' | 'right' | null;
}

interface UseSwipeGestureOptions {
  threshold?: number; // pixels to trigger action
  maxOffset?: number; // max drag distance
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipeGesture({
  threshold = 80,
  maxOffset = 120,
  onSwipeLeft,
  onSwipeRight,
}: UseSwipeGestureOptions) {
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    isDragging: false,
    direction: null,
  });
  
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    isDragging.current = true;
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
    let deltaX = currentX.current - startX.current;
    
    // Clamp to max offset
    deltaX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    
    // Apply resistance at edges
    if (Math.abs(deltaX) > threshold) {
      const excess = Math.abs(deltaX) - threshold;
      const resistance = 0.3;
      deltaX = Math.sign(deltaX) * (threshold + excess * resistance);
    }
    
    setState({
      offsetX: deltaX,
      isDragging: true,
      direction: deltaX > 20 ? 'right' : deltaX < -20 ? 'left' : null,
    });
  }, [maxOffset, threshold]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    const deltaX = currentX.current - startX.current;
    
    if (deltaX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (deltaX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setState({
      offsetX: 0,
      isDragging: false,
      direction: null,
    });
  }, [threshold, onSwipeLeft, onSwipeRight]);

  const reset = useCallback(() => {
    setState({
      offsetX: 0,
      isDragging: false,
      direction: null,
    });
  }, []);

  return {
    offsetX: state.offsetX,
    isDragging: state.isDragging,
    direction: state.direction,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    reset,
  };
}
