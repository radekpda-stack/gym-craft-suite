import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Scale, CalendarDays, Utensils, MessageCircle, Award, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  // Primary actions - daily use (row 1)
  {
    id: 'workout',
    label: 'Trénink',
    icon: <Dumbbell className="w-5 h-5" />,
    path: '/diary',
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageCircle className="w-5 h-5" />,
    path: '/chat',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    id: 'competitions',
    label: 'Soutěže',
    icon: <Trophy className="w-5 h-5" />,
    path: '/competitions',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
  },
  // Secondary actions (row 2)
  {
    id: 'measurement',
    label: 'Měření',
    icon: <Scale className="w-5 h-5" />,
    path: '/progress',
    color: 'text-success',
    bgColor: 'bg-success/10 hover:bg-success/20',
  },
  {
    id: 'attendance',
    label: 'Docházka',
    icon: <CalendarDays className="w-5 h-5" />,
    path: '/attendance',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
  },
  {
    id: 'rewards',
    label: 'Odměny',
    icon: <Award className="w-5 h-5" />,
    path: '/rewards',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/20',
  },
];

export function ClientQuickActions() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-4 gap-2"
    >
      {quickActions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 + index * 0.05 }}
        >
          <Link to={`${basePath}${action.path}`}>
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 h-auto py-3 px-2 w-full rounded-xl transition-all",
                action.bgColor
              )}
            >
              <div className={cn("shrink-0", action.color)}>
                {action.icon}
              </div>
              <span className="text-xs font-medium text-foreground/80">
                {action.label}
              </span>
            </Button>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

