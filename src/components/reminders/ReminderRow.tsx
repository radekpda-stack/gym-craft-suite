import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Clock, Trash2, Edit2 } from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ReminderRowProps {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export const ReminderRow = ({ reminder, onComplete, onEdit, onDelete }: ReminderRowProps) => {
  const isPastDue = isPast(new Date(reminder.remind_at)) && !reminder.is_completed;

  const formatRemindAt = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Dnes ${format(date, 'HH:mm')}`;
    }
    if (isTomorrow(date)) {
      return `Zítra ${format(date, 'HH:mm')}`;
    }
    return format(date, 'd. MMM HH:mm', { locale: cs });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'group relative flex items-start gap-4 p-4 rounded-2xl',
        'liquid-glass transition-all duration-300',
        'hover:bg-white/5',
        reminder.is_completed && 'opacity-50'
      )}
    >
      {/* iOS-style circular checkbox */}
      <button
        onClick={() => !reminder.is_completed && onComplete(reminder.id)}
        disabled={reminder.is_completed}
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full border-2 transition-all duration-300',
          'flex items-center justify-center mt-0.5',
          reminder.is_completed
            ? 'bg-green-500 border-green-500'
            : isPastDue
              ? 'border-destructive hover:bg-destructive/10'
              : 'border-primary/50 hover:border-primary hover:bg-primary/10'
        )}
      >
        {reminder.is_completed && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          'font-medium text-base leading-tight',
          reminder.is_completed && 'line-through text-muted-foreground'
        )}>
          {reminder.title}
        </h3>
        
        {reminder.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {reminder.description}
          </p>
        )}
        
        <div className={cn(
          'flex items-center gap-1.5 mt-2 text-xs',
          isPastDue ? 'text-destructive' : 'text-muted-foreground'
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span className={cn(isPastDue && 'font-medium')}>
            {formatRemindAt(reminder.remind_at)}
          </span>
          {isPastDue && (
            <span className="px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-medium ml-1">
              Zmeškáno
            </span>
          )}
          {isToday(new Date(reminder.remind_at)) && !isPastDue && !reminder.is_completed && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium ml-1">
              Dnes
            </span>
          )}
        </div>
      </div>

      {/* Action buttons - visible on hover */}
      <div className={cn(
        'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
        'absolute right-3 top-1/2 -translate-y-1/2'
      )}>
        <button
          onClick={() => onEdit(reminder)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => onDelete(reminder.id)}
          className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </motion.div>
  );
};
