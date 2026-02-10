import { Bell, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function NotificationEmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success/15 to-success/5 flex items-center justify-center">
          <Bell className="w-9 h-9 text-success/60" />
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30"
        >
          <CheckCircle2 className="w-4.5 h-4.5 text-success-foreground" />
        </motion.div>
      </div>

      <h3 className="text-lg font-bold text-foreground mb-1">
        Vše vyřízeno!
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[240px] leading-relaxed">
        Žádné nové notifikace. Skvělá práce! 🎉
      </p>

      <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground/60">
        <div className="w-8 h-px bg-border" />
        <span>Notifikace se zobrazí automaticky</span>
        <div className="w-8 h-px bg-border" />
      </div>
    </motion.div>
  );
}
