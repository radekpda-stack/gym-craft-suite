/**
 * Haptic feedback utilities for mobile devices
 * Provides consistent vibration patterns across the app
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 30,
  heavy: 50,
  success: [30, 50, 30],
  warning: [50, 30, 50],
  error: [100, 50, 100],
  selection: 5,
};

/**
 * Trigger haptic feedback if available
 * Falls back silently on unsupported devices
 */
export function haptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Silently fail on unsupported devices
    }
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Custom haptic pattern
 */
export function hapticCustom(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail
    }
  }
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // Silently fail
    }
  }
}
