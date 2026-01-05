import { AnimatePresence } from 'framer-motion';
import { useSmartCelebrations } from '@/contexts/SmartCelebrationContext';
import { CelebrationToast } from './CelebrationToast';

export function CelebrationToastContainer() {
  const { currentCelebration, dismissCurrent, mode } = useSmartCelebrations();

  // Don't render in fullscreen mode - that's handled by the overlay
  if (mode === 'fullscreen') return null;

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="wait">
          {currentCelebration && (
            <CelebrationToast
              key={currentCelebration.id}
              celebration={currentCelebration}
              onDismiss={dismissCurrent}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
