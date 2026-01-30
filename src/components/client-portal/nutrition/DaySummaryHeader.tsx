import { format, isToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Utensils, 
  Droplets, 
  Coffee, 
  CheckCircle2,
  MessageSquare,
  Reply,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface DaySummaryHeaderProps {
  date: Date;
  mealCount: number;
  waterMl: number;
  waterGoalMl?: number;
  coffeeCount: number;
  isChecked?: boolean;
  trainerDayNote?: string | null;
  onReply?: (reply: string) => Promise<void>;
}

export function DaySummaryHeader({ 
  date,
  mealCount,
  waterMl,
  waterGoalMl = 2500,
  coffeeCount,
  isChecked,
  trainerDayNote,
  onReply,
}: DaySummaryHeaderProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isSelectedToday = isToday(date);
  const waterPercent = Math.min((waterMl / waterGoalMl) * 100, 100);
  
  const handleReplySubmit = async () => {
    if (!replyText.trim() || !onReply) return;
    
    setIsSubmitting(true);
    haptic('medium');
    try {
      await onReply(replyText.trim());
      setReplyText('');
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isSelectedToday ? 'Dnešek' : format(date, 'EEEE', { locale: cs })}
          <span className="text-muted-foreground font-normal ml-2">
            {format(date, 'd. MMMM', { locale: cs })}
          </span>
        </h2>
        {isChecked && (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="w-4 h-4" />
            Zkontrolováno
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Meals */}
        <div className="rounded-xl bg-warning/5 border border-warning/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Utensils className="w-4 h-4 text-warning" />
            <span className="text-lg font-bold">{mealCount}</span>
          </div>
          <span className="text-xs text-muted-foreground">jídel</span>
        </div>

        {/* Water with progress */}
        <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-3 text-center col-span-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Droplets className="w-4 h-4 text-sky-500" />
            <span className="text-lg font-bold">
              {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
            </span>
            <span className="text-xs text-muted-foreground">
              / {waterGoalMl / 1000}L
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-sky-500/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${waterPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                "h-full rounded-full",
                waterPercent >= 100 ? "bg-success" : "bg-sky-500"
              )}
            />
          </div>
        </div>

        {/* Coffee */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Coffee className="w-4 h-4 text-amber-600" />
            <span className="text-lg font-bold">{coffeeCount}</span>
          </div>
          <span className="text-xs text-muted-foreground">káv</span>
        </div>
      </div>

      {/* Trainer Day Note */}
      {trainerDayNote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Komentář od trenéra k tomuto dni
            </span>
          </div>
          <p className="text-sm leading-relaxed">{trainerDayNote}</p>
          
          {onReply && !isReplying && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => {
                haptic('light');
                setIsReplying(true);
              }}
            >
              <Reply className="w-3.5 h-3.5 mr-1.5" />
              Odpovědět
            </Button>
          )}

          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 space-y-2"
            >
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Napište odpověď..."
                className="min-h-[60px] text-sm bg-background/50"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                >
                  Zrušit
                </Button>
                <Button
                  size="sm"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim() || isSubmitting}
                >
                  Odeslat
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
