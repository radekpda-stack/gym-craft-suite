import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { Zap, Trophy, Award, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLevelName } from '@/hooks/useClientXPLevel';

interface CelebrationOverlayProps {
  type: 'level-up' | 'badge' | 'pr' | 'streak';
  data: {
    level?: number;
    badgeName?: string;
    badgeIcon?: string;
    badgeRarity?: string;
    xpBonus?: number;
    prName?: string;
    prValue?: string;
    streakWeeks?: number;
  };
  onClose: () => void;
}

// Confetti particle component
function Confetti() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: 0,
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationOverlay({ type, data, onClose }: CelebrationOverlayProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    switch (type) {
      case 'level-up':
        return (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="w-24 h-24 mx-auto rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center"
            >
              <span className="text-4xl font-bold text-primary">{data.level}</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold">Level Up!</h2>
              <p className="text-xl text-primary mt-2">{getLevelName(data.level || 1)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-muted-foreground"
            >
              <Zap className="w-5 h-5 text-primary" />
              <span>Pokračuj v tréninku pro další level!</span>
            </motion.div>
          </div>
        );

      case 'badge':
        return (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="w-24 h-24 mx-auto rounded-full bg-warning/20 border-4 border-warning flex items-center justify-center"
            >
              <span className="text-4xl">{data.badgeIcon || '🏆'}</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold">Nový odznak!</h2>
              <p className="text-xl text-warning mt-2">{data.badgeName}</p>
              {data.badgeRarity && (
                <p className="text-sm text-muted-foreground capitalize">{data.badgeRarity}</p>
              )}
            </motion.div>
            {data.xpBonus && data.xpBonus > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary">+{data.xpBonus} XP</span>
              </motion.div>
            )}
          </div>
        );

      case 'pr':
        return (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 mx-auto rounded-full bg-warning/20 border-4 border-warning flex items-center justify-center"
            >
              <Trophy className="w-12 h-12 text-warning" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold">Nový rekord! 🎉</h2>
              <p className="text-xl text-warning mt-2">{data.prName}</p>
              <p className="text-2xl font-bold mt-1">{data.prValue}</p>
            </motion.div>
            {data.xpBonus && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary">+{data.xpBonus} XP</span>
              </motion.div>
            )}
          </div>
        );

      case 'streak':
        return (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="w-24 h-24 mx-auto rounded-full bg-warning/20 border-4 border-warning flex items-center justify-center"
            >
              <Flame className="w-12 h-12 text-warning" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold">Série! 🔥</h2>
              <p className="text-xl text-warning mt-2">
                {data.streakWeeks} {data.streakWeeks === 1 ? 'týden' : data.streakWeeks && data.streakWeeks >= 2 && data.streakWeeks <= 4 ? 'týdny' : 'týdnů'} v řadě
              </p>
            </motion.div>
            {data.xpBonus && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
              >
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary">+{data.xpBonus} XP</span>
              </motion.div>
            )}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        {showConfetti && <Confetti />}
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 150 }}
          className="relative bg-card border rounded-2xl p-8 max-w-sm mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <Button onClick={onClose} className="w-full" size="lg">
              Pokračovat
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage celebrations
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    type: 'level-up' | 'badge' | 'pr' | 'streak';
    data: CelebrationOverlayProps['data'];
  } | null>(null);

  const showLevelUp = useCallback((level: number) => {
    setCelebration({ type: 'level-up', data: { level } });
  }, []);

  const showBadge = useCallback((badgeName: string, badgeIcon?: string, badgeRarity?: string, xpBonus?: number) => {
    setCelebration({ type: 'badge', data: { badgeName, badgeIcon, badgeRarity, xpBonus } });
  }, []);

  const showPR = useCallback((prName: string, prValue: string, xpBonus?: number) => {
    setCelebration({ type: 'pr', data: { prName, prValue, xpBonus } });
  }, []);

  const showStreak = useCallback((streakWeeks: number, xpBonus?: number) => {
    setCelebration({ type: 'streak', data: { streakWeeks, xpBonus } });
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return {
    celebration,
    showLevelUp,
    showBadge,
    showPR,
    showStreak,
    closeCelebration,
  };
}
