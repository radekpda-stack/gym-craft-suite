import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Award, Target, Flame, Sparkles } from 'lucide-react';
import { CelebrationItem, CelebrationType } from '@/contexts/SmartCelebrationContext';
import { getBadgeIcon } from '@/hooks/useBadgeNotifications';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface CelebrationToastProps {
  celebration: CelebrationItem;
  onDismiss: () => void;
}

const typeConfig: Record<CelebrationType, {
  icon: typeof TrendingUp;
  title: string;
  gradient: string;
  confettiColors: string[];
}> = {
  'level-up': {
    icon: TrendingUp,
    title: 'Level Up!',
    gradient: 'from-amber-500 to-yellow-400',
    confettiColors: ['#f59e0b', '#fbbf24', '#fcd34d'],
  },
  'badge': {
    icon: Award,
    title: 'Nový odznak!',
    gradient: 'from-purple-500 to-pink-500',
    confettiColors: ['#a855f7', '#ec4899', '#d946ef'],
  },
  'pr': {
    icon: Target,
    title: 'Osobní rekord!',
    gradient: 'from-emerald-500 to-teal-400',
    confettiColors: ['#10b981', '#14b8a6', '#2dd4bf'],
  },
  'streak': {
    icon: Flame,
    title: 'Streak!',
    gradient: 'from-orange-500 to-red-500',
    confettiColors: ['#f97316', '#ef4444', '#fb923c'],
  },
};

export function CelebrationToast({ celebration, onDismiss }: CelebrationToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);
  const config = typeConfig[celebration.type];
  const Icon = config.icon;

  // Fire confetti on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Small delay to let toast animate in
    const timer = setTimeout(() => {
      if (toastRef.current) {
        const rect = toastRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
          particleCount: 30,
          spread: 60,
          origin: { x, y },
          colors: config.confettiColors,
          startVelocity: 20,
          gravity: 0.8,
          scalar: 0.8,
          ticks: 100,
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [config.confettiColors]);

  const getDescription = () => {
    switch (celebration.type) {
      case 'level-up':
        return `Dosáhl/a jsi levelu ${celebration.data.level}!`;
      case 'badge':
        return celebration.data.badgeName || 'Získal/a jsi nový odznak!';
      case 'pr':
        return `${celebration.data.prName}: ${celebration.data.prValue}`;
      case 'streak':
        return `${celebration.data.streakWeeks} týdnů v řadě!`;
      default:
        return celebration.data.description || '';
    }
  };

  const getBadgeEmoji = () => {
    if (celebration.type === 'badge' && celebration.data.badgeIcon) {
      return getBadgeIcon(celebration.data.badgeIcon);
    }
    return null;
  };

  const getRarityClass = () => {
    if (celebration.type !== 'badge' || !celebration.data.badgeRarity) return '';
    
    switch (celebration.data.badgeRarity) {
      case 'legendary': return 'ring-2 ring-amber-400 shadow-amber-400/50';
      case 'epic': return 'ring-2 ring-purple-400 shadow-purple-400/50';
      case 'rare': return 'ring-2 ring-blue-400 shadow-blue-400/50';
      default: return '';
    }
  };

  return (
    <motion.div
      ref={toastRef}
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        "relative w-80 bg-card border rounded-xl shadow-xl overflow-hidden",
        getRarityClass()
      )}
    >
      {/* Gradient header */}
      <div className={cn(
        "h-1.5 w-full bg-gradient-to-r",
        config.gradient
      )} />

      {/* Sparkle decorations */}
      <motion.div
        className="absolute top-3 right-10 text-warning"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
          rotate: [0, 15, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Sparkles className="w-4 h-4" />
      </motion.div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
              config.gradient
            )}
          >
            {celebration.type === 'badge' && getBadgeEmoji() ? (
              <span className="text-2xl">{getBadgeEmoji()}</span>
            ) : (
              <Icon className="w-6 h-6" />
            )}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <motion.h4
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-bold text-foreground"
              >
                {config.title}
              </motion.h4>
              <button
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground mt-0.5"
            >
              {getDescription()}
            </motion.p>

            {/* XP Bonus */}
            {(celebration.data.xpBonus ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                +{celebration.data.xpBonus} XP
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <motion.div
        className="h-0.5 bg-primary/30"
        initial={{ scaleX: 1, transformOrigin: 'left' }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
}
