import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check, CreditCard, Pencil, MoreHorizontal, Users, X, TrendingUp, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { TrainingStatusDot } from '@/components/ui/training-status-badge';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface AgendaItemProps {
  session: TrainingSession;
  client?: Client | null;
  onComplete?: (session: TrainingSession) => void;
  onPayment?: (session: TrainingSession) => void;
  onCancel?: (session: TrainingSession) => void;
  onProgress?: (session: TrainingSession) => void;
  onNote?: (session: TrainingSession) => void;
}

const SWIPE_THRESHOLD = 80;

export function AgendaItem({
  session,
  client,
  onComplete,
  onPayment,
  onCancel,
  onProgress,
  onNote,
}: AgendaItemProps) {
  const sessionDate = new Date(session.date);
  const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Background colors for swipe actions
  const rightBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const isScheduled = session.status === 'scheduled';
  const isCompleted = session.status === 'completed';
  const isCanceled = session.status === 'canceled';
  const isPaid = session.payment_status?.startsWith('paid_');
  const needsPayment = isCompleted && !isPaid;

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > SWIPE_THRESHOLD && isScheduled && onComplete) {
      // Swipe right = complete
      onComplete(session);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      // Swipe left = payment (if needs payment) or cancel (if scheduled)
      if (needsPayment && onPayment) {
        onPayment(session);
      } else if (isScheduled && onCancel) {
        onCancel(session);
      }
    }
  };

  const getStatusLabel = () => {
    if (isCanceled) return 'Zrušeno';
    if (isCompleted && isPaid) return 'Zaplaceno';
    if (isCompleted && !isPaid) return 'Čeká na platbu';
    return 'Naplánováno';
  };

  const getStatusColor = () => {
    if (isCanceled) return 'text-destructive';
    if (isCompleted && isPaid) return 'text-success';
    if (isCompleted && !isPaid) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      {/* Swipe action backgrounds */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-24 bg-success flex items-center justify-start pl-4 rounded-l-xl"
        style={{ opacity: rightBgOpacity }}
      >
        <Check className="w-6 h-6 text-white" />
      </motion.div>
      <motion.div 
        className="absolute inset-y-0 right-0 w-24 bg-warning flex items-center justify-end pr-4 rounded-r-xl"
        style={{ opacity: leftBgOpacity }}
      >
        {needsPayment ? (
          <CreditCard className="w-6 h-6 text-white" />
        ) : (
          <X className="w-6 h-6 text-white" />
        )}
      </motion.div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className="relative"
          >
            <Link
              to={isDragging ? '#' : `/trainings/${session.id}`}
              onClick={(e) => isDragging && e.preventDefault()}
              className={cn(
                'block glass-subtle rounded-xl p-4 transition-all active:scale-[0.98]',
                isCanceled && 'opacity-50'
              )}
            >
              {/* Main content row */}
              <div className="flex items-start gap-3">
                {/* Time column */}
                <div className="flex-shrink-0 text-center min-w-[60px]">
                  <p className="text-lg font-bold text-foreground">
                    {format(sessionDate, 'HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    –{format(endTime, 'HH:mm')}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-border/50 flex-shrink-0" />

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {client?.name || 'Neznámý klient'}
                    </p>
                    {(session.participant_count || 1) > 1 && (
                      <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{session.participant_count}×</span>
                      </div>
                    )}
                  </div>
                  <p className={cn('text-xs mt-0.5', getStatusColor())}>
                    {getStatusLabel()}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  <TrainingStatusDot 
                    status={session.status as 'scheduled' | 'completed' | 'canceled'} 
                    paymentStatus={session.payment_status}
                    className="w-5 h-5"
                  />
                </div>
              </div>

              {/* Actions row - visible on larger screens */}
              <div className="hidden sm:flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                {isScheduled && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onComplete?.(session);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Dokončit
                  </button>
                )}
                {needsPayment && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPayment?.(session);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Platba
                  </button>
                )}
                <Link
                  to={`/trainings/${session.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-colors ml-auto"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          </motion.div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          {isScheduled && (
            <ContextMenuItem onClick={() => onComplete?.(session)} className="gap-2">
              <Check className="w-4 h-4 text-success" />
              Dokončit trénink
            </ContextMenuItem>
          )}
          {(needsPayment || isScheduled) && (
            <ContextMenuItem onClick={() => onPayment?.(session)} className="gap-2">
              <CreditCard className="w-4 h-4 text-warning" />
              Zadat platbu
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => onProgress?.(session)} className="gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Zapsat progres
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onNote?.(session)} className="gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Poznámka
          </ContextMenuItem>
          {isScheduled && (
            <ContextMenuItem onClick={() => onCancel?.(session)} className="gap-2 text-destructive">
              <X className="w-4 h-4" />
              Zrušit trénink
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
