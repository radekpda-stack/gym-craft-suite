import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  ClipboardList, 
  FileText, 
  UserCircle, 
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientPendingActions, PendingAction, ActionType } from '@/hooks/useClientPendingActions';

const actionIcons: Record<ActionType, React.ReactNode> = {
  feedback: <ClipboardList className="w-5 h-5" />,
  prediagnostic: <FileText className="w-5 h-5" />,
  profile: <UserCircle className="w-5 h-5" />,
};

const actionColors: Record<ActionType, { bg: string; text: string; border: string }> = {
  feedback: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30 hover:border-amber-500/50',
  },
  prediagnostic: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30 hover:border-blue-500/50',
  },
  profile: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border hover:border-primary/30',
  },
};

function ActionItem({ action, index }: { action: PendingAction; index: number }) {
  const colors = actionColors[action.type];
  const icon = actionIcons[action.type];
  
  const content = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn(
        "transition-all cursor-pointer",
        colors.border,
        action.urgency === 'high' && "ring-1 ring-amber-500/20"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              colors.bg
            )}>
              <span className={colors.text}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{action.title}</p>
                {action.urgency === 'high' && (
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {action.description}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (action.link) {
    // For external pre-diagnostic link
    if (action.link.startsWith('/pre-diagnostic')) {
      return (
        <a href={action.link} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return <Link to={action.link}>{content}</Link>;
  }

  return content;
}

export function ClientActionRequired() {
  const { actions, isLoading, hasActions, count } = useClientPendingActions();

  // Don't render anything if no actions
  if (!isLoading && !hasActions) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-amber-500" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <h2 className="text-sm font-semibold">
            {count === 1 ? 'Máš úkol k vyřízení' : `Máš ${count} úkoly k vyřízení`}
          </h2>
        </div>

        {/* Actions list */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          ) : (
            <AnimatePresence mode="popLayout">
              {actions.map((action, index) => (
                <ActionItem key={action.id} action={action} index={index} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
