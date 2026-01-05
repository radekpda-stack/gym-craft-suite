import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartCelebrations } from '@/contexts/SmartCelebrationContext';
import { cn } from '@/lib/utils';

interface AvatarCelebrationProps {
  children: ReactNode;
  className?: string;
}

export function AvatarCelebration({ children, className }: AvatarCelebrationProps) {
  const { hasNewCelebrations, clearNewFlag, pendingCount, currentCelebration } = useSmartCelebrations();
  const [showRing, setShowRing] = useState(false);

  // Show ring effect when there's a new celebration
  useEffect(() => {
    if (currentCelebration || hasNewCelebrations) {
      setShowRing(true);
      
      // Hide ring after animation
      const timer = setTimeout(() => {
        setShowRing(false);
        clearNewFlag();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentCelebration, hasNewCelebrations, clearNewFlag]);

  const totalPending = pendingCount + (currentCelebration ? 1 : 0);

  return (
    <div className={cn("relative", className)}>
      {children}

      {/* Animated celebration ring */}
      <AnimatePresence>
        {showRing && (
          <>
            {/* Outer pulsing ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1.5],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
            />
            
            {/* Inner glowing ring */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: 1,
                opacity: [0, 1, 0.8, 1, 0.8]
              }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 2, repeat: 1 }}
              className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
            />

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  scale: 0,
                  x: 0,
                  y: 0,
                  opacity: 1
                }}
                animate={{ 
                  scale: [0, 1, 0],
                  x: Math.cos((i / 6) * Math.PI * 2) * 25,
                  y: Math.sin((i / 6) * Math.PI * 2) * 25,
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: 'easeOut'
                }}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"
                style={{ marginLeft: -3, marginTop: -3 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Badge counter for pending celebrations */}
      <AnimatePresence>
        {totalPending > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg pointer-events-none"
          >
            {totalPending > 9 ? '9+' : totalPending}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
