import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface LevelUpCelebrationProps {
  show: boolean;
  newLevel: number;
  levelName: string;
  onComplete?: () => void;
}

export function LevelUpCelebration({ show, newLevel, levelName, onComplete }: LevelUpCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();
      
      // Auto-complete after animation
      const timeout = setTimeout(() => {
        onComplete?.();
      }, duration + 500);
      
      return () => clearTimeout(timeout);
    }
  }, [show, onComplete]);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center p-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-8xl mb-4"
            >
              🎉
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold mb-2"
            >
              Level Up!
            </motion.h2>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-1"
            >
              <p className="text-5xl font-bold text-primary">{newLevel}</p>
              <p className="text-xl text-muted-foreground">{levelName}</p>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-muted-foreground mt-6"
            >
              Klikni pro pokračování
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BadgeEarnedCelebrationProps {
  show: boolean;
  badgeName: string;
  badgeIcon: string;
  onComplete?: () => void;
}

export function BadgeEarnedCelebration({ show, badgeName, badgeIcon, onComplete }: BadgeEarnedCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Fire confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9333EA', '#A855F7', '#C084FC'],
      });
      
      // Auto-complete after animation
      const timeout = setTimeout(() => {
        onComplete?.();
      }, 4000);
      
      return () => clearTimeout(timeout);
    }
  }, [show, onComplete]);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center p-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }}
              transition={{ 
                duration: 1,
                repeat: 2,
                repeatType: 'reverse',
              }}
              className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-purple-500/20 flex items-center justify-center text-5xl"
            >
              {badgeIcon}
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mb-2"
            >
              Nový odznak!
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-primary font-medium"
            >
              {badgeName}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-muted-foreground mt-6"
            >
              Klikni pro pokračování
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
