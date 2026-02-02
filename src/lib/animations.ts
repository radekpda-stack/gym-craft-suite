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

// ================================================
// PREMIUM ANIMATION PRESETS - Whoop/Apple inspired
// Subtle, purposeful animations (y: 4px not 20px)
// ================================================

// Subtle bezier curve - Apple style (typed as tuple)
export const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// Common Framer Motion animation variants - SUBTLE
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};

// Micro-scale for touch feedback
export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.1 },
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15 },
};

// NEW: Enhanced touch and hover presets
export const touchFeedback = {
  whileTap: { scale: 0.97, opacity: 0.9 },
  transition: { duration: 0.1 },
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: 0.2, ease: appleEase },
};

export const buttonPress = {
  whileTap: { scale: 0.98, opacity: 0.9 },
  transition: { duration: 0.1 },
};

export const cardInteraction = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: { duration: 0.2, ease: appleEase },
};

// Spring transition presets - Refined
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

// Premium easing transition (non-spring)
export const premiumTransition = {
  duration: 0.15,
  ease: appleEase,
};

export const slowPremiumTransition = {
  duration: 0.3,
  ease: appleEase,
};

// Stagger children animation - Faster
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const staggerContainerSlow = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
};

// List item animation for performance
export const listItemVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: premiumTransition,
  },
  exit: { 
    opacity: 0, 
    y: -4,
    transition: { duration: 0.1 },
  },
};

// Card hover effect
export const cardHover = {
  initial: {},
  whileHover: {
    y: -2,
    transition: { duration: 0.2, ease: appleEase },
  },
};

// Pulse animation for live indicators
export const pulseVariants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Breathing animation for icons
export const breathingVariants = {
  animate: {
    scale: [1, 1.03, 1],
    opacity: [0.7, 0.9, 0.7],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Glow pulse for alerts/notifications
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(var(--primary), 0)',
      '0 0 0 8px rgba(var(--primary), 0.1)',
      '0 0 0 0 rgba(var(--primary), 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
