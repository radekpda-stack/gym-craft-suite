import { CalendarDays, Calendar, Flag, CheckCircle, ListTodo } from 'lucide-react';
import { Reminder } from '@/hooks/useReminders';
import { isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface SmartListsGridProps {
  reminders: Reminder[];
  activeList: string;
  onListChange: (list: string) => void;
}

interface SmartListItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  count: number;
}

export const SmartListsGrid = ({ reminders, activeList, onListChange }: SmartListsGridProps) => {
  const todayReminders = reminders.filter(r => !r.is_completed && isToday(new Date(r.remind_at)));
  const scheduledReminders = reminders.filter(r => !r.is_completed && isFuture(new Date(r.remind_at)));
  const overdueReminders = reminders.filter(r => !r.is_completed && isPast(new Date(r.remind_at)));
  const completedReminders = reminders.filter(r => r.is_completed);
  const allActive = reminders.filter(r => !r.is_completed);

  const smartLists: SmartListItem[] = [
    {
      id: 'today',
      label: 'Dnes',
      icon: <CalendarDays className="w-6 h-6" />,
      gradient: 'from-blue-500 to-blue-600',
      count: todayReminders.length,
    },
    {
      id: 'scheduled',
      label: 'Naplánované',
      icon: <Calendar className="w-6 h-6" />,
      gradient: 'from-red-500 to-red-600',
      count: scheduledReminders.length,
    },
    {
      id: 'overdue',
      label: 'Zmeškané',
      icon: <Flag className="w-6 h-6" />,
      gradient: 'from-orange-500 to-orange-600',
      count: overdueReminders.length,
    },
    {
      id: 'completed',
      label: 'Hotovo',
      icon: <CheckCircle className="w-6 h-6" />,
      gradient: 'from-green-500 to-green-600',
      count: completedReminders.length,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {smartLists.map((list) => (
        <button
          key={list.id}
          onClick={() => onListChange(list.id)}
          className={cn(
            'relative p-4 rounded-2xl text-white transition-all duration-300',
            'bg-gradient-to-br shadow-lg hover:shadow-xl hover:scale-[1.02]',
            'flex flex-col items-start gap-2',
            list.gradient,
            activeList === list.id && 'ring-2 ring-white/50 ring-offset-2 ring-offset-background'
          )}
        >
          <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
            {list.icon}
          </div>
          <div className="flex items-end justify-between w-full">
            <span className="text-sm font-medium opacity-90">{list.label}</span>
            <span className="text-2xl font-bold">{list.count}</span>
          </div>
        </button>
      ))}
      
      {/* All reminders button */}
      <button
        onClick={() => onListChange('all')}
        className={cn(
          'col-span-2 p-4 rounded-2xl transition-all duration-300',
          'liquid-glass flex items-center justify-between',
          'hover:bg-white/10',
          activeList === 'all' && 'ring-2 ring-primary/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <ListTodo className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium">Všechny aktivní</span>
        </div>
        <span className="text-xl font-bold text-muted-foreground">{allActive.length}</span>
      </button>
    </div>
  );
};
