/**
 * Animation utilities barrel export
 * 
 * This module provides centralized animation and feedback utilities:
 * - Haptic feedback for mobile devices
 * - Confetti effects for celebrations
 * - Framer Motion presets
 */

// Haptic feedback
export { haptic, hapticCustom, hapticStop, isHapticSupported } from './haptics';

// Confetti effects
export { 
  fireConfetti, 
  fireConfettiFromElement, 
  fireCustomConfetti, 
  clearConfetti,
  type ConfettiPreset 
} from './confetti';

// Common Framer Motion animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Spring transition presets
export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const bouncyTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 17,
};

export const smoothTransition = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
};

// Stagger children animation
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};
