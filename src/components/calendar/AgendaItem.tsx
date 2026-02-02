import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CreditCard, MoreHorizontal, Users, X, TrendingUp, FileText, Trash2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePrefetchTrainingDetail } from '@/hooks/usePrefetchTrainingDetail';

interface AgendaItemProps {
  session: TrainingSession;
  client?: Client | null;
  onComplete?: (session: TrainingSession) => void;
  onPayment?: (session: TrainingSession) => void;
  onCancel?: (session: TrainingSession) => void;
  onProgress?: (session: TrainingSession) => void;
  onNote?: (session: TrainingSession) => void;
  onDelete?: (session: TrainingSession) => void;
  onRepeat?: (session: TrainingSession) => void;
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
  onDelete,
  onRepeat,
}: AgendaItemProps) {
  const sessionDate = new Date(session.date);
  const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const prefetchedRef = useRef(false);
  const { prefetchTraining } = usePrefetchTrainingDetail();
  
  // Prefetch on touch/hover - only once per card mount
  const handlePrefetch = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    prefetchTraining(session.id, session.client_id);
  }, [session.id, session.client_id, prefetchTraining]);
  
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
    
    // Swipe doprava = Dokončit (pokud scheduled)
    if (info.offset.x > SWIPE_THRESHOLD && isScheduled && onComplete) {
      onComplete(session);
    }
    // Swipe doleva = Menu (neprovedeme přímou akci)
    // Platba a zrušení jsou pouze přes menu
  };

  const getStatusLabel = () => {
    if (isCanceled) return 'Zrušeno';
    if (isCompleted && isPaid) return 'Zaplaceno';
    if (isCompleted && !isPaid) return 'Čeká na platbu';
    return 'Naplánováno';
  };

  const getStatusColor = () => {
    if (isCanceled) return 'text-destructive bg-destructive/10';
    if (isCompleted && isPaid) return 'text-success bg-success/10';
    if (isCompleted && !isPaid) return 'text-warning bg-warning/10';
    return 'text-muted-foreground bg-muted/30';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      {/* Swipe action backgrounds with gradient */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-success to-success/70 flex items-center justify-start pl-4 rounded-l-2xl"
        style={{ opacity: rightBgOpacity }}
      >
        <Check className="w-6 h-6 text-white" />
      </motion.div>
      <motion.div 
        className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-muted to-muted/70 flex items-center justify-end pr-4 rounded-r-2xl"
        style={{ opacity: leftBgOpacity }}
      >
        <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
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
            onTouchStart={handlePrefetch}
            onMouseEnter={handlePrefetch}
            whileTap={{ scale: 0.99 }}
          >
            <Link
              to={isDragging ? '#' : `/trainings/${session.id}`}
              onClick={(e) => isDragging && e.preventDefault()}
              className={cn(
                'block rounded-2xl p-4 transition-all',
                'bg-card/80 backdrop-blur-sm border border-border/40 shadow-sm',
                'hover:shadow-md hover:-translate-y-0.5',
                isCanceled && 'opacity-50'
              )}
            >
              {/* Main content row */}
              <div className="flex items-start gap-3">
                {/* Time column - monospace for alignment */}
                <div className="flex-shrink-0 text-center min-w-[60px]">
                  <p className="text-lg font-bold text-foreground font-mono tracking-tight">
                    {format(sessionDate, 'HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    –{format(endTime, 'HH:mm')}
                  </p>
                </div>

                {/* Divider with gradient */}
                <div className="w-px h-12 bg-gradient-to-b from-border/80 via-border/40 to-transparent flex-shrink-0" />

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">
                      {client?.name || 'Neznámý klient'}
                    </p>
                    {(session.participant_count || 1) > 1 && (
                      <div className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                        <Users className="w-3 h-3" />
                        <span>{session.participant_count}×</span>
                      </div>
                    )}
                  </div>
                  {/* Status badge - larger and more prominent */}
                  <div className="mt-2">
                    <span className={cn(
                      'inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold',
                      getStatusColor()
                    )}>
                      {getStatusLabel()}
                    </span>
                  </div>
                </div>

                {/* Primary actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {isScheduled && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onComplete?.(session);
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors"
                        title="Dokončit"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete?.(session);
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Smazat trénink"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {needsPayment && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPayment?.(session);
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                      title="Uhradit"
                    >
                      <CreditCard className="w-5 h-5" />
                    </button>
                  )}
                </div>
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
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRepeat?.(session)} className="gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                Opakovat trénink
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onCancel?.(session)} className="gap-2 text-destructive">
                <X className="w-4 h-4" />
                Zrušit trénink
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDelete?.(session)} className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Smazat trénink
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
