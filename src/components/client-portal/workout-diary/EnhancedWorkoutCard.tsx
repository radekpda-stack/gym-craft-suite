import { useState } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Dumbbell, 
  Bike, 
  Waves, 
  MoveHorizontal, 
  Footprints,
  Sparkles,
  User,
  MessageSquare,
  Clock,
  Trash2,
  Reply,
  ChevronDown,
  ChevronUp,
  Ship,
  Mountain,
  Zap,
  Activity,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { haptic } from '@/lib/haptics';

// Workout type configuration with gradients
const WORKOUT_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  label: string;
}> = {
  strength: {
    icon: Dumbbell,
    gradient: 'from-warning/10 via-background to-warning/5',
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    label: 'Posilovna',
  },
  cardio: {
    icon: Bike,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Kardio',
  },
  run: {
    icon: Footprints,
    gradient: 'from-success/10 via-background to-success/5',
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    label: 'Běh',
  },
  cycling: {
    icon: Bike,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Kolo',
  },
  walk: {
    icon: Footprints,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Chůze',
  },
  mobility: {
    icon: MoveHorizontal,
    gradient: 'from-primary/10 via-background to-primary/5',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    label: 'Protažení',
  },
  swimming: {
    icon: Waves,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Plavání',
  },
  rowing: {
    icon: Ship,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Veslo',
  },
  skierg: {
    icon: Mountain,
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'SkiErg',
  },
  treadmill_motor: {
    icon: Zap,
    gradient: 'from-success/10 via-background to-success/5',
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    label: 'Pás (motor)',
  },
  treadmill_curved: {
    icon: Activity,
    gradient: 'from-success/10 via-background to-success/5',
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    label: 'Pás (curved)',
  },
  jumprope: {
    icon: CircleDot,
    gradient: 'from-warning/10 via-background to-warning/5',
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    label: 'Švihadlo',
  },
  hiit: {
    icon: Sparkles,
    gradient: 'from-destructive/10 via-background to-destructive/5',
    iconBg: 'bg-destructive/15',
    iconColor: 'text-destructive',
    label: 'HIIT',
  },
  recovery: {
    icon: MoveHorizontal,
    gradient: 'from-success/10 via-background to-success/5',
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    label: 'Regenerace',
  },
  other: {
    icon: Sparkles,
    gradient: 'from-primary/10 via-background to-primary/5',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    label: 'Jiné',
  },
};

const FEELING_EMOJIS = ['', '😩', '😕', '😐', '😊', '🔥'];

interface EnhancedWorkoutCardProps {
  entry: UnifiedDiaryEntry;
  onDelete?: () => void;
  onReply?: (reply: string) => Promise<void>;
}

export function EnhancedWorkoutCard({ entry, onDelete, onReply }: EnhancedWorkoutCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const config = WORKOUT_CONFIG[entry.workout_type || 'other'] || WORKOUT_CONFIG.other;
  const Icon = entry.is_coached ? User : config.icon;
  const feelingEmoji = entry.energy_after ? FEELING_EMOJIS[entry.energy_after] : '';
  
  const hasTrainerComment = !!entry.trainer_comment;
  const hasNotes = !!entry.notes;
  const hasExercises = entry.exercises && entry.exercises.length > 0;

  const handleCardClick = () => {
    haptic('light');
    setShowDetails(!showDetails);
  };

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div 
        className={cn(
          "rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
          "bg-gradient-to-br border border-border/50",
          entry.is_coached 
            ? "from-primary/10 via-background to-primary/5" 
            : config.gradient
        )}
      >
        {/* Main Content */}
        <div 
          className="p-4 cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
              entry.is_coached ? "bg-primary/15" : config.iconBg
            )}>
              <Icon className={cn(
                "w-7 h-7",
                entry.is_coached ? "text-primary" : config.iconColor
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-lg">
                  {entry.is_coached ? 'S trenérem' : config.label}
                </span>
                {entry.is_coached && (
                  <Badge variant="secondary" className="text-xs">
                    Koučováno
                  </Badge>
                )}
                {feelingEmoji && (
                  <span className="text-xl">{feelingEmoji}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="font-medium">
                  {format(parseISO(entry.date), 'EEEE', { locale: cs })}
                </span>
                <span>
                  {format(parseISO(entry.date), 'd. M.', { locale: cs })}
                </span>
                {entry.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {entry.duration_minutes} min
                  </span>
                )}
              </div>

              {/* Exercise badges */}
              {hasExercises && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {entry.exercises!.slice(0, 3).map((ex, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-background/50">
                      {ex.exercise_name}
                    </Badge>
                  ))}
                  {entry.exercises!.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-background/50">
                      +{entry.exercises!.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-1">
              {onDelete && !entry.is_coached && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('light');
                    onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {(hasNotes || hasExercises) && (
                showDetails ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        </div>

        {/* Client Notes - Collapsible */}
        {showDetails && hasNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-3">
              <div className="p-3 bg-muted/50 rounded-xl text-sm backdrop-blur-sm">
                <p className="text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trainer Comment - ALWAYS VISIBLE */}
        {hasTrainerComment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mb-4"
          >
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Komentář od trenéra
                </span>
                {entry.trainer_commented_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(parseISO(entry.trainer_commented_at), { 
                      addSuffix: true, 
                      locale: cs 
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.trainer_comment}</p>
              
              {/* Reply section */}
              {onReply && !isReplying && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Napište odpověď..."
                    className="min-h-[80px] text-sm bg-background/50"
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
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
