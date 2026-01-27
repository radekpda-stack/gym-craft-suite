import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, Star, PartyPopper } from 'lucide-react';

interface RxPRCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  workoutName: string;
  newScore: string;
  previousScore?: string;
  improvementLabel?: string;
}

export function RxPRCelebration({
  open,
  onOpenChange,
  clientName,
  workoutName,
  newScore,
  previousScore,
  improvementLabel,
}: RxPRCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Trigger confetti
      import('canvas-confetti').then((confetti) => {
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32'];

        (function frame() {
          confetti.default({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
          confetti.default({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-2 -right-2"
                >
                  <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="absolute -bottom-1 -left-2"
                >
                  <Flame className="h-8 w-8 text-orange-500" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <DialogTitle className="text-2xl flex items-center gap-2 justify-center">
            <PartyPopper className="h-6 w-6" />
            NOVÉ OSOBNÍ MAXIMUM!
            <PartyPopper className="h-6 w-6 scale-x-[-1]" />
          </DialogTitle>
          
          <DialogDescription className="text-center space-y-2 pt-2">
            <p className="text-lg font-semibold text-foreground">
              {clientName}
            </p>
            <p className="text-muted-foreground">
              právě překonal/a své PR na
            </p>
            <p className="text-lg font-semibold text-foreground">
              {workoutName}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl p-6 border border-yellow-500/20">
            <p className="text-4xl font-bold text-primary">
              {newScore}
            </p>
            {previousScore && (
              <p className="text-sm text-muted-foreground mt-2">
                Předchozí: {previousScore}
              </p>
            )}
          </div>
          
          {improvementLabel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-green-500 font-semibold"
            >
              <Flame className="h-5 w-5" />
              {improvementLabel}
            </motion.div>
          )}
        </div>

        <DialogFooter className="justify-center">
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            Super! 🎉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
