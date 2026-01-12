/**
 * Confetti utilities for celebrations
 * Centralized confetti effects for consistent animations
 */

import confetti from 'canvas-confetti';

export type ConfettiPreset = 'pr' | 'levelUp' | 'badge' | 'streak' | 'success' | 'celebration';

const presets: Record<ConfettiPreset, () => void> = {
  pr: () => {
    // Personal record - green/teal burst
    const colors = ['#10b981', '#14b8a6', '#2dd4bf', '#34d399'];
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      startVelocity: 30,
    });
  },

  levelUp: () => {
    // Level up - gold explosion
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  },

  badge: () => {
    // Badge earned - purple/pink burst
    const colors = ['#a855f7', '#ec4899', '#d946ef', '#c084fc'];
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      shapes: ['star', 'circle'],
      scalar: 1.2,
    });
  },

  streak: () => {
    // Streak - orange/red fire effect
    const colors = ['#f97316', '#ef4444', '#fb923c', '#fbbf24'];
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors,
      gravity: 0.8,
      startVelocity: 25,
    });
  },

  success: () => {
    // General success - primary color burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['hsl(var(--primary))', '#10b981', '#3b82f6'],
    });
  },

  celebration: () => {
    // Big celebration - multi-color extravaganza
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  },
};

/**
 * Fire a preset confetti animation
 */
export function fireConfetti(preset: ConfettiPreset = 'success'): void {
  presets[preset]();
}

/**
 * Fire confetti from a specific element
 */
export function fireConfettiFromElement(
  element: HTMLElement,
  options?: Partial<confetti.Options>
): void {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 30,
    spread: 60,
    origin: { x, y },
    startVelocity: 20,
    gravity: 0.8,
    ...options,
  });
}

/**
 * Fire custom confetti
 */
export function fireCustomConfetti(options: confetti.Options): void {
  confetti(options);
}

/**
 * Clear all confetti
 */
export function clearConfetti(): void {
  confetti.reset();
}
