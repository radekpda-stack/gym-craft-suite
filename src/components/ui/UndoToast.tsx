import { useUndo } from '@/contexts/UndoContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function UndoToast() {
  const { currentAction, executeUndo, dismissUndo, isExecuting } = useUndo();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!currentAction) {
      setTimeLeft(5);
      return;
    }

    // Calculate initial time left
    const remaining = Math.max(0, Math.ceil((currentAction.expiresAt - Date.now()) / 1000));
    setTimeLeft(remaining);

    // Update countdown every second
    const interval = setInterval(() => {
      const newRemaining = Math.max(0, Math.ceil((currentAction.expiresAt - Date.now()) / 1000));
      setTimeLeft(newRemaining);
      
      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentAction]);

  return (
    <AnimatePresence>
      {currentAction && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="liquid-glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
            {/* Progress ring */}
            <div className="relative flex-shrink-0 w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={100.53}
                  strokeDashoffset={100.53 * (1 - timeLeft / 5)}
                  className="transition-all duration-100"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground">
                {timeLeft}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {currentAction.label}
              </p>
              {currentAction.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentAction.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={executeUndo}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Undo2 className="w-4 h-4" />
                )}
                Zpět
              </button>
              <button
                onClick={dismissUndo}
                disabled={isExecuting}
                className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
